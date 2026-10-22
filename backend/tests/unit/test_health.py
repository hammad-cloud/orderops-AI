"""Smoke tests: app boots, health is public, the API requires a valid token."""

import base64
import json
import time

from fastapi.testclient import TestClient

from app.core.security import _sign


def test_health(client: TestClient) -> None:
    res = client.get("/health", headers={"Authorization": ""})
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_api_requires_login(client: TestClient) -> None:
    assert client.get("/api/v1/orders", headers={"Authorization": ""}).status_code == 401
    tampered = client.headers["Authorization"].rsplit(".", 1)[0] + ".deadbeef"
    assert client.get("/api/v1/orders", headers={"Authorization": tampered}).status_code == 401
    # validly signed but in the old email-based format
    payload = base64.urlsafe_b64encode(json.dumps({"sub": "admin@orderops.local", "exp": time.time() + 60}).encode()).decode()
    assert client.get("/api/v1/orders", headers={"Authorization": f"Bearer {payload}.{_sign(payload)}"}).status_code == 401


def test_wrong_password_rejected(client: TestClient) -> None:
    res = client.post("/api/v1/auth/login", json={"email": "admin@orderops.local", "password": "nope"})
    assert res.status_code == 401


def test_repeated_failures_lock_the_account(client: TestClient) -> None:
    body = {"email": "guesser@example.com", "password": "wrong"}
    codes = [client.post("/api/v1/auth/login", json=body).status_code for _ in range(6)]
    assert codes == [401] * 5 + [429]
