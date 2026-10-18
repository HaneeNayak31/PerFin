import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/env.js';
import { forbidden } from '../utils/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection for cookie-based auth. Browsers always attach an Origin
 * header to cross-origin (and modern same-origin) state-changing requests,
 * so rejecting unknown origins stops another website from submitting forms
 * with the user's cookie. Requests without an Origin header (curl, server to
 * server, tests) cannot carry a victim's browser cookies, so they pass.
 * SameSite=Lax on the cookie is a second layer of the same defence.
 */
export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !config.frontendOrigins.includes(origin)) {
    throw forbidden('Request origin is not allowed');
  }
  next();
}

/** Logs method, path, status and duration only: no bodies, query strings or tokens. */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    const path = req.originalUrl.split('?')[0];
    console.log(`${req.method} ${path} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
}
