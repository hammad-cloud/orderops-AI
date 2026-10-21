# OrderOps AI

Monorepo for the autonomous order triage & resolution agent (BRD).

## Setup (first time)

Requires **Node.js 20+** and **Python 3.12–3.14**.

```bash
# Node deps (root + frontend + backend runner)
npm install
npm run install:all

# Python deps in a virtualenv (run-dev.js picks up backend/.venv automatically)
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt   # macOS/Linux: .venv/bin/pip
cd ..

# Environment files — copy the examples, then set a real SECRET_KEY and ADMIN_PASSWORD
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Needs a running **PostgreSQL** reachable at `DATABASE_URL` with an `orderops` database:
either `docker compose up -d db` (matches the default URL) or your own install plus `createdb orderops`. Tables are created and filled with demo data on first start.

Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env`. Login is refused while `ADMIN_PASSWORD` is empty.

## Run together (one command)

From the project root:

```bash
npm run dev
```

This starts **FastAPI** and **Next.js** together:

| App | URL |
|-----|-----|
| Frontend + API (proxied) | http://127.0.0.1:3000 |
| FastAPI direct | http://127.0.0.1:8000 |
| Swagger docs | http://127.0.0.1:8000/docs |

Frontend calls go to `/api/v1/...` and `/health` on port **3000**; Next.js proxies them to FastAPI on **8000**.

## Repository layout

```
.
├── backend/               # FastAPI + LangGraph API (see backend/README.md)
├── frontend/              # Next.js ops dashboard (see frontend/README.md)
├── .github/               # CI (lint, tests against Postgres, type-check, build) + Dependabot
├── docker-compose.yml     # Local PostgreSQL
├── SECURITY.md            # Vulnerability reporting + deployment checklist
└── package.json           # `npm run dev` starts both apps together
```

## Projects

| Folder | Role | Stack |
|--------|------|--------|
| `backend/` | API, LangGraph agent, DB | FastAPI, LangGraph, SQLAlchemy, PostgreSQL |
| `frontend/` | Ops dashboard | Next.js, TypeScript |

## BRD workflow

Order intake → fraud check → inventory validation → (negotiate if OOS) → fulfill / refund / audit

`POST /api/v1/orders/intake` runs the LangGraph triage graph (`backend/app/agents/graph.py`):

- **Fraud check:** rule-based score (order value, first order, velocity, bulk quantity). A score of 0.75 or higher goes to the manual **audit** queue.
- **Inventory check:** every line in stock → stock is reserved → **fulfillment**.
- **Out of stock:** a same-category alternative at the closest price is offered at 10% off → **negotiating**. With no alternative → **refunded**.
- **Customer reply** (`POST /api/v1/negotiations/{id}/respond`): accepted → item swapped, discounted, fulfilled. Declined → refunded.

## Tests & lint

```bash
cd backend && .venv/Scripts/python -m pytest -q && .venv/Scripts/python -m ruff check .
cd frontend && npm run lint && npx tsc --noEmit
```

CI runs all of these plus a production build on every push.

Tests use a separate `orderops_test` database (created and wiped automatically), never your dev data.

## License

[MIT](LICENSE)
