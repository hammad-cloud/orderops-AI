# OrderOps AI — Frontend

Operations dashboard for order triage, negotiations, inventory, fraud audit, and recovery analytics.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | CSS Modules / Tailwind-ready |
| State | Feature stores + React hooks |
| API client | Typed fetch layer under `src/lib/api` |

## Layout

```
front/
├── public/                 # Static assets
└── src/
    ├── app/                # Next.js App Router pages
    │   ├── (auth)/         # Login & auth routes
    │   └── (dashboard)/    # Ops console (orders, negotiations, inventory, analytics, audit)
    ├── components/         # Reusable UI + domain components
    ├── features/           # Feature modules (orders, fraud, negotiation, inventory)
    ├── hooks/              # Shared React hooks
    ├── lib/api/            # Backend API client
    ├── stores/             # Client state
    ├── styles/             # Global styles
    └── types/              # Shared TypeScript types
```

## Dashboard areas

- **Orders** — intake status, risk score, fulfillment path  
- **Negotiations** — out-of-stock offers, customer responses  
- **Inventory** — live availability views  
- **Audit** — high-risk / human review queue  
- **Analytics** — revenue recovery, processing time, uptime  

## Quick start

```bash
cd front
npm install
cp .env.example .env.local
npm run dev
```
