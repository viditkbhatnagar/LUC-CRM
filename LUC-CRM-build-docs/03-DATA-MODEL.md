# 03 · Data Model — MongoDB Schema

Database: **MongoDB** (Atlas M0 free tier for start). ODM: **Mongoose**. All `_id` are Mongo ObjectIds unless noted. All timestamps are stored as `Date` (UTC); Mongoose `timestamps: true` adds `createdAt`/`updatedAt` automatically.

> **Embedding vs referencing:** the lead document holds its *current* working state (denormalized for fast board/workspace reads). High-volume, append-only history (activities, stage transitions) lives in **separate collections** so leads stay small and reporting is efficient.

---

## Collections overview

| Collection | Purpose | Growth |
|------------|---------|--------|
| `users` | Counsellors, team leads, admins | Low |
| `leads` | The core opportunity + current state | Medium |
| `tasks` | Next actions / follow-ups (Rule 1, SLA) | High |
| `activities` | Timeline + audit log (all events) | Very high |
| `stagetransitions` | Funnel/aging/velocity analytics | High |
| `notifications` | In-app escalations & assignments | High |
| `counters` | Atomic sequential IDs (leadCode, admissionId, receiptNo) | Tiny |

---

## 1. `users`

```js
{
  _id: ObjectId,
  name: String,            // required
  email: String,           // required, unique, lowercase
  passwordHash: String,    // required, bcrypt
  role: String,            // enum: 'counsellor' | 'team_lead' | 'admin'
  active: Boolean,         // default true (soft-disable instead of delete)
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `{ email: 1 }` unique; `{ role: 1 }`; `{ active: 1 }`.
**Notes:** never store plaintext passwords. Seed at least one admin and three counsellors (Sara, Nadia, Ibrahim) for parity with the demo.

---

## 2. `leads` (core entity)

```js
{
  _id: ObjectId,
  leadCode: String,        // human id, unique, e.g. "LUC-2041" (from counters)

  // --- Contact ---
  name: String,            // required
  phone: String,           // required (raw, as entered)
  whatsapp: String,        // optional; defaults to phone if blank
  email: String,           // required
  city: String,            // e.g. "Dubai, UAE"

  // --- Normalized dedupe keys (Rule 4) ---
  normalizedPhone: String, // digits only, keep country code
  normalizedEmail: String, // lowercase + trim

  // --- Classification ---
  program: String,         // enum: 'Online MBA'|'Online BBA'|'DBA / Doctorate'|'Professional Certification'
  source: String,          // enum: 'Google Ads'|'Meta Ads'|'Website / SEO'|'WhatsApp'|'Referral'|'LinkedIn'|'Instagram'|'Walk-in'
  intake: String,          // e.g. "Sep 2026"
  consent: String,         // enum: 'all'|'whatsapp'|'email'|'none'
  campaignNotes: String,   // utm / keyword / referrer free text

  // --- Ownership & lifecycle ---
  owner: ObjectId,         // ref 'User' (counsellor); required for active leads
  stage: String,           // current pipeline stage slug (see workflow spec)
  lifecycleStatus: String, // enum: 'open'|'won'|'lost'|'on_hold'
  exitReason: String,      // terminal slug when lost/on_hold; else null

  // --- Sales signals ---
  score: Number,           // 0-100, rule-based
  interest: String,        // enum: 'High'|'Medium'|'Low'|'Needs more info'
  objection: String,       // enum incl. 'Not known yet'...'Resolved'
  confidence: Number,      // 0-100, counsellor-set conversion probability

  // --- Next action cache (mirrors the lead's open task; Rule 1) ---
  nextAction: String,
  nextActionDate: Date,    // due date that drives "overdue"
  lastActivityAt: Date,

  // --- SLA (Rule 5) ---
  slaDueAt: Date,          // recomputed on each stage entry
  slaBreached: Boolean,    // set by the sweep job

  // --- Offer / convert data ---
  offerAmount: String,     // e.g. "AED 22,000"
  discount: String,
  paymentPlan: String,     // e.g. "Full" | "3 instalments"
  offerExpiry: Date,
  offerSentAt: Date,

  // --- Documents ---
  docsRequested: [String], // e.g. ['Passport','Degree','CV','ID']
  docsReceived: Boolean,   // default false
  docsVerified: Boolean,   // default false
  missingDocs: [String],

  // --- Payment ---
  payment: {
    status: String,        // enum: 'none'|'pending'|'paid'  (default 'none')
    reference: String,
    dueDate: Date,
    confirmedAt: Date,
    confirmedBy: ObjectId  // ref 'User' (team_lead/admin)
  },

  // --- Won record ---
  admissionId: String,     // e.g. "ADM-2026-0001" (from counters, on win)
  receiptNo: String,       // e.g. "RCPT-00001" (from counters, on win)
  onboardingStatus: String,// e.g. "Welcome email sent"

  // --- Audit of furthest progress (for exited-lead reporting) ---
  maxStageReachedIndex: Number,

  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ leadCode: 1 }` unique
- `{ owner: 1, lifecycleStatus: 1 }` — counsellor's active list
- `{ stage: 1 }` — funnel counts
- `{ lifecycleStatus: 1 }` — won/lost/open splits
- `{ nextActionDate: 1 }` — overdue queries
- `{ slaDueAt: 1, slaBreached: 1 }` — SLA sweep
- `{ source: 1 }`, `{ program: 1 }` — report grouping
- `{ normalizedPhone: 1 }`, `{ normalizedEmail: 1 }` — dedupe lookups
- `{ createdAt: -1 }` — recent leads
- (Optional hard dedupe) partial unique index on `normalizedPhone` if LUC wants to *prevent* duplicates outright rather than flag them.

**Validation (enforce in Mongoose + service layer):**
- `lifecycleStatus = open` ⇒ `owner` and `stage` (1–12) present, `exitReason` null.
- `lifecycleStatus = won` ⇒ `stage = admission_won`, `admissionId` + `receiptNo` set.
- `lifecycleStatus ∈ {lost, on_hold}` ⇒ `exitReason` set.

---

## 3. `tasks`

The first-class "next action" that satisfies Rule 1 and feeds SLA/overdue views. A lead has at most **one open** task at a time (the active next action), plus historical done tasks.

```js
{
  _id: ObjectId,
  lead: ObjectId,          // ref 'Lead', required
  owner: ObjectId,         // ref 'User', required
  title: String,           // e.g. "First contact (call / WhatsApp)"
  type: String,            // enum: 'first_contact'|'follow_up'|'qualify'|'schedule_meeting'
                           //       |'meeting_prep'|'post_meeting'|'offer_follow_up'
                           //       |'collect_docs'|'verify_docs'|'payment_follow_up'|'reschedule'|'reengage'
  dueDate: Date,           // required
  status: String,          // enum: 'open'|'done'|'cancelled' (default 'open')
  stageAtCreation: String, // the lead's stage when this task was made
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `{ owner: 1, status: 1, dueDate: 1 }`; `{ lead: 1, status: 1 }`; `{ status: 1, dueDate: 1 }` (overdue sweep).
**Rule:** when a lead advances or exits, close the prior open task (`done`/`cancelled`) and, if still active, create the new one. Keep the lead's `nextAction`/`nextActionDate` in sync with the open task.

---

## 4. `activities` (timeline + audit log, append-only)

```js
{
  _id: ObjectId,
  lead: ObjectId,          // ref 'Lead', required
  type: String,            // enum: 'note'|'call'|'whatsapp'|'email'|'stage_change'
                           //       |'automation'|'system'|'task'|'onboarding_handoff'
  message: String,         // human-readable line, e.g. "Stage moved to Qualified"
  meta: Object,            // structured extras (e.g. { from, to, ruleKey, ... })
  actor: ObjectId,         // ref 'User'; null for system/automation
  actorLabel: String,      // 'system' | 'automation' | user name snapshot
  createdAt: Date
}
```
**Indexes:** `{ lead: 1, createdAt: -1 }`.
**Immutability:** never update or delete activity docs — append only. This is the audit trail.

---

## 5. `stagetransitions` (analytics + audit)

A focused record of each stage/status change, optimized for funnel, aging and velocity reports.

```js
{
  _id: ObjectId,
  lead: ObjectId,             // ref 'Lead'
  fromStage: String,          // slug or null (on create)
  toStage: String,            // slug or null (on exit)
  fromStatus: String,         // lifecycleStatus before
  toStatus: String,           // lifecycleStatus after
  exitReason: String,         // when moving to a terminal
  actor: ObjectId,            // ref 'User'; null if system
  reason: String,             // optional free text
  msInPreviousStage: Number,  // time spent in fromStage (for velocity)
  createdAt: Date
}
```
**Indexes:** `{ lead: 1, createdAt: 1 }`; `{ toStage: 1 }`; `{ toStatus: 1 }`; `{ exitReason: 1 }`.

---

## 6. `notifications`

```js
{
  _id: ObjectId,
  user: ObjectId,          // ref 'User' (recipient)
  type: String,            // enum: 'sla_breach'|'assignment'|'escalation'|'no_show'|'payment_due'|'system'
  message: String,
  lead: ObjectId,          // ref 'Lead' (optional deep link)
  read: Boolean,           // default false
  createdAt: Date
}
```
**Indexes:** `{ user: 1, read: 1, createdAt: -1 }`.

---

## 7. `counters` (atomic sequential IDs)

Single-doc-per-sequence pattern for generating human IDs without race conditions.

```js
{
  _id: String,             // sequence name: 'leadCode' | 'admissionId' | 'receiptNo'
  seq: Number              // last issued value
}
```
**Usage:** `findOneAndUpdate({_id:name}, {$inc:{seq:1}}, {new:true, upsert:true})`, then format:
- `leadCode`   → `LUC-${1000 + seq}`
- `admissionId`→ `ADM-${year}-${String(seq).padStart(4,'0')}`
- `receiptNo`  → `RCPT-${String(seq).padStart(5,'0')}`

---

## Sample documents

**A counsellor:**
```json
{ "name":"Sara", "email":"sara@luc.edu", "role":"counsellor", "active":true }
```

**An open lead at "Meeting Done":**
```json
{
  "leadCode":"LUC-2041", "name":"Sofia Almeida", "phone":"+971501234567",
  "normalizedPhone":"971501234567", "email":"sofia@example.com", "normalizedEmail":"sofia@example.com",
  "program":"DBA / Doctorate", "source":"LinkedIn", "owner":"<userId Sara>",
  "stage":"meeting_done", "lifecycleStatus":"open", "exitReason":null,
  "score":75, "interest":"High", "objection":"Employer approval", "confidence":62,
  "nextAction":"Send recognition + ROI pack", "nextActionDate":"2026-06-24T08:00:00Z",
  "lastActivityAt":"2026-06-24T08:00:00Z", "slaDueAt":"2026-06-25T08:00:00Z",
  "docsReceived":false, "docsVerified":false, "payment":{"status":"none"}
}
```

**A won lead:**
```json
{
  "leadCode":"LUC-2013", "name":"Fatima Noor", "lifecycleStatus":"won", "stage":"admission_won",
  "docsVerified":true, "payment":{"status":"paid","reference":"PAY-44821"},
  "admissionId":"ADM-2026-0001", "receiptNo":"RCPT-00001", "onboardingStatus":"Welcome email sent"
}
```

**A lost lead (note retained exit stage):**
```json
{
  "leadCode":"LUC-2014", "name":"Bilal Ahmed", "lifecycleStatus":"lost",
  "exitReason":"lost_price_budget", "stage":"meeting_done", "maxStageReachedIndex":6,
  "nextAction":"", "nextActionDate":null
}
```

---

## Enum reference (keep in the shared workflow config)

- **role:** `counsellor`, `team_lead`, `admin`
- **program:** `Online MBA`, `Online BBA`, `DBA / Doctorate`, `Professional Certification`
- **source:** `Google Ads`, `Meta Ads`, `Website / SEO`, `WhatsApp`, `Referral`, `LinkedIn`, `Instagram`, `Walk-in`
- **interest:** `High`, `Medium`, `Low`, `Needs more info`
- **lifecycleStatus:** `open`, `won`, `lost`, `on_hold`
- **payment.status:** `none`, `pending`, `paid`
- **stage slugs & exitReason slugs:** see `02-WORKFLOW-SPEC.md` §1 and §2.
