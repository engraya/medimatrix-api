import '../src/app.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { openapiDocument } from '../src/docs/openapi.js';
await mkdir('docs/api', { recursive: true });
await writeFile('docs/api/openapi.json', JSON.stringify(openapiDocument(), null, 2) + '\n');
