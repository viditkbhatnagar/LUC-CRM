# LUC CRM — In-House Build Documentation

This folder is the **complete specification package** for building the LUC lead-to-admission CRM in-house. It is written to be handed to **Claude Code** (or any engineering team) and executed end to end.

LUC previously rented a third-party CRM (codename "Pablo"). The lead lifecycle proven in that system is being rebuilt as LUC's own application. The workflow is **already validated by real use** — these documents formalize it for an engineering build, they do not invent new process.

---

## How to use this package

**Setup:** put **all** of these markdown files (this README, `00-MASTER-PROMPT.md`, `01`–`09`, and `CLAUDE.md`) directly in your **empty repository's root folder**. Then open Claude Code in that folder and paste the contents of `00-MASTER-PROMPT.md` as your first message. Claude Code will read every document, then build the app milestone by milestone.

1. Read this README, then `01-PRD.md` for the "what and why".
2. Read `02-WORKFLOW-SPEC.md` next — it is the heart of the system. Everything else serves it.
3. Build in the order defined in `08-BUILD-PLAN.md`. Do not skip milestones.
4. `CLAUDE.md` sits at the repo root and is auto-loaded by Claude Code as the standing brief.

> **Single source of truth rule:** the workflow (stages, gates, SLAs, automations) is defined **once** in a shared config module (`server/src/workflow/workflow.config.js`). The backend validation, the automation engine, and the frontend all read from it. Never hard-code stage lists in two places.

---

## Document index

| # | File | What it covers |
|---|------|----------------|
| — | `00-MASTER-PROMPT.md` | **The build kickoff prompt** — paste this into Claude Code to start |
| — | `README.md` | This index + build conventions |
| 01 | `01-PRD.md` | Product requirements: goals, users, roles, feature list, user stories, non-functional requirements |
| 02 | `02-WORKFLOW-SPEC.md` | The lead lifecycle state machine: 13 stages, 4 phases, 9 exit paths, transition rules, the 5 operating rules, stage gates |
| 03 | `03-DATA-MODEL.md` | MongoDB collections, schemas, indexes, dedupe strategy, sample documents |
| 04 | `04-ARCHITECTURE-TRD.md` | Technical design: stack, system architecture, repo structure, auth, jobs, integrations, config |
| 05 | `05-API-SPEC.md` | REST API: every endpoint, request/response shapes, validation, errors, auth |
| 06 | `06-AUTOMATION-SLA-ENGINE.md` | The 13 automation rules, the SLA table, escalations, and how the engine runs |
| 07 | `07-FRONTEND-SPEC.md` | Screens, routes, components, key interactions, and the design system (carried from the Pablo demo) |
| 08 | `08-BUILD-PLAN.md` | Phased milestones (M0–M8) with task checklists and definition-of-done |
| 09 | `09-DEPLOYMENT-RENDER.md` | Render + MongoDB Atlas deployment, `render.yaml`, env vars, cron jobs |
| — | `CLAUDE.md` | Project context & conventions for Claude Code (copy to repo root) |

---

## Tech stack at a glance

| Layer | Choice | Why |
|-------|--------|-----|
| Database | **MongoDB** (Atlas free tier M0) | Required. Flexible document model fits the lead + timeline shape. |
| Backend | **Node.js + Express + Mongoose** | Simple, well-trodden, fast to build, plays well with Mongo. |
| Frontend | **React + Vite** | Natural upgrade from the existing HTML/CSS demo; interaction patterns carry over, colors use the Learners Education brand palette (see `07-FRONTEND-SPEC.md §1`). |
| Auth | **JWT in httpOnly cookie** | Secure and simple because backend serves the frontend (same origin). |
| Hosting | **Render** | Required. One Web Service serves API + built frontend; one Cron Job runs SLA sweeps. |
| Jobs/SLA | **Render Cron Job** + in-request event automations | Simple now, no extra infrastructure. |
| Email / WhatsApp | **Adapter interface, console stub by default** | "Simple now, feature-rich later" — swap in real providers without touching business logic. |

**Design principle:** *simple but feature-rich.* Lean dependencies, one deployable service, no premature microservices — but the full workflow, all gates, all automations, all dashboards, and real RBAC are in scope from day one.

---

## Assumptions made (confirm or adjust)

These defaults were chosen so the build can proceed without blocking. Flag any you want changed.

- **Frontend = React** (not server-rendered). The demo is plain HTML; React is the chosen target.
- **Single Render service** serves both the API and the built React app (cheapest, simplest, avoids CORS/cookie friction).
- **Email/WhatsApp/lead-ingestion are real integration *points* but stubbed implementations** by default — functional, swappable, no third-party accounts required to run.
- **Desktop-first, responsive** down to tablet. Counsellors work primarily on laptops.
- **Workflow is treated as settled** (the 13 stages from the demo). Refinements are easy to make later because the workflow lives in one config file.
