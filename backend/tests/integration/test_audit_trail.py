"""The audit trail records who did what to which order, can't be changed, and never holds secrets."""

import asyncio
import json

import asyncpg
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from tests.conftest import sign_in

TRAIL = "/api/v1/audit-trail"


def events(client: TestClient, **params) -> list[dict]:
    return client.get(TRAIL, params=params).json()


def latest(client: TestClient, **params) -> dict:
    found = events(client, limit=1, **params)
    assert found, f"no audit entry for {params}"
    return found[0]


async def _sql(*statements: str) -> list:
    conn = await asyncpg.connect(settings.DATABASE_URL.replace("+asyncpg", ""))
    try:
        return [await conn.fetch(s) for s in statements]
    finally:
        await conn.close()


def test_order_creation_records_actor_order_and_result(client: TestClient, as_role: dict) -> None:
    body = {"id": "ORD-TRAIL-1", "customerId": "CUS-1001", "items": [{"sku": "SKU-1005", "quantity": 1}]}
    assert client.post("/api/v1/orders/intake", json=body, headers=as_role["operator"]).status_code == 201

    event = latest(client, orderId="ORD-TRAIL-1", action="order.created")
    assert event["actorEmail"] == "operator@example.com"
    assert event["actorRole"] == "operator"
    assert event["outcome"] == "success"
    assert event["changes"]["after"]["status"] == "fulfillment"
    assert event["changes"]["after"]["items"] == [{"sku": "SKU-1005", "quantity": 1, "price": 24.0}]

    # the retry is part of the order's history too, and changes nothing
    assert client.post("/api/v1/orders/intake", json=body, headers=as_role["operator"]).status_code == 409
    assert latest(client, orderId="ORD-TRAIL-1")["outcome"] == "duplicate"


def test_decisions_record_before_and_after(client: TestClient, as_role: dict) -> None:
    # SKU-1001 is out of stock with an in-stock alternative, so this order gets an offer
    order = client.post("/api/v1/orders/intake", json={"customerId": "CUS-1002", "items": [{"sku": "SKU-1001", "quantity": 1}]}).json()
    offer = client.get(f"/api/v1/orders/{order['id']}").json()["negotiations"][0]
    client.post(f"/api/v1/negotiations/{offer['id']}/respond", json={"decision": "declined"}, headers=as_role["operator"])
    event = latest(client, orderId=order["id"], action="negotiation.")
    assert event["action"] == "negotiation.declined"
    assert event["changes"]["before"]["status"] == "negotiating"
    assert event["changes"]["after"]["status"] == "refunded"

    risky = client.post("/api/v1/orders/intake", json={"customerId": "CUS-TRAIL", "items": [{"sku": "SKU-1011", "quantity": 9}]}).json()
    client.post(f"/api/v1/audit/{risky['id']}/decision", json={"decision": "reject"}, headers=as_role["reviewer"])
    event = latest(client, orderId=risky["id"], action="fraud_review.")
    assert (event["action"], event["actorEmail"]) == ("fraud_review.rejected", "reviewer@example.com")
    assert (event["changes"]["before"]["status"], event["changes"]["after"]["status"]) == ("audit", "refunded")


def test_denials_and_failed_logins_are_recorded(client: TestClient, as_role: dict) -> None:
    client.get("/api/v1/analytics", headers=as_role["customer"])
    event = latest(client, action="access.denied")
    assert event["actorEmail"] == "customer@example.com"
    assert event["changes"] == {"permission": "analytics:read", "method": "GET", "path": "/api/v1/analytics"}

    client.get("/api/v1/orders/ORD-2402", headers=as_role["customer"])  # CUS-1002's order
    assert latest(client, orderId="ORD-2402")["outcome"] == "denied"

    client.post("/api/v1/auth/login", json={"email": "Nobody@Example.com", "password": "hunter2-secret"}, headers={"Authorization": ""})
    event = latest(client, action="auth.login", outcome="failed")
    assert event["actorEmail"] == "nobody@example.com"
    assert "hunter2-secret" not in json.dumps(event)


def test_user_changes_never_store_passwords(client: TestClient) -> None:
    user = client.post("/api/v1/users", json={"email": "trail@example.com", "password": "first-password-1", "role": "analyst"}).json()
    client.patch(f"/api/v1/users/{user['id']}", json={"role": "reviewer", "password": "second-password-2"})

    event = latest(client, action="user.updated")
    assert event["targetId"] == str(user["id"])
    assert (event["changes"]["before"]["role"], event["changes"]["after"]["role"]) == ("analyst", "reviewer")
    assert event["changes"]["after"]["password"] == "[REDACTED]"  # shows that it changed, not what to
    dumped = json.dumps(events(client, limit=500))
    assert "first-password-1" not in dumped and "second-password-2" not in dumped and "scrypt$" not in dumped


def test_only_admins_read_it_and_nobody_can_write_it(client: TestClient, as_role: dict) -> None:
    for role in ("operator", "reviewer", "analyst", "customer"):
        assert client.get(TRAIL, headers=as_role[role]).status_code == 403
    entry = latest(client)
    for method in ("POST", "PUT", "PATCH", "DELETE"):
        assert client.request(method, f"{TRAIL}/{entry['id']}").status_code in (404, 405)
        assert client.request(method, TRAIL).status_code == 405


def test_database_rejects_changes_to_entries(client: TestClient) -> None:
    latest(client)  # make sure there is a row to target
    for statement in ("UPDATE audit_events SET outcome = 'success'", "DELETE FROM audit_events", "TRUNCATE audit_events"):
        with pytest.raises(asyncpg.RaiseError, match="append-only"):
            asyncio.run(_sql(statement))


def test_hash_chain_detects_tampering(client: TestClient) -> None:
    assert client.get(f"{TRAIL}/verify").json()["ok"] is True

    target = latest(client)["id"] - 1
    original = asyncio.run(_sql(f"SELECT outcome FROM audit_events WHERE id = {target}"))[0][0]["outcome"]
    # someone with database superuser rights switches the trigger off and rewrites history
    asyncio.run(_sql(
        "ALTER TABLE audit_events DISABLE TRIGGER audit_events_no_update_delete",
        f"UPDATE audit_events SET outcome = 'forged' WHERE id = {target}",
    ))
    try:
        result = client.get(f"{TRAIL}/verify").json()
        assert result["ok"] is False
        assert result["brokenAt"] == target
    finally:
        asyncio.run(_sql(
            f"UPDATE audit_events SET outcome = '{original}' WHERE id = {target}",
            "ALTER TABLE audit_events ENABLE TRIGGER audit_events_no_update_delete",
        ))
    assert client.get(f"{TRAIL}/verify").json()["ok"] is True


def test_sign_in_and_out_are_recorded(client: TestClient) -> None:
    client.post("/api/v1/users", json={"email": "inout@example.com", "password": "role-password-1", "role": "analyst"})
    headers = sign_in(client, "inout@example.com")
    client.post("/api/v1/auth/logout", headers=headers)
    actions = [e["action"] for e in events(client, actor="inout@example.com", limit=2)]
    assert actions == ["auth.logout", "auth.login"]
