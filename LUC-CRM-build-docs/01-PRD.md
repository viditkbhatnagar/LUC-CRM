# 01 · Product Requirements Document (PRD)

**Product:** LUC CRM — Lead-to-Admission management system
**Owner:** LUC (online-education provider)
**Status:** Approved for build
**Source workflow:** Carried over from the retired third-party "Pablo" CRM

---

## 1. Background & problem

LUC runs paid and organic lead generation (Google Ads, Meta Ads, website/SEO, WhatsApp, referrals, LinkedIn, Instagram, walk-ins) for programs like Online MBA, Online BBA, DBA/Doctorate and Professional Certifications. Counsellors work each enquiry from first contact to a paid, document-verified admission.

Until now LUC rented "Pablo," a third-party CRM. LUC is bringing this in-house to:

- Own its data, workflow and roadmap.
- Remove per-seat vendor cost.
- Tailor the exact lead lifecycle, SLAs and automations LUC uses.

The lifecycle itself is **proven** — the job is to rebuild it as LUC's own application, not to redesign the process.

## 2. Goals

| Goal | Measure of success |
|------|--------------------|
| Replace Pablo for daily counsellor work | Counsellors run their full day in the new CRM |
| No lead sits idle | Every active lead always has an owner + a dated next task (Rule 1 check reads zero) |
| Controlled, auditable pipeline | Every stage change is gated and logged with who/when/why |
| Management visibility | The 5 dashboards reproduce source, funnel, counsellor, aging and lost-reason analytics |
| Simple to run | One deployable service on Render; data on MongoDB Atlas |

## 3. Non-goals (out of scope for v1)

- Marketing campaign management / ad-spend tracking.
- Full accounting / invoicing (we record payment *confirmation*, not run finance).
- Student LMS / post-admission onboarding (we hand off at "Won").
- Mobile native apps (responsive web only).
- AI lead scoring (score is a simple rule-based number for now).

## 4. Users & roles

| Role | Who | Primary needs |
|------|-----|---------------|
| **Counsellor** | Front-line sales/admissions staff | Work their assigned leads, advance stages, log activities, handle objections, hit SLAs |
| **Team Lead / Manager** | Supervises counsellors | See team pipeline, overdue/SLA breaches, reassign leads, view dashboards |
| **Admin** | Ops/IT owner | Manage users, see everything, configure (within reason), access all leads and reports |

### Role permissions (RBAC summary — full matrix in `05-API-SPEC.md`)

| Capability | Counsellor | Team Lead | Admin |
|------------|:---------:|:---------:|:-----:|
| View own leads | ✅ | ✅ | ✅ |
| View all leads | ❌ | ✅ | ✅ |
| Create / capture leads | ✅ | ✅ | ✅ |
| Advance / change stage on own leads | ✅ | ✅ | ✅ |
| Reassign lead owner | ❌ | ✅ | ✅ |
| Close as lost / on-hold | ✅ | ✅ | ✅ |
| Confirm payment (finance gate) | ❌ | ✅ | ✅ |
| View dashboards | own slice | ✅ all | ✅ all |
| Manage users | ❌ | ❌ | ✅ |

> Payment confirmation is restricted to Team Lead/Admin deliberately — it is the final money gate before a "Won" admission.

## 5. Feature list (prioritized)

### Must-have (MVP — required for launch)
1. **Auth & accounts** — secure login, roles, password hashing.
2. **Lead capture** — full intake form with auto-assignment, duplicate check, acknowledgement, SLA timer start.
3. **Pipeline board** — Kanban grouped by the 4 phases; each card shows exact stage, owner, next action, overdue flag.
4. **Lead workspace** — the single-lead working screen: lifecycle rail, decision/transition buttons, required-field gates, rule check, counsellor update, activity timeline, captured stage data.
5. **Controlled stage movement** — every transition validated against stage gates (Rule 2); illegal transitions blocked.
6. **Exit handling** — 9 lost/on-hold paths with mandatory reason (Rule 3); reopen/reactivate supported.
7. **Tasks & next actions** — every active lead has an open, dated task (Rule 1).
8. **SLA tracking** — per-stage SLA; overdue and breach detection; escalation to manager.
9. **Automations** — the 13 trigger→action rules (acknowledgement, task creation, reminders, follow-up sequences, escalations).
10. **Admission closure** — gate requiring documents verified **and** payment confirmed before "Won"; generates admission ID + receipt + onboarding handoff record.
11. **Dashboards** — the 5 reports: source performance, funnel conversion, counsellor performance, stage aging, lost-reason analysis.
12. **Activity/audit log** — who changed what and when, per lead.

