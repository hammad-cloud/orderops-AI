"""High-risk order manual audit queue."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import Order
from app.schemas.order import OrderRead

router = APIRouter()


@router.get("/queue")
async def audit_queue(db: AsyncSession = Depends(get_db)) -> list[dict]:
    """Orders the fraud check sent to human review, highest risk first."""
    orders = await db.scalars(select(Order).where(Order.status == "audit").order_by(Order.risk_score.desc()))
    return [
        {
            "id": f"AUD-{o.id}",
            "orderId": o.id,
            "customerId": o.customer_id,
            "riskScore": o.risk_score,
            "riskLevel": OrderRead.model_validate(o).risk_level,
            "reason": o.notes or "High risk score",
            "status": "queued",
            "createdAt": o.created_at,
        }
        for o in orders
    ]
