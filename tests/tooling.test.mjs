import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import {
  renderContract,
  generate,
  convertYapi,
  syncYapi,
} from '../packages/tooling/lib/contracts.mjs';
import { createProject } from '../packages/cli/index.mjs';
import { readJson, writeJson } from '../packages/tooling/lib/io.mjs';
import { setupAgents } from '../packages/tooling/lib/agents.mjs';
import { readSource } from '../packages/tooling/lib/sources.mjs';
import { createTask, updateTask } from '../packages/tooling/lib/tasks.mjs';
import { projectFingerprint } from '../packages/tooling/lib/fingerprint.mjs';
import { checkLayers } from '../packages/tooling/lib/layers.mjs';
import { run } from '../packages/tooling/lib/process.mjs';
import { check } from 'prettier';

const root = resolve('.');
await mkdir('.tmp', { recursive: true });
const temp = await mkdtemp(join(root, '.tmp/tests-'));
const contract = await readJson('templates/admin/contracts/local.openapi.json');
test('command runner executes Windows package-manager shims without escaped quotes', async () => {
  const result = await run('pnpm', ['--version'], { cwd: root });
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+/);
});
async function project(name) {
  return createProject({ name, directory: temp, agents: ['codex', 'claude', 'cursor', 'trae'] });
}

