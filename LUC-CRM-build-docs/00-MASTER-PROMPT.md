# 00 · Master Build Prompt

> **How to use:** place every markdown file in this package (including `CLAUDE.md`) in your empty repo's **root folder**, open Claude Code there, and paste everything below the line as your first message.

---

You are building a production CRM for **LUC (Learners Education)** — an online-education provider in Dubai — from a complete, pre-written specification. **Every specification document is in this project's root folder.** Read them fully and follow them precisely. Do not invent a different product or architecture; the spec is authoritative.

## Step 1 — Read everything, in this order
1. `CLAUDE.md` — your standing brief and the non-negotiable rules.
2. `README.md` — overview, conventions, tech stack, assumptions.
3. `01-PRD.md` — product requirements, the three roles, features, user stories.
4. `02-WORKFLOW-SPEC.md` — **THE CORE.** The 13-stage lead lifecycle, the 4 phases, the 9 exit paths, the full transition matrix, the closure gate, and the 5 operating rules. Internalize this completely — everything else serves it.
5. `03-DATA-MODEL.md` — the MongoDB schema (collections, fields, indexes, dedupe).
6. `04-ARCHITECTURE-TRD.md` — stack, repo structure, the guarded transition engine, auth & security.
7. `05-API-SPEC.md` — every REST endpoint and the server-enforced RBAC matrix.
8. `06-AUTOMATION-SLA-ENGINE.md` — the automation rules and the SLA engine/sweep.
9. `07-FRONTEND-SPEC.md` — screens, components, and the **Learners Education brand color tokens** (use them exactly as written in §1).
10. `08-BUILD-PLAN.md` — the milestone plan (M0→M8) you will execute.
11. `09-DEPLOYMENT-RENDER.md` — Render + MongoDB Atlas deployment.

Treat these as the single source of truth. Where a detail isn't specified, choose the **simplest option consistent with the workflow and the 5 rules**, leave a brief code comment noting the assumption, and continue. Only stop to ask if you are genuinely blocked.

## Step 2 — Confirm understanding (keep it short)
Before writing code, output a brief summary (≤ 20 lines) covering: the chosen stack, the 13 stages, the 5 operating rules, the closure gate, and the M0→M8 plan. This proves you've absorbed the spec. Then proceed immediately — do not wait for further input.

## Step 3 — Build end to end, milestone by milestone
Follow `08-BUILD-PLAN.md` exactly, **M0 → M8**. For each milestone:
- Implement all of its tasks.
- Meet its **Definition of Done** and acceptance checks before moving on.
- Write/extend tests for that milestone's invariants — especially the workflow invariants in `02-WORKFLOW-SPEC.md §10`.
- Commit with a message referencing the milestone (e.g. `M4: workflow engine`).
- Then continue to the next milestone. **Do not skip ahead or leave a milestone half-done.**

## Non-negotiable rules (do not violate these)
1. **One source of truth for the workflow:** stages, phases, required fields, SLAs, automations and enums live ONLY in `server/src/workflow/workflow.config.js`. Never hard-code the stage list anywhere else. The client fetches it via `GET /api/meta/workflow`.
2. **One guarded path for state changes:** every stage/status change goes through `transitionService.move()`. No code path may edit a lead's `stage` directly and bypass the gates.
3. **The server is the authority** for RBAC, stage gates and ownership. The UI only hides what a user can't do; it never enforces.
4. **Enforce the 5 operating rules and the closure gate server-side:** no idle leads (every open lead has an owner + a dated open task); required fields before advancing; mandatory exit reason; dedupe on phone/whatsapp/email at capture; per-stage SLA. A lead reaches "Admission Closed - Won" **only** if documents are verified **and** payment is confirmed (payment confirmation is a team-lead/admin action).
5. **Activities are append-only** (the audit trail). Validate every request body with Zod and reject unknown fields.

## Tech & deployment (already decided — build to these)
- **MongoDB** (Atlas) + **Node/Express/Mongoose** · **React 18 + Vite** · **JWT in an httpOnly cookie** · **Zod** validation · **TanStack Query** on the client.
- Deploy on **Render**: ONE web service where Express serves both the JSON API and the built React app (same origin), and ONE Render **cron job** running `server/src/jobs/slaSweep.js` for the SLA sweep. Produce a working `render.yaml` per `09-DEPLOYMENT-RENDER.md`.
- Keep dependencies lean. No microservices, no GraphQL, no Redis. **Simple but feature-rich.**
- Use the brand color tokens in `07-FRONTEND-SPEC.md §1` exactly (Learners brand green, primary `#1D921E`).
- Provide a seed script (`npm run seed`) that creates one admin, three counsellors, and the sample leads described in the spec.

## Whole-project definition of done
A deployable application where:
- a user logs in and sees role-appropriate data (counsellor / team lead / admin);
- a lead can be **captured** (with duplicate detection), **worked** through all 13 stages with every gate enforced, **exited** with a mandatory reason, and **closed to "Won"** only after documents are verified and payment is confirmed;
- **automations** fire on the right triggers and the **SLA sweep** runs on schedule, raising escalations;
- the **5 dashboards** (source, funnel, counsellor, aging, lost-reason) report correctly;
- the full happy path runs **locally and on Render**, with seed data.

**Begin now: do Step 1, then Step 2, then start M0.**
