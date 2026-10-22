"""User account request/response shapes."""

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.base import CamelModel

Role = Literal["admin", "operator", "reviewer", "analyst", "customer"]


class Me(CamelModel):
    id: int
    email: str
    role: Role
    customer_id: str | None = None
    permissions: list[str]


class UserRead(CamelModel):
    id: int
    email: str
    role: Role
    customer_id: str | None = None
    is_active: bool
    created_at: datetime | None = None


class UserCreate(CamelModel):
    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+$")
    password: str = Field(min_length=10, max_length=128)
    role: Role
    customer_id: str | None = Field(default=None, max_length=64)  # required for role "customer", forbidden otherwise


class UserUpdate(CamelModel):
    role: Role | None = None
    customer_id: str | None = Field(default=None, max_length=64)
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=10, max_length=128)
