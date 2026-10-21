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
.venv/Scripts/pip install -r requirements.txt   # macOS/Linux: .venv/bin/pip
cd ..

# Environment files — copy the examples, then set a real SECRET_KEY
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

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

## Projects

| Folder | Role | Stack |
|--------|------|--------|
| `backend/` | API, LangGraph agent, DB | FastAPI, LangGraph, SQLAlchemy, Alembic, PostgreSQL |
| `frontend/` | Ops dashboard | Next.js, TypeScript |

## BRD workflow

Order intake → fraud check → inventory validation → (negotiate if OOS) → fulfill / refund / audit

## Tests

```bash
cd backend && .venv/Scripts/python -m pytest -q
```

## License

[MIT](LICENSE)
