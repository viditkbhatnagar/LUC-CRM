// Read-only reference prose for the Flow Map (02 §4). The dynamic workflow
// (stages/gates/SLAs/automations/counts) still comes from /api/meta/workflow +
// the funnel report — this is just the descriptive purpose/exit-criteria text.
export const STAGE_REFERENCE = {
  new_lead: { purpose: 'Lead has entered the CRM but has not been contacted.', exit: 'Owner assigned and first-contact task created.' },
  contact_attempted: { purpose: 'Counsellor has tried to reach the lead.', exit: 'A call/WhatsApp/email attempt is logged.' },
  connected_intro: { purpose: 'Lead reached; program explained.', exit: 'Interest level, preferred program and next action captured.' },
  qualified: { purpose: 'Confirmed a valid sales opportunity.', exit: 'Eligibility, budget, intake and timeline captured.' },
  meeting_to_schedule: { purpose: 'Qualified, but the meeting is not yet fixed.', exit: 'Follow-up task with a due date.' },
  meeting_scheduled: { purpose: 'Meeting date and time confirmed.', exit: 'Details, channel and reminder created.' },
  meeting_done: { purpose: 'Meeting completed with the prospect.', exit: 'Outcome, objections and next step recorded.' },
  post_meeting_followup: { purpose: 'Handle objections and move toward acceptance.', exit: 'Follow-up task and decision timeline set.' },
  offer_sent: { purpose: 'Official offer and payment plan shared.', exit: 'Offer value, plan, expiry and sent date captured.' },
  offer_accepted_docs_pending: { purpose: 'Offer accepted; documents are being collected.', exit: 'Document checklist shared and tracked.' },
  docs_received_verification: { purpose: 'Submitted documents are under review.', exit: 'Verification complete; missing docs tracked.' },
  payment_pending: { purpose: 'Secure payment and complete the admission.', exit: 'Payment received and finance-confirmed.' },
  admission_won: { purpose: 'Lead converted; handed to onboarding.', exit: 'Receipt, admission ID and onboarding handoff done.' },
};
