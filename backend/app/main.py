from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text

from app.api.v1.router import api_router
from app.core import log_redaction
from app.core.config import settings
from app.core.security import hash_password
from app.db.migrate import migrate
from app.db.session import AsyncSessionLocal, engine
from app.models import InventoryItem, User
from app.services.idempotency.guard import AlreadyProcessed
from app.services.seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    # the default key is public in this repo, so tokens signed with it could be forged by anyone
    if settings.SECRET_KEY == "change-me-in-production" or len(settings.SECRET_KEY) < 32:
        raise RuntimeError("Set SECRET_KEY in backend/.env to a random value of 32+ characters")
    # schema changes go in a new migration: from backend/, `alembic revision --autogenerate -m "..."`
    await migrate(engine)
    async with AsyncSessionLocal() as db:
        if await db.scalar(select(InventoryItem).limit(1)) is None:
            await seed(db)
        # first start only: later admins and other users are managed in the dashboard (/users)
        if settings.ADMIN_PASSWORD and await db.scalar(select(User).limit(1)) is None:
            db.add(User(email=settings.ADMIN_EMAIL.lower(), password_hash=hash_password(settings.ADMIN_PASSWORD), role="admin"))
            await db.commit()
    yield


log_redaction.install()  # before anything logs: tokens, passwords and emails never reach the logs

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


@app.exception_handler(AlreadyProcessed)
async def already_processed(_: Request, exc: AlreadyProcessed) -> JSONResponse:
    """A repeated order submit: the client treats 409 on its own order id as "already created"."""
    return JSONResponse({"detail": f"Order {exc} already exists"}, status_code=409)


@app.get("/health")
async def health_check(response: Response) -> dict[str, str]:
    """Reports "degraded" with 503 when the database is unreachable, so monitors and the UI pill notice."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:  # any DB failure means the API can't serve data
        response.status_code = 503
        return {"status": "degraded", "service": settings.PROJECT_NAME, "database": "unreachable"}
    return {"status": "ok", "service": settings.PROJECT_NAME}
