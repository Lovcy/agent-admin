import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import { loadConfig } from './lib/config.mjs';
import { generate, syncYapi } from './lib/contracts.mjs';
import { setupAgents } from './lib/agents.mjs';
import { checkLayers } from './lib/layers.mjs';
import { readSource } from './lib/sources.mjs';
import { createTask, updateTask } from './lib/tasks.mjs';
import { redact, writeJson } from './lib/io.mjs';
import { run, resolveExecutable } from './lib/process.mjs';
import { projectFingerprint } from './lib/fingerprint.mjs';

const root = process.cwd();
if (typeof process.loadEnvFile === 'function') {
  for (const file of ['.env', '.env.local']) {
    try {
      process.loadEnvFile(join(root, file));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}
async function doctor() {
  const config = await loadConfig(root);
  const checks = [];
  checks.push({
    name: 'Node.js',
    status: Number(process.versions.node.split('.')[0]) >= 22 ? 'ready' : 'failed',
    detail: process.version,
  });
  for (const executable of ['pnpm', config.lark.executable]) {
    checks.push(
      await resolveExecutable(executable).then(
        () => ({ name: executable, status: 'installed' }),
        () => ({ name: executable, status: 'not-configured' }),
      ),
    );
  }
  checks.push({
    name: 'YApi',
    status:
      config.api.mode === 'local'
        ? 'not-configured'
        : config.api.yapi
          ? 'configured-not-connected'
          : 'failed',
  });
  checks.push({
    name: 'ZenTao',
    status: config.zentao ? 'configured-not-connected' : 'not-configured',
  });
  for (const agent of config.agents)
    checks.push({
      name: agent,
      status: 'configuration-only',
      detail: 'Confirm rule loading and MCP connection in this client.',
    });
  checks.push(
    await access(join(root, 'public/mockServiceWorker.js')).then(
      () => ({ name: 'Mock worker', status: 'ready' }),
      () => ({
        name: 'Mock worker',
        status: 'missing',
        detail: 'pnpm exec msw init public --save',
      }),
    ),
  );
  console.table(checks);
  if (checks.some((check) => check.status === 'failed' || check.status === 'missing'))
    process.exitCode = 1;
}
async function verify() {
  const config = await loadConfig(root);
  const report = {
    startedAt: new Date().toISOString(),
    apiMode: config.api.mode,
    backend: 'not-verified',
    devtools: 'not-run',
    passed: true,
    checks: [],
  };
  const fingerprint = await projectFingerprint(root);
  for (const script of [
    'format:check',
    'api:check',
    'lint',
    'typecheck',
    'test:unit',
    'build',
    'test:e2e',
  ]) {
    const start = Date.now();
    console.log(`\n[verify] ${script}`);
    try {
      await run('pnpm', [script], { cwd: root, capture: false, timeout: 300000 });
      report.checks.push({ script, status: 'passed', durationMs: Date.now() - start });
    } catch (error) {
      report.passed = false;
      report.checks.push({
        script,
        status: 'failed',
        detail: redact(error.message),
        durationMs: Date.now() - start,
      });
    }
  }
  report.finishedAt = new Date().toISOString();
  report.fingerprint = await projectFingerprint(root);
  if (fingerprint !== report.fingerprint) {
    report.passed = false;
    report.checks.push({
      script: 'unchanged-inputs',
      status: 'failed',
      detail: 'Project changed during verification',
    });
  }
  await writeJson(join(root, '.agent-admin/runs/latest-verification.json'), report);
  console.log(
    report.passed
      ? `${config.api.mode === 'local' ? 'Mock' : 'Configured environment'} checks passed; real backend and DevTools inspection are not verified.`
      : 'Verification failed. See .agent-admin/runs/latest-verification.json',
  );
  if (!report.passed) process.exitCode = 1;
}
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'doctor') return doctor();
  if (command === 'api:generate') return console.log(await generate(root));
  if (command === 'api:check') return console.log(await generate(root, true));
  if (command === 'api:sync') return console.log(await syncYapi(root));
  if (command === 'layers:check') return console.log(await checkLayers(root));
  if (command === 'verify') return verify();
  if (command === 'ai:setup') {
    const bundled = join(root, 'scripts/agent-assets');
    const assets = await access(bundled).then(
      () => bundled,
      () => fileURLToPath(new URL('../../agent-assets', import.meta.url)),
    );
    return console.log(await setupAgents(root, assets));
  }
  if (command === 'source:read') return console.log(await readSource(root, args[0], args[1]));
  if (command === 'task') {
    if (args[0] === 'create') return console.log(await createTask(root, args[1], args[2]));
    return console.log(await updateTask(root, args[1], args[0], args.slice(2).join(' ')));
  }
  console.log(
    'Commands: doctor | api:generate | api:sync | api:check | ai:setup | layers:check | verify\nsource:read <md|lark|zentao> <path|URL|ID>\ntask create <feature|bug> <snapshot-path>\ntask <status|attempt|evidence|block|resolve> <task-id> <value>',
  );
}
main().catch((error) => {
  console.error(redact(error.message));
  process.exitCode = 1;
});
