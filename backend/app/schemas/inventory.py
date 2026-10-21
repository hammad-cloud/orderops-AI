"""Pydantic schemas for inventory."""

from typing import Literal

from pydantic import computed_field

from app.schemas.base import CamelModel

LOW_STOCK = 10


class InventoryRead(CamelModel):
    sku: str
    name: str
    category: str
    price: float
    quantity_available: int
    warehouse_id: str

    @computed_field
    def status(self) -> Literal["in_stock", "low", "out_of_stock"]:
        if self.quantity_available <= 0:
            return "out_of_stock"
        return "low" if self.quantity_available <= LOW_STOCK else "in_stock"


class InventoryCheck(CamelModel):
    sku: str
    available: bool
    quantity: int = 0
