"""Fraud / risk scoring service."""


class FraudService:
    async def score_order(self, order_id: str) -> float:
        """Return risk score 0.0–1.0. High risk triggers manual audit."""
        raise NotImplementedError
