// M0 invariants: health check returns ok; unknown /api routes return JSON 404
// (never the SPA index.html). No DB required.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('M0 · app scaffold', () => {
  const app = createApp();

  it('GET /api/health → { ok: true }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('unknown /api route → JSON 404 (not SPA html)', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
