import { Router } from 'express';
import { env } from '../config/env.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { requireManager, requireAdmin } from '../middleware/rbac.js';
import { loginSchema, createUserSchema } from '../schemas/auth.schema.js';
import { login, createUser, listUsers, publicUser } from '../services/authService.js';
import { signToken, cookieOptions } from '../lib/jwt.js';

const router = Router();

// POST /api/auth/login → set cookie + return public user.
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const user = await login(req.body.email, req.body.password);
    res.cookie(env.cookieName, signToken(user), cookieOptions());
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout → clear cookie.
router.post('/logout', (req, res) => {
  res.clearCookie(env.cookieName, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

// GET /api/auth/me → current session.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// POST /api/auth/users — admin only.
router.post('/users', requireAuth, requireAdmin, validate(createUserSchema), async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/users — admin/team_lead (assignment dropdowns).
router.get('/users', requireAuth, requireManager, async (_req, res, next) => {
  try {
    const users = await listUsers();
    res.json({ users: users.map(publicUser) });
  } catch (err) {
    next(err);
  }
});

export default router;
