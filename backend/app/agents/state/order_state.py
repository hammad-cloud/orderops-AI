"""Shared LangGraph agent state for the order triage workflow."""

from typing import Any, Literal, TypedDict


class OrderTriageState(TypedDict, total=False):
    order_id: str
    risk_score: float
    risk_level: Literal["low", "medium", "high"]
    stock_status: Literal["in_stock", "out_of_stock", "unknown"]
    negotiation_id: str | None
    customer_decision: Literal["accepted", "declined", "pending"] | None
    alternative_sku: str | None
    discount_percent: float | None
    outcome: Literal["fulfill", "audit", "refund", "negotiating"] | None
    metadata: dict[str, Any]
