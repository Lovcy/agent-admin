#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { input, checkbox, select } from '@inquirer/prompts';
import { setupAgents } from '../tooling/lib/agents.mjs';
import { generate } from '../tooling/lib/contracts.mjs';
import { redact, writeJson } from '../tooling/lib/io.mjs';
import { format } from 'prettier';

const repository = fileURLToPath(new URL('../../', import.meta.url));
export async function createProject({ name, directory, agents, mode = 'local' }) {
  if (!/^[a-z][a-z0-9-]{0,62}$/.test(name))
    throw new Error(
      'Project name must be lowercase letters, digits and hyphens, starting with a letter',
    );
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(name))
    throw new Error('Project name is reserved on Windows');
  if (!['local', 'yapi'].includes(mode)) throw new Error('Mode must be local or yapi');
  if (
    !agents.length ||
    agents.some((agent) => !['codex', 'claude', 'cursor', 'trae'].includes(agent))
  )
    throw new Error('Select valid AI tools');
  const destination = resolve(directory, name);
  if (
    await access(destination).then(
      () => true,
      () => false,
    )
  )
    throw new Error(`Target already exists: ${destination}`);
  await mkdir(resolve(directory), { recursive: true });
  await mkdir(destination);
  await cp(join(repository, 'templates/admin'), destination, {
    recursive: true,
    filter: (source) =>
      !/(?:^|[\\/])(node_modules|dist|playwright-report|test-results|coverage|artifacts|\.git|\.admin-kit|\.agents|\.codex|\.claude|\.cursor|\.trae)(?:[\\/]|$)/.test(
        source,
      ) && !/[\\/]\.env(?:\.|$)/.test(source),
  });
  await cp(join(repository, 'packages/tooling'), join(destination, 'scripts/tooling'), {
    recursive: true,
  });
  await cp(join(repository, 'docs'), join(destination, 'docs'), { recursive: true });
  const manifest = JSON.parse(await readFile(join(destination, 'package.json'), 'utf8'));
  manifest.name = name;
  await writeJson(join(destination, 'package.json'), manifest);
  const config = JSON.parse(await readFile(join(destination, 'admin-kit.config.json'), 'utf8'));
  config.agents = agents;
  config.api.mode = mode;
  await writeJson(join(destination, 'admin-kit.config.json'), config);
  await cp(join(repository, 'templates/admin/.env.example'), join(destination, '.env.example'));
  await setupAgents(destination, join(repository, 'agent-assets'));
  if (mode === 'local') await generate(destination);
  await writeFile(join(destination, 'pnpm-workspace.yaml'), 'packages: []\n');
  for (const file of ['package.json', 'admin-kit.config.json']) {
    const path = join(destination, file);
    await writeFile(
      path,
      await format(await readFile(path, 'utf8'), { filepath: path, printWidth: 100 }),
    );
  }
  return destination;
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      yes: { type: 'boolean', short: 'y' },
      agents: { type: 'string' },
      mode: { type: 'string' },
      directory: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help || positionals[0] !== 'create') {
    console.log(
      'admin-kit create <name> [--agents codex,claude,cursor,trae] [--mode local|yapi] [--directory path] [--yes]\nNames use lowercase ASCII. Existing directories are never overwritten.',
    );
    return;
  }
  const name =
    positionals[1] ??
    (values.yes ? undefined : await input({ message: '项目名称', default: 'my-admin' }));
  if (!name) throw new Error('Provide a project name');
  const agents =
    values.agents?.split(',') ??
    (values.yes
      ? ['codex', 'claude', 'cursor', 'trae']
      : await checkbox({
          message: '选择 AI 工具',
          choices: ['codex', 'claude', 'cursor', 'trae'].map((value) => ({ value, checked: true })),
          required: true,
        }));
  const mode =
    values.mode ??
    (values.yes
      ? 'local'
      : await select({
          message: '接口契约来源',
          choices: [
            { name: '本地契约 + Mock', value: 'local' },
            { name: 'YApi（配置后同步）', value: 'yapi' },
          ],
        }));
  const target = await createProject({
    name,
    directory: values.directory ?? process.cwd(),
    agents,
    mode,
  });
  console.log(
    `Created ${target}\nNext: cd ${name}\npnpm install\npnpm exec msw init public --save\npnpm exec playwright install chromium --no-shell\npnpm doctor\npnpm dev`,
  );
  if (mode === 'yapi')
    console.log(
      'YApi mode: configure api.yapi and sync before development. Demo repositories must be adapted to your real contract; no Mock fallback.',
    );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(redact(error.message));
    process.exitCode = 1;
  });
