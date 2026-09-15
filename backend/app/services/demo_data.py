"""Demo seed data for local dashboard previews."""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

_STATUSES = [
    "received",
    "fraud_check",
    "audit",
    "inventory_check",
    "negotiating",
    "fulfillment",
    "refunded",
    "completed",
]
_RISK_LEVELS = ["low", "medium", "high"]
_CHANNELS = ["email", "sms"]
_DECISIONS = ["accepted", "declined", "pending"]
_NEG_STATUSES = ["pending", "sent", "accepted", "declined", "expired"]
_PRODUCTS = [
    ("SKU-1001", "Wireless Earbuds Pro"),
    ("SKU-1002", "USB-C Hub 7-in-1"),
    ("SKU-1003", "Ceramic Pour-Over Set"),
    ("SKU-1004", "Trail Running Shoes"),
    ("SKU-1005", "Organic Cotton Tee"),
    ("SKU-1006", "Smart LED Desk Lamp"),
    ("SKU-1007", "Insulated Water Bottle"),
    ("SKU-1008", "Mechanical Keyboard"),
]
_WAREHOUSES = ["WH-EAST", "WH-WEST", "WH-CENTRAL"]


def _iso(hours_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat()


def random_orders(count: int = 8) -> list[dict]:
    items: list[dict] = []
    for i in range(1, count + 1):
        risk = round(random.uniform(0.05, 0.98), 2)
        level = "high" if risk >= 0.75 else "medium" if risk >= 0.4 else "low"
        items.append(
            {
                "id": f"ORD-{2400 + i}",
                "customerId": f"CUS-{random.randint(1000, 9999)}",
                "status": random.choice(_STATUSES),
                "riskScore": risk,
                "riskLevel": level,
                "createdAt": _iso(random.randint(1, 72)),
                "total": round(random.uniform(29.99, 489.0), 2),
                "itemCount": random.randint(1, 5),
            }
        )
    return items


def random_negotiations(count: int = 6) -> list[dict]:
    items: list[dict] = []
    for i in range(1, count + 1):
        original, alt = random.sample(_PRODUCTS, 2)
        decision = random.choice(_DECISIONS)
        items.append(
            {
                "id": f"NEG-{900 + i}",
                "orderId": f"ORD-{2400 + random.randint(1, 8)}",
                "originalSku": original[0],
                "originalName": original[1],
                "alternativeSku": alt[0],
                "alternativeName": alt[1],
                "discountPercent": random.choice([5, 10, 12, 15, 20]),
                "channel": random.choice(_CHANNELS),
                "status": random.choice(_NEG_STATUSES),
                "customerDecision": decision,
                "createdAt": _iso(random.randint(1, 48)),
            }
        )
    return items


def random_inventory(count: int = 8) -> list[dict]:
    items: list[dict] = []
    for sku, name in _PRODUCTS[:count]:
        qty = random.randint(0, 240)
        items.append(
            {
                "sku": sku,
                "name": name,
                "quantityAvailable": qty,
                "warehouseId": random.choice(_WAREHOUSES),
                "status": "out_of_stock" if qty == 0 else "low" if qty < 20 else "in_stock",
            }
        )
    return items


def random_audit_queue(count: int = 5) -> list[dict]:
    reasons = [
        "High fraud risk score",
        "Billing address mismatch",
        "Velocity check failed",
        "New customer + high AOV",
        "Payment gateway soft decline",
    ]
    items: list[dict] = []
    for i in range(1, count + 1):
        items.append(
            {
                "id": f"AUD-{500 + i}",
                "orderId": f"ORD-{2500 + i}",
                "customerId": f"CUS-{random.randint(1000, 9999)}",
                "riskScore": round(random.uniform(0.76, 0.99), 2),
                "riskLevel": "high",
                "reason": random.choice(reasons),
                "status": random.choice(["queued", "in_review", "escalated"]),
                "createdAt": _iso(random.randint(1, 36)),
            }
        )
    return items


def random_analytics() -> dict:
    recovered = random.randint(12, 48)
    attempted = recovered + random.randint(4, 20)
    return {
        "revenueRecoveryRate": round((recovered / attempted) * 100, 1),
        "recoveredOrders": recovered,
        "attemptedNegotiations": attempted,
        "avgProcessingMinutes": round(random.uniform(2.5, 18.0), 1),
        "systemUptimePercent": round(random.uniform(98.5, 99.99), 2),
        "ordersToday": random.randint(40, 180),
        "oosRatePercent": round(random.uniform(3.0, 14.0), 1),
        "refundsPrevented": random.randint(8, 35),
        "recoveredRevenue": round(random.uniform(4200, 28500), 2),
    }
