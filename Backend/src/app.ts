import cors from 'cors';
import express from 'express';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { requestLogger, requireTrustedOrigin } from './middleware/security.middleware.js';
import { accountRouter } from './routes/account.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { budgetRouter } from './routes/budget.routes.js';
import { categoryRouter } from './routes/category.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { transactionRouter } from './routes/transaction.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (config.nodeEnv !== 'test') app.use(requestLogger);

  app.use(
    cors({
      origin: config.frontendOrigins,
      credentials: true, // allow the browser to send the auth cookie
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    }),
  );
  app.use(requireTrustedOrigin);
  app.use(express.json({ limit: '100kb' }));

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/accounts', accountRouter);
  app.use('/transactions', transactionRouter);
  app.use('/categories', categoryRouter);
  app.use('/budgets', budgetRouter);
  app.use('/analytics', analyticsRouter);
  app.use('/ai', aiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
