"""Pydantic schemas for negotiations."""

from typing import Literal, Optional

from pydantic import BaseModel


class NegotiationRead(BaseModel):
    id: str
    order_id: str
    original_sku: str
    alternative_sku: str
    discount_percent: float
    channel: Literal["email", "sms"]
    status: str
    customer_decision: Optional[str] = None

    model_config = {"from_attributes": True}


class NegotiationResponse(BaseModel):
    decision: Literal["accepted", "declined"]
