"""Inventory validation endpoints."""

from fastapi import APIRouter

from app.services.demo_data import random_inventory

router = APIRouter()


@router.get("")
async def list_inventory() -> list[dict]:
    """List inventory with live-style availability (demo random data)."""
    return random_inventory()


@router.get("/check/{sku}")
async def check_availability(sku: str) -> dict:
    """Check live stock for a SKU."""
    stock = {item["sku"]: item for item in random_inventory()}
    item = stock.get(sku)
    if not item:
        return {"sku": sku, "available": False, "quantity": 0}
    return {
        "sku": sku,
        "available": item["quantityAvailable"] > 0,
        "quantity": item["quantityAvailable"],
    }
