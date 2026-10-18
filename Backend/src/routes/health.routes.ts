import { Router } from 'express';
import { db } from '../prisma/db.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

healthRouter.get('/db', async (_req, res) => {
  try {
    await db.runtime().query(db.raw.sql`SELECT 1 AS "ok"`.returnsRow({ ok: 'pg/int4@1' }).build());
    res.json({ database: 'connected' });
  } catch {
    res.status(503).json({ database: 'unavailable' });
  }
});
