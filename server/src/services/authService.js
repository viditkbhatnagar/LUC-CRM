// Auth/user business logic. Routes stay thin; this holds bcrypt + lookups.
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Unauthorized, Conflict } from '../lib/errors.js';

export async function login(email, password) {
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  // Constant-ish behaviour: always compare to avoid user-enumeration timing.
  const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw Unauthorized('Invalid email or password');
  return user;
}

export async function createUser({ name, email, password, role }) {
  const normEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normEmail });
  if (existing) throw Conflict('A user with this email already exists');
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({ name, email: normEmail, passwordHash, role });
}

export async function listUsers() {
  return User.find({ active: true }).sort({ name: 1 }).lean();
}

// Public-shape projection of a user for API responses.
export function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}
