import { Router } from 'express';
import { endpoint } from '../../utils/endpoint.js';
import { AppError } from '../../errors/app-error.js';
import { pingDatabase } from './health.repository.js';
import { workerState } from '../notifications/notification-worker.js';
export const healthRouter = Router();
endpoint(
  healthRouter,
  'get',
  '/health/live',
  { tag: 'health', summary: 'Process liveness', public: true },
  async () => ({ status: 'ok' }),
);
endpoint(
  healthRouter,
  'get',
  '/health/ready',
  { tag: 'health', summary: 'Database readiness and worker heartbeat', public: true },
  async () => {
    try {
      await pingDatabase();
    } catch {
      throw new AppError(503, 'NOT_READY', 'Database unavailable');
    }
    return { status: 'ok', db: 'ok', workerLastHeartbeat: workerState.lastHeartbeat };
  },
);
