// The 13 automation rules (06 §1) for the read-only Automation matrix screen.
export const AUTOMATION_RULES = [
  { n: 1, trigger: 'New lead submitted', condition: 'any source', action: 'Create lead, assign owner, first-contact task, send acknowledgement', escalation: 'Notify counsellor & manager if no attempt within SLA' },
  { n: 2, trigger: 'Lead not contacted in SLA', condition: 'no attempt logged in window', action: 'Escalation alert', escalation: 'Team lead notified' },
  { n: 3, trigger: 'Contact completed', condition: 'spoke to prospect', action: 'Create qualification task', escalation: '—' },
  { n: 4, trigger: 'Lead qualified', condition: 'eligible + interested', action: 'Create meeting-scheduling task', escalation: '—' },
  { n: 5, trigger: 'Meeting scheduled', condition: 'date & time present', action: 'Confirmation + 24h & 2h reminders', escalation: 'No-show recovery task if unattended' },
  { n: 6, trigger: 'Meeting missed', condition: "prospect didn't attend", action: 'Move to No Show + reschedule task', escalation: 'Counsellor follow-up' },
  { n: 7, trigger: 'Meeting completed', condition: 'outcome required', action: 'Objection-specific proof + next-step task', escalation: 'Escalate if probability < 50' },
  { n: 8, trigger: 'Offer sent', condition: 'offer + plan present', action: 'Day 1 / 3 / 7 follow-ups, value anchor', escalation: 'Senior advisor if high-score lead silent 48h' },
  { n: 9, trigger: 'Offer accepted', condition: 'acceptance confirmed', action: 'Generate document checklist', escalation: '—' },
  { n: 10, trigger: 'Documents submitted', condition: 'files received', action: 'Assign verification task', escalation: 'Admissions after 2 days' },
  { n: 11, trigger: 'Documents verified', condition: 'approved', action: 'Create payment follow-up task', escalation: '—' },
  { n: 12, trigger: 'Payment received', condition: 'finance confirmed', action: 'Move to Won, notify admissions/onboarding', escalation: 'Admissions review' },
  { n: 13, trigger: 'Lead marked lost', condition: 'reason captured', action: 'Stop active follow-up automations', escalation: 'Require lost reason' },
];
