import { rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/app-error.js';
export const limiter = (limit: number) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', 'Too many requests')),
  });
export const globalLimit = limiter(300);
export const authLimit = limiter(10);
