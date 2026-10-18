import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as ai from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { CategorizeDto, ChatDto } from '../validation/dtos.js';

// Each AI call costs money and quota, so cap it per user.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user?.id ?? 'anonymous'}`,
  message: { statusCode: 429, error: 'Too Many Requests', message: 'Too many AI requests. Wait a minute.' },
});

export const aiRouter = Router();
aiRouter.use(requireAuth, aiLimiter);
aiRouter.post('/categorize', validateBody(CategorizeDto), ai.categorize);
aiRouter.get('/insights', ai.insights);
aiRouter.post('/chat', validateBody(ChatDto), ai.chat);
