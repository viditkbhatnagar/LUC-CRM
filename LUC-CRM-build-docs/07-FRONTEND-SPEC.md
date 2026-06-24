# 07 · Frontend Specification

React 18 + Vite SPA. Data via TanStack Query against the API in `05`. Auth via cookie (fetch uses `credentials:'include'`). The interaction patterns and layout follow the approved Pablo demo; the **color system is aligned to the Learners Education brand green** (primary `#1D921E`, sampled directly from learnerseducation.com).

> The client never hard-codes the workflow. On load it fetches `GET /api/meta/workflow` and renders stages, phases, transitions and enums from that.

---

## 1. Design system — Learners Education brand

Put these in `client/src/styles/tokens.css` and use them everywhere. Fonts: **Space Grotesk** (display/headings) + **Inter** (body).

> **This block is the single source of truth for color.** It is the Learners Education brand green, sampled from the live site. To fine-tune, replace **only** the `--brand-*` lines here — nothing else needs to change.

```css
:root{
  /* Surfaces & ink (neutral base, faint green tint) */
  --canvas:#eef2ee; --surface:#ffffff; --surface-2:#f4f9f5; --surface-3:#eaf2ec;
  --ink:#10231a; --ink-2:#41544a; --ink-3:#73857b; --line:#e0e9e3; --line-2:#cfdcd4;

  /* Learners Education brand — green (PRIMARY) — sampled from learnerseducation.com */
  --brand:#1d921e; --brand-2:#167a18; --brand-3:#43a534; --brand-w:#e7f6e8;

  /* Deep CTA / sidebar base (the near-black "Ask Your Queries" button) */
  --dark:#0f211a; --dark-2:#1b3327;

  /* Functional state colors (CRM status semantics) */
  --teal:#0e9f8f; --teal-2:#0b7d70; --teal-w:#e5f6f3;
  --rose:#e11d48; --rose-w:#fff1f3; --amber:#c2740a; --amber-w:#fdf6e9;
  --emerald:#059669; --emerald-w:#e8faf1; --blue:#2563eb; --blue-w:#eef4ff;
  --violet:#7c3aed; --violet-w:#f3eeff;

  --shadow:0 10px 30px rgba(16,40,26,.10); --shadow-sm:0 2px 10px rgba(16,40,26,.06);
  --r:14px; --r-sm:10px; --r-lg:20px;
  --display:'Space Grotesk','Inter',system-ui,sans-serif;
  --body:'Inter',system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
}
```

