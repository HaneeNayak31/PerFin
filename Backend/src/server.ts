import { config } from './config/env.js';
import { createApp } from './app.js';
import { db } from './prisma/db.js';

async function checkDatabase() {
  try {
    await db.runtime().query(db.raw.sql`SELECT 1 AS "ok"`.returnsRow({ ok: 'pg/int4@1' }).build());
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Cannot connect to PostgreSQL. Check DATABASE_URL and that the server is running.\n${reason}`);
    process.exit(1);
  }
}

async function main() {
  await checkDatabase();

  const server = createApp().listen(config.port, () => {
    console.log(`PerFin API listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 35_000;

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down…`);
    // Stop accepting new requests, let in-flight ones finish, then close the pool.
    server.close(() => {
      db.close()
        .catch((error: unknown) => console.error('Error while closing the database pool', error))
        .finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
