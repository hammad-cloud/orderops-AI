"""Success metrics computed from the orders and negotiations tables."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Negotiation, Order

router = APIRouter()


@router.get("")
async def get_analytics(db: AsyncSession = Depends(get_db)) -> dict:
    # shortcut: aggregates in Python over every row; move to SQL GROUP BY past ~10k orders
    orders = (await db.scalars(select(Order).order_by(Order.created_at.desc()))).all()
    offers = (await db.scalars(select(Negotiation))).all()

    by_status = lambda *s: [o for o in orders if o.status in s]  # noqa: E731
    accepted_ids = {n.order_id for n in offers if n.customer_decision == "accepted"}
    decided = sum(1 for n in offers if n.customer_decision)
    oos_ids = {n.order_id for n in offers} | {o.id for o in by_status("refunded")}
    today = datetime.now(UTC).date()

    daily = []
    for back in range(6, -1, -1):
        day = today - timedelta(days=back)
        on_day = [o for o in orders if o.created_at.astimezone(UTC).date() == day]
        daily.append({
            "date": day.strftime("%a %d"),
            "orders": len(on_day),
            "fulfilled": sum(o.status in ("fulfillment", "completed") for o in on_day),
            "recovered": sum(o.id in accepted_ids for o in on_day),
        })

    return {
        "ordersTotal": len(orders),
        "ordersToday": daily[-1]["orders"],
        "fulfilledOrders": len(by_status("fulfillment", "completed")),
        "auditOrders": len(by_status("audit")),
        "refundedOrders": len(by_status("refunded")),
        "attemptedNegotiations": len(offers),
        "recoveredOrders": len(accepted_ids),
        "revenueRecoveryRate": round(len(accepted_ids) / decided * 100, 1) if decided else 0.0,
        "recoveredRevenue": round(sum(o.total for o in orders if o.id in accepted_ids), 2),
        "oosRatePercent": round(len(oos_ids) / len(orders) * 100, 1) if orders else 0.0,
        "daily": daily,
        "recent": [
            {"id": o.id, "customerId": o.customer_id, "status": o.status, "total": o.total, "createdAt": o.created_at}
            for o in orders[:8]
        ],
    }
