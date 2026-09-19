import { spawn } from 'node:child_process';
import { env } from '../../src/config/env.js';
const child = spawn(
  'docker',
  ['compose', 'exec', 'postgres', 'psql', '-U', env.POSTGRES_USER, '-d', env.POSTGRES_DB],
  { stdio: 'inherit' },
);
child.on('error', () => {
  process.stderr.write(
    'Unable to start Docker psql. Check Docker Desktop and the database container.\n',
  );
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
