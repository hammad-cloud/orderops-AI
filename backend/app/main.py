from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import AsyncSessionLocal, engine
from app.models import InventoryItem
from app.models.base import Base
from app.services.seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    # the default key is public in this repo, so tokens signed with it could be forged by anyone
    if settings.SECRET_KEY == "change-me-in-production" or len(settings.SECRET_KEY) < 32:
        raise RuntimeError("Set SECRET_KEY in backend/.env to a random value of 32+ characters")
    # shortcut: create_all can't alter existing tables; add Alembic migrations before the schema changes in production
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        if await db.scalar(select(InventoryItem).limit(1)) is None:
            await seed(db)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.PROJECT_NAME}
