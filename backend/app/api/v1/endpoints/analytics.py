"""Success metrics / analytics endpoints."""

from fastapi import APIRouter

from app.services.demo_data import random_analytics

router = APIRouter()


@router.get("")
async def get_analytics() -> dict:
    """BRD success metrics with demo values."""
    return random_analytics()
