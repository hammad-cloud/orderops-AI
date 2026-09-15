"""High-risk order manual audit queue."""

from fastapi import APIRouter

from app.services.demo_data import random_audit_queue

router = APIRouter()


@router.get("/queue")
async def audit_queue() -> list[dict]:
    """Orders flagged by fraud risk score for human review."""
    return random_audit_queue()
