import { spawn } from 'node:child_process';
import { mkdir, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { env } from '../../src/config/env.js';

const directory = resolve('backups');
await mkdir(directory, { recursive: true });
const path = resolve(
  directory,
  `medimatrix-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`,
);
const file = await open(path, 'wx', 0o600);
try {
  const child = spawn(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'pg_dump',
      '-U',
      env.POSTGRES_USER,
      '-d',
      env.POSTGRES_DB,
      '--format=custom',
    ],
    { stdio: ['ignore', 'pipe', 'inherit'] },
  );
  const completed = new Promise<void>((done, fail) => {
    child.once('error', fail);
    child.once('close', (code) =>
      code === 0 ? done() : fail(new Error(`pg_dump exited with ${code}`)),
    );
  });
  await Promise.all([pipeline(child.stdout, file.createWriteStream()), completed]);
  process.stdout.write(`Backup: ${path}\n`);
} catch (error) {
  await file.close().catch(() => {});
  await unlink(path);
  throw error;
}