test('generation is deterministic and produces strictly typed request functions', async () => {
  const one = await renderContract(contract);
  const two = await renderContract(contract);
  assert.deepEqual(one, two);
  assert.match(one['client.ts'], /export function listProjects\(\)/);
  assert.ok(!one['client.ts'].includes(': any'));
});
test('missing schemas, remote references and ambiguous responses fail closed', async () => {
  const incomplete = structuredClone(contract);
  incomplete.paths['/projects'].get.responses['200'].content['application/json'].schema = {};
  await assert.rejects(renderContract(incomplete), /Incomplete schema/);
  incomplete.paths['/projects'].get.responses['200'].content['application/json'].schema = {
    $ref: 'https://example.com/schema',
  };
  await assert.rejects(renderContract(incomplete), /Only local/);
  const ambiguous = structuredClone(contract);
  ambiguous.paths['/projects'].get.responses['201'] =
    ambiguous.paths['/projects'].get.responses['200'];
  await assert.rejects(renderContract(ambiguous), /Exactly one/);
});
test('CLI creates a standalone project, preserves existing directories and embeds tool assets', async () => {
  const target = await project('standalone');
  assert.equal((await readJson(join(target, 'package.json'))).name, 'standalone');
  for (const file of ['package.json', 'admin-kit.config.json']) {
    const path = join(target, file);
    assert.equal(
      await check(await readFile(path, 'utf8'), { filepath: path, printWidth: 100 }),
      true,
    );
  }
  for (const file of [
    'scripts/tooling/index.mjs',
    'scripts/agent-assets/skills/admin-bugfix/SKILL.md',
    '.cursor/rules/admin-kit.mdc',
    '.claude/skills/admin-feature/SKILL.md',
    '.trae/mcp.json',
    '.codex/config.toml',
  ])
    assert.ok((await readFile(join(target, file), 'utf8')).length > 0);
  await assert.rejects(project('standalone'), /already exists/);
  await generate(target, true);
  const client = join(target, 'src/api/generated/client.ts');
  await writeFile(client, `${await readFile(client, 'utf8')}\n// changed`);
  await assert.rejects(generate(target, true), /Generated file changed/);
  await generate(target);
  await generate(target, true);
});
test('AI setup preserves user configuration and emits a reviewable suggestion', async () => {
  const target = await project('custom-agent');
  await writeFile(join(target, '.cursor/mcp.json'), '{"custom":true}');
  const result = await setupAgents(target, join(root, 'agent-assets'));
  assert.equal(await readFile(join(target, '.cursor/mcp.json'), 'utf8'), '{"custom":true}');
  assert.ok(result.conflicts.some((file) => file.endsWith('mcp.json.admin-kit-new')));
});
test('YApi examples and untyped parameters cannot become an invented contract', () => {
  const detail = {
    _id: 1,
    method: 'GET',
    path: '/items',
    res_body_type: 'json',
    res_body_is_json_schema: false,
    res_body: '{"id":1}',
  };
  assert.throws(() => convertYapi([{ projectId: 2, detail }]), /JSON Schema/);
  detail.res_body_is_json_schema = true;
  detail.res_body = '{"type":"string"}';
  detail.req_query = [{ name: 'id' }];
  assert.throws(() => convertYapi([{ projectId: 2, detail }]), /no type/);
});
test('layer checker detects Vue SFC imports that bypass the data boundary', async () => {
  const target = await project('layers');
  await checkLayers(target);
  await writeFile(
    join(target, 'src/pages/Forbidden.vue'),
    '<script setup lang="ts">\nimport { login } from "../api/generated/client";\n</script><template><div/></template>',
  );
  await assert.rejects(checkLayers(target), /bypasses/);
});
test('task retries persist and completion rejects stale verification', async () => {
  const target = await project('tasks');
  const snapshot = await readSource(target, 'md', 'docs/examples/bug.md');
  const task = await createTask(target, 'bug', snapshot.file);
  await updateTask(target, task.id, 'status', 'running');
  for (let count = 0; count < 3; count++)
    await updateTask(target, task.id, 'attempt', 'filter-page');
  const stored = await readJson(join(target, '.admin-kit/runs', task.id, 'task.json'));
  assert.equal(stored.status, 'waiting');
  assert.equal(stored.issues['filter-page'], 3);
  await updateTask(target, task.id, 'resolve', 'filter-page');
  await updateTask(target, task.id, 'status', 'running');
  await updateTask(target, task.id, 'status', 'verifying');
  await updateTask(target, task.id, 'evidence', 'regression passed');
  await writeJson(join(target, '.admin-kit/runs/latest-verification.json'), {
    passed: true,
    startedAt: new Date().toISOString(),
    fingerprint: await projectFingerprint(target),
  });
  await writeFile(join(target, 'src/changed.ts'), 'export const changed = true;');
  await assert.rejects(updateTask(target, task.id, 'status', 'complete'), /Code changed/);
});
test('ZenTao adapter only reads, preserves evidence and blocks product mismatch', async (context) => {
  const calls = [];
  const server = createServer((request, response) => {
    calls.push({ method: request.method, path: request.url });
    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify({
        id: 123,
        title: 'Filter regression',
        product: { id: 8 },
        steps: '<p>Reproduce steps</p>',
        openedBuild: '1.0',
      }),
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => server.close());
  const target = await project('zentao');
  const config = await readJson(join(target, 'admin-kit.config.json'));
  config.zentao = {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    tokenEnv: 'ADMIN_KIT_TEST_TOKEN',
    productIds: [8],
  };
  process.env.ADMIN_KIT_TEST_TOKEN = 'test-only';
  context.after(() => delete process.env.ADMIN_KIT_TEST_TOKEN);
  await writeJson(join(target, 'admin-kit.config.json'), config);
  const snapshot = await readSource(target, 'zentao', '123');
  assert.match((await readJson(snapshot.file)).content, /Reproduce steps/);
  assert.deepEqual(calls, [{ method: 'GET', path: '/api.php/v1/bugs/123' }]);
  config.zentao.productIds = [99];
  await writeJson(join(target, 'admin-kit.config.json'), config);
  await assert.rejects(readSource(target, 'zentao', '123'), /does not match/);
});
test('YApi sync failure preserves local provenance without switching modes', async () => {
  const target = await project('yapi-offline');
  const config = await readJson(join(target, 'admin-kit.config.json'));
  config.api.mode = 'yapi';
  config.api.yapi = {
    baseUrl: 'http://127.0.0.1:1',
    projects: [{ id: 1, tokenEnv: 'MISSING_TEST_YAPI_TOKEN' }],
  };
  await writeJson(join(target, 'admin-kit.config.json'), config);
  await assert.rejects(syncYapi(target), /Missing environment/);
  assert.equal((await readJson(join(target, 'admin-kit.config.json'))).api.mode, 'yapi');
  await assert.rejects(generate(target), /ENOENT/);
  assert.ok((await readdir(join(target, 'contracts'))).includes('local.openapi.json'));
});

test('YApi sync reads all pages, converts typed path parameters and compares the local contract', async (context) => {
  const target = await project('yapi-sync');
  const calls = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    calls.push(url.pathname);
    let data;
    if (url.pathname.endsWith('/list'))
      data = { count: 2, total: 2, list: [{ _id: Number(url.searchParams.get('page')) }] };
    else {
      const id = Number(url.searchParams.get('id'));
      data = {
        _id: id,
        project_id: 7,
        title: `Item ${id}`,
        method: 'GET',
        path: `/items${id}/:id`,
        req_params: [{ name: 'id', type: 'string', required: true }],
        res_body_type: 'json',
        res_body_is_json_schema: true,
        res_body: JSON.stringify({
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
          additionalProperties: false,
        }),
      };
    }
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ errcode: 0, data }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => server.close());
  process.env.ADMIN_KIT_YAPI_TEST_TOKEN = 'test-only';
  context.after(() => delete process.env.ADMIN_KIT_YAPI_TEST_TOKEN);
  const config = await readJson(join(target, 'admin-kit.config.json'));
  config.api.mode = 'yapi';
  config.api.yapi = {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    projects: [{ id: 7, tokenEnv: 'ADMIN_KIT_YAPI_TEST_TOKEN' }],
  };
  await writeJson(join(target, 'admin-kit.config.json'), config);
  await syncYapi(target);
  await generate(target, true);
  const synced = await readJson(join(target, 'contracts/yapi.openapi.json'));
  assert.equal(Object.keys(synced.paths).length, 2);
  assert.ok(synced.paths['/items1/{id}']);
  assert.equal(calls.filter((path) => path.endsWith('/list')).length, 2);
  const diff = await readJson(join(target, '.admin-kit/incoming/yapi-diff.json'));
  assert.equal(diff.previous.info.title, contract.info.title);
});
