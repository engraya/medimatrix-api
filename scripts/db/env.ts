import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { env } from '../../src/config/env.js';
const child = spawn(
  process.execPath,
  [resolve('node_modules/prisma/build/index.js'), ...process.argv.slice(2)],
  { stdio: 'inherit', env: { ...process.env, DATABASE_URL: env.DATABASE_URL } },
);
child.on('error', () => {
  process.stderr.write('Unable to start Prisma. Install dependencies first.\n');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
