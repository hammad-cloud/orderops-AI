"""Every refund goes through here: out of stock with no alternative, offer declined, or rejected in fraud review."""

import logging

from app.models import Order

log = logging.getLogger(__name__)


def refund(order: Order, reason: str | None = None) -> None:
    """Mark the order refunded. `reason` replaces the order notes; None keeps them."""
    order.status = "refunded"
    if reason is not None:
        order.notes = reason
    # shortcut: no payment provider yet, so nothing is charged back; call its refund API here when one is chosen
    log.info("Order %s refunded (%s)", order.id, order.total)
