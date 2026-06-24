// M5 — automations fire on the right triggers; the sweep flips breaches once,
// notifies owner+manager, delivers reminders idempotently (06 §6).
import { describe, it, expect } from 'vitest';
import { setupTestDb } from './db.js';
import { agentFor, makeUser } from './factory.js';
import { Lead } from '../src/models/Lead.js';
import { Task } from '../src/models/Task.js';
import { Activity } from '../src/models/Activity.js';
import { Notification } from '../src/models/Notification.js';
import { runSweep } from '../src/jobs/slaSweep.js';

const iso = (days = 0) => new Date(Date.now() + days * 86400000).toISOString();

async function capture(agent) {
  const r = await agent.post('/api/leads').send({
    name: 'Auto Lead', phone: `+9715${Math.floor(Math.random() * 1e8)}`,
    email: `auto${Math.floor(Math.random() * 1e8)}@x.com`,
    program: 'Online MBA', source: 'Referral', interest: 'High',
    owner: undefined,
  });
  return r.body.lead;
}

describe('M5 · on-create / on-entry automations', () => {
  setupTestDb();

  it('capture fires Rule 1 + acknowledgement (task + automation activity)', async () => {
    const agent = await agentFor('counsellor');
    const lead = await capture(agent);
    const tasks = await Task.find({ lead: lead._id, kind: 'action', status: 'open' });
    expect(tasks).toHaveLength(1);
    const ack = await Activity.find({ lead: lead._id, type: 'automation' });
    expect(ack.some((a) => /acknowledgement/i.test(a.message))).toBe(true);
  });

  it('entering Offer Sent schedules Day 1/3/7 follow-ups as reminder tasks + automation activities', async () => {
    const agent = await agentFor('counsellor');
    const sid = agent.user._id;
    // capture owned by this counsellor so they can transition
    const r = await agent.post('/api/leads').send({
      name: 'Offer Lead', phone: '+9715offer01', email: 'offer1@x.com',
      program: 'Online MBA', source: 'Referral', interest: 'High', owner: String(sid),
    });
    const id = r.body.lead._id;
    const PAY = {
      new_lead: {}, contact_attempted: { attemptMethod: 'Call', attemptAt: iso(-1), callOutcome: 'Reached', nextActionDate: iso(1) },
      connected_intro: { program: 'Online MBA', interest: 'High', intake: 'Sep 2026', consent: 'all', eligibility: 'Eligible', nextAction: 'Qualify' },
      qualified: { eligibility: 'Eligible', budgetReadiness: 'Ready', decisionTimeline: 'This intake', intake: 'Sep 2026', objective: 'Growth', objection: 'Resolved' },
      meeting_to_schedule: { meetingDate: iso(2), meetingMode: 'Online', nextActionDate: iso(1) },
      meeting_scheduled: { meetingDate: iso(2), meetingTime: '15:00', meetingMode: 'Online', meetingLink: 'http://x', reminderStatus: 'Scheduled' },
      meeting_done: { meetingCompletedAt: iso(0), meetingOutcome: 'Positive', objection: 'Resolved', program: 'Online MBA', paymentDiscussed: 'Yes', nextActionDate: iso(1) },
    };
    const FWD = { new_lead: 'contact_attempted', contact_attempted: 'connected_intro', connected_intro: 'qualified', qualified: 'meeting_to_schedule', meeting_to_schedule: 'meeting_scheduled', meeting_scheduled: 'meeting_done', meeting_done: 'offer_sent' };
    let stage = 'new_lead';
    while (stage !== 'offer_sent') {
      const res = await agent.post(`/api/leads/${id}/transition`).send({ action: FWD[stage], payload: PAY[stage] });
      expect(res.status).toBe(200);
      stage = FWD[stage];
    }
    const reminders = await Task.find({ lead: id, kind: 'reminder', type: 'offer_follow_up' });
    expect(reminders.length).toBe(3); // Day 1/3/7
    const autos = await Activity.find({ lead: id, type: 'automation' });
    expect(autos.some((a) => /offer sent/i.test(a.message))).toBe(true);
    expect(autos.some((a) => /follow-ups/i.test(a.message))).toBe(true);
  });

  it('marking lost stops scheduled follow-ups', async () => {
    const agent = await agentFor('counsellor');
    const lead = await capture(agent);
    // exit immediately
    await agent.post(`/api/leads/${lead._id}/transition`).send({ action: 'exit', exitReason: 'lost_not_interested' });
    const auto = await Activity.find({ lead: lead._id, type: 'automation' });
    expect(auto.some((a) => /follow-ups stopped/i.test(a.message))).toBe(true);
  });
});

describe('M5 · SLA sweep (idempotent)', () => {
  setupTestDb();

  it('flips slaBreached once, notifies owner + manager, and does not double-notify', async () => {
    const agent = await agentFor('counsellor');
    await makeUser('team_lead'); // a manager to receive escalations
    const lead = await capture(agent);
    // force an overdue SLA
    await Lead.updateOne({ _id: lead._id }, { $set: { slaDueAt: new Date(Date.now() - 60000), slaBreached: false } });

    const first = await runSweep();
    expect(first.breaches).toBe(1);
    const fresh = await Lead.findById(lead._id).lean();
    expect(fresh.slaBreached).toBe(true);
    const notifs1 = await Notification.countDocuments({ type: 'sla_breach', lead: lead._id });
    expect(notifs1).toBeGreaterThanOrEqual(2); // owner + manager

    // second run: no new breach, no new notifications (idempotent)
    const second = await runSweep();
    expect(second.breaches).toBe(0);
    const notifs2 = await Notification.countDocuments({ type: 'sla_breach', lead: lead._id });
    expect(notifs2).toBe(notifs1);
  });

  it('delivers due reminder sends once (sets sentAt) and not again', async () => {
    const agent = await agentFor('counsellor');
    const lead = await capture(agent);
    // a due reminder
    await Task.create({
      lead: lead._id, owner: lead.owner, title: 'Day 1 follow-up', type: 'offer_follow_up',
      kind: 'reminder', dueDate: new Date(Date.now() - 1000), status: 'open',
    });
    const first = await runSweep();
    expect(first.reminders).toBe(1);
    const sent = await Task.findOne({ lead: lead._id, kind: 'reminder' });
    expect(sent.sentAt).toBeTruthy();
    const autos = await Activity.countDocuments({ lead: lead._id, type: 'automation', message: /Sent "Day 1 follow-up"/ });
    expect(autos).toBe(1);

    const second = await runSweep();
    expect(second.reminders).toBe(0); // already sent
  });
});
