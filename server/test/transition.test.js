// M4 — the workflow engine invariants (02 §10). The core of the system.
import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from './db.js';
import { agentFor, makeUser } from './factory.js';
import { Lead } from '../src/models/Lead.js';
import { Task } from '../src/models/Task.js';
import { Activity } from '../src/models/Activity.js';
import { StageTransition } from '../src/models/StageTransition.js';

const iso = (days = 0) => new Date(Date.now() + days * 86400000).toISOString();

// Per-source-stage payloads that satisfy each stage's gate (leaf names).
const PAYLOADS = {
  new_lead: {},
  contact_attempted: { attemptMethod: 'Call', attemptAt: iso(-1), callOutcome: 'Reached', nextActionDate: iso(1) },
  connected_intro: { program: 'Online MBA', interest: 'High', intake: 'Sep 2026', consent: 'all', eligibility: 'Eligible', nextAction: 'Qualify' },
  qualified: { eligibility: 'Eligible', budgetReadiness: 'Ready', decisionTimeline: 'This intake', intake: 'Sep 2026', objective: 'Career growth', objection: 'Schedule / timing' },
  meeting_to_schedule: { meetingDate: iso(2), meetingMode: 'Online', nextActionDate: iso(1) },
  meeting_scheduled: { meetingDate: iso(2), meetingTime: '15:00', meetingMode: 'Online', meetingLink: 'https://meet.luc/x', reminderStatus: 'Scheduled' },
  meeting_done: { meetingCompletedAt: iso(0), meetingOutcome: 'Positive — wants to proceed', objection: 'Resolved', program: 'Online MBA', paymentDiscussed: 'Yes', nextActionDate: iso(1) },
  post_meeting_followup: { objection: 'Resolved', followupNote: 'Sent ROI pack', nextActionDate: iso(1), confidence: 75, decisionTimeline: 'This intake' },
  offer_sent: { offerSentAt: iso(0), offerAmount: 'AED 30,000', discount: 'None', paymentPlan: '3 instalments', offerExpiry: iso(7), consent: 'all' },
  offer_accepted_docs_pending: { acceptedAt: iso(0), docsRequested: ['Passport', 'Degree'], docsReceived: true, missingDocs: [], nextActionDate: iso(2) },
  docs_received_verification: { verificationOwner: 'Sara', verifiedAt: iso(0), verificationRemarks: 'All clear', approvalStatus: 'Approved' },
  payment_pending: { dueDate: iso(5), paymentPlan: '3 instalments', reference: 'PAY-1' },
};

const FORWARD = {
  new_lead: 'contact_attempted',
  contact_attempted: 'connected_intro',
  connected_intro: 'qualified',
  qualified: 'meeting_to_schedule',
  meeting_to_schedule: 'meeting_scheduled',
  meeting_scheduled: 'meeting_done',
  meeting_done: 'offer_sent',
  offer_sent: 'offer_accepted_docs_pending',
  offer_accepted_docs_pending: 'docs_received_verification',
  docs_received_verification: 'payment_pending',
  payment_pending: 'admission_won',
};

async function capture(agent) {
  const res = await agent.post('/api/leads').send({
    name: 'Walk Lead', phone: `+9715${Math.floor(Math.random() * 1e8)}`,
    email: `walk${Math.floor(Math.random() * 1e8)}@x.com`,
    program: 'Online MBA', source: 'Referral', interest: 'High',
  });
  return res.body.lead;
}

const advance = (agent, id, from) =>
  agent.post(`/api/leads/${id}/transition`).send({ action: FORWARD[from], payload: PAYLOADS[from] });

