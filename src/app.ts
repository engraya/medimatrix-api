import express, { Router } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { ulid } from 'ulid';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { csrf } from './middleware/csrf.js';
import { globalLimit } from './middleware/rate-limit.js';
import { errorHandler } from './middleware/error-handler.js';
import { requireAuth } from './middleware/authenticate.js';
import { requireRole } from './middleware/authorize.js';
import { AppError } from './errors/app-error.js';
import { openapiDocument } from './docs/openapi.js';
import { healthRouter } from './modules/health/health.routes.js';
import { doctorsRouter } from './modules/doctors/doctors.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { filesRouter } from './modules/files/files.routes.js';
import { patientsRouter } from './modules/patients/patients.routes.js';
import { appointmentsRouter } from './modules/appointments/appointments.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.use((req, res, next) => {
    const candidate = req.get('X-Request-Id');
    req.id = candidate && /^[a-zA-Z0-9_-]{1,100}$/.test(candidate) ? candidate : ulid();
    res.setHeader('X-Request-Id', String(req.id));
    next();
  });
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      serializers: {
        req: (req) => ({ id: req.id, method: req.method }),
        res: (res) => ({ statusCode: res.statusCode }),
        err: () => ({ message: 'Request error' }),
      },
      autoLogging: { ignore: (req) => req.url?.startsWith('/health/') ?? false },
    }),
  );
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { 'img-src': ["'self'", 'data:'], 'script-src': ["'self'"] },
      },
    }),
  );
  app.use(
    cors({
      credentials: true,
      origin: (origin, cb) => {
        if (!origin || env.CORS_ORIGINS.includes(origin)) cb(null, true);
        else cb(new AppError(403, 'ORIGIN_DENIED', 'Origin denied'));
      },
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
    }),
  );
  app.use(compression(), globalLimit, express.json({ limit: '100kb' }), cookieParser(), csrf);
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  const api = Router();
  api.use(
    healthRouter,
    doctorsRouter,
    authRouter,
    usersRouter,
    filesRouter,
    patientsRouter,
    appointmentsRouter,
    notificationsRouter,
  );
  const docsAuth = env.NODE_ENV === 'production' ? [requireAuth, requireRole('ADMIN')] : [];
  api.get('/docs/openapi.json', ...docsAuth, (_req, res) => res.json(openapiDocument()));
  api.use(
    '/docs',
    ...docsAuth,
    helmet({
      contentSecurityPolicy: {
        directives: { 'script-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'data:'] },
      },
    }),
    swaggerUi.serve,
    swaggerUi.setup(openapiDocument(), { swaggerOptions: { withCredentials: true } }),
  );
  app.use('/api/v1', api);
  app.use(healthRouter);
  app.use((_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found')));
  app.use(errorHandler);
  return app;
}
