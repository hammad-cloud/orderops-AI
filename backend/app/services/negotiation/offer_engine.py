"""Build alternative offers for out-of-stock items and apply the customer's decision."""

import logging
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer, InventoryItem, Negotiation, Order
from app.services.inventory.validator import first_shortage, load_stock, reserve

log = logging.getLogger(__name__)

DISCOUNT_PERCENT = 10.0


async def create_offer(db: AsyncSession, order: Order, original: InventoryItem, alternative: InventoryItem) -> Negotiation:
    customer = await db.get(Customer, order.customer_id)
    channel = "sms" if customer and customer.phone and not customer.email else "email"
    offer = Negotiation(
        id=f"NEG-{uuid4().hex[:8].upper()}",
        order_id=order.id,
        original_sku=original.sku,
        original_name=original.name,
        alternative_sku=alternative.sku,
        alternative_name=alternative.name,
        discount_percent=DISCOUNT_PERCENT,
        channel=channel,
        status="sent",
    )
    db.add(offer)
    # shortcut: offers are logged, not delivered; add an email/SMS provider client here when one is chosen
    log.info("Offer %s for %s sent via %s", offer.id, order.id, channel)
    return offer


async def apply_decision(db: AsyncSession, offer: Negotiation, order: Order, decision: str) -> None:
    """Accepted → swap the item, apply the discount and fulfill. Declined (or swap sold out) → refund."""
    offer.customer_decision = decision
    offer.status = decision
    if decision == "accepted":
        stock = await load_stock(db, list({i["sku"] for i in order.items} | {offer.alternative_sku}))
        alt = stock[offer.alternative_sku]
        items = [
            {**i, "sku": alt.sku, "name": alt.name, "price": round(alt.price * (1 - offer.discount_percent / 100), 2)}
            if i["sku"] == offer.original_sku
            else i
            for i in order.items
        ]
        if first_shortage(items, stock) is None:
            reserve(items, stock)
            order.items = items
            order.total = round(sum(i["price"] * i["quantity"] for i in items), 2)
            order.status = "fulfillment"
            return
        order.notes = "Alternative sold out before the customer accepted"
    order.status = "refunded"
