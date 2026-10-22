"""Order intake idempotency. The order id is the idempotency key: the dashboard generates it once per form, so a
retried, double-clicked or re-sent submit reuses it, and only the first request creates an order."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Order


class AlreadyProcessed(Exception):
    """An order with this id exists: the request is a repeat (the API answers 409)."""


async def ensure_unused(db: AsyncSession, order_id: str) -> None:
    """Cheap early check, so a repeat doesn't run the triage graph again."""
    if await db.get(Order, order_id):
        raise AlreadyProcessed(order_id)


async def commit_once(db: AsyncSession, order_id: str) -> None:
    """Commit the new order; if a concurrent repeat committed the same id first, the primary key rejects this one."""
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AlreadyProcessed(order_id) from None
