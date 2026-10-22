"""Drop and recreate a throwaway database on the configured server, then print its URL (used by the e2e tests).

    .venv/Scripts/python -m scripts.reset_test_db orderops_e2e
"""

import asyncio
import sys

import asyncpg

from app.core.config import settings


async def main(name: str) -> None:
    server = settings.DATABASE_URL.rpartition("/")[0]
    conn = await asyncpg.connect(server.replace("+asyncpg", "") + "/postgres")
    await conn.execute(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)')
    await conn.execute(f'CREATE DATABASE "{name}"')
    await conn.close()
    print(f"{server}/{name}")


if __name__ == "__main__":
    # never point this at real data
    if len(sys.argv) != 2 or not sys.argv[1].endswith(("_test", "_e2e")):
        sys.exit("Usage: reset_test_db <name ending in _test or _e2e>")
    asyncio.run(main(sys.argv[1]))
