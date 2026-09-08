import { rm, cp } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

const filter = (source) =>
  !/(?:^|[\\/])(node_modules|dist|playwright-report|test-results|coverage|artifacts|\.git|\.agent-admin|\.agents|\.codex|\.claude|\.cursor|\.trae)(?:[\\/]|$)/.test(
    source,
  ) && (!/[\\/]\.env(?:\.|$)/.test(source) || source.endsWith('.env.example'));

const targets = [
  [join(repoRoot, 'templates/admin'), join(__dirname, 'templates/admin')],
  [join(repoRoot, 'packages/tooling'), join(__dirname, 'tooling')],
  [join(repoRoot, 'agent-assets'), join(__dirname, 'agent-assets')],
  [join(repoRoot, 'docs'), join(__dirname, 'docs')],
];

for (const [, dest] of targets) await rm(dest, { recursive: true, force: true });
for (const [src, dest] of targets) await cp(src, dest, { recursive: true, filter });

console.log('Prepack: resources copied.');
