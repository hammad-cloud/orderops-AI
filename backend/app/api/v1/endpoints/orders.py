"""Order intake and lifecycle endpoints."""

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import triage_graph
from app.core.security import can_see_customer, current_user, require
from app.db.session import get_db
from app.models import InventoryItem, Negotiation, Order, User
from app.schemas.negotiation import NegotiationRead
from app.schemas.order import OrderCreate, OrderDetail, OrderRead
from app.services.audit_trail.recorder import order_state, record, record_now
from app.services.idempotency.guard import AlreadyProcessed, commit_once, ensure_unused

router = APIRouter()

# fraud score and reasons are internal: showing them to customers would teach them how to pass the check
_STAFF_ONLY = {"risk_score": None, "notes": None}


@router.get("", response_model=list[OrderRead])
async def list_orders(
    q: str | None = None, status: str | None = None, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)
):
    """Newest first; `q` matches order or customer id, `status` filters exactly. Customers only get their own."""
    query = select(Order).order_by(Order.created_at.desc()).limit(200)
    if user.role == "customer":
        query = query.where(Order.customer_id == user.customer_id)
    if q:
        query = query.where(or_(Order.id.icontains(q), Order.customer_id.icontains(q)))
    if status:
        query = query.where(Order.status == status)
    orders = [OrderRead.model_validate(o) for o in await db.scalars(query)]
    return [o.model_copy(update=_STAFF_ONLY) for o in orders] if user.role == "customer" else orders


@router.get("/{order_id}", response_model=OrderDetail)
async def get_order(order_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    order = await db.get(Order, order_id)
    if order is not None and not can_see_customer(user, order.customer_id):
        await record_now(db, actor=user, action="order.viewed", outcome="denied", target_type="order", target_id=order_id,
                         order_id=order_id)
        order = None
    if order is None:  # 404, not 403: don't confirm someone else's order exists
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    offers = await db.scalars(select(Negotiation).where(Negotiation.order_id == order_id).order_by(Negotiation.created_at))
    detail = OrderDetail.model_validate(order)
    detail.negotiations = [NegotiationRead.model_validate(n) for n in offers]
    return detail.model_copy(update=_STAFF_ONLY) if user.role == "customer" else detail


@router.post("/intake", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def intake_order(payload: OrderCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require("orders:create"))):
    """Receive a new order and run it through the triage graph (fraud → inventory → outcome)."""
    if not can_see_customer(user, payload.customer_id):
        await record_now(db, actor=user, action="order.created", outcome="denied", order_id=payload.id,
                         changes={"customerId": payload.customer_id})
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only place orders for your own account")
    try:
        created = await create_order(payload, db, actor=user)
    except AlreadyProcessed:
        # a retried submit: nothing was created this time, but the attempt is part of the order's history
        await record_now(db, actor=user, action="order.created", outcome="duplicate", target_type="order", target_id=payload.id,
                         order_id=payload.id)
        raise
    order = OrderRead.model_validate(created)
    return order.model_copy(update=_STAFF_ONLY) if user.role == "customer" else order


async def create_order(payload: OrderCreate, db: AsyncSession, actor: User | None = None) -> Order:
    """Validate, triage and save an order. Callers do the permission check; actor None is the system (seed data)."""
    order_id = payload.id or f"ORD-{uuid4().hex[:8].upper()}"
    await ensure_unused(db, order_id)  # repeats raise AlreadyProcessed → 409 (handler in app/main.py)

    products = {p.sku: p for p in await db.scalars(select(InventoryItem).where(InventoryItem.sku.in_([i.sku for i in payload.items])))}
    unknown = [i.sku for i in payload.items if i.sku not in products]
    if unknown:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown SKU: {', '.join(unknown)}")
    if len(products) != len(payload.items):  # stock is checked per line, so one SKU per line
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Each SKU may appear only once")

    items = [{"sku": i.sku, "name": products[i.sku].name, "quantity": i.quantity, "price": products[i.sku].price} for i in payload.items]
    order = Order(
        id=order_id,
        customer_id=payload.customer_id,
        status="received",
        items=items,
        total=round(sum(i["price"] * i["quantity"] for i in items), 2),
    )
    # triage before adding, so the fraud check doesn't count this order as the customer's history
    await triage_graph.ainvoke({"order": order}, {"configurable": {"db": db}})
    db.add(order)
    await record(db, actor=actor, action="order.created", target_type="order", target_id=order_id, order_id=order_id,
                 changes={"after": order_state(order)})
    await commit_once(db, order_id)  # the order and its audit entry are saved together
    await db.refresh(order)
    return order
