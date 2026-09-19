import type { RequestHandler } from 'express';
import type { UserRole } from '@prisma/client';
import { forbidden, unauthorized } from '../errors/app-error.js';
export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
