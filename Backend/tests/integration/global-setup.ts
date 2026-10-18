import { spawnSync } from 'node:child_process';
import { config as loadDotenv } from 'dotenv';

/**
 * Runs once before the integration suite: checks that TEST_DATABASE_URL points
 * at a dedicated test database and applies the Prisma migrations to it.
 */
export default function setup() {
  loadDotenv({ quiet: true });
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Integration tests need a separate, disposable PostgreSQL database, ' +
        'e.g. TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/perfin_test" in Backend/.env',
    );
  }
  const databaseName = new URL(testUrl).pathname.slice(1);
  if (!/test/i.test(databaseName)) {
    throw new Error(`Refusing to run: test database name "${databaseName}" must contain "test" (tables are truncated).`);
  }
  if (process.env.DATABASE_URL && new URL(process.env.DATABASE_URL).pathname === new URL(testUrl).pathname
      && new URL(process.env.DATABASE_URL).host === new URL(testUrl).host) {
    throw new Error('Refusing to run: TEST_DATABASE_URL must not be the same database as DATABASE_URL.');
  }

  const result = spawnSync('npx', ['prisma', 'db', 'migrate'], {
    env: { ...process.env, DATABASE_URL: testUrl, DO_NOT_TRACK: '1' },
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`Applying migrations to the test database failed:\n${result.stdout}\n${result.stderr}`);
  }
}
