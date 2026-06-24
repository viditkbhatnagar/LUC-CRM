// Typed application errors. Services throw these; the central error
// middleware maps them to { error: { code, message, details? } } responses.

export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

// Convenience factories for the status codes defined in 04 §8 / 05.
export const BadRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
export const Unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'UNAUTHENTICATED', message);
export const Forbidden = (message = 'Forbidden') => new AppError(403, 'FORBIDDEN', message);
export const NotFound = (message = 'Not found') => new AppError(404, 'NOT_FOUND', message);
export const Conflict = (message, details) => new AppError(409, 'CONFLICT', message, details);
export const Unprocessable = (message, details) =>
  new AppError(422, 'UNPROCESSABLE', message, details);
export const IllegalTransition = (message, details) =>
  new AppError(400, 'ILLEGAL_TRANSITION', message, details);
