# Runbook

How to run, deploy and fix OrderOps AI. Paths are relative to the repo root. On macOS or Linux, use `.venv/bin/python` instead of `.venv/Scripts/python`.

## Run it

| Goal | Command | URL |
|---|---|---|
| Develop (auto-reload) | `docker compose up -d db`, then `npm run dev` | http://127.0.0.1:3000 |
| Production-like on the host | `npm start` | http://127.0.0.1:3000 |
| Everything in Docker | `docker compose up --build` | http://localhost:3000 |

Docker needs `backend/.env` (copy `backend/.env.example`) with a real `SECRET_KEY` and `ADMIN_PASSWORD`. Only the frontend and API ports are published, and both bind to 127.0.0.1. Put a TLS reverse proxy in front for anything public, so the session cookie gets its `Secure` flag over HTTPS.

## First start
1. The API refuses to start unless `SECRET_KEY` is 32+ random characters: `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
2. Startup applies database migrations, seeds the demo products, customers and orders into an empty database, and creates the first admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. Sign in as that admin and add other users on the **Users** page. After the first start, changing `ADMIN_*` in `.env` does nothing.

## Health
- `GET /health` returns 200 `ok`, or 503 `degraded` when the database is unreachable. The dashboard's status pill and the Docker health check both use it.
- The API logs to stdout (`docker compose logs -f backend`).

## Common incidents

### Every page shows "Unable to load…" / the status pill is red
1. Check the API: `curl http://127.0.0.1:8000/health`.
2. If you get 503, the database is down or unreachable. Check `docker compose ps db` and `DATABASE_URL`.
3. If the connection is refused, the API isn't running or crashed at startup. Read its logs: a bad `SECRET_KEY` and failed migrations are the usual causes.

### Locked out of the only admin account
```bash
cd backend && .venv/Scripts/python -m scripts.set_admin_password admin@example.com
# or: docker compose exec backend python -m scripts.set_admin_password admin@example.com
```
This creates the account, or resets it to an **active admin** with a new password, and signs out its old sessions.

### "Too many failed attempts" for a user
The lock clears after 15 minutes, or when the API restarts (the counter is in memory). If it keeps happening, someone may be guessing passwords: check the logs for repeated 401s on `/auth/login`.

### A user should lose access now
On the Users page, choose **Deactivate**. Their next request gets 401, and their tokens stop working everywhere. Changing their role takes effect on their next request. Both are recorded in the audit trail.

### Suspected leak of `SECRET_KEY`
Anyone with the key can sign tokens for any user. Generate a new key, put it in `.env` and restart the API. Every session ends and everyone signs in again.

### An order is stuck or a customer says they were charged twice
- A duplicate submit can't create a second order: the order ID is the idempotency key. Search the Orders page by customer ID to confirm.
- No payment provider is connected yet, so "refunded" is a status only. Nothing is charged or refunded externally.

### Who did this? (audit trail)
Open **Activity log** as an admin, or use **Activity for this order →** on an order. Filter by order ID, person, action (prefix, e.g. `user.`) or outcome. Every sign-in, order, decision, account change and refused attempt is there, with before → after values. A burst of `failed` or `denied` entries from one email is worth a look.

### "Integrity check failed at entry #N" on the Activity log
Someone changed or removed an audit entry directly in the database, bypassing the append-only trigger. Treat it as a security incident:
1. Don't restore over the evidence. Take a database backup first (see below).
2. Find out who has superuser or owner access to the database, and check the PostgreSQL logs for `ALTER TABLE ... DISABLE TRIGGER` and edits to `audit_events`.
3. Compare entries from #N onward with your latest backup or exported hash to see what changed.
4. Rotate the database credentials and `SECRET_KEY`.

### Make the audit trail harder to tamper with (production)
The triggers stop everyone, but the table's owner can switch them off. In production, run migrations as an owner role and the API as a separate role that can't:
```sql
CREATE ROLE orderops_app LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE orderops TO orderops_app;
GRANT USAGE ON SCHEMA public TO orderops_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO orderops_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO orderops_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM orderops_app;   -- insert and read only
```
Then point `DATABASE_URL` at `orderops_app`, and run `alembic upgrade head` as the owner during releases. Startup migrations then find nothing to do. Also save the latest entry's `hash` (`GET /api/v1/audit-trail?limit=1`) somewhere outside the database daily. A rewritten chain then won't match it.

Audit entries can't be deleted, so plan retention as an export to archive storage plus a reviewed migration, not ad-hoc SQL.

### Audit queue is growing
Orders scoring 0.75+ wait for a reviewer or admin to choose **Approve** or **Reject** on the Audit page. Approve continues to the stock check. Reject refunds.

## Database

### Migrations
Applied automatically on API startup. To run them by hand:
```bash
cd backend
.venv/Scripts/python -m alembic current          # which revision the database is at
.venv/Scripts/python -m alembic upgrade head     # apply pending migrations
.venv/Scripts/python -m alembic downgrade -1     # undo the last one (drops data the migration added)
```
To change the schema, see [database-schema.md](database-schema.md#changing-the-schema).
**Before running several API workers,** run `alembic upgrade head` as a release step and keep one worker per migration run, because startup migrations shouldn't race.

### Backup and restore (Docker)
```bash
docker compose exec -T db pg_dump -U postgres -Fc orderops > orderops-$(date +%F).dump
docker compose exec -T db pg_restore -U postgres -d orderops --clean < orderops-YYYY-MM-DD.dump
```

### Reset to demo data (development only, deletes everything)
```bash
docker compose down -v && docker compose up -d db
```
The next API start migrates and re-seeds.

## Releases
CI (`.github/workflows/ci.yml`) runs ruff and pytest against PostgreSQL, then eslint, the TypeScript check, Vitest, a production build, and the Playwright tests. Deploy only a green commit:
```bash
git pull && docker compose up --build -d     # rebuilds, migrates on start
docker compose logs -f backend               # watch for "Application startup complete"
```
Roll back by deploying the previous commit. If a migration ran, `alembic downgrade` to the previous revision first.
