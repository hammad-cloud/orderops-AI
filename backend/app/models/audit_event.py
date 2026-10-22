"""Audit trail entry — append-only (a database trigger rejects UPDATE/DELETE/TRUNCATE) and hash-chained."""

from datetime import datetime

from sqlalchemy import JSON, BigInteger, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    actor_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)  # None: system or not signed in
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)  # as it was at the time
    actor_role: Mapped[str | None] = mapped_column(String(16), nullable=True)
    action: Mapped[str] = mapped_column(String(64), index=True)  # e.g. order.created, user.updated, access.denied
    outcome: Mapped[str] = mapped_column(String(16))  # success | denied | failed | blocked | duplicate
    target_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    order_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)  # the workflow it belongs to
    changes: Mapped[dict] = mapped_column(JSON)  # {"before": {...}, "after": {...}} or context; secrets redacted
    prev_hash: Mapped[str] = mapped_column(String(64))
    hash: Mapped[str] = mapped_column(String(64))
