# 04 · Architecture & Technical Requirements (TRD)

How the system is built, structured, secured and run. Keep it **simple but feature-rich**: one deployable service, lean dependencies, the full workflow.

---

## 1. Stack decisions

| Concern | Decision | Notes |
|---------|----------|-------|
| Runtime | Node.js (LTS ≥ 20) | |
| API framework | Express | Minimal, familiar |
| DB / ODM | MongoDB Atlas + Mongoose | Required DB |
| Frontend | React 18 + Vite | SPA; design tokens from the demo |
| Routing (FE) | React Router | |
| Data fetching (FE) | TanStack Query (React Query) | Cache + refetch for boards/dashboards |
| Auth | JWT in httpOnly cookie | Same-origin → cookies are clean & secure |
| Password hashing | bcrypt | |
| Validation | Zod (shared schemas) | Reuse on server; mirror on client |
| Scheduled jobs | Render Cron Job → a Node script | SLA sweep, overdue, reminders |
| Email/WhatsApp | Adapter pattern, console stub default | Swap in Nodemailer/Twilio/Meta later |
| Charts (FE) | Recharts | Dashboards |

**Avoid for v1:** GraphQL, microservices, Redis, message queues, server-side rendering, a state library beyond React Query + local state. None are needed at this scale.

---

## 2. Deployment topology

**One Render Web Service** serves everything:

```
                       ┌─────────────────────────────────────────┐
   Browser  ───────►   │  Render Web Service (Node/Express)       │
   (React SPA)         │                                          │
                       │   /api/*    → Express JSON API           │
                       │   /*        → serves built React (dist)  │
                       └───────────────┬──────────────────────────┘
                                       │ Mongoose
                                       ▼
                       ┌─────────────────────────────────────────┐
                       │  MongoDB Atlas (M0)                      │
                       └─────────────────────────────────────────┘

   ┌─────────────────────────────────────────┐
   │  Render Cron Job (every 15 min)          │  ──► same MongoDB
   │  node server/src/jobs/slaSweep.js        │
   └─────────────────────────────────────────┘
```

Because the API and the SPA share one origin, the auth cookie needs no cross-site config and there is no CORS to manage in production. (For local dev, Vite proxies `/api` to the Express port — see §6.)

---

## 3. Repository structure (monorepo, npm workspaces)

```
luc-crm/
├── CLAUDE.md                      # project context (from this package)
├── 00-MASTER-PROMPT.md … 09-*.md  # the spec markdown files (this package), in the repo root
├── README.md                      # spec index
├── package.json                   # root: workspaces + top-level scripts
├── render.yaml                    # Render blueprint (web service + cron)
├── .env.example
│
├── server/
│   ├── package.json
│   └── src/
│       ├── index.js               # express app bootstrap + static serving
│       ├── config/
│       │   ├── env.js             # validated env loading
│       │   └── db.js              # mongoose connection
│       ├── workflow/
│       │   ├── workflow.config.js # SINGLE SOURCE OF TRUTH: stages, gates, SLAs, automations, enums
│       │   └── stateMachine.js    # canMove(), requiredFields(), nextTaskFor(), gate checks
│       ├── models/                # Mongoose schemas (one file each)
│       │   ├── User.js  Lead.js  Task.js  Activity.js
│       │   ├── StageTransition.js  Notification.js  Counter.js
│       ├── middleware/
│       │   ├── auth.js            # verify JWT cookie → req.user
│       │   ├── rbac.js            # requireRole('team_lead','admin')
│       │   ├── validate.js        # Zod request validation
│       │   └── error.js           # central error handler
│       ├── services/
│       │   ├── leadService.js     # create/dedupe/assign
│       │   ├── transitionService.js # the guarded state-change engine
│       │   ├── automationEngine.js  # fire on-entry automations
│       │   ├── slaService.js      # compute slaDueAt, detect breaches
│       │   ├── counterService.js  # atomic IDs
│       │   └── reportService.js   # aggregation pipelines for dashboards
│       ├── routes/
│       │   ├── auth.routes.js  leads.routes.js  tasks.routes.js
│       │   ├── activities.routes.js  reports.routes.js
│       │   ├── notifications.routes.js  meta.routes.js  webhooks.routes.js
│       ├── jobs/
│       │   └── slaSweep.js        # run by Render Cron
│       ├── adapters/
│       │   ├── messaging.js       # interface
│       │   └── consoleMessaging.js# default stub (logs "sent")
│       └── seed/
│           └── seed.js            # users + sample leads (demo parity)
│
└── client/
    ├── package.json
    ├── vite.config.js             # dev proxy /api → server
    └── src/
        ├── main.jsx  App.jsx
        ├── styles/tokens.css      # design tokens from the demo
        ├── lib/api.js             # fetch wrapper (credentials: 'include')
        ├── lib/workflow.js        # fetched workflow meta (from /api/meta)
        ├── context/AuthContext.jsx
        ├── components/            # Rail, KanbanCard, GateList, Timeline, Toast, ...
        ├── pages/
        │   ├── Login.jsx  Dashboard.jsx  Pipeline.jsx
        │   ├── LeadWorkspace.jsx  Capture.jsx
        │   ├── FlowMap.jsx  Automation.jsx  Reports.jsx
        └── hooks/                 # useLeads, useLead, useReports, ...
```

