# 08 · Build Plan — Milestones for Claude Code

Build in this order. Each milestone has **tasks**, a **definition of done (DoD)**, and **acceptance checks**. Do not start a milestone until the previous one's DoD is met. Commit at each milestone.

> Golden rule throughout: the workflow lives in **`server/src/workflow/workflow.config.js`** only. Validation, automations and the client all read from it.

---

## M0 · Scaffold & deploy skeleton
**Goal:** an empty-but-deployable monorepo proving the pipeline works.

Tasks:
- Init monorepo with npm workspaces: root `package.json`, `server/`, `client/`.
- Server: Express app, `GET /api/health` → `{ ok:true }`, central error handler, env loader (`config/env.js`) with `.env.example`.
- Client: Vite + React + React Router skeleton, `tokens.css`, a placeholder Login + Dashboard.
- Vite dev proxy `/api` → server. Root script `npm run dev` runs both concurrently.
- Express serves the built client (`client/dist`) for non-`/api` routes in production.
- `render.yaml` (web service + cron placeholder). Commit.

**DoD:** `npm run dev` runs both; `/api/health` returns ok; production build serves the SPA. Deployed skeleton reachable on Render (or build verified locally if deploy is later).
**Acceptance:** health check passes; SPA loads behind the same origin.

---

## M1 · Data layer & workflow config
**Goal:** the database shape and the single source of truth.

Tasks:
- `config/db.js` Mongoose connection (Atlas URI from env), connect on boot.
- Implement all models from `03-DATA-MODEL.md`: `User, Lead, Task, Activity, StageTransition, Notification, Counter` — with the specified fields, enums, defaults and **indexes**.
- Implement `workflow/workflow.config.js`: stages (label/slug/index/phase/requiredFields/sla/maxAge), phases, exitReasons, transition matrix, automations per stage, enums — exactly per `02` and `06`.
- Implement `workflow/stateMachine.js`: `allowedActions(stage)`, `resolveAction(stage, action)`, `requiredFields(stage)`, `gatesFor(stage)` (docsVerified / closure), helpers `isTerminal`, `stageIndex`, `phaseOf`.
- `counterService.js` (atomic IDs) + formatters for leadCode/admissionId/receiptNo.
- `seed/seed.js`: create 1 admin + 3 counsellors (Sara, Nadia, Ibrahim) and the ~15 sample leads from the demo across various stages/terminals. `npm run seed`.

**DoD:** seed populates Atlas; models enforce enums; `stateMachine` unit tests pass.
**Acceptance:** unit tests for allowed/illegal moves and required fields are green; seeded data visible in Atlas.

---

## M2 · Auth & RBAC
**Goal:** secure sessions and role enforcement.

Tasks:
- `POST /auth/login` (bcrypt compare → JWT cookie), `/auth/logout`, `/auth/me`.
- `middleware/auth.js` (verify cookie → `req.user`), `middleware/rbac.js` (`requireRole`).
- Admin user management: `POST /auth/users`, `GET /auth/users`.
- Client: real Login page, `AuthContext`, `RequireAuth` guard, `RoleGate`. Fetch wrapper with `credentials:'include'` and 401 handling.

**DoD:** login issues a cookie; protected routes 401 without it; role-gated routes 403 for the wrong role; client redirects to login on 401.
**Acceptance:** login as each seeded role; `/auth/me` reflects role; a counsellor is blocked from an admin route.

---

## M3 · Lead core (capture, read, edit, dedupe)
**Goal:** create and view leads with hygiene rules.

Tasks:
- `leadService`: normalize phone/email, **dedupe check (Rule 4)**, owner assignment (given or round-robin), score calc, initial `slaDueAt`, first-contact task + creation activities.
- `POST /leads` (capture, full + quick), `GET /leads` (filters, RBAC scoping, pagination), `GET /leads/:id`, `PATCH /leads/:id` (non-stage fields + note→activity), `POST /leads/:id/activities`, `GET /leads/:id/activities`.
- `GET /meta/workflow` (serve the config).
- Client: Capture form (→ workspace on success; duplicate handling on 409), Pipeline board (Kanban by phase, RBAC-scoped), Dashboard priority queue, basic Lead Workspace shell rendering lead + timeline.

**DoD:** capturing creates a valid lead with task + activities; duplicates return 409; counsellors see only their leads.
**Acceptance:** US-1 acceptance criteria pass; board and workspace render seeded leads.

---

## M4 · Workflow engine (the core)
**Goal:** guarded stage movement with all gates and audit. **This is the milestone that makes it a CRM.**

