// M6 — reports reflect live data; rule1-check; RBAC slice vs all.
import { describe, it, expect } from 'vitest';
import { setupTestDb } from './db.js';
import { agentFor } from './factory.js';
import { Task } from '../src/models/Task.js';

const lead = (over = {}) => ({
  name: 'R', phone: `+9715${Math.floor(Math.random() * 1e8)}`,
  email: `r${Math.floor(Math.random() * 1e8)}@x.com`,
  program: 'Online MBA', source: 'Referral', interest: 'High', ...over,
});

describe('M6 · reports', () => {
  setupTestDb();

  it('rule1-check is 0 for a healthy pipeline and >0 after closing the open task', async () => {
    const agent = await agentFor('counsellor');
    const created = await agent.post('/api/leads').send(lead({ owner: undefined }));
    const id = created.body.lead._id;

    const healthy = await agent.get('/api/reports/rule1-check');
    expect(healthy.body.leadsWithNoTask).toBe(0);

    // artificially cancel the open action task → now the lead has no next task
    await Task.updateMany({ lead: id, kind: 'action' }, { $set: { status: 'cancelled' } });
    const unhealthy = await agent.get('/api/reports/rule1-check');
    expect(unhealthy.body.leadsWithNoTask).toBeGreaterThan(0);
  });

  it('funnel returns all 13 stages and counts reconcile', async () => {
    const agent = await agentFor('counsellor');
    await agent.post('/api/leads').send(lead({ owner: undefined }));
    const res = await agent.get('/api/reports/funnel');
    expect(res.body).toHaveLength(13);
    const newLead = res.body.find((s) => s.stage === 'new_lead');
    expect(newLead.count).toBeGreaterThanOrEqual(1);
  });

  it('kpis reflect captured leads', async () => {
    const agent = await agentFor('counsellor');
    await agent.post('/api/leads').send(lead({ owner: undefined }));
    await agent.post('/api/leads').send(lead({ owner: undefined, phone: '+97150000123', email: 'k2@x.com' }));
    const res = await agent.get('/api/reports/kpis');
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    expect(res.body.active).toBeGreaterThanOrEqual(2);
    expect(res.body).toHaveProperty('winRate');
  });

  it('source-performance groups by source with conversion', async () => {
    const agent = await agentFor('counsellor');
    await agent.post('/api/leads').send(lead({ owner: undefined, source: 'Google Ads' }));
    const res = await agent.get('/api/reports/source-performance');
    const ga = res.body.find((r) => r.source === 'Google Ads');
    expect(ga).toBeTruthy();
    expect(ga).toHaveProperty('conversionPct');
  });

  it('counsellor-performance is manager-only (counsellor 403)', async () => {
    const counsellor = await agentFor('counsellor');
    const denied = await counsellor.get('/api/reports/counsellor-performance');
    expect(denied.status).toBe(403);

    const manager = await agentFor('team_lead');
    const ok = await manager.get('/api/reports/counsellor-performance');
    expect(ok.status).toBe(200);
    expect(Array.isArray(ok.body)).toBe(true);
  });

  it('counsellor kpis are scoped to own leads (manager sees more)', async () => {
    const sara = await agentFor('counsellor');
    const nadia = await agentFor('counsellor');
    await sara.post('/api/leads').send(lead({ owner: String(sara.user._id), phone: '+97150000777', email: 's@x.com' }));
    await nadia.post('/api/leads').send(lead({ owner: String(nadia.user._id), phone: '+97150000888', email: 'n@x.com' }));

    const saraKpis = await sara.get('/api/reports/kpis');
    expect(saraKpis.body.total).toBe(1); // only her own

    const admin = await agentFor('admin');
    const allKpis = await admin.get('/api/reports/kpis');
    expect(allKpis.body.total).toBeGreaterThanOrEqual(2);
  });
});
