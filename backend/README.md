# OrderOps AI — Backend

Autonomous order triage & resolution API built with **FastAPI**, **LangGraph**, **SQLAlchemy**, and **PostgreSQL**.

## Stack

| Layer | Technology |
|-------|------------|
| API | FastAPI (async) |
| Orchestration | LangGraph (StateGraph + conditional edges) |
| ORM / Migrations | SQLAlchemy + Alembic |
| Database | PostgreSQL (Neon-compatible) |
| Background work | Async workers |

## Layout

```
backend/
├── app/
│   ├── api/v1/endpoints/   # HTTP route handlers
│   ├── agents/             # LangGraph workflow (nodes, edges, state)
│   ├── core/               # Config, security, logging
│   ├── db/                 # Engine, session, repositories
│   ├── models/             # SQLAlchemy models
│   ├── schemas/            # Pydantic request/response schemas
│   ├── services/           # Business logic (fraud, inventory, negotiation, notifications)
│   └── workers/            # Background / async jobs
├── alembic/                # Schema migrations
├── tests/                  # Unit + integration tests
└── scripts/                # Dev / ops utilities
```

## Domain flow (from BRD)

1. **Order intake & fraud check** → high-risk → manual audit  
2. **Inventory validation** → in stock → fulfillment  
3. **Agentic negotiation** → out of stock → alternative + discount (email/SMS)  
4. **Human-in-the-loop** → accept → update order | decline → refund  

## Quick start

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```
