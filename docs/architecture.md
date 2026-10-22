# Architecture

OrderOps AI triages incoming orders automatically: a fraud check, a stock check, then fulfil, offer an alternative, send to human review, or refund. Staff and customers work with it through a web dashboard.

## Components

```
 Browser ──HTTPS──▶ Next.js dashboard (frontend/, port 3000)
                     │  server components + server actions
                     │  session cookie (httpOnly) → Bearer token
                     ▼
                    FastAPI (backend/, port 8000)
                     │  /api/v1/*  auth + permission check on every route
                     │  LangGraph triage graph
                     ▼
                    PostgreSQL (schema managed by Alembic)
```

| Component | Responsibility | Code |
|---|---|---|
| Dashboard | Pages for orders, negotiations, inventory, audit queue, analytics, users. Renders on the server; the browser never sees the API token. | `frontend/src/app/` |
| Server actions | Login, logout, create order, answer offer, audit decision, manage users. Each one calls the API with the user's token. | `frontend/src/lib/actions.ts` |
| API | REST endpoints, authentication, role checks, customer scoping. | `backend/app/api/v1/` |
| Triage graph | The order workflow as a LangGraph state machine. | `backend/app/agents/graph.py` |
| Services | Business rules, one folder each: fraud scoring, inventory, negotiation offers, refunds, idempotency, audit trail. | `backend/app/services/` |
| Auth core | Password hashing, tokens, role → permission table. | `backend/app/core/` |
| Migrations | Schema history, applied on API startup. | `backend/migrations/` |

## Order workflow

```
POST /orders/intake
   │
   ▼
fraud_check ── score ≥ 0.75 ──▶ audit ──(reviewer)──▶ approve ─▶ inventory_check
   │                                     └────────────▶ reject  ─▶ refunded
   ▼
inventory_check ── all in stock ──────────▶ fulfill      (stock reserved)  → fulfillment
   ├── short, same-category alternative ─▶ negotiate    (offer at 10% off) → negotiating
   └── short, no alternative ────────────▶ refund                          → refunded

negotiating ──(customer or operator answers)──▶ accepted → item swapped, discounted → fulfillment
                                              └ declined → refunded
```

- **Fraud score** (`services/fraud/scorer.py`): 0.05 base, plus weights for order value over $500 or $1,000, a first order, 3+ orders in the last hour, and 5+ of one item. Capped at 0.99.
- **Stock** (`services/inventory/validator.py`): stock rows are locked with `SELECT … FOR UPDATE` during the check, so two orders can't reserve the same units.
- **Refunds** (`services/refunds/refunder.py`): the only place that marks an order refunded. No payment provider is connected yet.
- **Offers** (`services/negotiation/offer_engine.py`): an offer is recorded with a channel (email or SMS), but delivery isn't implemented. Offers are answered in the dashboard.

The graph runs inside the request's database transaction. Nothing is saved unless the whole run succeeds.

## Authentication and authorization

1. **Login.** `POST /auth/login` checks the scrypt password hash and returns a signed token: HMAC-SHA256 over `{sub: user id, ver: token version, exp}`, valid for 12 hours. The dashboard stores it in an httpOnly cookie that expires after 15 minutes without activity.
2. **Every request.** `current_user` checks the signature and expiry, then loads the user from the database. It rejects deactivated users and tokens whose `ver` no longer matches. Logout, a password change and deactivation all increment the version, which revokes every token issued before.
3. **Permissions.** Each router requires a read permission, and each write endpoint requires its own permission (`require("orders:create")` and so on). Roles map to permissions in `core/permissions.py`, the single source of truth.
4. **Customer scoping.** A user with role `customer` is linked to one customer ID. Order and negotiation queries are filtered to that ID, and other customers' records return 404. Fraud scores and notes are blanked in every response to a customer.

The dashboard hides controls a role can't use, but every rule is enforced by the API.

## Audit trail

Every action that matters writes one entry to `audit_events` (`services/audit_trail/recorder.py`):

| Recorded | Actions |
|---|---|
| Sign-in | `auth.login` (success, failed, blocked by lockout), `auth.logout` |
| Orders | `order.created` (success, duplicate retry, denied), `order.viewed` (denied: another customer's order) |
| Decisions | `negotiation.accepted` / `declined`, `fraud_review.approved` / `rejected` |
| Accounts | `user.created`, `user.updated` |
| Refusals | `access.denied`: any 403, with the permission and path |

Each entry has who did it (user ID, plus the email and role *at that time*), the action, the outcome, the target, the **order ID it belongs to**, and `changes`: a `before`/`after` snapshot of the relevant fields. All timestamps are UTC.

- **Same transaction as the change.** `record()` adds the entry to the request's session, so the entry and the change commit together or not at all. Refused or failed attempts (`record_now`) are committed in their own short transaction, because the request itself fails.
- **Append-only.** Database triggers reject `UPDATE`, `DELETE` and `TRUNCATE` on `audit_events`, for every database user, including the app. The API has only read endpoints for it.
- **Tamper-evident.** Each entry stores `prev_hash` and `hash = SHA-256(prev_hash + its content)`, written under an advisory lock so the chain is strictly ordered. `GET /audit-trail/verify` and the Activity log page recompute the chain and report the first entry that doesn't match.
- **No secrets.** Password hashes and tokens are never passed in, and `redact()` blanks any `password`/`token`/`secret` key at any depth. A password change is recorded as `password: [REDACTED]` in both before and after.
- **Readers.** Admins only (`audit_trail:read`), on the dashboard's **Activity log** page (filter by order, person, action, outcome), or from an order's page.

Logs are separate from the audit trail. `core/log_redaction.py` scrubs every log message and traceback before any handler writes it: bearer and session tokens, `password=`/`token=`-style values, and the personal part of email addresses (`***@example.com`).

## Idempotency

The dashboard generates an order ID when the New order form renders (`frontend/src/lib/idempotency.ts`) and sends it with every submit. The API refuses a second order with the same ID with 409, both in an early check and through the primary key at commit (`services/idempotency/guard.py`). The dashboard treats 409 on its own ID as "already created" and opens that order.

## Deployment shape

`docker-compose.yml` runs `db`, `backend` and `frontend`. The backend runs one uvicorn worker, because startup runs migrations and creates the first admin. To scale out, run migrations as a separate step first; see [runbook.md](runbook.md).

Related: [database-schema.md](database-schema.md) · [api.md](api.md) · [threat-model.md](threat-model.md) · [runbook.md](runbook.md)
