// Zod request validation. Every mutating route validates its body (and where
// relevant query/params) with a strict schema; unknown fields are rejected
// (05 §validation). On failure → 422 with field-level details.
import { ZodError } from 'zod';
import { Unprocessable } from '../lib/errors.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      // Replace with the parsed (and stripped/coerced) value.
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        return next(Unprocessable('Validation failed', details));
      }
      next(err);
    }
  };
}
