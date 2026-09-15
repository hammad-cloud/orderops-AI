"""Agentic negotiation endpoints (offers, customer responses)."""

from fastapi import APIRouter

from app.services.demo_data import random_negotiations

router = APIRouter()


@router.get("")
async def list_negotiations() -> list[dict]:
    return random_negotiations()


@router.post("/{negotiation_id}/respond")
async def customer_response(negotiation_id: str) -> dict:
    """Human-in-the-loop: accept alternative or route to refund."""
    return {"negotiation_id": negotiation_id, "status": "received"}
