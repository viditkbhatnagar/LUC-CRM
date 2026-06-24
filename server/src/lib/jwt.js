// JWT helpers. Token carries the minimal claim set; req.user is re-loaded
// from the DB on each request so role/active changes take effect immediately.
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

// Cookie options for the auth token (httpOnly, secure in prod, SameSite=Lax).
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // ~8h, matches JWT expiry
    path: '/',
  };
}
