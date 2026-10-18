import { config as loadDotenv } from 'dotenv';

loadDotenv({ quiet: true });

export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresInSeconds: number;
  frontendOrigins: string[];
  cookieSecure: boolean;
  cookieSameSite: 'lax' | 'strict' | 'none';
  authRateLimitMax: number;
  reportingTimeZone: string;
  aiApiKey: string | undefined;
  geminiModel: string;
  aiTimeoutMs: number;
}

type Source = Record<string, string | undefined>;

function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function readPositiveInt(source: Source, key: string, fallback: number, problems: string[]): number {
  const raw = source[key];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    problems.push(`${key} must be a positive integer`);
    return fallback;
  }
  return value;
}

/**
 * Reads and validates configuration. Collects every problem first so the
 * developer sees all missing variables at once instead of one per restart.
 * Secret values are never included in error messages.
 */
export function loadConfig(source: Source = process.env): AppConfig {
  const problems: string[] = [];

  const nodeEnvRaw = source.NODE_ENV ?? 'development';
  const nodeEnv =
    nodeEnvRaw === 'production' || nodeEnvRaw === 'test' ? nodeEnvRaw : 'development';

  const databaseUrl = source.DATABASE_URL ?? '';
  if (!databaseUrl) problems.push('DATABASE_URL is required');
  else if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    problems.push('DATABASE_URL must be a postgresql:// connection string');
  }

  const jwtSecret = source.JWT_SECRET ?? '';
  if (!jwtSecret) problems.push('JWT_SECRET is required');
  else if (jwtSecret.length < 32) problems.push('JWT_SECRET must be at least 32 characters long');

  const frontendOrigins = (source.FRONTEND_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const sameSiteRaw = (source.COOKIE_SAMESITE ?? 'lax').toLowerCase();
  const cookieSameSite = sameSiteRaw === 'strict' || sameSiteRaw === 'none' ? sameSiteRaw : 'lax';
  const cookieSecure =
    source.COOKIE_SECURE !== undefined ? source.COOKIE_SECURE === 'true' : nodeEnv === 'production';
  if (cookieSameSite === 'none' && !cookieSecure) {
    problems.push('COOKIE_SAMESITE=none requires COOKIE_SECURE=true');
  }

  const reportingTimeZone = source.REPORTING_TIMEZONE ?? 'Asia/Kolkata';
  if (!isValidTimeZone(reportingTimeZone)) {
    problems.push('REPORTING_TIMEZONE must be a valid IANA time zone, e.g. Asia/Kolkata');
  }

  const config: AppConfig = {
    nodeEnv,
    port: readPositiveInt(source, 'PORT', 4000, problems),
    databaseUrl,
    jwtSecret,
    jwtExpiresInSeconds: readPositiveInt(source, 'JWT_EXPIRES_IN_SECONDS', 60 * 60 * 24, problems),
    frontendOrigins,
    cookieSecure,
    cookieSameSite,
    authRateLimitMax: readPositiveInt(source, 'AUTH_RATE_LIMIT_MAX', 10, problems),
    reportingTimeZone,
    aiApiKey: source.AI_API_KEY || undefined,
    geminiModel: source.GEMINI_MODEL || 'gemini-3.8-flash',
    aiTimeoutMs: readPositiveInt(source, 'AI_TIMEOUT_MS', 15000, problems),
  };

  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${problems.join('\n  - ')}`);
  }
  return config;
}

export const config = loadConfig();