**Color usage:**
- **Sidebar** = deep gradient (`--dark` → `--dark-2`), a near-black green; active nav item highlighted with `--brand` green.
- **Primary buttons / key actions** = `--brand` green; **hover** → `--brand-2`. Use `--dark` for a secondary high-contrast CTA (the site's "Ask Your Queries" style). `--brand-3` is the brighter accent green for highlights and active dots.
- **Score/status tags:** hot (≥80) rose, warm (≥60) amber, info (<60) blue; success = emerald/teal; overdue = rose.

**Phase colors** (used on boards, rails, flow map — these stay distinct for categorization): Capture & Qualify = `--blue`, Meeting = `--violet`, Convert = `--amber`, Close = `--teal` (the brand green is reserved for actions/sidebar, so the Close phase stays teal to remain distinct).

---

## 2. Routes & screens

| Route | Screen | Who | Purpose |
|-------|--------|-----|---------|
| `/login` | Login | all | Email/password sign-in |
| `/` | Dashboard / Overview | all | KPIs + today's priority queue (overdue first, then score) |
| `/pipeline` | Pipeline board | counsellor (own), manager (all) | Kanban grouped by the 4 phases |
| `/capture` | Lead capture | all | Intake form → creates a lead, opens workspace |
| `/leads/:id` | **Lead workspace** | owner/manager | The main working screen (below) |
| `/flow` | Flow map | all | Read-only reference of the 13 stages + exits |
| `/automation` | Automation matrix | all | Read-only reference of the 13 rules + SLA table |
| `/reports` | Dashboards | counsellor (own), manager (all) | The 5 reports |

Layout: persistent left **sidebar** (logo, nav, phase legend) + **topbar** (title, "New lead" button, notifications badge, user menu), matching the demo.

---

## 3. The Lead Workspace (most important screen)

This is where counsellors spend their day. Sections, top to bottom:

1. **Header** — lead name, leadCode · program · owner · "Stage X/13" (or exit tag), score tag, and a "Play path" demo toggle (optional, dev nicety).
2. **Lifecycle rail** — the 13 stages as a horizontal clickable rail; done/current states styled; clicking a stage requests that transition (subject to gates).
3. **Control deck** — three rows of buttons from `/api/meta/workflow` transitions for the current stage:
   - *Forward / outcome* (e.g. "Qualified ✓", "Send offer")
   - *Navigate* (Previous stage, Next stage, Reopen, Show on flow map)
   - *Any-stage exits* (Mark lost… → reason modal, No show, Defer intake)
4. **Exit-criteria note** — what's required to leave this stage + the SLA string.
5. **Three info cards** — Decision state (interest, objection, source, offer, confidence bar) · Next action (title, due date, overdue flag, last activity) · Required-at-this-stage (the gate fields as pass/fail chips, Rule 2).
6. **Operating-rule check** — live pass/fail for Rule 1 (owner, stage, next task, due date, last-activity) + lost-reason when terminal.
7. **Counsellor update** — edit objection, confidence (slider), next action + date, and add a note (→ activity). Save calls `PATCH /api/leads/:id`.
8. **Captured stage data** — an accordion that fills in as the lead advances, showing the data recorded at each completed stage (from the lead + activities).
9. **Activity timeline** — newest-first feed of all activities (notes, calls, stage changes, automations, system).

**Gate UX:** if a forward action is blocked, the button shows a tooltip / inline message listing missing required fields; on attempt, surface the API's `422` details. Closure ("→ Won") is visibly blocked until docs verified + payment confirmed, with a clear reason.

**Documents & payment:** within the Close phase, show a small panel to mark documents received/verified and (for managers) confirm payment, wired to `/documents` and `/payment/confirm`.

---

## 4. Pipeline board

- Four columns = four phases; each card shows name, score tag, program, exact stage chip, owner, next action, and an **overdue** flag when `nextActionDate < now`.
- Clicking a card opens its workspace.
- Below the board: an **Exited & on-hold** strip (lost/on-hold leads) with their reason; clicking opens the lead (and offers reopen).
- A phase-colored mini lifecycle rail sits above the board for orientation.
- Manager view shows all leads; counsellor view shows only theirs. A simple filter bar (owner/source/program/search) is a should-have.

---

## 5. Capture form

Mirror the demo's fields: name, phone/WhatsApp, email, city, program, source, interest, intake, counsellor (or auto-assign), key objection, consent, source/campaign notes. Plus a "Fill sample" helper for demos.
On submit → `POST /api/leads`:
- `201` → toast "Opportunity created", navigate to the new lead's workspace.
- `409` (duplicate) → show the existing lead and offer "Open existing" (admin: "Create anyway").

---

## 6. Dashboards (`/reports`)

Render from the report endpoints in `05`, using Recharts where a chart helps and tables where the demo uses tables:
1. **KPI strip** — total, won, lost, win rate (+ active, meetings, offers, overdue).
2. **Source performance** — table with a conversion bar per source.
3. **Funnel conversion** — bar list of live counts across all 13 stages.
4. **Counsellor performance** — table: assigned / meetings / offers / admissions / overdue.
5. **Stage aging** — table with healthy/stuck flags.
6. **Lost-reason analysis** — table: reason / count / recommended fix.
7. **Rule-1 check** — "Leads with no next task: N" (should be 0).

Counsellors see their own slice; managers see everything.

---

## 7. Flow map & automation (read-only reference)

- **Flow map:** render the 4 phase lanes with the 13 stage nodes (live counts per stage), decision branches, and the 9 exit chips — a faithful, mostly static reference built from `/api/meta/workflow` + funnel counts. Selecting a node shows its purpose, exit criteria, required fields, automations and SLA.
- **Automation matrix:** render the 13 rules (trigger → action, expandable to condition + escalation) and the SLA table. Static reference for training/onboarding.

---

## 8. Shared components

`Sidebar`, `Topbar`, `Toast`, `Modal`, `Tag`, `MetricCard`, `LifecycleRail`, `KanbanColumn`/`LeadCard`, `GateList` (pass/fail chips), `Timeline`, `ConfidenceBar`, `StageDataAccordion`, `RoleGate` (hide UI by role), `RequireAuth` (route guard), `ReportTable`, `Bar`.

---

## 9. State & data rules

- **Auth context** holds the current user; `RequireAuth` redirects to `/login` on 401.
- **TanStack Query** for all server data; invalidate the relevant queries after any mutation (transition, capture, payment) so boards/dashboards update immediately.
- Optimistic UI is optional; correctness first — always reflect the server's returned lead.
- All times shown in the user's locale; "overdue"/"due" derived from `nextActionDate`/`slaDueAt`.

---

## 10. Accessibility & responsiveness

- Desktop-first; collapse the sidebar and stack cards on tablet widths.
- Keyboard-focusable buttons/cards with visible focus rings (the demo already does this).
- Respect `prefers-reduced-motion`.
- Sufficient color contrast for tags/flags (don't rely on color alone — pair with text like "Overdue").
