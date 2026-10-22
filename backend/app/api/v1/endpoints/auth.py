"""Login, logout and the signed-in user's profile."""

import time

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import ROLE_PERMISSIONS
from app.core.security import create_token, current_user, password_matches
from app.db.session import get_db
from app.models import User
from app.schemas.user import Me
from app.services.audit_trail.recorder import record, record_now

router = APIRouter()

MAX_FAILURES = 5
LOCKOUT_SECONDS = 15 * 60
# shortcut: in-memory, per process; move to Redis/the DB if the API runs with several workers
_failures: dict[str, list[float]] = {}


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    email, now = body.email.lower(), time.monotonic()
    recent = [t for t in _failures.get(email, []) if now - t < LOCKOUT_SECONDS]
    if len(recent) >= MAX_FAILURES:
        await record_now(db, actor=None, actor_email=email, action="auth.login", outcome="blocked")
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many failed attempts. Try again in 15 minutes.")

    user = await db.scalar(select(User).where(User.email == email))
    if not password_matches(user, body.password):
        if len(_failures) > 10_000:  # bound memory against floods of made-up emails
            _failures.clear()
        _failures[email] = [*recent, now]
        await record_now(db, actor=None, actor_email=email, action="auth.login", outcome="failed")  # never the password
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")

    _failures.pop(email, None)
    await record(db, actor=user, action="auth.login", target_type="user", target_id=user.id)
    await db.commit()
    return {"token": create_token(user)}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> None:
    """Revokes every token issued to this user so far, not just the one in this browser."""
    user.token_version += 1
    await record(db, actor=user, action="auth.logout", target_type="user", target_id=user.id)
    await db.commit()


@router.get("/me", response_model=Me)
async def me(user: User = Depends(current_user)):
    return Me(id=user.id, email=user.email, role=user.role, customer_id=user.customer_id,
              permissions=sorted(ROLE_PERMISSIONS[user.role]))
