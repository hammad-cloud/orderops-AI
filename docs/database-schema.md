# Database schema

PostgreSQL. The models are in `backend/app/models/`; the schema history is in `backend/migrations/versions/`. The API applies pending migrations on startup.

| Revision | Change |
|---|---|
| `0001` | customers, inventory_items, orders, negotiations |
| `0002` | users (login and roles) |
| `0003` | audit_events (append-only audit trail, with triggers) |

A database created before migrations existed (by the old `create_all` startup) is detected on first start, stamped at the revision it already matches, and then upgraded.

## Tables

### `orders`
| Column | Type | Notes |
|---|---|---|
| `id` | varchar(64) PK | `ORD-…`. Also the idempotency key for intake. |
| `customer_id` | varchar(64), indexed | Not a foreign key: an order may come from a customer with no `customers` row (a first-time customer). |
| `status` | varchar(32), indexed | `received`, `fraud_check`, `audit`, `inventory_check`, `negotiating`, `fulfillment`, `refunded`, `completed` |
| `items` | JSON | `[{sku, name, quantity, price}]`. Prices are copied at order time. |
| `total` | float | Sum of price × quantity, rounded to cents. |
| `risk_score` | float, nullable | 0.05–0.99 from the fraud check. Hidden from customer logins. |
| `notes` | text, nullable | Fraud reasons (`; `-separated) or workflow notes. Hidden from customer logins. |
| `created_at`, `updated_at` | timestamptz | |

### `negotiations`
| Column | Type | Notes |
|---|---|---|
| `id` | varchar(64) PK | `NEG-…` |
| `order_id` | varchar(64), indexed | The order this offer belongs to. Not a foreign key. |
| `original_sku`, `original_name` | | The out-of-stock item. |
| `alternative_sku`, `alternative_name` | | The offered replacement. |
| `discount_percent` | float | Currently always 10. |
| `channel` | varchar(16) | `email` or `sms`, from the customer's contact details. |
| `status` | varchar(32), indexed | `sent`, `accepted`, `declined` |
| `customer_decision` | varchar(32), nullable | Set once; a second answer gets 409. |
| `created_at` | timestamptz | |

### `inventory_items`
| Column | Type | Notes |
|---|---|---|
| `sku` | varchar(64) PK | |
| `name` | varchar(255) | |
| `category` | varchar(64), indexed | Alternatives come from the same category. |
| `price` | float | |
| `quantity_available` | int | Decremented when an order is fulfilled. Rows are locked during checks. |
| `warehouse_id` | varchar(64), indexed | |

### `customers`
| Column | Type | Notes |
|---|---|---|
| `id` | varchar(64) PK | `CUS-…` |
| `email`, `phone` | nullable | Picks the offer channel: SMS only if there's a phone and no email. |
| `preferences` | text, nullable | JSON string, not used yet. |

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | int PK | The token subject. |
| `email` | varchar(255), unique | Stored lowercase. |
| `password_hash` | varchar(255) | `scrypt$<salt hex>$<hash hex>` (n=2^14, r=8, p=1). |
| `role` | varchar(16) | `admin`, `operator`, `reviewer`, `analyst`, `customer` |
| `customer_id` | varchar(64), nullable, indexed | Required for `customer`, empty for staff (enforced by the API). |
| `is_active` | bool | Deactivated users can't sign in, and their tokens are rejected. |
| `token_version` | int | Incremented on logout, password change or deactivation, which revokes all of that user's tokens. |
| `created_at` | timestamptz | |

### `audit_events` (append-only)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | Chain order. |
| `occurred_at` | timestamptz, indexed | Set by the API (UTC) and part of the hash. |
| `actor_id` | int, nullable, indexed | `users.id`. Null for the system (seed data) or someone not signed in. |
| `actor_email`, `actor_role` | nullable | As they were when it happened, so later renames don't rewrite history. `system` for seed data, or the attempted email for failed logins. |
| `action` | varchar(64), indexed | `order.created`, `negotiation.declined`, `fraud_review.approved`, `user.updated`, `auth.login`, `access.denied`, ... |
| `outcome` | varchar(16) | `success`, `denied`, `failed`, `blocked`, `duplicate` |
| `target_type`, `target_id` | nullable | What was acted on (`order`, `negotiation`, `user`). |
| `order_id` | varchar(64), nullable, indexed | The order (workflow) this belongs to. |
| `changes` | JSON | `{"before": {...}, "after": {...}}`, or context such as the denied permission. Secrets are redacted. |
| `prev_hash`, `hash` | char(64) | SHA-256 chain. `hash` covers `prev_hash` and every column above. |

Triggers `audit_events_no_update_delete` (row level) and `audit_events_no_truncate` call `audit_events_append_only()`, which raises an error. Rows can only be inserted and read.

## Known simplifications
- **No foreign keys** between orders, negotiations and customers. The app keeps them consistent; add constraints in a migration if other writers appear.
- **Money is stored as `float`** and rounded to cents. Switch to `numeric(12,2)` before real payments are connected.
- **Order lines are a JSON column,** fine for display and triage. Move them to an `order_items` table if you need per-line SQL reporting.

## Changing the schema
```bash
cd backend
# edit app/models/…, then:
.venv/Scripts/python -m alembic revision --autogenerate -m "describe the change"
# review the generated file in migrations/versions/, then restart the API (or: alembic upgrade head)
```
`tests/integration/test_migrations.py` fails if the migrations and the models drift apart.
