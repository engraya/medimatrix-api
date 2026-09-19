import { pino } from 'pino';
import { env } from '../config/env.js';
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'medimatrix-api', env: env.NODE_ENV, version: env.APP_VERSION },
  redact: {
    paths: [
      'req.headers',
      'req.body',
      'res.headers',
      'password',
      'passwordHash',
      'token',
      'code',
      'email',
      'phone',
      'medicalHistory',
      '*.password',
      '*.token',
      '*.email',
      '*.phone',
    ],
    censor: '[REDACTED]',
  },
  ...(env.NODE_ENV === 'development' && !process.env.CONTAINER
    ? { transport: { target: 'pino-pretty' } }
    : {}),
});
