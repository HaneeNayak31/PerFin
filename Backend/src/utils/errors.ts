/** An error that is safe to show to API clients. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, details);
export const unauthorized = (message = 'Authentication required') => new HttpError(401, message);
export const forbidden = (message = 'Forbidden') => new HttpError(403, message);
export const notFound = (message = 'Not found') => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

/** Postgres SQLSTATE codes we translate into client errors. */
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

function readSqlState(error: unknown): string | undefined {
  let current: unknown = error;
  // The driver error may be wrapped one or more levels deep in `cause`.
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    const candidate = current as { sqlState?: unknown; code?: unknown; cause?: unknown };
    if (typeof candidate.sqlState === 'string') return candidate.sqlState;
    if (typeof candidate.code === 'string' && /^\d{5}$/.test(candidate.code)) return candidate.code;
    current = candidate.cause;
  }
  return undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  return readSqlState(error) === UNIQUE_VIOLATION;
}

export function isForeignKeyViolation(error: unknown): boolean {
  return readSqlState(error) === FOREIGN_KEY_VIOLATION;
}
