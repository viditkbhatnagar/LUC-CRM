# 02 · Workflow Specification — Lead Lifecycle State Machine

This is the **heart of the CRM**. Every other document serves what is defined here. Implement it exactly.

The workflow is a **state machine**: a lead is always in exactly one state, and may only move along **defined transitions**, and only when the **gate** for that transition is satisfied.

---

## 1. The shape: 13 stages in 4 phases

| # | Stage | Slug | Phase |
|---|-------|------|-------|
| 1 | New Lead | `new_lead` | A · Capture & Qualify |
| 2 | Contact Attempted | `contact_attempted` | A · Capture & Qualify |
| 3 | Connected / Introduction Done | `connected_intro` | A · Capture & Qualify |
| 4 | Qualified | `qualified` | A · Capture & Qualify |
| 5 | Meeting To Be Scheduled | `meeting_to_schedule` | B · Meeting |
| 6 | Meeting Scheduled | `meeting_scheduled` | B · Meeting |
| 7 | Meeting Done | `meeting_done` | B · Meeting |
| 8 | Post-Meeting Follow-up | `post_meeting_followup` | C · Convert |
| 9 | Offer & Payment Plan Sent | `offer_sent` | C · Convert |
| 10 | Offer Accepted / Documents Pending | `offer_accepted_docs_pending` | C · Convert |
| 11 | Documents Received / Verification | `docs_received_verification` | D · Close |
| 12 | Payment Pending | `payment_pending` | D · Close |
| 13 | Admission Closed - Won | `admission_won` | D · Close |

**Design rule (do not collapse):** Offer (9), Documents (10/11) and Payment (12) are **separate** stages on purpose. This lets LUC see *exactly* where a deal stalls and report on each step. Never merge them.

### Phase definitions

| Phase | Slug | Color token | Stages |
|-------|------|-------------|--------|
| A · Capture & Qualify | `capture` | `--blue` | 1–4 |
| B · Meeting | `meeting` | `--violet` | 5–7 |
| C · Convert | `convert` | `--amber` | 8–10 |
| D · Close | `close` | `--teal` | 11–13 |

---

## 2. The 9 exit / on-hold statuses (terminals)

A lead that leaves the active funnel takes one of these statuses. **A reason is always required (Rule 3).** None of these is a dead end — every one can be reopened/reactivated to `New Lead`.

| Exit status | Slug | Lifecycle bucket | When it applies |
|-------------|------|------------------|-----------------|
| Lost - Not Interested | `lost_not_interested` | lost | Prospect clearly says they are not interested |
| Lost - Price / Budget | `lost_price_budget` | lost | Cannot proceed for financial reasons |
| Lost - Not Eligible | `lost_not_eligible` | lost | Does not meet program eligibility |
| Lost - Not Reachable | `lost_not_reachable` | lost | Uncontactable after defined attempts |
| Lost - Competitor | `lost_competitor` | lost | Chose another institute/provider |
| No Show | `no_show` | on_hold | Meeting booked but not attended |
| Deferred / Future Intake | `deferred_future_intake` | on_hold | Interested, but wants a later intake |
| Duplicate Lead | `duplicate_lead` | lost | Same lead already exists |
| Invalid Lead | `invalid_lead` | lost | Phone/email/contact details are wrong |

> `on_hold` leads (No Show, Deferred) keep a forward path: No Show → reschedule a meeting; Deferred → re-engage before next intake. `lost` leads stop active follow-up but can be reopened.

---

## 3. Lifecycle status model (how to store state)

A lead carries **both** a stage and a lifecycle status. This keeps reporting clean.

```
lifecycleStatus ∈ { "open", "won", "lost", "on_hold" }

- open    → stage is one of 1–12, lead is actively worked
- won     → stage = admission_won (13)
- lost    → exitReason is one of the 5 Lost reasons / duplicate / invalid
- on_hold → exitReason is no_show or deferred_future_intake
```

