"""API v1 router aggregation. Each router needs a read permission; writes add their own `require(...)`."""

from fastapi import APIRouter, Depends

from app.api.v1.endpoints import analytics, audit, audit_trail, auth, inventory, negotiations, orders, users
from app.core.security import require

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])


def needs(permission: str) -> list:
    return [Depends(require(permission))]


api_router.include_router(orders.router, prefix="/orders", tags=["orders"], dependencies=needs("orders:read"))
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"], dependencies=needs("inventory:read"))
api_router.include_router(negotiations.router, prefix="/negotiations", tags=["negotiations"], dependencies=needs("negotiations:read"))
api_router.include_router(audit.router, prefix="/audit", tags=["audit"], dependencies=needs("audit:read"))
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"], dependencies=needs("analytics:read"))
api_router.include_router(users.router, prefix="/users", tags=["users"], dependencies=needs("users:manage"))
api_router.include_router(audit_trail.router, prefix="/audit-trail", tags=["audit trail"], dependencies=needs("audit_trail:read"))