### Should-have (fast-follow)
- In-app notifications centre for escalations and assignments.
- Lead ingestion webhook (Google/Meta lead ads → CRM).
- CSV export of leads and reports.
- Saved filters / search on the pipeline.

### Could-have (later)
- Real email/WhatsApp sending via providers.
- Configurable workflow (edit stages/SLAs from an admin UI).
- Bulk actions and lead import.
- Calendar integration for meetings.

## 6. Key user stories (acceptance-oriented)

> Format: *As a [role], I want [capability], so that [outcome].* Acceptance criteria are testable.

**US-1 — Capture a lead**
As a counsellor, I want to submit a new enquiry, so that it becomes a tracked opportunity.
- AC: Submitting with required fields creates a lead at stage `New Lead`.
- AC: An owner is assigned (chosen or round-robin), an acknowledgement activity is logged, a first-contact task is created with an SLA due time.
- AC: If phone/email matches an existing lead, the system flags a duplicate and does **not** silently create a second record (Rule 4).

**US-2 — Advance a lead**
As a counsellor, I want to move a lead forward only when its required info is captured, so that the pipeline stays clean.
- AC: The transition button is disabled / rejected if required fields for the current stage are missing (Rule 2).
- AC: A successful transition writes a stage-history record (from, to, by, timestamp).
- AC: The lead's next task and SLA recompute for the new stage.

**US-3 — Lose a lead**
As a counsellor, I want to close a lead with a reason, so that management can analyse why deals are lost.
- AC: Closing requires selecting one of the defined exit reasons (Rule 3).
- AC: Active follow-up automations stop; the lead can later be reopened/reactivated.

**US-4 — Never lose track**
As a team lead, I want to see leads breaching SLA or with no next task, so that nothing slips.
- AC: The dashboard shows overdue tasks and SLA breaches per counsellor.
- AC: The "leads with no next task" count is always reportable and should be zero in a healthy pipeline (Rule 1 check).

**US-5 — Close an admission**
As a team lead, I want to confirm payment before an admission is marked Won, so that money is real before we celebrate.
- AC: "Close admission" is blocked unless documents are verified **and** payment is confirmed.
- AC: On close, an admission ID and receipt number are generated and an onboarding handoff record is created.

**US-6 — Report to management**
As an admin, I want source/funnel/counsellor/aging/lost-reason dashboards, so that I can steer the team.
- AC: Each report reflects live data and matches the analytics defined in `06` and `05`.

## 7. Non-functional requirements

| Area | Requirement |
|------|-------------|
| **Security** | Passwords hashed (bcrypt). JWT in httpOnly, secure, SameSite cookie. RBAC enforced server-side on every endpoint — never trust the client. Input validated on the server. |
| **Auditability** | Every stage change and material edit is logged with actor + timestamp. Logs are immutable (append-only). |
| **Performance** | Pipeline and dashboards load in < 1.5s for up to ~50k leads. All hot query fields indexed (see `03`). |
| **Reliability** | SLA sweep runs on a schedule even if no user is online. Closure gate cannot be bypassed via the API. |
| **Usability** | Counsellor can work a lead end-to-end from one screen. Overdue and required-field states are visually obvious. |
| **Maintainability** | Workflow defined in one config module; adding a stage or changing an SLA is a single-file change. |
| **Data integrity** | A lead is always in a valid state: a stage **or** an exit reason, an owner, and (if active) a next task. |
| **Portability** | No Render-specific lock-in in app code; only deployment config is Render-specific. |

## 8. Glossary

- **Lead / Opportunity** — a prospective student enquiry tracked through the lifecycle. Used interchangeably.
- **Stage** — one of the 13 active pipeline positions.
- **Phase** — a group of stages (Capture & Qualify, Meeting, Convert, Close).
- **Exit / Terminal status** — a lead that has left the active funnel (lost, on-hold, duplicate, invalid, no-show, deferred).
- **Gate** — required fields/conditions that must be satisfied before a transition is allowed.
- **SLA** — the maximum time a lead should wait at a stage before action / escalation.
- **Won** — the success terminal: a paid, document-verified admission handed to onboarding.
