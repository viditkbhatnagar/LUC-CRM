// Central error handler — the only place that shapes error responses.
// Maps typed AppErrors and common library errors to the
// { error: { code, message, details? } } envelope (04 §8).
import { AppError } from '../lib/errors.js';

// 404 for unmatched /api routes (must run before the SPA fallback).
export function apiNotFound(req, res, next) {
  if (req.path.startsWith('/api')) {
    return res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
  }
  next();
}

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature.
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details !== undefined) body.error.details = err.details;
    return res.status(err.status).json(body);
  }

  // Mongoose validation → 422
  if (err?.name === 'ValidationError') {
    const details = Object.fromEntries(
      Object.entries(err.errors || {}).map(([k, v]) => [k, v.message]),
    );
    return res
      .status(422)
      .json({ error: { code: 'VALIDATION', message: 'Validation failed', details } });
  }

  // Duplicate key (e.g. unique index) → 409
  if (err?.code === 11000) {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Duplicate key', details: err.keyValue },
    });
  }

  // Invalid ObjectId / cast → 400
  if (err?.name === 'CastError') {
    return res
      .status(400)
      .json({ error: { code: 'BAD_REQUEST', message: `Invalid ${err.path}` } });
  }

  // Unknown → 500 (do not leak internals)
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  return res
    .status(500)
    .json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
}
