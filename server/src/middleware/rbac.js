// Role-based access control. Gates restricted routes (payment confirm,
// reassign, user management) to the given roles. Must run after requireAuth.
import { Forbidden } from '../lib/errors.js';

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(Forbidden());
    if (!roles.includes(req.user.role)) {
      return next(Forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

// Convenience: team_lead OR admin (the "manager" tier).
export const requireManager = requireRole('team_lead', 'admin');
export const requireAdmin = requireRole('admin');
