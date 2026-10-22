# OrderOps AI — Frontend

Operations dashboard for order triage, negotiations, inventory, fraud audit and recovery analytics.
Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS** and **Recharts**.

## Layout

```
frontend/src/
├── middleware.ts           # Redirects signed-out visitors to /login; renews the idle session
├── app/
│   ├── (auth)/login/       # Sign-in page
│   └── (dashboard)/        # orders (+ new, [id] detail), negotiations, inventory, audit, analytics, users
├── components/
│   ├── layout/             # App shell, sidebar, API status pill, idle sign-out timer
│   ├── ui/                 # StatCard, ShareBar, SubmitButton
│   └── analytics/          # Charts + CSV export (client components)
├── lib/
│   ├── api/                # Server-side API client, one file per backend resource
│   ├── actions.ts          # Server actions: login, logout, orders, offers, audit decisions, users
│   ├── idempotency.ts      # Order idempotency keys
│   └── session.ts          # Cookie name/options and the 15-minute idle timeout
├── styles/                 # Global CSS + Tailwind
└── types/                  # Shared TypeScript types (mirror the API's camelCase JSON)

frontend/tests/
├── unit/                   # Vitest: API client, permissions, sidebar per role (`npm test`)
└── e2e/                    # Playwright: real browser + API + database (`npm run test:e2e`)
```

Pages are server components: they call FastAPI directly from the Next.js server and forward
the login cookie as a Bearer token, so the token never reaches browser JavaScript.

## Quick start

```bash
cd frontend
npm install
cp .env.example .env.local      # BACKEND_URL, defaults to http://127.0.0.1:8000
npm run dev      # Turbopack dev server; `npm run build && npm start` for production mode
npm run lint
```
