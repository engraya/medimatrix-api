import './lib/sentry.js';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';
import { Sentry } from './lib/sentry.js';
import { startWorker } from './modules/notifications/notification-worker.js';

await prisma.$connect();
const stopWorker = startWorker();
const server = createApp().listen(env.PORT, () => logger.info({ port: env.PORT }, 'API listening'));
server.requestTimeout = 30000;
server.headersTimeout = 35000;
let shuttingDown = false;
async function shutdown(exitCode: number) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Graceful shutdown started');
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
  await Promise.all([new Promise<void>((resolve) => server.close(() => resolve())), stopWorker()]);
  await prisma.$disconnect();
  await Sentry.flush(2000);
  clearTimeout(deadline);
  process.exit(exitCode);
}
process.on('SIGTERM', () => {
  void shutdown(0);
});
process.on('SIGINT', () => {
  void shutdown(0);
});
process.on('unhandledRejection', () => {
  logger.fatal('Unhandled rejection');
  void shutdown(1);
});
process.on('uncaughtException', () => {
  logger.fatal('Uncaught exception');
  void shutdown(1);
});
