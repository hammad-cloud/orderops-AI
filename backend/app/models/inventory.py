"""Inventory item model — live stock availability."""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    sku: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    quantity_available: Mapped[int] = mapped_column(Integer, default=0)
    warehouse_id: Mapped[str] = mapped_column(String(64), index=True)
