"""Audit trail response shape."""

from datetime import datetime

from app.schemas.base import CamelModel


class AuditEventRead(CamelModel):
    id: int
    occurred_at: datetime
    actor_id: int | None = None
    actor_email: str | None = None
    actor_role: str | None = None
    action: str
    outcome: str
    target_type: str | None = None
    target_id: str | None = None
    order_id: str | None = None
    changes: dict
    hash: str