- `stage`: the current pipeline stage (for `open`/`won`). For `lost`/`on_hold`, `stage` retains the **last active stage** the lead exited from (so we can report "where do we lose people?").
- `exitReason`: set only when `lifecycleStatus` is `lost` or `on_hold`; otherwise `null`.

This separation powers: funnel-by-stage (open leads), win-rate (won/total), lost-reason analysis (by exitReason), and exit-by-stage leakage analysis.

---

## 4. Per-stage specification

For each stage: **purpose**, **entry condition**, **required fields to advance (the gate — Rule 2)**, **exit criteria**, **automations fired on entry**, **follow-up SLA**, and **max age** before it's "stuck".

> Required fields are the gate: the forward transition is blocked until they are captured. Automations and SLA detail are cross-referenced in `06-AUTOMATION-SLA-ENGINE.md`.

### 1. New Lead
- **Purpose:** Lead has entered the CRM but has not been contacted.
- **Entry:** Created via capture form, webhook, or quick-create.
- **Required to advance:** Owner assigned; contact details present.
- **Exit criteria:** Owner assigned and first-contact task created.
- **On entry:** acknowledgement message; auto-assign owner; create first-contact task; duplicate check.
- **SLA:** First contact 15 min – 1 hr. **Max age:** 1 hour.

### 2. Contact Attempted
- **Purpose:** Counsellor has tried to reach the lead.
- **Required to advance:** Attempt method, date/time, call outcome, next follow-up date.
- **Exit criteria:** A call/WhatsApp/email attempt is logged.
- **On entry:** log attempt; schedule next follow-up; manager alert if SLA missed.
- **SLA:** Second attempt same day. **Max age:** 1 day.

### 3. Connected / Introduction Done
- **Purpose:** Lead reached; program explained.
- **Required to advance:** Program interest, interest level, preferred intake, channel, basic eligibility, next action.
- **Exit criteria:** Interest level, preferred program and next action captured.
- **On entry:** create qualification task.
- **SLA:** Qualify within 24 hrs. **Max age:** 2 days.

### 4. Qualified
- **Purpose:** Confirmed a valid sales opportunity.
- **Required to advance:** Eligibility, budget readiness, decision timeline, intake, objective, key objection.
- **Exit criteria:** Eligibility, budget, intake and timeline captured.
- **On entry:** create meeting-scheduling task.
- **SLA:** Meeting fixed within 48 hrs. **Max age:** 2 days.

### 5. Meeting To Be Scheduled
- **Purpose:** Qualified, but the meeting is not yet fixed.
- **Required to advance:** Proposed date, meeting mode, follow-up due, owner.
- **Exit criteria:** Follow-up task with a due date.
- **On entry:** propose slots; follow-up task.
- **SLA:** Fix meeting within 48 hrs. **Max age:** 2 days.

### 6. Meeting Scheduled
- **Purpose:** Meeting date and time confirmed.
- **Required to advance:** Date, time, mode, link/location, owner, reminder status.
- **Exit criteria:** Details, channel and reminder created.
- **On entry:** confirmation; 24h + 2h reminders; prep task.
- **SLA:** Reminders 24h & 2h before. **Max age:** until meeting date.

### 7. Meeting Done
- **Purpose:** Meeting completed with the prospect.
- **Required to advance:** Completed date, outcome, objections, program confirmed, payment discussed, next follow-up. **Outcome note is mandatory.**
- **Exit criteria:** Outcome, objections and next step recorded.
- **On entry:** require outcome note; create next-step task.
- **SLA:** Follow-up within 24 hrs. **Max age:** 1 day to follow-up.

### 8. Post-Meeting Follow-up
- **Purpose:** Handle objections and move toward acceptance.
- **Required to advance:** Objection category, follow-up note, next date, probability, decision timeline.
- **Exit criteria:** Follow-up task and decision timeline set.
- **On entry:** objection-based follow-up sequence.
- **SLA:** Active follow-up. **Max age:** 7 days.

