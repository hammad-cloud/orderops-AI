"""Break-glass access: create an admin, or turn an existing account into an active admin with a new password.

    cd backend && .venv/Scripts/python -m scripts.set_admin_password admin@example.com
    docker compose exec backend python -m scripts.set_admin_password admin@example.com

Prompts for the password (10+ characters). Existing sessions of that account are signed out.
"""

import asyncio
import getpass
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal, engine
from app.models import User


async def main(email: str, password: str) -> None:
    async with AsyncSessionLocal() as db:
        user = await db.scalar(select(User).where(User.email == email))
        if user is None:
            db.add(User(email=email, password_hash=hash_password(password), role="admin"))
            action = "Created"
        else:
            user.password_hash, user.role, user.customer_id, user.is_active = hash_password(password), "admin", None, True
            user.token_version += 1
            action = "Reset"
        await db.commit()
    await engine.dispose()
    print(f"{action} admin {email}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    password = getpass.getpass("New password: ")
    if len(password) < 10 or password != getpass.getpass("Repeat: "):
        sys.exit("Passwords must match and be at least 10 characters.")
    asyncio.run(main(sys.argv[1].lower(), password))
