"""Build alternative offers with discount for OOS items."""


class NegotiationService:
    async def create_offer(
        self,
        order_id: str,
        original_sku: str,
        alternative_sku: str,
        discount_percent: float,
        channel: str,
    ) -> str:
        raise NotImplementedError

    async def apply_decision(self, negotiation_id: str, decision: str) -> None:
        raise NotImplementedError
