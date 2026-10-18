import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config/env.js';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { LoginDto, RegisterDto } from '../validation/dtos.js';

// Slows down password guessing: N attempts per IP per 15 minutes.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.authRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { statusCode: 429, error: 'Too Many Requests', message: 'Too many attempts. Try again later.' },
});

export const authRouter = Router();
authRouter.post('/register', authLimiter, validateBody(RegisterDto), auth.register);
authRouter.post('/login', authLimiter, validateBody(LoginDto), auth.login);
authRouter.post('/logout', auth.logout);
authRouter.get('/me', requireAuth, auth.me);
