# OrderOps AI — Backend

Order triage & resolution API built with **FastAPI**, **LangGraph**, **SQLAlchemy** (async) and **PostgreSQL**.

## Layout

```
backend/
├── app/
│   ├── main.py             # App factory; creates tables + seeds demo data on first start
│   ├── api/v1/
│   │   ├── router.py       # Mounts endpoints; everything except /auth needs a token
│   │   └── endpoints/      # auth, orders, negotiations, inventory, audit, analytics
│   ├── agents/
│   │   ├── graph.py        # LangGraph triage graph (nodes + conditional edges)
│   │   └── state/          # Graph state type
│   ├── core/               # Settings (config.py), tokens & auth dependency (security.py)
│   ├── db/                 # Async engine + session dependency
│   ├── models/             # SQLAlchemy tables
│   ├── schemas/            # Pydantic request/response shapes (camelCase on the wire)
│   └── services/           # Business rules: fraud scoring, inventory, negotiation, seed data
├── tests/
│   ├── conftest.py         # Uses a throwaway `orderops_test` database
│   ├── unit/               # Health + auth
│   └── integration/        # Full triage workflow over HTTP
├── requirements.txt        # Runtime dependencies
├── requirements-dev.txt    # + pytest, ruff
├── pyproject.toml          # Ruff + pytest config
└── run-dev.js              # `npm run dev` launcher (uses .venv if present)
```

## Workflow

1. **Fraud check** — rule-based score; ≥ 0.75 → manual **audit** queue
2. **Inventory check** — all lines in stock → stock reserved → **fulfillment**
3. **Negotiation** — out of stock → same-category alternative at 10% off → **negotiating**; no alternative → **refunded**
4. **Customer reply** — accepted → item swapped and fulfilled; declined → refunded

## Quick start

```bash
docker compose up -d db          # from the repo root, or use your own PostgreSQL
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt   # macOS/Linux: .venv/bin/pip
cp .env.example .env                            # set SECRET_KEY and ADMIN_PASSWORD
.venv/Scripts/python -m uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs. Tests: `.venv/Scripts/python -m pytest -q`. Lint: `.venv/Scripts/python -m ruff check .`
