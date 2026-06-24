# 05 · API Specification (REST)

Base path: `/api`. JSON in/out. Auth via `luc_token` httpOnly cookie. All mutating routes require auth; RBAC noted per route. Errors follow `{ error: { code, message, details? } }`.

Status codes: `400` illegal/bad · `401` unauthenticated · `403` forbidden · `404` not found · `409` duplicate · `422` validation/gate · `500` server.

---

## Auth

### POST `/api/auth/login`
Body: `{ "email": "sara@luc.edu", "password": "..." }`
→ `200` sets `luc_token` cookie, returns `{ user: { id, name, email, role } }`.
→ `401` on bad credentials.

### POST `/api/auth/logout`
→ `200` clears cookie.

### GET `/api/auth/me`
→ `200 { user }` (current session) or `401`.

### POST `/api/auth/users` — **admin only**
Create a user. Body: `{ name, email, password, role }` → `201 { user }`.

### GET `/api/auth/users` — **admin/team_lead**
List users (for assignment dropdowns). → `200 { users: [...] }`.

---

## Meta (workflow definition — single source of truth for the client)

### GET `/api/meta/workflow`
Returns the workflow config so the client never hard-codes it.
→ `200`:
```json
{
  "stages": [ { "slug":"new_lead", "label":"New Lead", "index":0, "phase":"capture",
                "requiredFields":["owner","contact"], "sla":"First contact 15 min – 1 hr", "maxAge":"1 hour" }, ... ],
  "phases": [ { "slug":"capture", "label":"Capture & Qualify", "color":"--blue", "stages":[...] }, ... ],
  "exitReasons": [ { "slug":"lost_not_interested", "label":"Lost - Not Interested", "bucket":"lost" }, ... ],
  "transitions": { "new_lead": [ { "action":"contact_attempted", "to":"contact_attempted", "kind":"forward" } ], ... },
  "enums": { "programs":[...], "sources":[...], "interest":[...] }
}
```

---

## Leads

### GET `/api/leads`
Query params: `status` (open|won|lost|on_hold), `stage`, `owner`, `source`, `program`, `overdue=true`, `q` (search name/email/leadCode), `page`, `limit` (default 50), `sort`.
RBAC: counsellor sees only their own (`owner` forced to self); team_lead/admin see all.
→ `200 { leads: [...], total, page, limit }`.

### GET `/api/leads/:id`
Full lead. Counsellor only if owner; else 403. → `200 { lead }`.

### POST `/api/leads` (capture)
Create a lead (full or quick form). Body (required *): `name*`, `phone*`, `email*`, `program*`, `source*`, plus optional `whatsapp, city, intake, interest, objection, consent, owner, campaignNotes`.
Behavior:
- Normalize phone/email; **dedupe check (Rule 4)** → if match, `409 { error, existingLead }`.
- Assign `owner` (given, else round-robin among active counsellors).
- Create at `stage=new_lead`, `lifecycleStatus=open`; compute `score`, `slaDueAt`.
- Create first-contact task; log "Lead created / Acknowledgement sent / First-contact task created" activities.
→ `201 { lead }`.
- Admin may pass `?force=true` to bypass dedupe (records the link to the original).

### PATCH `/api/leads/:id`
Update **non-stage** fields only (objection, confidence, interest, nextAction, nextActionDate, notes → appended as activity, offer/doc fields, etc.). Never changes `stage`/`lifecycleStatus` (use the transition route). Refreshes `lastActivityAt`.
→ `200 { lead }`.

### POST `/api/leads/:id/transition` — the guarded state change
The **only** way to move stage or exit. Body:
```json
{ "action": "qualified",            // an allowed action from the current stage
  "payload": { ... },               // any fields the gate requires (optional if already on lead)
  "exitReason": "lost_not_eligible",// required when action is a terminal/exit
  "reason": "free text" }           // optional note
```
Validation order (see `04` §4): illegal move → `400`; RBAC → `403`; gate/required fields → `422`; mandatory exit reason → `422`; closure gate → `422`.
On success: applies change, manages tasks, runs automations, writes audit.
→ `200 { lead }`.

Examples:
- Advance: `{ "action": "qualified", "payload": { "eligibility":"Eligible", "budgetReadiness":"Ready", "decisionTimeline":"This intake", "intake":"Sep 2026", "objection":"Schedule / timing" } }`
- Exit: `{ "action": "exit", "exitReason": "lost_price_budget", "reason":"Beyond budget" }`
- No show: `{ "action": "no_show" }`
- Reopen: `{ "action": "reopen" }` (from a terminal → new_lead)

