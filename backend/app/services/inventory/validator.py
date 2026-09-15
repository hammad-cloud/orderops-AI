"""Live inventory validation against PostgreSQL."""


class InventoryService:
    async def is_available(self, sku: str, quantity: int = 1) -> bool:
        raise NotImplementedError

    async def suggest_alternative(self, sku: str, preferences: dict | None = None) -> str | None:
        raise NotImplementedError
