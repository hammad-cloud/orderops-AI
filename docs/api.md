# API reference

Base path `/api/v1`. JSON request and response bodies use camelCase. The interactive OpenAPI docs are at `http://127.0.0.1:8000/docs` while the API runs; this page adds what they don't say: who may call each endpoint, and what each error means.

## Authentication
Send `Authorization: Bearer <token>`, using the token from `POST /auth/login`. Every endpoint except login and `/health` requires it.

| Status | Meaning |
|---|---|
| 401 | No token, a forged or expired token, a revoked token (after logout, password change or deactivation), or a deactivated user. |
| 403 | Signed in, but the role lacks the permission. |
| 404 | Doesn't exist, **or** belongs to another customer when the caller is a customer login. The API doesn't confirm that other customers' records exist. |

## Permissions by role

| Permission | admin | operator | reviewer | analyst | customer |
|---|:-:|:-:|:-:|:-:|:-:|
| `orders:read` | ✓ | ✓ | ✓ | ✓ | own only |
| `orders:create` | ✓ | ✓ | | | own only |
| `negotiations:read` | ✓ | ✓ | ✓ | ✓ | own only |
| `negotiations:respond` | ✓ | ✓ | | | own only |
| `inventory:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `audit:read` | ✓ | ✓ | ✓ | ✓ | |
| `audit:decide` | ✓ | | ✓ | | |
| `analytics:read` | ✓ | ✓ | ✓ | ✓ | |
| `users:manage` | ✓ | | | | |
| `audit_trail:read` | ✓ | | | | |

The source is `backend/app/core/permissions.py`, and `backend/tests/integration/test_rbac.py` checks the whole matrix.

## Endpoints

### Auth
| Method & path | Permission | Notes |
|---|---|---|
| `POST /auth/login` | none | Body `{email, password}` → `{token}`. 401 for a wrong email or password. 429 after 5 failures for one email within 15 minutes. |
| `POST /auth/logout` | signed in | 204. Revokes **all** of the caller's tokens. |
| `GET /auth/me` | signed in | `{id, email, role, customerId, permissions[]}` |

### Orders
| Method & path | Permission | Notes |
|---|---|---|
| `GET /orders?q=&status=` | `orders:read` | Newest 200 orders. `q` matches the order or customer ID. Customer logins get only their own. |
| `GET /orders/{id}` | `orders:read` | The order plus its `negotiations[]`. |
| `POST /orders/intake` | `orders:create` | Body `{id?, customerId, items:[{sku, quantity 1–100}]}` (1–50 lines). Runs the triage graph and returns 201 with the order. **422**: unknown SKU, a repeated SKU, or invalid quantities. **403**: a customer login ordering for another customer. **409**: an order with this `id` already exists (see Idempotency). |

`riskScore` and `notes` are always `null` in responses to customer logins.

### Negotiations
| Method & path | Permission | Notes |
|---|---|---|
| `GET /negotiations` | `negotiations:read` | Newest 200. Customer logins see offers on their own orders only. |
| `POST /negotiations/{id}/respond` | `negotiations:respond` | Body `{decision: "accepted" \| "declined"}`. Accepted swaps the item at the discount and fulfils, or refunds if the alternative sold out meanwhile. Declined refunds. **409** if already answered. |

### Audit (fraud review)
| Method & path | Permission | Notes |
|---|---|---|
| `GET /audit/queue` | `audit:read` | Orders in `audit`, highest risk first. |
| `POST /audit/{orderId}/decision` | `audit:decide` | Body `{decision: "approve" \| "reject"}`. Approve continues to the stock check, which leads to fulfillment, negotiating or refunded. Reject refunds. The reviewer's email is recorded in the notes. **409** if the order isn't awaiting review. |

### Inventory and analytics
| Method & path | Permission | Notes |
|---|---|---|
| `GET /inventory` | `inventory:read` | All products with stock. |
| `GET /inventory/check/{sku}` | `inventory:read` | `{sku, available, quantity}` |
| `GET /analytics` | `analytics:read` | Totals, the recovery rate, a 7-day series and recent orders. |

### Users
| Method & path | Permission | Notes |
|---|---|---|
| `GET /users` | `users:manage` | All accounts. Password hashes are never returned. |
| `POST /users` | `users:manage` | Body `{email, password (10–128 chars), role, customerId?}`. A `customer` needs an existing customer ID; staff must not have one (422). **409** if the email is taken. |
| `PATCH /users/{id}` | `users:manage` | Any of `{role, customerId, isActive, password}`. A new password or deactivation signs the user out everywhere. **409** if admins try to demote or deactivate themselves. |

### Audit trail (read-only)
| Method & path | Permission | Notes |
|---|---|---|
| `GET /audit-trail?orderId=&actor=&action=&outcome=&beforeId=&limit=` | `audit_trail:read` | Newest first, up to 500 per page (`beforeId` pages back). `actor` matches part of the email, and `action` matches a prefix such as `order.`. Each entry: `{id, occurredAt, actorId, actorEmail, actorRole, action, outcome, targetType, targetId, orderId, changes, hash}`. |
| `GET /audit-trail/verify` | `audit_trail:read` | `{ok, checked, brokenAt}`: recomputes the hash chain, and `brokenAt` is the first entry that doesn't match. |

There are no create, update or delete endpoints. `POST`/`PUT`/`PATCH`/`DELETE` return 405. Entries are written by the API itself as a side effect of the actions above. Every 403 is recorded as `access.denied`.

### Health
`GET /health` needs no auth. Returns 200 `{status: "ok"}`, or 503 `{status: "degraded"}` when the database is unreachable.

## Idempotency
Order intake is idempotent on the order `id`. Generate the ID once per user action and resend it on every retry. The first request creates the order; any repeat, including a concurrent one, gets **409** and creates nothing. Treat 409 on your own ID as success and fetch `GET /orders/{id}`. If you omit `id`, the server generates one, and retries can then create duplicates.
