import { loadConfig } from '../../src/config/env.js';

const valid = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/perfin',
  JWT_SECRET: 'x'.repeat(32),
};

describe('loadConfig', () => {
  it('applies defaults for optional settings', () => {
    const config = loadConfig(valid);
    expect(config.port).toBe(4000);
    expect(config.frontendOrigins).toEqual(['http://localhost:3000']);
    expect(config.cookieSecure).toBe(false);
    expect(config.aiApiKey).toBeUndefined();
  });

  it('reports every problem at once without echoing secret values', () => {
    let message = '';
    try {
      loadConfig({ JWT_SECRET: 'short-secret', PORT: 'abc', REPORTING_TIMEZONE: 'Mars/Base' });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('DATABASE_URL is required');
    expect(message).toContain('JWT_SECRET must be at least 32 characters');
    expect(message).toContain('PORT must be a positive integer');
    expect(message).toContain('REPORTING_TIMEZONE');
    expect(message).not.toContain('short-secret');
  });

  it('requires secure cookies when SameSite=None', () => {
    expect(() => loadConfig({ ...valid, COOKIE_SAMESITE: 'none' })).toThrow('COOKIE_SECURE=true');
  });

  it('defaults to secure cookies in production', () => {
    expect(loadConfig({ ...valid, NODE_ENV: 'production' }).cookieSecure).toBe(true);
  });
});