> **Single source of truth:** `workflow.config.js` defines stages, phases, required fields, SLAs, automations and enums. The server validates against it; the client fetches it via `GET /api/meta/workflow`. There is no second copy of the stage list.

---

## 4. The transition engine (most important server module)

All stage/status changes go through **one** guarded path: `transitionService.move(leadId, action, payload, actor)`.

Pseudo-flow:
```
1. Load lead + actor.
2. Resolve the requested action against the transition matrix (workflow.config).
   - If not an allowed move from lead.stage → 400 IllegalTransition.
3. RBAC check (e.g. payment confirm / reassign restricted).
4. Gate check (Rule 2):
   - requiredFields(lead.stage) all present? else 422 with missing list.
   - special gates: docsVerified for docs→payment; closure gate for →won.
5. If terminal move: require exitReason (Rule 3); set lifecycleStatus + exitReason; retain stage.
6. Apply state change (stage / status / won fields via counters).
7. Close prior open task; create next task (Rule 1); refresh nextAction + lastActivityAt.
8. Recompute slaDueAt (Rule 5).
9. Run on-entry automations (automationEngine).
10. Write Activity + StageTransition (audit).
11. Return updated lead.
```

This guarantees no code path can mutate `stage` directly and skip the rules. **Models do not expose stage edits except through this service.**

---

## 5. Auth & security

- **Login:** email + password → bcrypt compare → issue JWT (≈ 8h) set as `httpOnly`, `secure` (prod), `SameSite=Lax` cookie named `luc_token`.
- **Every API request:** `auth` middleware reads the cookie, verifies JWT, loads `req.user`. No token → 401.
- **RBAC:** `rbac` middleware gates restricted routes (reassign, payment confirm, user management) to `team_lead`/`admin`.
- **Server-side authority:** ownership and role checks happen on the server for every lead mutation. The client UI hides what a user can't do, but the server is the enforcer.
- **Input validation:** every request body validated with Zod before hitting services.
- **Secrets:** only via env (`JWT_SECRET`, `MONGODB_URI`, `INGEST_API_KEY`, `CRON_SECRET`). Never commit.
- **Webhook ingestion:** `/api/webhooks/leads` requires a static `INGEST_API_KEY` header.
- **CSRF:** low risk (same-origin SPA + `SameSite=Lax`); state-changing requests also require `Content-Type: application/json` + a custom `X-Requested-With` header as a light extra guard.

## 6. Local development

- `npm run dev` (root) runs server (e.g. :4000) and Vite client (:5173) concurrently.
- Vite proxies `/api` → `http://localhost:4000` so cookies and paths behave like production.
- `.env` for local; `.env.example` documents every variable.
- `npm run seed` populates demo users + leads.

## 7. Background processing (no extra infra)

Two mechanisms only:
1. **In-request automations** — on-entry side effects (acknowledgements, task creation, reminders scheduling, escalations) run synchronously inside the transition. Simple and deterministic.
2. **Scheduled sweep** — a Render Cron Job runs `jobs/slaSweep.js` every 15 minutes to: mark overdue tasks, set `slaBreached`, raise manager escalation notifications, and "send" due reminders via the messaging adapter. The job is idempotent.

Messaging (email/WhatsApp/SMS) goes through the **messaging adapter**. Default `consoleMessaging` just logs and records an Activity, so the whole system is fully functional with **zero** third-party accounts. Real providers are dropped in later by implementing the same interface.

## 8. Error handling & API conventions

- JSON everywhere. Errors: `{ error: { code, message, details? } }`.
- Status codes: `400` bad/illegal request, `401` unauthenticated, `403` forbidden (role/ownership), `404` not found, `409` duplicate (dedupe), `422` validation/gate failure, `500` server.
- Central Express error middleware maps thrown typed errors → responses.
- Server logs structured lines (pino or console JSON) including actor + leadCode on mutations.

## 9. Testing

- **Unit:** `stateMachine` (allowed moves, gates), `slaService`, `counterService`, dedupe normalization.
- **Integration:** transition endpoint covering the §10 invariants in the workflow spec (illegal move blocked, missing-field 422, closure gate, mandatory reason).
- **Seed-based smoke:** run seed, walk a lead New Lead → Won via the API, assert audit + tasks + admission record.
- Tooling: Vitest + supertest. Keep tests fast; mock the messaging adapter.

## 10. Performance & scale notes

- Index every field used in board filters and report `$match`/`$group` (see `03`).
- Dashboards use MongoDB aggregation pipelines (server-side), not in-memory JS over all leads.
- Paginate lead lists (default 50). Boards fetch only active leads.
- Target comfortably handles tens of thousands of leads on the free tier; vertical scale on Render/Atlas when needed.
