// M3 — lead capture (US-1), dedupe (Rule 4), RBAC scoping, meta payload.
import { describe, it, expect } from 'vitest';
import { setupTestDb } from './db.js';
import { app, makeUser, agentFor } from './factory.js';
import { Lead } from '../src/models/Lead.js';
import { Task } from '../src/models/Task.js';
import { Activity } from '../src/models/Activity.js';

const sample = (over = {}) => ({
  name: 'Omar Khan',
  phone: '+971 50-111 2233',
  email: 'Omar.Khan@Example.com',
  program: 'Online MBA',
  source: 'Google Ads',
  interest: 'High',
  ...over,
});

describe('M3 · lead capture & dedupe', () => {
  setupTestDb();

  it('captures a lead at new_lead with owner, task and creation activities (US-1)', async () => {
    const agent = await agentFor('counsellor');
    const res = await agent.post('/api/leads').send(sample());
    expect(res.status).toBe(201);
    const lead = res.body.lead;
    expect(lead.stage).toBe('new_lead');
    expect(lead.lifecycleStatus).toBe('open');
    expect(lead.leadCode).toMatch(/^LUC-\d+$/);
    expect(lead.owner).toBeTruthy();
    expect(lead.slaDueAt).toBeTruthy();
    expect(lead.normalizedPhone).toBe('97150111 2233'.replace(/\D/g, '')); // digits only
    expect(lead.normalizedEmail).toBe('omar.khan@example.com');

    // Rule 1: exactly one open action task
    const tasks = await Task.find({ lead: lead._id, kind: 'action', status: 'open' });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].type).toBe('first_contact');

    // creation + acknowledgement + task activities exist
    const acts = await Activity.find({ lead: lead._id });
    const types = acts.map((a) => a.type);
    expect(types).toEqual(expect.arrayContaining(['system', 'automation', 'task']));
  });

  it('returns 409 with existingLead on a duplicate phone/email and creates no 2nd record', async () => {
    const agent = await agentFor('counsellor');
    await agent.post('/api/leads').send(sample());
    const dup = await agent.post('/api/leads').send(sample({ name: 'Different Name' }));
    expect(dup.status).toBe(409);
    expect(dup.body.existingLead).toBeTruthy();
    expect(await Lead.countDocuments()).toBe(1);
  });

  it('admin can ?force=true to create a duplicate, linked via duplicateOf', async () => {
    const counsellor = await agentFor('counsellor'); // ensures an active counsellor for assignment
    await counsellor.post('/api/leads').send(sample());
    const admin = await agentFor('admin');
    const forced = await admin.post('/api/leads?force=true').send(sample());
    expect(forced.status).toBe(201);
    expect(forced.body.lead.duplicateOf).toBeTruthy();
    expect(await Lead.countDocuments()).toBe(2);
  });

  it('rejects unknown capture fields (strict) → 422', async () => {
    const agent = await agentFor('counsellor');
    const res = await agent.post('/api/leads').send(sample({ hacker: 'yes' }));
    expect(res.status).toBe(422);
  });

  it('round-robin assigns across active counsellors when no owner is given', async () => {
    await makeUser('counsellor');
    await makeUser('counsellor');
    await makeUser('counsellor');
    const admin = await agentFor('admin');
    const owners = new Set();
    for (let i = 0; i < 3; i += 1) {
      const r = await admin.post('/api/leads').send(sample({ phone: `+9715000000${i}`, email: `rr${i}@x.com` }));
      owners.add(String(r.body.lead.owner));
    }
    expect(owners.size).toBeGreaterThan(1); // rotated, not all to one
  });
});

describe('M3 · RBAC scoping & reads', () => {
  setupTestDb();

  it('counsellors see only their own leads; managers see all', async () => {
    const sara = await agentFor('counsellor');
    const nadia = await agentFor('counsellor');
    await sara.post('/api/leads').send(sample({ owner: String(sara.user._id), phone: '+971500000001', email: 's1@x.com' }));
    await nadia.post('/api/leads').send(sample({ owner: String(nadia.user._id), phone: '+971500000002', email: 'n1@x.com' }));

    const saraList = await sara.get('/api/leads');
    expect(saraList.body.leads).toHaveLength(1);
    expect(String(saraList.body.leads[0].owner._id || saraList.body.leads[0].owner)).toBe(String(sara.user._id));

    const admin = await agentFor('admin');
    const allList = await admin.get('/api/leads');
    expect(allList.body.total).toBeGreaterThanOrEqual(2);
  });

  it("a counsellor cannot read another counsellor's lead → 403", async () => {
    const sara = await agentFor('counsellor');
    const nadia = await agentFor('counsellor');
    const created = await nadia
      .post('/api/leads')
      .send(sample({ owner: String(nadia.user._id), phone: '+971500000003', email: 'n2@x.com' }));
    const res = await sara.get(`/api/leads/${created.body.lead._id}`);
    expect(res.status).toBe(403);
  });

  it('PATCH updates non-stage fields and appends a note activity', async () => {
    const agent = await agentFor('counsellor');
    const created = await agent.post('/api/leads').send(sample());
    const id = created.body.lead._id;
    const res = await agent.patch(`/api/leads/${id}`).send({ confidence: 70, note: 'Spoke to prospect' });
    expect(res.status).toBe(200);
    expect(res.body.lead.confidence).toBe(70);
    const notes = await Activity.find({ lead: id, type: 'note' });
    expect(notes).toHaveLength(1);
  });
});

describe('M3 · meta endpoint', () => {
  setupTestDb();

  it('serves the full workflow definition', async () => {
    const agent = await agentFor('counsellor');
    const res = await agent.get('/api/meta/workflow');
    expect(res.status).toBe(200);
    expect(res.body.stages).toHaveLength(13);
    expect(res.body.exitReasons).toHaveLength(9);
    expect(res.body.phases).toHaveLength(4);
    expect(res.body.transitions.new_lead[0].to).toBe('contact_attempted');
    expect(res.body.enums.programs).toContain('Online MBA');
  });
});
