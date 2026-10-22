"""Password hashing, signed bearer tokens (HMAC-SHA256 over a JSON payload) and the auth/permission dependencies."""

import base64
import hashlib
import hmac
import json
import secrets
import time

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.permissions import ROLE_PERMISSIONS
from app.db.session import get_db
from app.models import User
from app.services.audit_trail.recorder import record_now

TOKEN_TTL_SECONDS = 12 * 3600
_SCRYPT = {"n": 2**14, "r": 8, "p": 1}


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    _, salt, digest = stored.split("$")
    return hmac.compare_digest(hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), **_SCRYPT).hex(), digest)


# checked when the email is unknown, so a miss takes as long as a wrong password
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


def password_matches(user: User | None, password: str) -> bool:
    ok = verify_password(password, user.password_hash if user else _DUMMY_HASH)
    return ok and user is not None and user.is_active


def _sign(payload: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_token(user: User) -> str:
    data = {"sub": user.id, "ver": user.token_version, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    payload = base64.urlsafe_b64encode(json.dumps(data).encode()).decode()
    return f"{payload}.{_sign(payload)}"


def verify_token(token: str) -> tuple[int, int] | None:
    """Return (user id, token version) for a genuine, unexpired token, else None."""
    payload, _, signature = token.partition(".")
    if not hmac.compare_digest(_sign(payload), signature):
        return None
    try:
        data = json.loads(base64.urlsafe_b64decode(payload))
    except ValueError:
        return None
    if not isinstance(data.get("sub"), int) or not isinstance(data.get("ver"), int):  # e.g. pre-RBAC tokens
        return None
    return (data["sub"], data["ver"]) if data.get("exp", 0) > time.time() else None


async def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Loaded fresh on every request, so deactivation, role changes and logout take effect immediately."""
    claims = verify_token(creds.credentials) if creds else None
    user = await db.get(User, claims[0]) if claims else None
    if user is None or not user.is_active or user.token_version != claims[1]:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in", headers={"WWW-Authenticate": "Bearer"})
    return user


def require(permission: str):
    """Dependency that returns the signed-in user, or 403 if their role lacks `permission`."""

    async def dependency(request: Request, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> User:
        if permission not in ROLE_PERMISSIONS.get(user.role, set()):
            await record_now(db, actor=user, action="access.denied", outcome="denied",
                             changes={"permission": permission, "method": request.method, "path": request.url.path})
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Your role doesn't allow this")
        return user

    return dependency


def can_see_customer(user: User, customer_id: str) -> bool:
    """Staff see every customer; a customer login sees only its own records."""
    return user.role != "customer" or customer_id == user.customer_id
