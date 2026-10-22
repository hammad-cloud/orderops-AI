"""Agentic negotiation endpoints (offers, customer responses)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import can_see_customer, current_user, require
from app.db.session import get_db
from app.models import Negotiation, Order, User
from app.schemas.negotiation import NegotiationRead, NegotiationResponse
from app.services.audit_trail.recorder import order_state, record, record_now
from app.services.negotiation.offer_engine import apply_decision

router = APIRouter()


@router.get("", response_model=list[NegotiationRead])
async def list_negotiations(db: AsyncSession = Depends(get_db), user: User = Depends(current_user)):
    query = select(Negotiation).order_by(Negotiation.created_at.desc()).limit(200)
    if user.role == "customer":
        query = query.join(Order, Order.id == Negotiation.order_id).where(Order.customer_id == user.customer_id)
    return (await db.scalars(query)).all()


@router.post("/{negotiation_id}/respond", response_model=NegotiationRead)
async def customer_response(
    negotiation_id: str,
    body: NegotiationResponse,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require("negotiations:respond")),
):
    """Human-in-the-loop: accept the alternative (fulfill) or decline (refund)."""
    offer = await db.get(Negotiation, negotiation_id, with_for_update=True)
    order = await db.get(Order, offer.order_id) if offer else None
    if order is not None and not can_see_customer(user, order.customer_id):
        await record_now(db, actor=user, action="negotiation.responded", outcome="denied", target_type="negotiation",
                         target_id=negotiation_id, order_id=order.id)
        order = None
    if offer is None or order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Negotiation not found")
    if offer.customer_decision:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Already {offer.customer_decision}")
    before = order_state(order)
    await apply_decision(db, offer, order, body.decision)
    await record(db, actor=user, action=f"negotiation.{body.decision}", target_type="negotiation", target_id=offer.id,
                 order_id=order.id, changes={"before": before, "after": order_state(order)})
    await db.commit()
    return offer
