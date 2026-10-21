"""Inventory validation endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import InventoryItem
from app.schemas.inventory import InventoryCheck, InventoryRead

router = APIRouter()


@router.get("", response_model=list[InventoryRead])
async def list_inventory(db: AsyncSession = Depends(get_db)):
    return (await db.scalars(select(InventoryItem).order_by(InventoryItem.sku))).all()


@router.get("/check/{sku}", response_model=InventoryCheck)
async def check_availability(sku: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(InventoryItem, sku)
    quantity = item.quantity_available if item else 0
    return InventoryCheck(sku=sku, available=quantity > 0, quantity=quantity)
