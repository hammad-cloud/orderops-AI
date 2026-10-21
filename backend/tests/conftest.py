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
