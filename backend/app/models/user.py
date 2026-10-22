"""Dashboard user — staff role or customer login."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)  # stored lowercase
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16))  # see app.core.permissions.ROLE_PERMISSIONS
    customer_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)  # set only for role "customer"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    token_version: Mapped[int] = mapped_column(Integer, default=0)  # bumped on logout/password change to revoke tokens
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
