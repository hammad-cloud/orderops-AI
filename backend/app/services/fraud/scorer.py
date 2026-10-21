"""Rule-based fraud / risk scoring. A score >= HIGH_RISK sends the order to manual audit."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Order

HIGH_RISK = 0.75


async def score_order(db: AsyncSession, customer_id: str, total: float, items: list[dict]) -> tuple[float, list[str]]:
    """Return (risk score 0.0–0.99, human-readable reasons)."""
    prior = await db.scalar(select(func.count()).where(Order.customer_id == customer_id))
    hour_ago = datetime.now(UTC) - timedelta(hours=1)
    recent = await db.scalar(
        select(func.count()).where(Order.customer_id == customer_id, Order.created_at >= hour_ago)
    )

    rules = [
        (total >= 1000, 0.45, "Order value over $1,000"),
        (500 <= total < 1000, 0.25, "Order value over $500"),
        (not prior, 0.25, "First order from this customer"),
        (recent >= 3, 0.3, "Velocity: 3+ orders in the last hour"),
        (any(i["quantity"] >= 5 for i in items), 0.15, "Bulk quantity of a single item"),
    ]
    hits = [(weight, reason) for matched, weight, reason in rules if matched]
    score = 0.05 + sum(weight for weight, _ in hits)
    return round(min(score, 0.99), 2), [reason for _, reason in hits]
