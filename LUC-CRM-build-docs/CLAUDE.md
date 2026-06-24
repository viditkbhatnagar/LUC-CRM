# CLAUDE.md — LUC CRM Project Context

> Copy this file to the **repository root**. Claude Code reads it automatically and should treat it as the standing brief for every task in this repo.

## What this is
An in-house **lead-to-admission CRM for LUC** (an online-education provider), replacing a retired third-party CRM ("Pablo"). It tracks prospective-student enquiries through a 13-stage lifecycle to a paid, document-verified admission, with controlled stage movement, mandatory follow-ups, automations, SLAs and management dashboards.

The full specification lives in the **project root** as markdown files. **Read them all before building:**
- `00-MASTER-PROMPT.md` — the build kickoff prompt (the order to read + how to execute)
- `README.md` — index + conventions
- `01-PRD.md` — product requirements & roles
- `02-WORKFLOW-SPEC.md` — **the core**: stages, gates, transitions, the 5 rules
- `03-DATA-MODEL.md` — MongoDB schema
- `04-ARCHITECTURE-TRD.md` — stack & structure
- `05-API-SPEC.md` — endpoints & RBAC
- `06-AUTOMATION-SLA-ENGINE.md` — automations & SLA
- `07-FRONTEND-SPEC.md` — screens & the **Learners Education brand color tokens** (use them exactly)
- `08-BUILD-PLAN.md` — **build in this milestone order (M0→M8)**
- `09-DEPLOYMENT-RENDER.md` — deploy

## Stack
Node + Express + Mongoose · MongoDB (Atlas) · React 18 + Vite · TanStack Query · JWT in httpOnly cookie · Zod validation · Render (one web service serves API + built SPA; one cron job runs the SLA sweep). Keep dependencies lean. **Simple but feature-rich** — no microservices, no GraphQL, no Redis.

## Repo layout (npm workspaces)
`server/` (Express API + workflow engine + jobs) · `client/` (React SPA) · the spec markdown files live in the **project root** · root `render.yaml` + scripts. Full code tree in `04-ARCHITECTURE-TRD.md §3`.

## Non-negotiable rules
1. **Single source of truth for the workflow** = `server/src/workflow/workflow.config.js`. Stages, phases, required fields, SLAs, automations and enums are defined ONCE there. The server validates against it; the client fetches it via `GET /api/meta/workflow`. Never hard-code the stage list anywhere else.
2. **All stage/status changes go through `transitionService.move()`** — the single guarded path. Models must not allow direct `stage` edits that skip the rules.
3. **Server is the authority.** RBAC, stage gates and ownership are enforced server-side on every request. The UI only hides what a user can't do; it never enforces.
4. **The 5 operating rules are invariants** (see `02 §7`): no idle leads (every open lead has an owner + dated open task); controlled movement (required fields before advancing); mandatory lost reason; dedupe on phone/whatsapp/email at capture; per-stage SLA.
5. **The closure gate is absolute:** a lead reaches "Admission Closed - Won" only if `docsVerified === true` AND `payment.status === 'paid'`. Payment confirmation is a team_lead/admin action.
6. **Activities are append-only** (audit trail). Never update or delete them.
7. **Validate every request body** with Zod; reject unknown fields.

## Commands (define these in package.json)
- `npm run dev` — server + client concurrently (Vite proxies /api)
- `npm run build` — build the client
- `npm run start` — start server, serve built client (production)
- `npm run seed` — seed admin + counsellors + sample leads
- `npm test` — run Vitest (+ supertest integration)

## Coding conventions
- Modern ESM, async/await, no callbacks. Small, single-purpose modules.
- Services hold business logic; routes stay thin (validate → call service → respond).
- Errors: throw typed errors; the central error middleware maps them to `{ error: { code, message, details? } }` with the right status (400/401/403/404/409/422/500).
- Mongoose: define indexes in the schema; use `lean()` for read-only queries; aggregation pipelines for reports (never load all leads into JS).
- Frontend: TanStack Query for server state; invalidate affected queries after mutations; design tokens from `07-FRONTEND-SPEC.md §1` (Learners brand); no browser localStorage for app data (use server + query cache).
- Keep the workflow data-driven so adding a stage or changing an SLA is a one-file edit.

## Definition of done (per milestone)
Meet the DoD and acceptance checks in `08-BUILD-PLAN.md` for each milestone before moving on. Write/extend tests for that milestone's invariants. Commit per milestone referencing its ID (e.g. "M4: workflow engine").

## When unsure
The spec markdown files in the root win. If a detail is genuinely missing, choose the **simplest option consistent with the workflow and the 5 rules**, note the assumption in a code comment, and keep going — don't block.
