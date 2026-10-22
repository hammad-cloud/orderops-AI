"""High-risk order manual audit queue."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import triage_graph
from app.core.security import require
from app.db.session import get_db
from app.models import Order, User
from app.schemas.order import OrderRead
from app.services.audit_trail.recorder import order_state, record
from app.services.refunds.refunder import refund

router = APIRouter()


class AuditDecision(BaseModel):
    decision: Literal["approve", "reject"]


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


@router.post("/{order_id}/decision", response_model=OrderRead)
async def decide(order_id: str, body: AuditDecision, db: AsyncSession = Depends(get_db), user: User = Depends(require("audit:decide"))):
    """Approve: continue to the stock check and the normal outcome. Reject: refund the order."""
    order = await db.get(Order, order_id, with_for_update=True)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    if order.status != "audit":
        raise HTTPException(status.HTTP_409_CONFLICT, f"Order is {order.status}, not awaiting review")
    before = order_state(order)
    if body.decision == "approve":
        await triage_graph.ainvoke({"order": order, "approved": True}, {"configurable": {"db": db}})
        order.notes = f"Approved in review by {user.email}. {order.notes or ''}".strip()
    else:
        refund(order, f"Rejected in review by {user.email}. {order.notes or ''}".strip())
    action = "fraud_review.approved" if body.decision == "approve" else "fraud_review.rejected"
    await record(db, actor=user, action=action, target_type="order", target_id=order.id,
                 order_id=order.id, changes={"before": before, "after": order_state(order)})
    await db.commit()
    await db.refresh(order)
    return order
