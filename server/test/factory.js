// Shared test factories. Creates users with known passwords and returns a
// logged-in supertest agent (cookie persisted) for integration tests.
import request from 'supertest';
import { createUser } from '../src/services/authService.js';
import { createApp } from '../src/app.js';

export const TEST_PASSWORD = 'Passw0rd!';
export const app = createApp();

let counter = 0;
export async function makeUser(role = 'counsellor', overrides = {}) {
  counter += 1;
  const email = overrides.email || `${role}.${counter}@test.luc`;
  const user = await createUser({
    name: overrides.name || `${role} ${counter}`,
    email,
    password: TEST_PASSWORD,
    role,
  });
  return user;
}

// Returns a supertest agent already authenticated as a freshly-created user.
export async function agentFor(role = 'counsellor', overrides = {}) {
  const user = await makeUser(role, overrides);
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  if (res.status !== 200) throw new Error(`login failed for ${user.email}: ${res.status}`);
  agent.user = user;
  return agent;
}
