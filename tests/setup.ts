import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeEach } from 'vitest';
let container: StartedPostgreSqlContainer | undefined;
if (process.env.TEST_USE_SERVICE !== 'true') {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('medimatrix_test')
    .withUsername('test')
    .withPassword('test')
    .start();
  Object.assign(process.env, {
    POSTGRES_HOST: container.getHost(),
    POSTGRES_PORT: String(container.getPort()),
    POSTGRES_USER: container.getUsername(),
    POSTGRES_PASSWORD: container.getPassword(),
    POSTGRES_DB: container.getDatabase(),
  });
}
if (!process.env.POSTGRES_DB?.endsWith('_test'))
  throw new Error('Refusing to use a non-test database');
const storageDir = await mkdtemp(join(tmpdir(), 'medimatrix-test-'));
process.env.LOCAL_STORAGE_DIR = storageDir;
execFileSync(process.execPath, ['--import', 'tsx', 'scripts/db/env.ts', 'migrate', 'deploy'], {
  env: process.env,
  stdio: 'pipe',
});
const { prisma } = await import('../src/lib/prisma.js');
const { emailDeliveries } = await import('../src/modules/emails/providers/console.provider.js');
const { smsDeliveries } = await import('../src/lib/sms/fake.provider.js');
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE audit_logs, notification_preferences, notifications, verification_tokens, refresh_tokens, appointments, patients, files, doctors, users CASCADE',
  );
  emailDeliveries.length = 0;
  smsDeliveries.length = 0;
});
afterAll(async () => {
  await prisma.$disconnect();
  await container?.stop();
  if (
    resolve(storageDir).startsWith(resolve(tmpdir()) + '\\') ||
    resolve(storageDir).startsWith(resolve(tmpdir()) + '/')
  )
    await rm(storageDir, { recursive: true, force: true });
});
