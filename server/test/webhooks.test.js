// Lead ingestion webhook — key-protected; reuses capture + dedupe.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { setupTestDb } from './db.js';
import { app, makeUser } from './factory.js';
import { env } from '../src/config/env.js';
import { Lead } from '../src/models/Lead.js';

describe('webhooks · lead ingestion', () => {
  setupTestDb();
  beforeAll(() => {
    env.ingestApiKey = env.ingestApiKey || 'test-ingest-key';
  });

  const payload = {
    full_name: 'Webhook Lead',
    phone_number: '+971500111222',
    email: 'webhook.lead@example.com',
    program: 'Online MBA',
    utm_campaign: 'meta-q3',
  };

  it('rejects without the ingest key (401)', async () => {
    const res = await request(app).post('/api/webhooks/leads').send(payload);
    expect(res.status).toBe(401);
  });

  it('ingests a lead with the key, mapping aliases + default source (201)', async () => {
    await makeUser('counsellor'); // an active counsellor for round-robin assignment
    const res = await request(app)
      .post('/api/webhooks/leads')
      .set('X-Ingest-Key', env.ingestApiKey)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.lead.name).toBe('Webhook Lead');
    expect(res.body.lead.source).toBe('Meta Ads'); // defaulted
    expect(res.body.lead.stage).toBe('new_lead');
    expect(res.body.lead.owner).toBeTruthy(); // round-robin assigned
  });

  it('dedupes on repeat ingestion (409)', async () => {
    await makeUser('counsellor');
    await request(app).post('/api/webhooks/leads').set('X-Ingest-Key', env.ingestApiKey).send(payload);
    const dup = await request(app)
      .post('/api/webhooks/leads')
      .set('X-Ingest-Key', env.ingestApiKey)
      .send(payload);
    expect(dup.status).toBe(409);
    expect(await Lead.countDocuments({ normalizedEmail: 'webhook.lead@example.com' })).toBe(1);
  });
});
