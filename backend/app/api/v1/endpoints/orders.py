"""Order intake and lifecycle endpoints."""

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import triage_graph
from app.db.session import get_db
from app.models import InventoryItem, Negotiation, Order
from app.schemas.negotiation import NegotiationRead
from app.schemas.order import OrderCreate, OrderDetail, OrderRead

router = APIRouter()


@router.get("", response_model=list[OrderRead])
async def list_orders(q: str | None = None, status: str | None = None, db: AsyncSession = Depends(get_db)):
    """Newest first; `q` matches order or customer id, `status` filters exactly."""
    query = select(Order).order_by(Order.created_at.desc()).limit(200)
    if q:
        query = query.where(or_(Order.id.icontains(q), Order.customer_id.icontains(q)))
    if status:
        query = query.where(Order.status == status)
    return (await db.scalars(query)).all()


@router.get("/{order_id}", response_model=OrderDetail)
async def get_order(order_id: str, db: AsyncSession = Depends(get_db)):
    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    offers = await db.scalars(select(Negotiation).where(Negotiation.order_id == order_id).order_by(Negotiation.created_at))
    detail = OrderDetail.model_validate(order)
    detail.negotiations = [NegotiationRead.model_validate(n) for n in offers]
    return detail


@router.post("/intake", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def intake_order(payload: OrderCreate, db: AsyncSession = Depends(get_db)):
    """Receive a new order and run it through the triage graph (fraud → inventory → outcome)."""
    order_id = payload.id or f"ORD-{uuid4().hex[:8].upper()}"
    if await db.get(Order, order_id):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Order {order_id} already exists")

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
    await db.commit()
    await db.refresh(order)
    return order
