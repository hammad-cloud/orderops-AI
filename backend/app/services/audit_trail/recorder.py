"""Write and verify the audit trail.

Call `record()` before the commit of the change it describes, so both are saved or neither is. Each entry stores the
SHA-256 of the previous entry plus its own content; `verify()` recomputes the chain, so editing or deleting a row
directly in the database (bypassing the append-only trigger) is detected.
"""

import hashlib
import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models import AuditEvent, Order, User

GENESIS = "0" * 64
_CHAIN_LOCK = 0x0A0D17  # advisory lock: one writer at a time, so every entry links to the true previous one
SENSITIVE_KEYS = {"password", "password_hash", "token", "secret", "secret_key", "authorization"}


def redact(value: Any) -> Any:
    """Replace secret-looking fields at any depth; the audit trail must never hold credentials."""
    if isinstance(value, dict):
        return {k: "[REDACTED]" if k.lower() in SENSITIVE_KEYS else redact(v) for k, v in value.items()}
    if isinstance(value, list):
        return [redact(v) for v in value]
    return value


def order_state(order: Order) -> dict:
    """The audit-relevant state of an order, for before/after records."""
    return {
        "status": order.status,
        "customerId": order.customer_id,
        "total": order.total,
        "riskScore": order.risk_score,
        "items": [{"sku": i["sku"], "quantity": i["quantity"], "price": i["price"]} for i in order.items],
    }


def _digest(prev_hash: str, event: AuditEvent) -> str:
    body = {
        "prev": prev_hash,
        "at": event.occurred_at.isoformat(),
        "actor_id": event.actor_id,
        "actor_email": event.actor_email,
        "actor_role": event.actor_role,
        "action": event.action,
        "outcome": event.outcome,
        "target_type": event.target_type,
        "target_id": event.target_id,
        "order_id": event.order_id,
        "changes": event.changes,
    }
    return hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":"), default=str).encode()).hexdigest()


async def record(
    db: AsyncSession,
    *,
    actor: User | None,
    action: str,
    outcome: str = "success",
    target_type: str | None = None,
    target_id: str | int | None = None,
    order_id: str | None = None,
    changes: dict | None = None,
    actor_email: str | None = None,  # for attempts by someone not signed in (failed logins)
) -> AuditEvent:
    """Add an entry to the session; the caller's commit saves it together with the change."""
    await db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": _CHAIN_LOCK})
    prev_hash = await db.scalar(select(AuditEvent.hash).order_by(AuditEvent.id.desc()).limit(1)) or GENESIS
    event = AuditEvent(
        occurred_at=datetime.now(UTC),
        actor_id=actor.id if actor else None,
        actor_email=(actor.email if actor else actor_email or "system")[:255],
        actor_role=actor.role if actor else None,
        action=action,
        outcome=outcome,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        order_id=order_id,
        changes=redact(changes or {}),
        prev_hash=prev_hash,
    )
    event.hash = _digest(prev_hash, event)
    db.add(event)
    return event


async def record_now(_db: AsyncSession | None = None, **kwargs: Any) -> None:
    """Record and commit in a separate transaction, for events whose request then fails (denials, failed logins).
    The request's own session is left alone: it may hold work that must not be saved."""
    async with AsyncSessionLocal() as db:
        await record(db, **kwargs)
        await db.commit()


async def verify(db: AsyncSession) -> dict:
    """Recompute the whole chain. Returns the first entry that doesn't match, if any."""
    prev_hash, checked = GENESIS, 0
    async for event in await db.stream_scalars(select(AuditEvent).order_by(AuditEvent.id).execution_options(yield_per=1000)):
        if event.prev_hash != prev_hash or _digest(prev_hash, event) != event.hash:
            return {"ok": False, "checked": checked, "brokenAt": event.id}
        prev_hash, checked = event.hash, checked + 1
    return {"ok": True, "checked": checked, "brokenAt": None}
