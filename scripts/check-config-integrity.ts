import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
async function check(dir: string): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (/\.config\.[cm]?[jt]s$/.test(entry.name)) {
      const content = await readFile(path, 'utf8');
      if (content.length > 100000 || /_0x[a-f\d]{4,}/i.test(content) || /eval\s*\(/.test(content))
        throw new Error(`Suspicious config file: ${path}`);
    }
  }
}
await check('.');
