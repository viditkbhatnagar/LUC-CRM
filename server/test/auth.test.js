// M2 — auth issues a cookie; protected routes 401 without it; RBAC 403 for the
// wrong role; admin can manage users.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { setupTestDb } from './db.js';
import { app, makeUser, agentFor, TEST_PASSWORD } from './factory.js';

describe('M2 · auth & RBAC', () => {
  setupTestDb();

  it('rejects bad credentials with 401', async () => {
    await makeUser('counsellor', { email: 'sara@test.luc' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sara@test.luc', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('login sets an httpOnly luc_token cookie and /me reflects the role', async () => {
    const agent = await agentFor('team_lead');
    const setCookie = String(
      (await request(app).post('/api/auth/login').send({ email: agent.user.email, password: TEST_PASSWORD }))
        .headers['set-cookie'],
    );
    expect(setCookie).toMatch(/luc_token=/);
    expect(setCookie).toMatch(/HttpOnly/i);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe('team_lead');
  });

  it('protected route without a cookie → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects unknown fields on login (strict schema) → 422', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'x', role: 'admin' });
    expect(res.status).toBe(422);
  });

  it('counsellor is blocked from admin user-management → 403', async () => {
    const agent = await agentFor('counsellor');
    const res = await agent
      .post('/api/auth/users')
      .send({ name: 'X', email: 'x@test.luc', password: 'Passw0rd!', role: 'counsellor' });
    expect(res.status).toBe(403);
  });

  it('admin can create and list users', async () => {
    const admin = await agentFor('admin');
    const created = await admin
      .post('/api/auth/users')
      .send({ name: 'New Counsellor', email: 'newc@test.luc', password: 'Passw0rd!', role: 'counsellor' });
    expect(created.status).toBe(201);
    expect(created.body.user.email).toBe('newc@test.luc');

    const list = await admin.get('/api/auth/users');
    expect(list.status).toBe(200);
    expect(list.body.users.some((u) => u.email === 'newc@test.luc')).toBe(true);
  });

  it('logout clears the cookie', async () => {
    const agent = await agentFor('counsellor');
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    const clear = String(out.headers['set-cookie']);
    expect(clear).toMatch(/luc_token=;/);
  });
});
