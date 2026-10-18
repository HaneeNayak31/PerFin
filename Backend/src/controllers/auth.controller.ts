import type { CookieOptions, Request, Response } from 'express';
import { config } from '../config/env.js';
import { AUTH_COOKIE, currentUserId } from '../middleware/auth.middleware.js';
import * as authService from '../services/auth.service.js';

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/',
  };
}

export async function register(req: Request, res: Response) {
  const user = await authService.register(req.body);
  res.status(201).json(user);
}

export async function login(req: Request, res: Response) {
  const { token, user } = await authService.login(req.body);
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: config.jwtExpiresInSeconds * 1000 });
  res.json({ user });
}

/**
 * JWTs are stateless, so logout clears the cookie in this browser. A copied
 * token stays valid until it expires (see README: security limitations).
 */
export function logout(_req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE, cookieOptions());
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  res.json(await authService.getProfile(currentUserId(req)));
}
