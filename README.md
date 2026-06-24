# LUC CRM

In-house **lead-to-admission CRM** for **LUC (Learners Education, Dubai)** — replacing the retired third-party "Pablo" CRM. Tracks prospective-student enquiries through a **13-stage lifecycle** to a paid, document-verified admission, with server-enforced stage gates, mandatory follow-ups, automations, SLAs, RBAC and management dashboards.

> Full specification lives in [`LUC-CRM-build-docs/`](./LUC-CRM-build-docs) (`01`–`09` + `CLAUDE.md`). The workflow is the single source of truth in [`server/src/workflow/workflow.config.js`](./server/src/workflow/workflow.config.js).

## Stack
Node + Express + Mongoose · MongoDB Atlas · React 18 + Vite + TanStack Query + Recharts · JWT in an httpOnly cookie · Zod validation · Vitest + supertest · Render (one web service serves API + built SPA; one cron runs the SLA sweep).

## Monorepo layout (npm workspaces)
- `server/` — Express API, workflow engine, jobs, seed
- `client/` — React SPA
- `render.yaml` — Render blueprint · `LUC-CRM-build-docs/` — the spec

## Getting started
```bash
npm install                # installs server + client workspaces
cp .env.example server/.env # then fill MONGODB_URI, JWT_SECRET, …
npm run seed               # 1 admin + 3 counsellors + sample leads
npm run dev                # Express :4000 + Vite :5173 (proxies /api)
npm test                   # Vitest + supertest (against luc_crm_test DB)
```

## Production
```bash
npm run build              # build client → client/dist
NODE_ENV=production npm start   # Express serves API + SPA on one origin
```

## Non-negotiable rules
1. Workflow defined ONCE in `workflow.config.js`; client fetches it via `GET /api/meta/workflow`.
2. All stage/status changes go through `transitionService.move()` — the single guarded path.
3. Server enforces RBAC, stage gates and ownership; the UI only hides.
4. The 5 operating rules + the closure gate are server-side invariants.
5. Activities are append-only (audit trail). Every request body is Zod-validated.

See [`LUC-CRM-build-docs/08-BUILD-PLAN.md`](./LUC-CRM-build-docs/08-BUILD-PLAN.md) for the milestone plan.
