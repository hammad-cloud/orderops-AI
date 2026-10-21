"""Agentic negotiation endpoints (offers, customer responses)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Negotiation, Order
from app.schemas.negotiation import NegotiationRead, NegotiationResponse
from app.services.negotiation.offer_engine import apply_decision

router = APIRouter()


@router.get("", response_model=list[NegotiationRead])
async def list_negotiations(db: AsyncSession = Depends(get_db)):
    return (await db.scalars(select(Negotiation).order_by(Negotiation.created_at.desc()).limit(200))).all()


@router.post("/{negotiation_id}/respond", response_model=NegotiationRead)
async def customer_response(negotiation_id: str, body: NegotiationResponse, db: AsyncSession = Depends(get_db)):
    """Human-in-the-loop: accept the alternative (fulfill) or decline (refund)."""
    offer = await db.get(Negotiation, negotiation_id, with_for_update=True)
    if offer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Negotiation not found")
    if offer.customer_decision:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Already {offer.customer_decision}")
    await apply_decision(db, offer, await db.get(Order, offer.order_id), body.decision)
    await db.commit()
    return offer
