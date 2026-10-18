import { config as loadDotenv } from 'dotenv';

// Runs in every test file before the app is imported: point the app at the
// test database and use test-only secrets.
loadDotenv({ quiet: true });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-test-secret-at-least-32-characters';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.REPORTING_TIMEZONE = 'Asia/Kolkata';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
delete process.env.AI_API_KEY;
