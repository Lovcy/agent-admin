import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export async function projectFingerprint(root) {
  const hash = createHash('sha256');
  async function walk(path, label) {
    const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory()) await walk(join(path, entry.name), `${label}/${entry.name}`);
      else if (entry.isFile()) {
        hash.update(`${label}/${entry.name}`);
        hash.update(await readFile(join(path, entry.name)));
      }
    }
  }
  for (const folder of ['src', 'contracts', 'mocks', 'tests', 'scripts'])
    await walk(join(root, folder), folder);
  for (const file of [
    'package.json',
    'pnpm-lock.yaml',
    'agent-admin.config.json',
    'tsconfig.json',
    'vite.config.ts',
    'playwright.config.ts',
    'vitest.config.ts',
    'eslint.config.mjs',
  ]) {
    hash.update(file);
    hash.update(await readFile(join(root, file)).catch(() => Buffer.from('missing')));
  }
  return hash.digest('hex');
}