describe('M4 · guarded transitions', () => {
  setupTestDb();
  let agent;
  beforeEach(async () => {
    agent = await agentFor('counsellor');
  });

  it('rejects an illegal move (New Lead → Qualified) with 400', async () => {
    const lead = await capture(agent);
    const res = await agent.post(`/api/leads/${lead._id}/transition`).send({ action: 'qualified' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ILLEGAL_TRANSITION');
  });

  it('blocks advancing with missing required fields (422 + missing list)', async () => {
    const lead = await capture(agent);
    await advance(agent, lead._id, 'new_lead'); // → contact_attempted
    const res = await agent
      .post(`/api/leads/${lead._id}/transition`)
      .send({ action: 'connected_intro', payload: {} });
    expect(res.status).toBe(422);
    // nextActionDate is already set (the follow-up task on entry); the
    // stageData capture fields are what's genuinely missing.
    expect(res.body.error.details.missing).toEqual(
      expect.arrayContaining(['stageData.attemptMethod', 'stageData.callOutcome']),
    );
  });

  it('rejects unknown/forbidden payload fields with 422', async () => {
    const lead = await capture(agent);
    await advance(agent, lead._id, 'new_lead');
    const res = await agent
      .post(`/api/leads/${lead._id}/transition`)
      .send({ action: 'connected_intro', payload: { ...PAYLOADS.contact_attempted, hacker: 'x' } });
    expect(res.status).toBe(422);
  });

  it('writes exactly one StageTransition + one stage_change activity per move, one open task', async () => {
    const lead = await capture(agent);
    const before = await Activity.countDocuments({ lead: lead._id, type: 'stage_change' });
    await advance(agent, lead._id, 'new_lead'); // → contact_attempted
    const st = await StageTransition.find({ lead: lead._id, toStage: 'contact_attempted' });
    expect(st).toHaveLength(1);
    expect(st[0].fromStage).toBe('new_lead');
    const after = await Activity.countDocuments({ lead: lead._id, type: 'stage_change' });
    expect(after - before).toBe(1);
    const openTasks = await Task.countDocuments({ lead: lead._id, kind: 'action', status: 'open' });
    expect(openTasks).toBe(1);
  });

  it('exit requires a reason (Rule 3) and retains the last active stage', async () => {
    const lead = await capture(agent);
    await advance(agent, lead._id, 'new_lead'); // contact_attempted
    const noReason = await agent.post(`/api/leads/${lead._id}/transition`).send({ action: 'exit' });
    expect(noReason.status).toBe(422);

    const exit = await agent
      .post(`/api/leads/${lead._id}/transition`)
      .send({ action: 'exit', exitReason: 'lost_not_reachable', reason: 'No answer' });
    expect(exit.status).toBe(200);
    const fresh = await Lead.findById(lead._id).lean();
    expect(fresh.lifecycleStatus).toBe('lost');
    expect(fresh.exitReason).toBe('lost_not_reachable');
    expect(fresh.stage).toBe('contact_attempted'); // retained, not cleared
    // invariant: never an active stage (1-12) AND a null exitReason mismatch
    expect(fresh.exitReason).not.toBeNull();
    // no open action task after exit
    expect(await Task.countDocuments({ lead: lead._id, kind: 'action', status: 'open' })).toBe(0);
  });

  it('no_show parks the lead on_hold with a reschedule task; reopen restores to New Lead', async () => {
    const lead = await capture(agent);
    await advance(agent, lead._id, 'new_lead');
    await advance(agent, lead._id, 'contact_attempted');
    await advance(agent, lead._id, 'connected_intro');
    await advance(agent, lead._id, 'qualified'); // → meeting_to_schedule
    await advance(agent, lead._id, 'meeting_to_schedule'); // → meeting_scheduled
    const ns = await agent.post(`/api/leads/${lead._id}/transition`).send({ action: 'no_show' });
    expect(ns.status).toBe(200);
    let fresh = await Lead.findById(lead._id).lean();
    expect(fresh.lifecycleStatus).toBe('on_hold');
    expect(fresh.exitReason).toBe('no_show');
    const resched = await Task.findOne({ lead: lead._id, type: 'reschedule', status: 'open' });
    expect(resched).toBeTruthy();
    const maxBefore = fresh.maxStageReachedIndex;

    const reopen = await agent.post(`/api/leads/${lead._id}/transition`).send({ action: 'reopen' });
    expect(reopen.status).toBe(200);
    fresh = await Lead.findById(lead._id).lean();
    expect(fresh.stage).toBe('new_lead');
    expect(fresh.lifecycleStatus).toBe('open');
    expect(fresh.exitReason).toBeNull();
    expect(fresh.maxStageReachedIndex).toBe(maxBefore); // furthest progress preserved
  });

  it('backward navigation is one step, ungated, and logged', async () => {
    const lead = await capture(agent);
    await advance(agent, lead._id, 'new_lead'); // contact_attempted
    await advance(agent, lead._id, 'contact_attempted'); // connected_intro
    const back = await agent.post(`/api/leads/${lead._id}/transition`).send({ action: 'back' });
    expect(back.status).toBe(200);
    expect(back.body.lead.stage).toBe('contact_attempted');
    const st = await StageTransition.findOne({ lead: lead._id, fromStage: 'connected_intro', toStage: 'contact_attempted' });
    expect(st).toBeTruthy();
  });
});

describe('M4 · closure gate + RBAC (the money gate)', () => {
  setupTestDb();

  // Walk a lead up to a given stage.
  async function walkTo(agent, target) {
    const lead = await capture(agent);
    let stage = 'new_lead';
    while (stage !== target) {
      const res = await advance(agent, lead._id, stage);
      if (res.status !== 200) throw new Error(`advance ${stage} failed: ${res.status} ${JSON.stringify(res.body)}`);
      stage = FORWARD[stage];
      if (stage === 'admission_won') break;
    }
    return lead;
  }

  it('HARD GATE A: docs→payment blocked until docsVerified=true', async () => {
    const agent = await agentFor('counsellor');
    const lead = await walkTo(agent, 'docs_received_verification');
    // Without verifying documents:
    const blocked = await agent
      .post(`/api/leads/${lead._id}/transition`)
      .send({ action: 'payment_pending', payload: PAYLOADS.docs_received_verification });
    expect(blocked.status).toBe(422);
    expect(blocked.body.error.details.gate).toBe('docsVerified');

    // Verify docs, then it advances.
    await agent.post(`/api/leads/${lead._id}/documents`).send({ docsReceived: true, docsVerified: true });
    const ok = await agent
      .post(`/api/leads/${lead._id}/transition`)
      .send({ action: 'payment_pending', payload: PAYLOADS.docs_received_verification });
    expect(ok.status).toBe(200);
    expect(ok.body.lead.stage).toBe('payment_pending');
  });

  it('HARD GATE B: Won is impossible without docsVerified AND payment paid; counsellor cannot self-confirm', async () => {
    const agent = await agentFor('counsellor');
    const manager = await agentFor('team_lead');
    const lead = await walkTo(agent, 'docs_received_verification');
    await agent.post(`/api/leads/${lead._id}/documents`).send({ docsReceived: true, docsVerified: true });
    await agent
      .post(`/api/leads/${lead._id}/transition`)
      .send({ action: 'payment_pending', payload: PAYLOADS.docs_received_verification });

    // payment not yet confirmed (no reference, not paid) → Won blocked (422)
    const blocked = await agent.post(`/api/leads/${lead._id}/transition`).send({ action: 'admission_won' });
    expect(blocked.status).toBe(422);
    expect((await Lead.findById(lead._id).lean()).lifecycleStatus).toBe('open');

    // counsellor cannot inject payment.status via payload (forbidden field → 422)
    const inject = await agent
      .post(`/api/leads/${lead._id}/transition`)
      .send({ action: 'admission_won', payload: { status: 'paid' } });
    expect(inject.status).toBe(422);

    // counsellor cannot confirm payment (RBAC 403)
    const selfConfirm = await agent.post(`/api/leads/${lead._id}/payment/confirm`).send({ reference: 'PAY-x' });
    expect(selfConfirm.status).toBe(403);

    // manager confirms payment (sets paid + reference)
    const confirm = await manager.post(`/api/leads/${lead._id}/payment/confirm`).send({ reference: 'PAY-9' });
    expect(confirm.status).toBe(200);

    // closure-gate message reachable: unverify docs → required fields pass but closure fails
    await agent.post(`/api/leads/${lead._id}/documents`).send({ docsVerified: false });
    const closureBlocked = await agent.post(`/api/leads/${lead._id}/transition`).send({ action: 'admission_won' });
    expect(closureBlocked.status).toBe(422);
    expect(closureBlocked.body.error.message).toMatch(/verify documents and confirm payment/i);

    // re-verify → Won succeeds
    await agent.post(`/api/leads/${lead._id}/documents`).send({ docsVerified: true });
    const won = await agent.post(`/api/leads/${lead._id}/transition`).send({ action: 'admission_won' });
    expect(won.status).toBe(200);

    const fresh = await Lead.findById(lead._id).lean();
    expect(fresh.lifecycleStatus).toBe('won');
    expect(fresh.stage).toBe('admission_won');
    expect(fresh.admissionId).toMatch(/^ADM-\d{4}-\d{4}$/);
    expect(fresh.receiptNo).toMatch(/^RCPT-\d{5}$/);
    expect(fresh.slaDueAt).toBeNull();
    // onboarding handoff activity written; no open action task remains
    expect(await Activity.countDocuments({ lead: lead._id, type: 'onboarding_handoff' })).toBe(1);
    expect(await Task.countDocuments({ lead: lead._id, kind: 'action', status: 'open' })).toBe(0);
  });

  it('full happy path New Lead → Won via the API leaves a complete audit trail', async () => {
    const agent = await agentFor('counsellor');
    const manager = await agentFor('admin');
    const lead = await walkTo(agent, 'docs_received_verification');
    await agent.post(`/api/leads/${lead._id}/documents`).send({ docsReceived: true, docsVerified: true });
    await agent.post(`/api/leads/${lead._id}/transition`).send({ action: 'payment_pending', payload: PAYLOADS.docs_received_verification });
    await manager.post(`/api/leads/${lead._id}/payment/confirm`).send({ reference: 'PAY-final' });
    const won = await agent.post(`/api/leads/${lead._id}/transition`).send({ action: 'admission_won' });
    expect(won.status).toBe(200);

    // 11 forward transitions: happy path skips post_meeting_followup
    // (meeting_done → offer_sent direct), so new_lead → Won is 11 edges.
    const transitions = await StageTransition.countDocuments({ lead: lead._id });
    expect(transitions).toBe(11);
  });

  it('reassign is manager-only (counsellor 403; team_lead 200)', async () => {
    const agent = await agentFor('counsellor');
    const manager = await agentFor('team_lead');
    const other = await makeUser('counsellor');
    const lead = await capture(agent);

    const denied = await agent.post(`/api/leads/${lead._id}/reassign`).send({ owner: String(other._id) });
    expect(denied.status).toBe(403);

    const ok = await manager.post(`/api/leads/${lead._id}/reassign`).send({ owner: String(other._id) });
    expect(ok.status).toBe(200);
    expect(String(ok.body.lead.owner)).toBe(String(other._id));
  });
});
