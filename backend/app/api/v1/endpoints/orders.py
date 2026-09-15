"""Order intake and lifecycle endpoints."""

from fastapi import APIRouter

from app.services.demo_data import random_orders

router = APIRouter()


@router.get("")
async def list_orders() -> list[dict]:
    """List orders in the triage pipeline (demo random data)."""
    return random_orders()


@router.post("/intake")
async def intake_order() -> dict:
    """Receive a new order and start fraud + inventory workflow."""
    return {"status": "accepted"}
