import { Router } from 'express';
import * as analytics from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);
analyticsRouter.get('/overview', analytics.overview);
analyticsRouter.get('/monthly', analytics.monthly);
analyticsRouter.get('/cashflow', analytics.monthly); // kept for compatibility; same data as /monthly
analyticsRouter.get('/categories', analytics.categories);
