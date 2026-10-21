"""Smoke tests: app boots and core endpoints respond."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_list_orders() -> None:
    res = client.get("/api/v1/orders")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
