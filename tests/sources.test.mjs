import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readSource } from '../packages/tooling/lib/sources.mjs';
import { readJson, writeJson } from '../packages/tooling/lib/io.mjs';

test('Feishu reader preserves tables, downloads image tokens and never issues write commands', async () => {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(join(process.cwd(), '.tmp/lark-'));
  await writeJson(join(root, 'agent-admin.config.json'), {
    version: 1,
    agents: ['codex'],
    api: { mode: 'local' },
    lark: { executable: 'lark-cli' },
  });
  const calls = [];
  const result = await readSource(root, 'lark', 'https://example.feishu.cn/wiki/test123', {
    runCommand: async (command, args) => {
      calls.push(args[1]);
      if (args[1] === '+fetch')
        return {
          stdout: JSON.stringify({
            ok: true,
            data: {
              document: {
                document_id: 'doc123',
                revision_id: 3,
                content: '<table><tr><td>Requirement</td></tr></table><img token="image123"/>',
                reference_map: { comments: { ignored: true } },
              },
            },
          }),
        };
      if (args[1] === '+media-download') {
        await writeFile(`${args[args.indexOf('--output') + 1]}.png`, 'test-fixture');
        return { stdout: '{}' };
      }
      throw new Error('Unexpected command');
    },
  });
  const snapshot = await readJson(result.file);
  assert.match(snapshot.content, /<table>/);
  assert.equal(snapshot.metadata.revision, 3);
  assert.equal(snapshot.metadata.references.comments, undefined);
  assert.equal(snapshot.resources[0].status, 'downloaded');
  assert.deepEqual(calls, ['+fetch', '+media-download']);
});

test('Feishu image failure remains visible instead of silently dropping visual requirements', async () => {
  await mkdir('.tmp', { recursive: true });
  const root = await mkdtemp(join(process.cwd(), '.tmp/lark-failure-'));
  await writeJson(join(root, 'agent-admin.config.json'), {
    version: 1,
    agents: ['codex'],
    api: { mode: 'local' },
  });
  const result = await readSource(root, 'lark', 'https://example.feishu.cn/docx/test123', {
    runCommand: async (_, args) => {
      if (args[1] === '+fetch')
        return {
          stdout: JSON.stringify({
            ok: true,
            data: {
              document: {
                document_id: 'doc123',
                revision_id: 1,
                content: '<img token="image123"/>',
              },
            },
          }),
        };
      throw new Error('403 forbidden');
    },
  });
  assert.equal((await readJson(result.file)).resources[0].status, 'unavailable');
  assert.ok(result.warnings.some((warning) => warning.includes('403')));
});
