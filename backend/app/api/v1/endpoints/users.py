"""User administration (admins only)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, require
from app.db.session import get_db
from app.models import Customer, User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.audit_trail.recorder import record

router = APIRouter()


async def _check_customer_link(db: AsyncSession, role: str, customer_id: str | None) -> None:
    if role == "customer":
        if not customer_id or await db.get(Customer, customer_id) is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Customer logins need an existing customer ID")
    elif customer_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Only customer logins have a customer ID")


def _account(user: User) -> dict:
    """Account fields worth auditing; never the password hash."""
    return {"email": user.email, "role": user.role, "customerId": user.customer_id, "isActive": user.is_active}


@router.get("", response_model=list[UserRead])
async def list_users(db: AsyncSession = Depends(get_db)):
    return (await db.scalars(select(User).order_by(User.created_at))).all()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db), me: User = Depends(require("users:manage"))):
    await _check_customer_link(db, body.role, body.customer_id)
    user = User(email=body.email.lower(), password_hash=hash_password(body.password), role=body.role, customer_id=body.customer_id)
    db.add(user)
    try:
        await db.flush()  # assigns the id for the audit entry; a taken email fails here
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, f"{user.email} already has an account") from None
    await record(db, actor=me, action="user.created", target_type="user", target_id=user.id,
                 changes={"after": _account(user)})
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(user_id: int, body: UserUpdate, db: AsyncSession = Depends(get_db), me: User = Depends(require("users:manage"))):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    if user.id == me.id and (changes.get("is_active") is False or changes.get("role", "admin") != "admin"):
        raise HTTPException(status.HTTP_409_CONFLICT, "You can't deactivate or demote your own account")

    before = _account(user)
    role = changes.get("role", user.role)
    customer_id = changes.get("customer_id", user.customer_id if role == "customer" else None)
    await _check_customer_link(db, role, customer_id)
    user.role, user.customer_id = role, customer_id
    if "is_active" in changes:
        user.is_active = changes["is_active"]
    if "password" in changes:
        user.password_hash = hash_password(changes["password"])
    if "password" in changes or changes.get("is_active") is False:
        user.token_version += 1  # sign them out everywhere
    after = _account(user)
    if "password" in changes:  # record that it changed; redact() blanks the value
        before["password"], after["password"] = "old", "new"
    await record(db, actor=me, action="user.updated", target_type="user", target_id=user.id,
                 changes={"before": before, "after": after})
    await db.commit()
    await db.refresh(user)
    return user
