"""API v1 router aggregation."""

from fastapi import APIRouter, Depends

from app.api.v1.endpoints import analytics, audit, auth, inventory, negotiations, orders
from app.core.security import require_user

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

protected = [Depends(require_user)]
api_router.include_router(orders.router, prefix="/orders", tags=["orders"], dependencies=protected)
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"], dependencies=protected)
api_router.include_router(negotiations.router, prefix="/negotiations", tags=["negotiations"], dependencies=protected)
api_router.include_router(audit.router, prefix="/audit", tags=["audit"], dependencies=protected)
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"], dependencies=protected)