### 9. Offer & Payment Plan Sent
- **Purpose:** Official offer and payment plan shared.
- **Required to advance:** Offer date, amount, discount, payment plan, expiry, channel.
- **Exit criteria:** Offer value, plan, expiry and sent date captured.
- **On entry:** send offer; Day 1/3/7 follow-ups; manager alert on SLA.
- **SLA:** Follow-up within 24 hrs · window 7 days. **Max age:** 7 days.

### 10. Offer Accepted / Documents Pending
- **Purpose:** Offer accepted; documents are being collected.
- **Required to advance:** Accepted date, docs requested, received status, missing docs, follow-up date.
- **Exit criteria:** Document checklist shared and tracked.
- **On entry:** generate document checklist.
- **SLA:** Follow-up every 2 working days. **Max age:** 5 working days.

### 11. Documents Received / Verification
- **Purpose:** Submitted documents are under review.
- **Required to advance:** Verification owner, date, missing list, remarks, approval status. **`docsVerified` must be true to advance.**
- **Exit criteria:** Verification complete; missing docs tracked.
- **On entry:** assign verification task.
- **SLA:** Verify within 2 working days. **Max age:** 2 working days.

### 12. Payment Pending
- **Purpose:** Secure payment and complete the admission.
- **Required to advance:** Amount due, plan, reference, due date, status, **finance confirmation (`payment.status = paid`)**.
- **Exit criteria:** Payment received and finance-confirmed.
- **On entry:** payment reminder; due-date alert; escalate overdue; notify admissions on receipt.
- **SLA:** Daily until payment / expiry. **Max age:** 7 days.

### 13. Admission Closed - Won
- **Purpose:** Lead converted; handed to onboarding.
- **Required:** Payment date, reference, receipt no., admission ID, intake, onboarding status.
- **Exit criteria:** Receipt, admission ID and onboarding handoff done.
- **On entry:** notify admissions/onboarding; mark won; generate admission ID + receipt.
- **SLA:** — **Max age:** —

---

## 5. Transition matrix (allowed moves)

Forward / outcome transitions per stage. **Any transition not listed here is illegal** and must be rejected by the API. Backward navigation (to the immediately previous stage) is allowed for correction and is always logged.

| From stage | Allowed forward / branch transitions |
|------------|--------------------------------------|
| New Lead | → Contact Attempted |
| Contact Attempted | → Connected/Intro Done · **exit:** Lost - Not Reachable |
| Connected/Intro Done | → Qualified · **exit:** Lost - Not Interested |
| Qualified | → Meeting To Be Scheduled · **exit:** Lost - Not Eligible |
| Meeting To Be Scheduled | → Meeting Scheduled |
| Meeting Scheduled | → Meeting Done · **exit:** No Show |
| Meeting Done | → Offer & Payment Plan Sent · → Post-Meeting Follow-up · **exit:** Lost - Not Interested |
| Post-Meeting Follow-up | → Offer & Payment Plan Sent · **exit:** Lost - Price / Budget |
| Offer & Payment Plan Sent | → Offer Accepted / Documents Pending · **exit:** Lost - Price / Budget |
| Offer Accepted / Documents Pending | → Documents Received / Verification |
| Documents Received / Verification | → Payment Pending *(gate: docsVerified)* · → Offer Accepted / Documents Pending *(if incomplete)* |
| Payment Pending | → Admission Closed - Won *(gate: docsVerified **and** payment paid)* |
| Admission Closed - Won | *(terminal success — no forward transition)* |

### Any-stage exits (available from any open stage)
From **any** open stage (1–12) a counsellor may move a lead to:
- **Mark lost** → one of the 5 Lost reasons (modal requires a reason).
- **No Show** → on-hold; auto-creates a "Reschedule meeting" task due +1 day.
- **Deferred / Future Intake** → on-hold; auto-creates a "Re-engage before next intake" task due +30 days.

### Reopen / reactivate (from any terminal)
- Any `lost` status → **Reopen as New Lead** (stage resets to `new_lead`, lifecycleStatus → open, exitReason cleared, fresh first-contact task).
- `deferred_future_intake` → **Reactivate** to `new_lead`.

