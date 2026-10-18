// Unit tests never touch a database or the network. These values only satisfy
// config validation; the URL points at a port where nothing listens.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unit-tests@127.0.0.1:1/never_connects';
process.env.JWT_SECRET = 'unit-test-secret-that-is-at-least-32-characters';
process.env.REPORTING_TIMEZONE = 'Asia/Kolkata';
delete process.env.AI_API_KEY;
