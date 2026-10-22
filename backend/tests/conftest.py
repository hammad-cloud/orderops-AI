"""Point the app at a throwaway `orderops_test` database, wiped and re-seeded once per test run."""

import asyncio

import asyncpg
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings

# must run before app.db.session is imported, because the engine is built from this URL
_server = settings.DATABASE_URL.rpartition("/")[0]
settings.DATABASE_URL = f"{_server}/orderops_test"
settings.ADMIN_PASSWORD = "test-password"
settings.SECRET_KEY = "test-secret-key-that-is-at-least-32-chars"


async def _reset_db() -> None:
    dsn = _server.replace("+asyncpg", "")
    conn = await asyncpg.connect(f"{dsn}/postgres")
    if not await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = 'orderops_test'"):
        await conn.execute("CREATE DATABASE orderops_test")
    await conn.close()
    conn = await asyncpg.connect(f"{dsn}/orderops_test")
    await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public")
    await conn.close()


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Signed-in client. One instance for the whole run: the async engine is bound to its event loop."""
    asyncio.run(_reset_db())
    from app.main import app

    with TestClient(app) as c:
        res = c.post("/api/v1/auth/login", json={"email": settings.ADMIN_EMAIL, "password": "test-password"})
        c.headers["Authorization"] = f"Bearer {res.json()['token']}"
        yield c


def sign_in(client: TestClient, email: str, password: str = "role-password-1") -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password}, headers={"Authorization": ""})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['token']}"}


@pytest.fixture(scope="session")
def as_role(client: TestClient) -> dict[str, dict[str, str]]:
    """Auth headers for one user per role; the customer login belongs to CUS-1001."""
    headers = {"admin": dict(client.headers)}
    for role in ("operator", "reviewer", "analyst", "customer"):
        body = {"email": f"{role}@example.com", "password": "role-password-1", "role": role}
        if role == "customer":
            body["customerId"] = "CUS-1001"
        assert client.post("/api/v1/users", json=body).status_code == 201
        headers[role] = sign_in(client, body["email"])
    return headers
