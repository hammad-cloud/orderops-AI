"""End-to-end triage: seeded outcomes, intake, negotiation responses, analytics."""

from fastapi.testclient import TestClient


def stock(client: TestClient, sku: str) -> int:
    return client.get(f"/api/v1/inventory/check/{sku}").json()["quantity"]


def test_seeded_orders_took_every_path(client: TestClient) -> None:
    status = {o["id"]: o["status"] for o in client.get("/api/v1/orders").json()}
    assert status["ORD-2401"] == "fulfillment"  # in stock
    assert status["ORD-2405"] == "refunded"  # out of stock, no alternative
    assert status["ORD-2406"] == "audit"  # high risk
    assert status["ORD-2409"] == "negotiating"  # out of stock, offer pending
    assert status["ORD-2404"] == "refunded"  # customer declined the swap


def test_accepted_swap_replaced_item_with_discount(client: TestClient) -> None:
    order = client.get("/api/v1/orders/ORD-2403").json()
    assert order["status"] == "fulfillment"
    assert order["items"] == [{"sku": "SKU-1009", "name": "Wireless Earbuds Lite", "quantity": 1, "price": 80.1}]
    assert order["negotiations"][0]["customerDecision"] == "accepted"


def test_intake_in_stock_reserves_units(client: TestClient) -> None:
    before = stock(client, "SKU-1005")
    res = client.post("/api/v1/orders/intake", json={"customerId": "CUS-1001", "items": [{"sku": "SKU-1005", "quantity": 2}]})
    assert res.status_code == 201
    assert res.json()["status"] == "fulfillment"
    assert res.json()["total"] == 48.0
    assert stock(client, "SKU-1005") == before - 2


def test_intake_rejects_bad_input(client: TestClient) -> None:
    body = {"customerId": "CUS-1001", "items": [{"sku": "SKU-NOPE", "quantity": 1}]}
    assert client.post("/api/v1/orders/intake", json=body).status_code == 422
    body = {"id": "ORD-2401", "customerId": "CUS-1001", "items": [{"sku": "SKU-1005", "quantity": 1}]}
    assert client.post("/api/v1/orders/intake", json=body).status_code == 409
    body = {"customerId": "CUS-1001", "items": [{"sku": "SKU-1005", "quantity": 0}]}
    assert client.post("/api/v1/orders/intake", json=body).status_code == 422
    body = {"customerId": "CUS-1001", "items": [{"sku": "SKU-1005", "quantity": 1}, {"sku": "SKU-1005", "quantity": 1}]}
    assert client.post("/api/v1/orders/intake", json=body).status_code == 422


def test_high_value_new_customer_goes_to_audit(client: TestClient) -> None:
    res = client.post("/api/v1/orders/intake", json={"customerId": "CUS-NEW", "items": [{"sku": "SKU-1011", "quantity": 9}]})
    assert res.json()["status"] == "audit"
    assert res.json()["riskLevel"] == "high"
    assert any(a["orderId"] == res.json()["id"] for a in client.get("/api/v1/audit/queue").json())


def test_out_of_stock_negotiation_accept_and_no_double_answer(client: TestClient) -> None:
    order = client.post("/api/v1/orders/intake", json={"customerId": "CUS-1002", "items": [{"sku": "SKU-1001", "quantity": 1}]}).json()
    assert order["status"] == "negotiating"
    offer = client.get(f"/api/v1/orders/{order['id']}").json()["negotiations"][0]
    assert offer["alternativeSku"] == "SKU-1009"

    before = stock(client, "SKU-1009")
    res = client.post(f"/api/v1/negotiations/{offer['id']}/respond", json={"decision": "accepted"})
    assert res.status_code == 200
    assert client.get(f"/api/v1/orders/{order['id']}").json()["status"] == "fulfillment"
    assert stock(client, "SKU-1009") == before - 1
    assert client.post(f"/api/v1/negotiations/{offer['id']}/respond", json={"decision": "declined"}).status_code == 409


def test_search_and_filter(client: TestClient) -> None:
    assert [o["id"] for o in client.get("/api/v1/orders", params={"q": "2405"}).json()] == ["ORD-2405"]
    assert all(o["status"] == "audit" for o in client.get("/api/v1/orders", params={"status": "audit"}).json())


def test_analytics_match_the_data(client: TestClient) -> None:
    data = client.get("/api/v1/analytics").json()
    orders = client.get("/api/v1/orders").json()
    assert data["ordersTotal"] == len(orders)
    assert data["auditOrders"] == sum(o["status"] == "audit" for o in orders)
    assert sum(d["orders"] for d in data["daily"]) == len(orders)  # every order is within the last 7 days
    assert data["recoveredOrders"] >= 1
