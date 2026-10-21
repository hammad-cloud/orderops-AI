"""Order request/response shapes."""

from datetime import datetime
from typing import Literal

from pydantic import Field, computed_field

from app.schemas.base import CamelModel
from app.schemas.negotiation import NegotiationRead


class OrderLine(CamelModel):
    sku: str = Field(min_length=1, max_length=64)
    quantity: int = Field(ge=1, le=100)


class OrderCreate(CamelModel):
    id: str | None = Field(default=None, max_length=64)  # generated when omitted
    customer_id: str = Field(min_length=1, max_length=64)
    items: list[OrderLine] = Field(min_length=1, max_length=50)


class OrderItemRead(CamelModel):
    sku: str
    name: str
    quantity: int
    price: float


class OrderRead(CamelModel):
    id: str
    customer_id: str
    status: str
    items: list[OrderItemRead]
    total: float
    risk_score: float | None = None
    notes: str | None = None
    created_at: datetime | None = None

    @computed_field
    def item_count(self) -> int:
        return sum(i.quantity for i in self.items)

    @computed_field
    def risk_level(self) -> Literal["low", "medium", "high"]:
        score = self.risk_score or 0.0
        return "high" if score >= 0.75 else "medium" if score >= 0.4 else "low"


class OrderDetail(OrderRead):
    negotiations: list[NegotiationRead] = []
