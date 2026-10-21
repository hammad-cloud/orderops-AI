"""Live inventory validation against PostgreSQL."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import InventoryItem


async def load_stock(db: AsyncSession, skus: list[str]) -> dict[str, InventoryItem]:
    """Lock the rows so concurrent orders can't sell the same units twice."""
    rows = await db.scalars(select(InventoryItem).where(InventoryItem.sku.in_(skus)).with_for_update())
    return {row.sku: row for row in rows}


def first_shortage(items: list[dict], stock: dict[str, InventoryItem]) -> dict | None:
    return next((i for i in items if stock[i["sku"]].quantity_available < i["quantity"]), None)


async def suggest_alternative(db: AsyncSession, original: InventoryItem, quantity: int) -> InventoryItem | None:
    """Same-category item with enough stock, closest in price."""
    candidates = await db.scalars(
        select(InventoryItem).where(
            InventoryItem.category == original.category,
            InventoryItem.sku != original.sku,
            InventoryItem.quantity_available >= quantity,
        )
    )
    return min(candidates, key=lambda c: abs(c.price - original.price), default=None)


def reserve(items: list[dict], stock: dict[str, InventoryItem]) -> None:
    for i in items:
        stock[i["sku"]].quantity_available -= i["quantity"]
