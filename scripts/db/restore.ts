import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { pipeline } from 'node:stream/promises';
import { env } from '../../src/config/env.js';

const argument = process.argv[2];
if (!argument) throw new Error('Usage: npm run db:restore -- path/to/backup.dump');
const path = resolve(argument);
if (!(await stat(path)).isFile()) throw new Error('Backup must be a file');
const prompt = createInterface({ input: process.stdin, output: process.stdout });
const answer = await prompt.question(
  `This replaces data in the compose database ${env.POSTGRES_DB}. Type RESTORE to continue: `,
);
prompt.close();
if (answer !== 'RESTORE') throw new Error('Restore cancelled');
const child = spawn(
  'docker',
  [
    'compose',
    'exec',
    '-T',
    'postgres',
    'pg_restore',
    '-U',
    env.POSTGRES_USER,
    '-d',
    env.POSTGRES_DB,
    '--clean',
    '--if-exists',
    '--exit-on-error',
    '--single-transaction',
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);
const completed = new Promise<void>((done, fail) => {
  child.once('error', fail);
  child.once('close', (code) =>
    code === 0 ? done() : fail(new Error(`pg_restore exited with ${code}`)),
  );
});
await Promise.all([pipeline(createReadStream(path), child.stdin), completed]);
process.stdout.write('Restore complete.\n');
