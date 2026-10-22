"""Read-only access to the audit trail (admins). There are deliberately no write, update or delete endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import AuditEvent
from app.schemas.audit_event import AuditEventRead
from app.services.audit_trail.recorder import verify

router = APIRouter()


@router.get("", response_model=list[AuditEventRead])
async def list_events(
    order_id: str | None = Query(None, alias="orderId"),
    actor: str | None = None,
    action: str | None = None,
    outcome: str | None = None,
    before_id: int | None = Query(None, alias="beforeId"),
    limit: int = Query(200, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Newest first. `actor` matches the email, `action` matches a prefix (e.g. "order."), `beforeId` pages back."""
    query = select(AuditEvent).order_by(AuditEvent.id.desc()).limit(limit)
    if order_id:
        query = query.where(AuditEvent.order_id == order_id)
    if actor:
        query = query.where(AuditEvent.actor_email.icontains(actor))
    if action:
        query = query.where(AuditEvent.action.startswith(action))
    if outcome:
        query = query.where(AuditEvent.outcome == outcome)
    if before_id:
        query = query.where(AuditEvent.id < before_id)
    return (await db.scalars(query)).all()


@router.get("/verify")
async def verify_chain(db: AsyncSession = Depends(get_db)) -> dict:
    """Recompute the hash chain; `brokenAt` is the first entry that was altered or follows a removed one."""
    return await verify(db)
