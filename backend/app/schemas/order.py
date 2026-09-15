"""Order list response shape for the frontend."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class OrderCreate(BaseModel):
    id: str
    customer_id: str
    items: list[dict] = Field(default_factory=list)


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    customer_id: str = Field(serialization_alias="customerId")
    status: str
    risk_score: Optional[float] = Field(default=None, serialization_alias="riskScore")
    created_at: Optional[datetime] = Field(default=None, serialization_alias="createdAt")
