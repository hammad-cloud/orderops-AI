# Threat model

Scope: the dashboard, the API and the database as deployed by `docker-compose.yml`. Last reviewed 2026-10-22 (audit trail added).

## What we protect
| Asset | Why it matters |
|---|---|
| Customer order data (items, totals, status) | Personal purchase history. Each customer may see only their own. |
| Fraud scores and reasons | They reveal how to get past the fraud check. Staff only. |
| Stock levels and order outcomes | Wrong writes ship goods or refund money. |
| User accounts and tokens | A stolen admin account controls everything. |
| `SECRET_KEY` | Anyone holding it can mint tokens for any user. |

## Actors
- **Staff**: admin, operator, reviewer, analyst, each with different permissions.
- **Customer logins**: tied to one customer ID.
- **Anonymous internet users**: can reach `/login` and `/health` only.
- **Malicious insider**: a staff member trying to exceed their role.

## Trust boundaries
1. Browser → Next.js: a session cookie (httpOnly, SameSite=Lax, Secure in production).
2. Next.js → API: a Bearer token, attached server-side. The browser never handles it.
3. API → PostgreSQL: credentials from `DATABASE_URL`.

## Threats and mitigations

| # | Threat | Mitigation | Test or code |
|---|---|---|---|
| 1 | A customer reads or changes another customer's orders or offers | Queries are filtered by the linked customer ID, and other customers' records return 404. Intake for another customer returns 403. | `test_rbac.py::test_customer_*` |
| 2 | A role exceeds its permissions by calling the API directly | Every route has a `require(permission)` check on the server. The UI only hides controls. | `test_rbac.py::test_permission_matrix` |
| 3 | Fraud rules leak to customers | `riskScore` and `notes` are blanked in every response to customer logins. | `test_customer_sees_only_own_orders` |
| 4 | A forged or tampered token | HMAC-SHA256 with `SECRET_KEY`, compared in constant time. The API won't start with the example or a short key. | `test_api_requires_login`, `main.py` |
| 5 | A stolen token is reused after logout | Every request checks `token_version`. Logout, a password change and deactivation all increment it. | `test_logout_revokes_the_token` |
| 6 | A deactivated or demoted user keeps access | The user is reloaded from the database on every request. | `test_deactivated_and_demoted_users_lose_access_immediately` |
| 7 | Password guessing | 5 failures per email in 15 minutes returns 429. Passwords are scrypt-hashed with a per-user salt, and unknown emails cost the same time as wrong passwords. | `test_repeated_failures_lock_the_account` |
| 8 | XSS steals the session | The token is in an httpOnly cookie that scripts can't read. React escapes output. | `lib/session.ts` |
| 9 | CSRF triggers actions | Next.js server actions check the Origin header against the host. The cookie is SameSite=Lax. The API itself uses Bearer tokens, not cookies. | Next.js |
| 10 | Clickjacking or MIME sniffing | `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff`. | `next.config.mjs` |
| 11 | A duplicate order from a retry or race | An idempotency key on the order ID, enforced by the primary key. | `test_intake_resubmit_with_same_id_creates_one_order` |
| 12 | Two orders reserve the same stock | Stock rows are locked (`FOR UPDATE`) during the check. | `services/inventory/validator.py` |
| 13 | Lockout of the last admin | Admins can't demote or deactivate themselves. A break-glass script resets access. | `test_user_management_rules`, runbook |
| 14 | Secrets in git | Only `.env.example` files are tracked, and `.env*` is git-ignored. | `.gitignore` |
| 15 | Someone denies doing an action, or misuse goes unnoticed | An audit trail records every write, sign-in, refused attempt and failed login, with actor, order ID, before/after and outcome. Admins only. | `test_audit_trail.py` |
| 16 | Audit records are edited or deleted to hide activity | Triggers reject `UPDATE`, `DELETE` and `TRUNCATE`, the API has no write endpoints, and a SHA-256 hash chain flags any edited or removed entry. | `test_database_rejects_changes_to_entries`, `test_hash_chain_detects_tampering` |
| 17 | Secrets or personal data leak through logs or the audit trail | Log messages and tracebacks are scrubbed (tokens, password/secret values, email local parts). Audit entries drop `password`/`token`/`secret` fields at any depth. | `test_log_redaction.py`, `test_user_changes_never_store_passwords` |

## Accepted risks and open items
| Risk | Impact | What would fix it |
|---|---|---|
| **Account lockout as a nuisance.** Anyone can lock a known email out for 15 minutes with 5 bad passwords. | Annoyance, not a breach. | Lock per IP and email pair, or use a CAPTCHA after failures. |
| **The lockout counter is in memory, per process.** With several API workers, an attacker gets 5 tries per worker. | Weaker brute-force protection. | Keep the counter in Redis or the database. |
| **No rate limit** on other endpoints. | A signed-in user can hammer intake or analytics. | A rate limit at a reverse proxy or in middleware. |
| **Logout revokes every session** of the user, not just one device. | Minor inconvenience. | Per-session IDs with a revocation table. |
| **Order ID existence leaks to customers.** Supplying an existing ID returns 409. | Low: IDs are random and the order's contents stay hidden. | Return a generic error to customers on someone else's ID. |
| **A database superuser can still rewrite the whole audit trail:** disable the trigger, edit rows and recompute every hash after them. The chain catches partial edits, not a full rewrite. | Someone with full database control can hide activity. | Run the API as a non-owner role with only `INSERT`/`SELECT` on `audit_events` (see the runbook), and copy the latest `hash` somewhere outside the database regularly (or stream entries to write-once storage). |
| **The audit trail grows without limit.** Failed-login floods with made-up emails add rows too. | Disk use over time. | A retention policy: export old entries to archive storage, then drop old partitions through a reviewed migration. Deleting rows is intentionally impossible. |
| **Audit entries hold staff emails and the email typed in a failed login.** | Personal data, though admin-only. | Accepted: needed to know who acted. Include the table in data-subject requests. |
| **No Content-Security-Policy.** | XSS has fewer layers of defence. | Add a CSP header with nonces. |
| **No dependency vulnerability scanning in CI.** | Known-vulnerable packages could ship. | Add `pip-audit` and `npm audit`, or Dependabot security alerts. |
| **Offers and refunds touch no external system** (offers aren't sent, nothing is charged back). | None today. This becomes the riskiest area once connected. | Re-run this model when email, SMS or payments are added: webhook signatures, idempotent provider calls, secret storage. |

## Reporting
See [SECURITY.md](../SECURITY.md).
