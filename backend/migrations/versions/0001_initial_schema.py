"""Initial schema: customers, inventory, orders, negotiations (what create_all built before roles existed).

Revision ID: 0001
Revises:
Create Date: 2026-10-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("preferences", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_customers_email"), "customers", ["email"])

    op.create_table(
        "inventory_items",
        sa.Column("sku", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("quantity_available", sa.Integer(), nullable=False),
        sa.Column("warehouse_id", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("sku"),
    )
    op.create_index(op.f("ix_inventory_items_category"), "inventory_items", ["category"])
    op.create_index(op.f("ix_inventory_items_warehouse_id"), "inventory_items", ["warehouse_id"])

    op.create_table(
        "negotiations",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("order_id", sa.String(length=64), nullable=False),
        sa.Column("original_sku", sa.String(length=64), nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=False),
        sa.Column("alternative_sku", sa.String(length=64), nullable=False),
        sa.Column("alternative_name", sa.String(length=255), nullable=False),
        sa.Column("discount_percent", sa.Float(), nullable=False),
        sa.Column("channel", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("customer_decision", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_negotiations_order_id"), "negotiations", ["order_id"])
    op.create_index(op.f("ix_negotiations_status"), "negotiations", ["status"])

    op.create_table(
        "orders",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("customer_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("items", sa.JSON(), nullable=False),
        sa.Column("total", sa.Float(), nullable=False),
        sa.Column("risk_score", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_orders_customer_id"), "orders", ["customer_id"])
    op.create_index(op.f("ix_orders_status"), "orders", ["status"])


def downgrade() -> None:
    op.drop_table("orders")
    op.drop_table("negotiations")
    op.drop_table("inventory_items")
    op.drop_table("customers")
