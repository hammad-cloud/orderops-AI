"""Signed bearer tokens (HMAC-SHA256 over a JSON payload) and the auth dependency."""

import base64
import hashlib
import hmac
import json
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

TOKEN_TTL_SECONDS = 12 * 3600


def _sign(payload: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_token(email: str) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({"sub": email, "exp": int(time.time()) + TOKEN_TTL_SECONDS}).encode()).decode()
    return f"{payload}.{_sign(payload)}"


def verify_token(token: str) -> str | None:
    """Return the email the token was issued to, or None if forged or expired."""
    payload, _, signature = token.partition(".")
    if not hmac.compare_digest(_sign(payload), signature):
        return None
    try:
        data = json.loads(base64.urlsafe_b64decode(payload))
    except ValueError:
        return None
    return data["sub"] if data.get("exp", 0) > time.time() else None


def check_credentials(email: str, password: str) -> bool:
    if not settings.ADMIN_PASSWORD:
        return False
    # compare both fields every time so timing doesn't reveal which one was wrong
    email_ok = hmac.compare_digest(email.lower().encode(), settings.ADMIN_EMAIL.lower().encode())
    password_ok = hmac.compare_digest(password.encode(), settings.ADMIN_PASSWORD.encode())
    return email_ok and password_ok


async def require_user(creds: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False))) -> str:
    email = verify_token(creds.credentials) if creds else None
    if email is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in", headers={"WWW-Authenticate": "Bearer"})
    return email
