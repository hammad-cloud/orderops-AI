# OrderOps AI

Monorepo for the autonomous order triage & resolution agent (BRD).

## Run together (one command)

From the project root:

```bash
npm install
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
| `front/` | Ops dashboard | Next.js, TypeScript |

## BRD workflow

Order intake → fraud check → inventory validation → (negotiate if OOS) → fulfill / refund / audit
