"""Fixed demo data. Orders go through the real triage graph, so every status is a genuine outcome."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.orders import intake_order
from app.models import Customer, InventoryItem, Negotiation, Order
from app.schemas.order import OrderCreate
from app.services.negotiation.offer_engine import apply_decision

PRODUCTS = [
    # sku, name, category, price, qty, warehouse
    ("SKU-1001", "Wireless Earbuds Pro", "audio", 129.0, 0, "WH-EAST"),
    ("SKU-1009", "Wireless Earbuds Lite", "audio", 89.0, 60, "WH-EAST"),
    ("SKU-1002", "USB-C Hub 7-in-1", "accessories", 59.0, 140, "WH-WEST"),
    ("SKU-1010", "USB-C Hub 5-in-1", "accessories", 45.0, 8, "WH-WEST"),
    ("SKU-1003", "Ceramic Pour-Over Set", "kitchen", 42.0, 35, "WH-CENTRAL"),
    ("SKU-1007", "Insulated Water Bottle", "kitchen", 28.0, 220, "WH-CENTRAL"),
    ("SKU-1004", "Trail Running Shoes", "footwear", 135.0, 0, "WH-WEST"),
    ("SKU-1005", "Organic Cotton Tee", "apparel", 24.0, 300, "WH-CENTRAL"),
    ("SKU-1006", "Smart LED Desk Lamp", "lighting", 79.0, 6, "WH-EAST"),
    ("SKU-1008", "Mechanical Keyboard", "peripherals", 149.0, 0, "WH-WEST"),
    ("SKU-1011", "Low-Profile Keyboard", "peripherals", 119.0, 25, "WH-WEST"),
]

CUSTOMERS = [
    ("CUS-1001", "ava@example.com", None),
    ("CUS-1002", "liam@example.com", "+15550102"),
    ("CUS-1003", "noah@example.com", None),
    ("CUS-1004", "mia@example.com", None),
    ("CUS-1005", "zoe@example.com", None),
    ("CUS-1006", None, "+15550106"),
    ("CUS-1007", "eli@example.com", None),
]

# id, customer, [(sku, qty)], days ago, customer decision on any offer
ORDERS = [
    ("ORD-2401", "CUS-1001", [("SKU-1002", 1), ("SKU-1005", 2)], 6, None),
    ("ORD-2402", "CUS-1002", [("SKU-1003", 1)], 6, None),
    ("ORD-2403", "CUS-1001", [("SKU-1001", 1)], 5, "accepted"),
    ("ORD-2404", "CUS-1003", [("SKU-1008", 1)], 5, "declined"),
    ("ORD-2405", "CUS-1004", [("SKU-1004", 1)], 4, None),
    ("ORD-2406", "CUS-1005", [("SKU-1008", 8)], 4, None),
    ("ORD-2407", "CUS-1002", [("SKU-1006", 1), ("SKU-1007", 2)], 3, None),
    ("ORD-2408", "CUS-1006", [("SKU-1002", 10)], 3, None),
    ("ORD-2409", "CUS-1003", [("SKU-1001", 2)], 2, None),
    ("ORD-2410", "CUS-1007", [("SKU-1011", 9)], 1, None),
    ("ORD-2411", "CUS-1001", [("SKU-1005", 3), ("SKU-1007", 1)], 0, None),
    ("ORD-2412", "CUS-1006", [("SKU-1001", 1)], 0, None),
]


async def seed(db: AsyncSession) -> None:
    db.add_all(InventoryItem(sku=s, name=n, category=c, price=p, quantity_available=q, warehouse_id=w) for s, n, c, p, q, w in PRODUCTS)
    db.add_all(Customer(id=i, email=e, phone=ph) for i, e, ph in CUSTOMERS)
    await db.commit()

    now = datetime.now(UTC)
    for order_id, customer_id, lines, days_ago, decision in ORDERS:
        payload = OrderCreate(id=order_id, customer_id=customer_id, items=[{"sku": s, "quantity": q} for s, q in lines])
        await intake_order(payload, db)
        order = await db.get(Order, order_id)
        order.created_at = order.updated_at = now - timedelta(days=days_ago, hours=len(lines))
        offer = await db.scalar(select(Negotiation).where(Negotiation.order_id == order_id))
        if offer:
            offer.created_at = order.created_at
            if decision:
                await apply_decision(db, offer, order, decision)
        await db.commit()
