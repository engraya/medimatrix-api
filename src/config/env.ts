import 'dotenv/config';
import { z } from 'zod';

const boolean = z.enum(['true', 'false']).transform((v) => v === 'true');
const optional = z.string().default('');
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    API_BASE_URL: z.string().url().default('http://localhost:4000'),
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform((v) => v.split(',').map((s) => s.trim()))
      .pipe(z.array(z.string().url()).min(1)),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    APP_VERSION: z.string().default('0.1.0'),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    POSTGRES_HOST: z.string().min(1).default('localhost'),
    POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
    POSTGRES_USER: z.string().min(1).default('medimatrix'),
    POSTGRES_PASSWORD: z.string().min(1),
    POSTGRES_DB: z
      .string()
      .regex(/^[a-zA-Z0-9_]+$/)
      .default('medimatrix'),
    DB_POOL_SIZE: z.coerce.number().int().positive().default(10),
    JWT_SECRET: z.string().min(32),
    JWT_SECRET_PREVIOUS: optional,
    OTP_PEPPER: z.string().min(32),
    ACCESS_TOKEN_TTL: z
      .string()
      .regex(/^\d+[smhd]$/)
      .default('15m'),
    REFRESH_TOKEN_TTL: z
      .string()
      .regex(/^\d+[smhd]$/)
      .default('30d'),
    COOKIE_DOMAIN: optional,
    COOKIE_SECURE: boolean.default('false'),
    EMAIL_PROVIDER: z.enum(['console', 'smtp', 'resend']).default('smtp'),
    EMAIL_FROM: z.string().default('MediMatrix <no-reply@example.com>'),
    EMAIL_REPLY_TO: optional,
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    RESEND_API_KEY: optional,
    SMS_PROVIDER: z.enum(['fake', 'twilio']).default('fake'),
    TWILIO_ACCOUNT_SID: optional,
    TWILIO_AUTH_TOKEN: optional,
    TWILIO_FROM_NUMBER: optional,
    STORAGE_PROVIDER: z.enum(['local', 's3']).default('s3'),
    LOCAL_STORAGE_DIR: z.string().default('./storage'),
    S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
    S3_PUBLIC_ENDPOINT: z.string().url().default('http://localhost:9000'),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().default('medimatrix-documents'),
    S3_ACCESS_KEY_ID: optional,
    S3_SECRET_ACCESS_KEY: optional,
    S3_FORCE_PATH_STYLE: boolean.default('true'),
    SENTRY_DSN: optional,
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
    NOTIFICATION_WORKER_INTERVAL_MS: z.coerce.number().int().min(100).default(5000),
    NOTIFICATION_TIMEZONE: z
      .string()
      .default('Africa/Lagos')
      .refine((v) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, 'Invalid timezone'),
    SEED_ADMIN_EMAIL: optional,
    SEED_ADMIN_PASSWORD: optional,
  })
  .superRefine((v, ctx) => {
    const issue = (key: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [key], message });
    if (v.JWT_SECRET_PREVIOUS && v.JWT_SECRET_PREVIOUS.length < 32)
      issue('JWT_SECRET_PREVIOUS', 'Must have at least 32 characters');
    if (v.EMAIL_PROVIDER === 'resend' && !v.RESEND_API_KEY)
      issue('RESEND_API_KEY', 'Required for Resend');
    if (v.SMS_PROVIDER === 'twilio')
      for (const key of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'] as const)
        if (!v[key]) issue(key, 'Required for Twilio');
    if (v.STORAGE_PROVIDER === 's3')
      for (const key of ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const)
        if (!v[key]) issue(key, 'Required for S3');
    if (v.NODE_ENV === 'production') {
      if (!v.COOKIE_SECURE) issue('COOKIE_SECURE', 'Must be true in production');
      if (!v.API_BASE_URL.startsWith('https://')) issue('API_BASE_URL', 'HTTPS required');
      if (v.SMS_PROVIDER === 'fake') issue('SMS_PROVIDER', 'Fake delivery is development-only');
      if (v.EMAIL_PROVIDER === 'console')
        issue('EMAIL_PROVIDER', 'Console delivery is development-only');
      if (v.STORAGE_PROVIDER === 'local')
        issue('STORAGE_PROVIDER', 'Use private S3 storage in production');
      if (v.POSTGRES_PASSWORD.length < 20) issue('POSTGRES_PASSWORD', 'Use at least 20 characters');
    }
  });
export function loadEnv(source: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success)
    throw new Error(
      `Invalid configuration: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  const v = parsed.data;
  const DATABASE_URL = `postgresql://${encodeURIComponent(v.POSTGRES_USER)}:${encodeURIComponent(v.POSTGRES_PASSWORD)}@${v.POSTGRES_HOST}:${v.POSTGRES_PORT}/${v.POSTGRES_DB}?schema=public&connection_limit=${v.DB_POOL_SIZE}`;
  return Object.freeze({ ...v, DATABASE_URL });
}
export const env = loadEnv();
process.env.DATABASE_URL = env.DATABASE_URL;
