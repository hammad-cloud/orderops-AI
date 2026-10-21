"""Pydantic schemas for negotiations."""

from datetime import datetime
from typing import Literal

from app.schemas.base import CamelModel


class NegotiationRead(CamelModel):
    id: str
    order_id: str
    original_sku: str
    original_name: str | None = None
    alternative_sku: str
    alternative_name: str | None = None
    discount_percent: float
    channel: Literal["email", "sms"]
    status: str
    customer_decision: str | None = None
    created_at: datetime | None = None


class NegotiationResponse(CamelModel):
    decision: Literal["accepted", "declined"]