Tasks:
- `transitionService.move()` per `04 §4`: illegal-move guard, RBAC, gate/required-field check (Rule 2), terminal + mandatory reason (Rule 3), apply change, task management (close old / open new, keep `nextAction` in sync — Rule 1), recompute SLA, write Activity + StageTransition.
- `POST /leads/:id/transition` (forward, exit, no_show, defer, reopen, reactivate).
- Closure gate: `→ admission_won` requires `docsVerified && payment.status==='paid'`; generate admissionId + receipt; onboarding handoff activity.
- `POST /leads/:id/documents`, `POST /leads/:id/payment/confirm` (team_lead/admin), `POST /leads/:id/reassign` (team_lead/admin).
- Client: wire the Workspace control deck (forward/exit/navigate), lifecycle rail transitions, gate UX (block + show missing fields), lost-reason modal, documents/payment panel, operating-rule check, counsellor update, captured-stage-data accordion.

**DoD:** every invariant in `02 §10` holds via the API; illegal transitions, missing-field 422s, mandatory-reason 422s, and the closure gate all behave correctly; each change is audited.
**Acceptance:** integration tests walk New Lead → Won and assert audit + tasks + admission record; blocked paths return correct codes.

---

## M5 · Automation & SLA engine
**Goal:** the system works leads on its own.

Tasks:
- `automationEngine.run(lead, event)` reading `onCreate/onEntry/onExit` from config; handlers create tasks/notifications/activities and call the messaging adapter.
- `adapters/messaging.js` + `consoleMessaging.js` (logs + activity).
- `slaService.computeDueAt()` per the SLA table; set on each stage entry.
- `jobs/slaSweep.js` (overdue surfacing, `slaBreached` flips + breach notifications, due reminder/follow-up sends, payment-due alerts) — idempotent.
- Notifications API + (should-have) client notifications panel/badge.

**DoD:** entering stages fires the right automations (visible as automation activities); the sweep flips breaches once and notifies owner+manager; marking lost stops follow-ups.
**Acceptance:** `06 §6` tests pass; running the sweep twice doesn't double-notify.

---

## M6 · Dashboards & reports
**Goal:** management visibility.

Tasks:
- `reportService` aggregation pipelines for: kpis, source-performance, funnel, counsellor-performance, stage-aging, lost-reasons, rule1-check.
- Report endpoints per `05` with RBAC scoping (own slice vs all).
- Client `/reports` screen: KPI strip + the 5 reports + rule-1 check, using tables and Recharts.

**DoD:** every report matches its spec and reflects live data; counsellor sees own slice, manager sees all.
**Acceptance:** US-6 criteria pass; numbers reconcile against seeded data.

---

## M7 · Reference screens & polish
**Goal:** complete the UI and harden.

Tasks:
- `/flow` (flow map from meta + funnel counts; node detail panel) and `/automation` (rules + SLA table) read-only references.
- Toasts, loading/empty/error states across screens, form validation messages, responsive sidebar/cards.
- Consistent error surfacing from API codes (409/422/403).
- Accessibility pass (focus rings, contrast, reduced motion).

**DoD:** all 8 screens implemented and navigable; errors and edge states handled gracefully.
**Acceptance:** manual walkthrough of every screen with seeded data; no dead ends.

---

## M8 · Deploy & verify on Render
**Goal:** live, scheduled, seeded.

Tasks:
- Finalize `render.yaml` (web service build/start + cron job command + schedule).
- Set env vars in Render; connect Atlas; run seed once (one-off job or guarded script).
- Verify the cron sweep runs on schedule in Render logs.
- Smoke test production: login, capture, advance to Won, view dashboards.
- Write a short `RUNBOOK` (env vars, how to seed, how to add a user, how to read logs).

**DoD:** production URL works end-to-end; cron sweep executes; data persists in Atlas.
**Acceptance:** the full happy path runs in production; SLA breach appears after the sweep.

---

## Cross-cutting (every milestone)
- Keep the workflow in one config file; never duplicate stage lists.
- Server is the authority for RBAC, gates and ownership — UI only hides, never enforces.
- Append-only activities; never mutate audit records.
- Validate every request body (Zod); reject unknown fields.
- Write/extend tests for each milestone's invariants before moving on.
- Commit per milestone with a clear message referencing the milestone ID.

## Suggested sequencing note for the agent
Backend M1→M6 can be built and tested headless first (with integration tests as the proof), then the client wired screen-by-screen — or build each milestone full-stack. Either is fine; the DoD gates are the same. Prioritize M4 correctness above visual polish.
