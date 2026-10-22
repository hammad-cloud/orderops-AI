"""Roles are enforced by the API itself, and a customer login never reaches another customer's data."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import sign_in

ORDER = {"customerId": "CUS-1001", "items": [{"sku": "SKU-1005", "quantity": 1}]}

# method, path, body, roles allowed (anyone else gets 403)
MATRIX = [
    ("GET", "/api/v1/orders", None, {"admin", "operator", "reviewer", "analyst", "customer"}),
    ("POST", "/api/v1/orders/intake", ORDER, {"admin", "operator", "customer"}),
    ("GET", "/api/v1/inventory", None, {"admin", "operator", "reviewer", "analyst", "customer"}),
    ("GET", "/api/v1/negotiations", None, {"admin", "operator", "reviewer", "analyst", "customer"}),
    ("GET", "/api/v1/audit/queue", None, {"admin", "operator", "reviewer", "analyst"}),
    ("GET", "/api/v1/analytics", None, {"admin", "operator", "reviewer", "analyst"}),
    ("GET", "/api/v1/users", None, {"admin"}),
]


@pytest.mark.parametrize(("method", "path", "body", "allowed"), MATRIX, ids=[f"{m} {p}" for m, p, _, _ in MATRIX])
def test_permission_matrix(client: TestClient, as_role: dict, method: str, path: str, body: dict | None, allowed: set) -> None:
    for role, headers in as_role.items():
        code = client.request(method, path, json=body, headers=headers).status_code
        assert (code < 400) == (role in allowed), f"{role} got {code}"
        if role not in allowed:
            assert code == 403


def test_write_actions_need_their_own_permission(client: TestClient, as_role: dict) -> None:
    for role in ("reviewer", "analyst"):
        res = client.post("/api/v1/negotiations/NEG-NOPE/respond", json={"decision": "accepted"}, headers=as_role[role])
        assert res.status_code == 403
    for role in ("operator", "analyst", "customer"):
        assert client.post("/api/v1/audit/ORD-2406/decision", json={"decision": "approve"}, headers=as_role[role]).status_code == 403


def test_customer_sees_only_own_orders(client: TestClient, as_role: dict) -> None:
    mine = client.get("/api/v1/orders", headers=as_role["customer"]).json()
    assert mine and {o["customerId"] for o in mine} == {"CUS-1001"}
    assert all(o["riskScore"] is None and o["notes"] is None for o in mine)  # fraud data is staff-only

    # searching for someone else's order finds nothing, and opening it directly is a 404
    assert client.get("/api/v1/orders", params={"q": "ORD-2402"}, headers=as_role["customer"]).json() == []
    assert client.get("/api/v1/orders/ORD-2402", headers=as_role["customer"]).status_code == 404
    assert client.get("/api/v1/orders/ORD-2401", headers=as_role["customer"]).status_code == 200


def test_customer_cannot_order_for_someone_else(client: TestClient, as_role: dict) -> None:
    body = {**ORDER, "customerId": "CUS-1002"}
    assert client.post("/api/v1/orders/intake", json=body, headers=as_role["customer"]).status_code == 403
    res = client.post("/api/v1/orders/intake", json=ORDER, headers=as_role["customer"])
    assert res.status_code == 201
    assert res.json()["riskScore"] is None


def test_customer_negotiations_are_scoped(client: TestClient, as_role: dict) -> None:
    every = client.get("/api/v1/negotiations").json()
    mine = client.get("/api/v1/negotiations", headers=as_role["customer"]).json()
    own_orders = {o["id"] for o in client.get("/api/v1/orders", headers=as_role["customer"]).json()}
    assert {n["orderId"] for n in mine} <= own_orders
    assert len(mine) < len(every)

    # someone else's pending offer (ORD-2409 belongs to CUS-1003) can't be answered
    other = next(n for n in every if n["orderId"] == "ORD-2409")
    res = client.post(f"/api/v1/negotiations/{other['id']}/respond", json={"decision": "declined"}, headers=as_role["customer"])
    assert res.status_code == 404


def test_logout_revokes_the_token(client: TestClient) -> None:
    client.post("/api/v1/users", json={"email": "leaver@example.com", "password": "role-password-1", "role": "analyst"})
    headers = sign_in(client, "leaver@example.com")
    assert client.get("/api/v1/auth/me", headers=headers).json()["role"] == "analyst"
    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/v1/orders", headers=headers).status_code == 401


def test_deactivated_and_demoted_users_lose_access_immediately(client: TestClient) -> None:
    user = client.post("/api/v1/users", json={"email": "temp@example.com", "password": "role-password-1", "role": "operator"}).json()
    headers = sign_in(client, "temp@example.com")
    assert client.get("/api/v1/analytics", headers=headers).status_code == 200

    client.patch(f"/api/v1/users/{user['id']}", json={"role": "customer", "customerId": "CUS-1002"})
    assert client.get("/api/v1/analytics", headers=headers).status_code == 403  # same token, new role

    client.patch(f"/api/v1/users/{user['id']}", json={"isActive": False})
    assert client.get("/api/v1/orders", headers=headers).status_code == 401
    login = {"email": "temp@example.com", "password": "role-password-1"}
    assert client.post("/api/v1/auth/login", json=login, headers={"Authorization": ""}).status_code == 401


def test_user_management_rules(client: TestClient) -> None:
    def create(email: str, role: str, customer_id: str | None = None, password: str = "role-password-1") -> int:
        body = {"email": email, "password": password, "role": role, "customerId": customer_id}
        return client.post("/api/v1/users", json=body).status_code

    assert create("c1@example.com", "customer") == 422  # customer login without a customer
    assert create("c2@example.com", "customer", "CUS-NOPE") == 422  # unknown customer
    assert create("s1@example.com", "analyst", "CUS-1001") == 422  # staff tied to a customer
    assert create("s2@example.com", "analyst", password="short") == 422
    assert create("ADMIN@orderops.local", "analyst") == 409  # email taken, case-insensitively

    me = client.get("/api/v1/auth/me").json()
    assert client.patch(f"/api/v1/users/{me['id']}", json={"role": "analyst"}).status_code == 409
    assert client.patch(f"/api/v1/users/{me['id']}", json={"isActive": False}).status_code == 409


def test_reviewer_decides_audited_orders(client: TestClient, as_role: dict) -> None:
    def audited(customer_id: str) -> str:  # high value from a first-time customer
        res = client.post("/api/v1/orders/intake", json={"customerId": customer_id, "items": [{"sku": "SKU-1011", "quantity": 9}]})
        assert res.json()["status"] == "audit"
        return res.json()["id"]

    approve, reject = audited("CUS-RISKY-1"), audited("CUS-RISKY-2")
    res = client.post(f"/api/v1/audit/{approve}/decision", json={"decision": "approve"}, headers=as_role["reviewer"])
    assert res.status_code == 200
    assert res.json()["status"] == "fulfillment"
    assert res.json()["notes"].startswith("Approved in review by reviewer@example.com")

    res = client.post(f"/api/v1/audit/{reject}/decision", json={"decision": "reject"}, headers=as_role["reviewer"])
    assert res.json()["status"] == "refunded"
    assert client.post(f"/api/v1/audit/{reject}/decision", json={"decision": "approve"}, headers=as_role["reviewer"]).status_code == 409
