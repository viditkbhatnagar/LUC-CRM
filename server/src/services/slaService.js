// SLA computation (Rule 5 · 06 §2). slaDueAt = stage entry + follow-up SLA.
// "Stuck / max age" is derived in the stage-aging report (not stored here).
import { stageBySlug } from '../workflow/stateMachine.js';

// Returns the slaDueAt Date for entering `stageSlug` at `fromTime`, or null
// for terminal stages with no SLA (admission_won).
export function computeDueAt(stageSlug, fromTime = new Date(), lead = null) {
  const stage = stageBySlug(stageSlug);
  if (!stage || stage.slaMs == null) return null;

  // Meeting Scheduled: SLA runs "until the meeting date" when one is set.
  if (stageSlug === 'meeting_scheduled' && lead?.meetingDate) {
    return new Date(lead.meetingDate);
  }
  return new Date(fromTime.getTime() + stage.slaMs);
}

export default { computeDueAt };
