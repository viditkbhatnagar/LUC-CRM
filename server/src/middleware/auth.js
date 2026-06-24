// Reads the luc_token cookie, verifies the JWT, loads req.user from the DB.
// No token / invalid / inactive → 401. The server is the authority (04 §5).
import { env } from '../config/env.js';
import { verifyToken } from '../lib/jwt.js';
import { User } from '../models/User.js';
import { Unauthorized } from '../lib/errors.js';

export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[env.cookieName];
    if (!token) throw Unauthorized();
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw Unauthorized('Session expired or invalid');
    }
    const user = await User.findById(payload.sub);
    if (!user || !user.active) throw Unauthorized();
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
