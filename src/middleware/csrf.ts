import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { forbidden } from '../errors/app-error.js';
export const csrf: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'fetch') return next(forbidden());
  const origin = req.get('Origin');
  if (origin && !env.CORS_ORIGINS.includes(origin)) return next(forbidden());
  next();
};
