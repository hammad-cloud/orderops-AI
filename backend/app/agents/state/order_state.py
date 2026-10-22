"""Shared LangGraph agent state for the order triage workflow."""

from typing import Literal, TypedDict

from app.models import InventoryItem, Order


class OrderTriageState(TypedDict, total=False):
    order: Order  # ORM object, mutated in place; the caller commits
    approved: bool  # a reviewer cleared it from the audit queue: skip the fraud check
    stock: dict[str, InventoryItem]
    shortage: dict | None  # first order line that can't be filled
    alternative: InventoryItem | None
    outcome: Literal["fulfill", "audit", "refund", "negotiate"]
