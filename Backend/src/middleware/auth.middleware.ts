import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { unauthorized } from '../utils/errors.js';

export const AUTH_COOKIE = 'perfin_token';

export interface AuthUser {
  id: number;
  email: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ email: user.email }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.jwtExpiresInSeconds,
    algorithm: 'HS256',
  });
}

/** Returns the user encoded in a token, or null if it is invalid or expired. */
export function verifyToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload === 'string') return null;
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0 || typeof payload.email !== 'string') return null;
    return { id, email: payload.email };
  } catch {
    return null;
  }
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * The token lives in an httpOnly cookie so page scripts cannot read it.
 * An Authorization: Bearer header is also accepted for API clients and tests.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = bearer ?? readCookie(req, AUTH_COOKIE);
  const user = token ? verifyToken(token) : null;
  if (!user) {
    throw unauthorized(token ? 'Session expired or invalid. Please sign in again.' : 'Authentication required');
  }
  req.user = user;
  next();
}

/** Use inside controllers that sit behind requireAuth. */
export function currentUserId(req: Request): number {
  if (!req.user) throw unauthorized();
  return req.user.id;
}
