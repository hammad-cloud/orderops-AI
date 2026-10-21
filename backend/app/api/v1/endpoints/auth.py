"""Operator login."""

import time

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.security import check_credentials, create_token

router = APIRouter()

MAX_FAILURES = 5
LOCKOUT_SECONDS = 15 * 60
# shortcut: in-memory, per process; move to Redis/the DB if the API runs with several workers
_failures: dict[str, list[float]] = {}


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(body: LoginRequest) -> dict[str, str]:
    email, now = body.email.lower(), time.monotonic()
    recent = [t for t in _failures.get(email, []) if now - t < LOCKOUT_SECONDS]
    if len(recent) >= MAX_FAILURES:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many failed attempts. Try again in 15 minutes.")

    if not check_credentials(body.email, body.password):
        if len(_failures) > 10_000:  # bound memory against floods of made-up emails
            _failures.clear()
        _failures[email] = [*recent, now]
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")

    _failures.pop(email, None)
    return {"token": create_token(email)}
