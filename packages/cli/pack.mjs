import { mkdir } from 'node:fs/promises';
import { create } from 'tar';
await mkdir('artifacts', { recursive: true });
await create(
  {
    gzip: true,
    file: 'artifacts/admin-kit-0.1.0.tar.gz',
    filter: (path) =>
      !/(^|\/)(node_modules|dist|test-results|playwright-report|\.admin-kit)(\/|$)/.test(path) &&
      (!/(^|\/)\.env(\.|$)/.test(path) || path.endsWith('/.env.example')),
  },
  [
    'packages',
    'templates',
    'agent-assets',
    'docs',
    'tests',
    'AGENTS.md',
    'README.md',
    'package.json',
    'pnpm-workspace.yaml',
    'pnpm-lock.yaml',
    '.prettierrc.json',
    '.prettierignore',
    '.gitignore',
  ],
);
console.log('artifacts/admin-kit-0.1.0.tar.gz');
