"""Pydantic schemas for inventory."""

from pydantic import BaseModel


class InventoryCheck(BaseModel):
    sku: str
    available: bool
    quantity: int = 0
