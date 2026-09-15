"""Negotiation offer model — alternatives, discounts, customer decisions."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Negotiation(Base):
    __tablename__ = "negotiations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    order_id: Mapped[str] = mapped_column(String(64), index=True)
    original_sku: Mapped[str] = mapped_column(String(64))
    alternative_sku: Mapped[str] = mapped_column(String(64))
    discount_percent: Mapped[float] = mapped_column(Float, default=0.0)
    channel: Mapped[str] = mapped_column(String(16))  # email | sms
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    customer_decision: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
