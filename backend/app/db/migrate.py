"""Bring the database schema up to date with Alembic (runs on API startup)."""

import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncEngine

ALEMBIC_INI = Path(__file__).resolve().parents[2] / "alembic.ini"


def _upgrade(url: str, stamp: str | None) -> None:
    cfg = Config(str(ALEMBIC_INI))
    cfg.attributes["url"] = url
    if stamp:
        command.stamp(cfg, stamp)
    command.upgrade(cfg, "head")


async def migrate(engine: AsyncEngine) -> None:
    async with engine.connect() as conn:
        tables = set(await conn.run_sync(lambda c: inspect(c).get_table_names()))
    # databases built by the old create_all startup have tables but no Alembic history:
    # record which revision they already match instead of re-creating their tables
    stamp = None
    if "orders" in tables and "alembic_version" not in tables:
        stamp = "0002" if "users" in tables else "0001"
    # env.py runs its own event loop, so it needs a thread without one
    await asyncio.to_thread(_upgrade, engine.url.render_as_string(hide_password=False), stamp)
