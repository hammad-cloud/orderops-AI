"""Migrations build the same schema as the models, and upgrade databases made by the old create_all startup."""

import asyncio

import asyncpg
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.db.migrate import ALEMBIC_INI, migrate
from app.models.base import Base

SERVER = settings.DATABASE_URL.rpartition("/")[0]
URL = f"{SERVER}/orderops_migrate_test"
HEAD = ScriptDirectory.from_config(Config(str(ALEMBIC_INI))).get_current_head()


async def _fresh_db() -> None:
    conn = await asyncpg.connect(SERVER.replace("+asyncpg", "") + "/postgres")
    await conn.execute("DROP DATABASE IF EXISTS orderops_migrate_test")
    await conn.execute("CREATE DATABASE orderops_migrate_test")
    await conn.close()


async def _run(legacy_tables: list[str] | None) -> tuple[str, set[str]]:
    """Optionally pre-create tables like create_all did, migrate, return (revision, tables)."""
    await _fresh_db()
    engine = create_async_engine(URL)
    if legacy_tables:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=[Base.metadata.tables[t] for t in legacy_tables])
    await migrate(engine)
    async with engine.connect() as conn:
        version = await conn.scalar(text("SELECT version_num FROM alembic_version"))
        tables = set((await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))).scalars())
    await engine.dispose()
    return version, tables


def test_fresh_database_matches_the_models() -> None:
    version, tables = asyncio.run(_run(None))
    assert version == HEAD
    assert {"customers", "inventory_items", "orders", "negotiations", "users", "audit_events"} <= tables
    cfg = Config(str(ALEMBIC_INI))
    cfg.attributes["url"] = URL
    command.check(cfg)  # raises if the models and the migrated schema differ


def test_pre_rbac_create_all_database_is_upgraded() -> None:
    version, tables = asyncio.run(_run(["customers", "inventory_items", "orders", "negotiations"]))
    assert version == HEAD
    assert {"users", "audit_events"} <= tables
