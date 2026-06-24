# 06 · Automation & SLA Engine

Two cooperating mechanisms, no extra infrastructure:

1. **On-entry automations** — fire synchronously inside the transition when a lead enters a stage (or is created/exited).
2. **Scheduled sweep** — a Render Cron Job runs every 15 min to detect SLA breaches, overdue tasks, and due reminders.

All outbound messages (acknowledgement, reminders, follow-ups) go through the **messaging adapter** (`adapters/messaging.js`). The default `consoleMessaging` logs the send and writes an Activity, so the system is fully functional with no third-party accounts. Real email/WhatsApp providers implement the same interface later.

---

## 1. Automation rules (trigger → action)

These are the 13 rules carried from the proven workflow. Each fires its **action** automatically; the **human escalation** column says what a person is alerted to do.

| # | Trigger | Condition | Automated action | Human escalation |
|---|---------|-----------|------------------|------------------|
| 1 | New lead submitted | any source | Create lead, assign owner, create first-contact task, send acknowledgement | Notify counsellor & manager if no attempt within SLA |
| 2 | Lead not contacted in SLA | no attempt logged in window | Escalation alert | Team lead notified |
| 3 | Contact completed | spoke to prospect | Create qualification task | — |
| 4 | Lead qualified | eligible + interested | Create meeting-scheduling task | — |
| 5 | Meeting scheduled | date & time present | Confirmation + 24h & 2h reminders | No-show recovery task if unattended |
| 6 | Meeting missed | prospect didn't attend | Move to No Show + reschedule task | Counsellor follow-up |
| 7 | Meeting completed | outcome required | Send objection-specific proof + next-step task | Escalate if probability < 50 |
| 8 | Offer sent | offer + plan present | Day 1 / 3 / 7 follow-ups, value anchor | Senior advisor if high-score lead silent 48h |
| 9 | Offer accepted | acceptance confirmed | Generate document checklist | — |
| 10 | Documents submitted | files received | Assign verification task | Admissions after 2 days |
| 11 | Documents verified | approved | Create payment follow-up task | — |
| 12 | Payment received | finance confirmed | Move to Won, notify admissions/onboarding | Admissions review |
| 13 | Lead marked lost | reason captured | Stop active follow-up automations | Require lost reason |

### Implementation shape

In `workflow.config.js`, attach an `onEntry` automation list to each stage (and `onCreate`, `onExit` hooks). The `automationEngine.run(lead, event, ctx)` reads them and executes handlers:

```js
// conceptual
onEntry: {
  qualified:       ['createTask:schedule_meeting'],
  meeting_scheduled:['sendConfirmation','scheduleReminder:24h','scheduleReminder:2h','createTask:meeting_prep'],
  offer_sent:      ['sendOffer','scheduleFollowups:1,3,7','createTask:offer_follow_up'],
  offer_accepted_docs_pending:['generateDocChecklist','createTask:collect_docs'],
  docs_received_verification:['createTask:verify_docs'],
  payment_pending: ['sendPaymentReminder','createTask:payment_follow_up'],
  admission_won:   ['notifyOnboarding'] // admissionId/receipt generated in transition itself
}
```

Handlers are small, pure-ish functions that may: create a Task, write an Activity, create a Notification, call the messaging adapter, or set a field. Every automated effect writes an Activity of `type:'automation'` so the timeline shows what the system did.

**Reminders/follow-ups** ("24h", "Day 1/3/7") are realized as **scheduled future tasks/activities** with a `dueDate`; the sweep "sends" them when due. Keep it simple: no in-memory timers that die on redeploy.

---

## 2. SLA table (per stage)

`slaService.computeDueAt(stage, fromTime)` sets `lead.slaDueAt` on each stage entry using these targets.

| Stage | Follow-up SLA | Max age (breach threshold) |
|-------|---------------|----------------------------|
| New Lead | First contact 15 min – 1 hr | 1 hour |
| Contact Attempted | Second attempt same day | 1 day |
| Connected / Introduction Done | Qualify within 24 hrs | 2 days |
| Qualified | Meeting fixed within 48 hrs | 2 days |
| Meeting To Be Scheduled | Fix meeting within 48 hrs | 2 days |
| Meeting Scheduled | Reminders 24h & 2h before | until meeting date |
| Meeting Done | Follow-up within 24 hrs | 1 day |
| Post-Meeting Follow-up | Active follow-up | 7 days |
| Offer & Payment Plan Sent | Follow-up within 24 hrs · window 7 days | 7 days |
| Offer Accepted / Documents Pending | Every 2 working days | 5 working days |
| Documents Received / Verification | Verify within 2 working days | 2 working days |
| Payment Pending | Daily until payment / expiry | 7 days |
| Admission Closed - Won | — | — |

Store both the human SLA string (for display) and a machine duration (for `slaDueAt`). Keep working-day vs calendar-day handling simple in v1 (calendar hours/days are acceptable; note the simplification).

---

## 3. The scheduled sweep (`jobs/slaSweep.js`)

Runs every 15 minutes via Render Cron. Idempotent. Steps:

```
1. Mark overdue tasks:
   tasks where status='open' AND dueDate < now  → still 'open' but surfaced as overdue
   (overdue is derived: dueDate < now; no status change needed, but flag for dashboards).

2. Detect SLA breaches:
   leads where lifecycleStatus='open' AND slaDueAt < now AND slaBreached=false
     → set slaBreached=true
     → create Notification(type:'sla_breach') to the lead.owner AND their team_lead/admin
     → write Activity(type:'system', "SLA breached at <stage>")

3. Send due reminders / follow-ups:
   scheduled reminder tasks/activities whose dueDate <= now and not yet sent
     → messaging.send(...) (stub logs it) → write Activity(type:'automation')
     → mark sent.

4. Payment due alerts:
   leads at payment_pending with payment.dueDate < now and status!='paid'
     → Notification(type:'payment_due') + escalation Activity.
```

Guard the job entry with a `CRON_SECRET` if exposed as an HTTP endpoint; if run as a Render Cron *command*, no secret needed. Log a one-line summary (counts) each run.

---

## 4. Escalations & notifications

- Escalations create `notifications` for the owner and the relevant manager(s).
- The frontend shows an unread badge and a notifications panel (should-have); at minimum, the manager dashboard surfaces SLA breaches and overdue counts per counsellor (must-have).
- "Stuck" in the **Stage aging** report = open leads at a stage past its max age.

---

## 5. Messaging adapter contract

```js
// adapters/messaging.js  (interface)
export async function send({ channel, to, template, data, leadId }) { /* ... */ }
//   channel: 'email' | 'whatsapp' | 'sms'
//   returns { ok, providerMessageId? }

// adapters/consoleMessaging.js  (default)
//   logs the payload, writes an Activity(type:'automation', "Sent <template> via <channel>"),
//   returns { ok: true }.
```

Selecting the implementation is a single line in config (`MESSAGING_DRIVER=console`), so swapping to Nodemailer/Twilio/Meta later touches nothing else.

---

## 6. What must be true (tests)

- [ ] Creating a lead fires rule 1 (task + acknowledgement activity exist).
- [ ] Entering each stage sets a correct `slaDueAt`.
- [ ] The sweep flips `slaBreached` and creates exactly one breach notification per breach.
- [ ] Marking a lead lost stops scheduled follow-ups (no new sends after exit).
- [ ] Every automated effect is visible as an `automation` activity in the timeline.
- [ ] The sweep is idempotent (running twice doesn't double-notify).