### POST `/api/leads/:id/documents` 
Update document tracking. Body: `{ docsRequested?, docsReceived?, docsVerified?, missingDocs? }`.
RBAC: owner/team_lead/admin. Setting `docsVerified=true` is what unlocks docs→payment.
→ `200 { lead }`.

### POST `/api/leads/:id/payment/confirm` — **team_lead/admin only**
Confirm finance payment. Body: `{ reference, amount?, plan? }` → sets `payment.status=paid`, `confirmedBy`, `confirmedAt`; logs activity. This is the money gate before Won.
→ `200 { lead }`.

### POST `/api/leads/:id/reassign` — **team_lead/admin only**
Body: `{ owner: "<userId>" }` → reassign + activity + notification to new owner.
→ `200 { lead }`.

---

## Tasks

### GET `/api/tasks`
Params: `owner` (self for counsellor), `status` (open|done), `overdue=true`, `lead`.
→ `200 { tasks: [...] }`.

### POST `/api/tasks/:id/complete`
Mark a task done (and optionally create a follow-up). → `200 { task }`.
(Most tasks are created/closed automatically by transitions; this supports manual completion/logging.)

---

## Activities

### GET `/api/leads/:id/activities`
Timeline for a lead, newest first, paginated. → `200 { activities: [...] }`.

### POST `/api/leads/:id/activities`
Log a manual activity (note/call/whatsapp/email). Body: `{ type, message }`. Refreshes `lastActivityAt`.
→ `201 { activity }`.

---

## Notifications

### GET `/api/notifications` → current user's notifications `{ notifications, unread }`.
### POST `/api/notifications/:id/read` → mark read.
### POST `/api/notifications/read-all` → mark all read.

---

## Reports / Dashboards

All RBAC: counsellor gets own slice; team_lead/admin get all. All computed via aggregation pipelines.

### GET `/api/reports/kpis`
→ `{ total, active, qualifiedPlus, meetings, offersOut, won, lost, overdue, winRate }`.

### GET `/api/reports/source-performance`
→ `[ { source, leads, admissions, conversionPct } ]` (sorted by leads desc).

### GET `/api/reports/funnel`
→ `[ { stage, label, count } ]` for all 13 stages (live counts).

### GET `/api/reports/counsellor-performance`
→ `[ { counsellor, assigned, meetings, offers, admissions, overdue } ]`.

### GET `/api/reports/stage-aging`
→ `[ { stage, label, open, maxAge, stuckCount, flag } ]` (flag: healthy | stuck).

### GET `/api/reports/lost-reasons`
→ `[ { reason, label, count, recommendedFix } ]`.
Recommended-fix map (carry from demo): Not Interested → improve qualification & nurturing; Price/Budget → offer plans/scholarships earlier; Not Eligible → tighten lead-source targeting; Not Reachable → faster speed-to-lead; Competitor → sharpen recognition/ROI proof; No Show → stronger reminders & confirmation; Deferred → nurture to next intake; Duplicate → dedupe at capture; Invalid → validate contact fields.

### GET `/api/reports/rule1-check`
→ `{ leadsWithNoTask: <count> }` — should be 0 in a healthy pipeline.

---

## Webhooks (lead ingestion — should-have)

### POST `/api/webhooks/leads`
Header: `X-Ingest-Key: <INGEST_API_KEY>` (else 401). Body maps external lead-ad payloads → capture. Runs the same create+dedupe+assign path. → `201 { lead }` or `409`.

---

## RBAC matrix (server-enforced)

| Endpoint group | Counsellor | Team Lead | Admin |
|----------------|:---------:|:---------:|:-----:|
| Login / me / logout | ✅ | ✅ | ✅ |
| Leads — read own | ✅ | ✅ | ✅ |
| Leads — read all | ❌ | ✅ | ✅ |
| Leads — create / capture | ✅ | ✅ | ✅ |
| Leads — transition (own) | ✅ | ✅ | ✅ |
| Documents update (own) | ✅ | ✅ | ✅ |
| Payment confirm | ❌ | ✅ | ✅ |
| Reassign owner | ❌ | ✅ | ✅ |
| Reports — own slice | ✅ | — | — |
| Reports — all | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Webhook ingest | (key-based, not user) | | |

> Counsellors are always scoped to `owner = self` on reads and mutations. Attempting to act on another counsellor's lead → `403`.

---

## Validation rules (Zod) — highlights

- `email` valid format; `phone` non-empty; `program`/`source`/`interest` must be in enum.
- Transition `action` must exist for the lead's current stage.
- Exit transitions require `exitReason ∈ exitReasons`.
- Payment confirm requires `reference`.
- Pagination `limit` capped at 100.
- Reject unknown fields on create/transition (strict schemas) to keep data clean.