---

## 6. The closure gate (the most important rule)

A lead can move to **Admission Closed - Won** only if **both**:

1. `docsVerified === true`, **and**
2. `payment.status === "paid"` (finance-confirmed).

This must be enforced **server-side** in the transition endpoint, not just hidden in the UI. If either condition is false, reject with a clear error: *"Blocked — verify documents and confirm payment first."*

Payment confirmation itself is a **Team Lead/Admin** action (see RBAC). On successful close:
- generate `admissionId` (e.g. `ADM-2026-0001`) and `receiptNo` (e.g. `RCPT-00001`) via atomic counters,
- set `lifecycleStatus = won`, `stage = admission_won`,
- write an `onboarding_handoff` activity,
- stop SLA tracking for the lead.

---

## 7. The 5 mandatory operating rules

These are global invariants. They are enforced in data + API + UI.

### Rule 1 — No idle leads
Every **active** lead (lifecycleStatus = open) must always have: an **owner**, a **stage**, an open **next task**, a **due date**, and a **last-activity date**.
- Enforcement: lead creation and every transition create/refresh the open task and `lastActivityAt`. A reporting query lists any open lead with no open task — this should always be zero. (`Won` and terminal leads are exempt from needing a next task.)

### Rule 2 — Controlled stage movement
A lead may only advance when the **required fields for its current stage** are captured.
- Enforcement: the transition endpoint validates required fields for the *source* stage before allowing the move. Missing fields → `422` with the list of what's missing. Notable hard gates: Meeting Done requires an outcome; Docs Verification requires `docsVerified`; Won requires the closure gate.

### Rule 3 — Mandatory lost reason
Closing a lead as lost/on-hold **requires** an exit reason from the defined list.
- Enforcement: the close endpoint rejects a terminal move with no `exitReason`. This is what powers the lost-reason dashboard.

### Rule 4 — No duplicates
Duplicate leads are checked on **phone, WhatsApp and email** at capture.
- Enforcement: on create, normalize phone (digits only, keep country code) and email (lowercase/trim); query for an existing match. If found, return a `409 Conflict` with the existing lead reference; do **not** create a second record. (Admin may override to create anyway, which marks the new record's relationship to the original.)

### Rule 5 — SLA per stage
Every stage has a defined follow-up SLA and a max age; breaches escalate.
- Enforcement: on entering a stage, compute `slaDueAt`. A scheduled sweep flags breaches and raises manager escalations. Full table in `06`.

---

## 8. Lead scoring (simple, rule-based)

Score is a 0–100 number for prioritization, not ML.
- Base on capture: Referral or Google Ads source → 68; else High interest → 66; else 58. Default fallback 60.
- It may be nudged by confidence and stage progress, but keep it simple and deterministic.
- Used only for sorting the priority queue and visual emphasis (hot ≥ 80, warm ≥ 60, info < 60).

## 9. Decision branches (what the workspace shows)

The workspace renders the allowed transitions from §5 as buttons:
- **Forward / outcome** buttons (e.g. "Qualified ✓", "Send offer", "Offer accepted ✓").
- **Exit** buttons (e.g. "Not reachable", "Not interested") which open the reason flow.
- **Any-stage exits** (Mark lost / No show / Defer intake).
- **Navigation** (Previous stage, Next stage, Reopen, Restart) — always reversible, always logged.

## 10. Invariants checklist (for tests)

- [ ] A lead never has both an active `stage` (1–12) and an `exitReason`.
- [ ] A `won` lead has `stage = admission_won` and a generated admissionId + receiptNo.
- [ ] No transition outside the matrix in §5 ever succeeds via the API.
- [ ] Advancing with missing required fields returns 422.
- [ ] Closing with no reason returns 422.
- [ ] Won is impossible without docsVerified AND payment paid.
- [ ] Every open lead has exactly one open task.
- [ ] Every stage change writes one stage-history record.
