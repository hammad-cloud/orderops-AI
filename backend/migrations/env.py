"""Alembic environment: async engine from app settings, target metadata from the ORM models."""

import asyncio

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

import app.models  # noqa: F401  registers every table on Base.metadata
from app.core.config import settings
from app.models.base import Base

target_metadata = Base.metadata
# app/db/migrate.py passes the URL of the engine it migrates; the alembic CLI falls back to backend/.env
URL = context.config.attributes.get("url", settings.DATABASE_URL)


def run_offline() -> None:
    """`alembic upgrade head --sql`: print the SQL instead of running it."""
    context.configure(url=URL, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def _run(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_online() -> None:
    engine = create_async_engine(URL)
    async with engine.connect() as connection:
        await connection.run_sync(_run)
    await engine.dispose()


if context.is_offline_mode():
    run_offline()
else:
    asyncio.run(run_online())
