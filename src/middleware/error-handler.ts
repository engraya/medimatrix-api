import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import multer from 'multer';
import { AppError } from '../errors/app-error.js';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  if (res.headersSent) {
    _next(error);
    return;
  }
  let appError =
    error instanceof AppError
      ? error
      : new AppError(500, 'INTERNAL_ERROR', 'Internal server error');
  if (error instanceof ZodError)
    appError = new AppError(
      400,
      'VALIDATION_ERROR',
      'Invalid request',
      error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') appError = new AppError(409, 'CONFLICT', 'Resource already exists');
    if (error.code === 'P2025') appError = new AppError(404, 'NOT_FOUND', 'Resource not found');
    if (error.code === 'P2003')
      appError = new AppError(409, 'CONFLICT', 'Referenced resource is unavailable');
    if (error.code === 'P2034')
      appError = new AppError(409, 'CONFLICT', 'Concurrent update; retry the request');
  }
  if (error instanceof multer.MulterError)
    appError = new AppError(
      error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
      error.code,
      'Invalid upload',
    );
  if (error instanceof SyntaxError && 'body' in error)
    appError = new AppError(400, 'INVALID_JSON', 'Invalid JSON');
  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.too.large'
  )
    appError = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Payload too large');
  logger[appError.status >= 500 ? 'error' : 'warn'](
    { requestId: req.id, code: appError.code, statusCode: appError.status },
    'Request failed',
  );
  if (appError.status >= 500)
    Sentry.captureException(error, {
      tags: { requestId: String(req.id), endpoint: String(req.route?.path ?? 'unknown') },
    });
  res
    .status(appError.status)
    .json({
      success: false,
      error: {
        code: appError.code,
        message: appError.status >= 500 ? 'Internal server error' : appError.message,
        ...(appError.details ? { details: appError.details } : {}),
      },
      requestId: req.id,
    });
};
