# OrderOps AI — Frontend

Operations dashboard for order triage, negotiations, inventory, fraud audit and recovery analytics.
Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS** and **Recharts**.

## Layout

```
frontend/src/
├── middleware.ts           # Redirects signed-out visitors to /login
├── app/
│   ├── (auth)/login/       # Sign-in page
│   └── (dashboard)/        # orders (+ [id] detail), negotiations, inventory, audit, analytics
├── components/
│   ├── layout/             # App shell, sidebar, API status pill
│   ├── ui/                 # StatCard, ShareBar
│   └── analytics/          # Charts + CSV export (client components)
├── lib/
│   ├── api/                # Server-side API client, one file per backend resource
│   └── actions.ts          # Server actions: login, logout, answer an offer
├── styles/                 # Global CSS + Tailwind
└── types/                  # Shared TypeScript types (mirror the API's camelCase JSON)
```

Pages are server components: they call FastAPI directly from the Next.js server and forward
the login cookie as a Bearer token, so the token never reaches browser JavaScript.

## Quick start

```bash
cd frontend
npm install
cp .env.example .env.local      # BACKEND_URL, defaults to http://127.0.0.1:8000
npm run dev
```
