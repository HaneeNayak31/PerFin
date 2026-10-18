import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/env.js';
import { HttpError, isForeignKeyViolation, isUniqueViolation } from '../utils/errors.js';

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  413: 'Payload Too Large',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

function send(res: Response, statusCode: number, message: string, details?: unknown) {
  res.status(statusCode).json({
    statusCode,
    error: STATUS_NAMES[statusCode] ?? 'Error',
    message,
    ...(details === undefined ? {} : { details }),
  });
}

export function notFoundHandler(req: Request, res: Response) {
  send(res, 404, `Route ${req.method} ${req.path} not found`);
}

/**
 * Every error ends up here. Known errors become clean JSON responses; unknown
 * ones are logged on the server and returned as a generic 500 so stack traces
 * and SQL never reach the client.
 */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    return send(res, error.statusCode, error.message, error.details);
  }

  // Errors raised by express.json() / express.text() (bad JSON, body too large).
  if (error && typeof error === 'object' && 'type' in error && 'status' in error) {
    const status = Number((error as { status: unknown }).status);
    if (status === 413) return send(res, 413, 'Request body is too large');
    if (status === 400) return send(res, 400, 'Request body is not valid JSON');
  }

  if (isUniqueViolation(error)) return send(res, 409, 'A record with these values already exists');
  if (isForeignKeyViolation(error)) {
    return send(res, 409, 'This record is still referenced by other records');
  }

  const name = error instanceof Error ? error.name : 'UnknownError';
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Unhandled error on ${req.method} ${req.path}: ${name}: ${message}`);
  if (config.nodeEnv !== 'production' && error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  send(res, 500, 'Something went wrong. Please try again.');
}
