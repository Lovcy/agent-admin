import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { z } from 'zod';
import { loadConfig } from './config.mjs';
import { run } from './process.mjs';
import { writeJson, redact } from './io.mjs';
import { digest } from './contracts.mjs';
import { XMLParser } from 'fast-xml-parser';

const larkDocument = z.object({
  ok: z.literal(true),
  data: z.object({
    document: z.object({
      document_id: z.string(),
      revision_id: z.number(),
      content: z.string(),
      reference_map: z.record(z.unknown()).optional(),
    }),
  }),
});
const bugSchema = z
  .object({
    id: z.coerce.number(),
    title: z.string(),
    steps: z.string().optional(),
    product: z.union([z.coerce.number(), z.object({ id: z.coerce.number() })]),
    module: z.unknown().optional(),
    openedBuild: z.unknown().optional(),
    files: z.unknown().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export async function readSource(root, kind, value, { runCommand = run } = {}) {
  const config = await loadConfig(root);
  const warnings = [];
  const resources = [];
  let content;
  let metadata = {};
  if (kind === 'md') {
    if (!['.md', '.markdown'].includes(extname(value).toLowerCase()))
      throw new Error('Local source must be Markdown');
    content = await readFile(resolve(root, value), 'utf8');
    metadata = { path: resolve(root, value) };
  } else if (kind === 'lark') {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !/^\/(docx|wiki)\/[a-zA-Z0-9]+/.test(url.pathname)
    )
      throw new Error('Expected an HTTPS Feishu docx or wiki URL');
    const { stdout } = await runCommand(
      config.lark.executable,
      [
        'docs',
        '+fetch',
        '--doc',
        url.href,
        '--doc-format',
        'xml',
        '--detail',
        'full',
        '--as',
        'user',
        '--format',
        'json',
      ],
      { cwd: root },
    );
    const document = larkDocument.parse(JSON.parse(stdout)).data.document;
    content = document.content;
    const references = { ...document.reference_map };
    delete references.comments;
    metadata = { documentId: document.document_id, revision: document.revision_id, references };
    const parsed = new XMLParser({ ignoreAttributes: false, processEntities: false }).parse(
      `<root>${content}</root>`,
    );
    function inspect(node) {
      if (!node || typeof node !== 'object') return;
      for (const [key, value] of Object.entries(node)) {
        if (key === 'img') {
          for (const image of Array.isArray(value) ? value : [value]) {
            if (!image || typeof image !== 'object') continue;
            const ref = image['@_ref'];
            const referenced = ref
              ? Object.values(references)
                  .map((group) => (group && typeof group === 'object' ? group[ref] : null))
                  .find(Boolean)
              : null;
            const token =
              image['@_token'] ??
              image['@_file_token'] ??
              referenced?.token ??
              referenced?.file_token;
            if (typeof token === 'string' && /^[a-zA-Z0-9_-]+$/.test(token))
              resources.push({ token, status: 'pending' });
            else
              warnings.push(
                'An embedded image has no downloadable file token; inspect the source and record unavailable visual information.',
              );
          }
        } else if (['sheet', 'bitable', 'source', 'whiteboard', 'synced_reference'].includes(key))
          warnings.push(`Embedded ${key} is outside this reader scope and was not expanded.`);
        inspect(value);
      }
    }
    inspect(parsed);
  } else if (kind === 'zentao') {
    if (!/^\d+$/.test(value) || Number(value) < 1)
      throw new Error('Bug ID must be a positive integer');
    if (!config.zentao) throw new Error('Configure zentao before reading a Bug ID');
    const token = process.env[config.zentao.tokenEnv];
    if (!token) throw new Error(`Missing ${config.zentao.tokenEnv}`);
    const url = `${config.zentao.baseUrl.replace(/\/$/, '')}/api.php/v1/bugs/${value}`;
    const response = await fetch(url, {
      headers: { Token: token },
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error(`ZenTao HTTP ${response.status}`);
    const bug = bugSchema.parse(await response.json());
    const productId = typeof bug.product === 'number' ? bug.product : bug.product.id;
    if (!config.zentao.productIds.includes(productId))
      throw new Error(
        'Bug product does not match this project. No source imported; confirm project mapping.',
      );
    content = `# ${bug.title}\n\n${bug.steps ?? 'No reproduction steps provided.'}`;
    metadata = {
      bugId: bug.id,
      productId,
      module: bug.module,
      openedBuild: bug.openedBuild,
      files: bug.files,
      status: bug.status,
    };
    warnings.push(
      'Check module and affected version against the current checkout before modifying code. Attachment and image references require inspection; their content has not been read.',
    );
  } else throw new Error('Source kind must be md, lark or zentao');
  const snapshot = {
    kind,
    source: redact(value),
    readAt: new Date().toISOString(),
    content: redact(content),
    metadata,
    warnings,
    resources,
  };
  const id = `${Date.now()}-${digest(snapshot).slice(0, 8)}`;
  const folder = join(root, '.agent-admin/incoming', id);
  await mkdir(folder, { recursive: true });
  for (const [index, resource] of resources.entries()) {
    const output = join(folder, `image-${index}`);
    try {
      await runCommand(
        config.lark.executable,
        ['docs', '+media-download', '--token', resource.token, '--output', output, '--as', 'user'],
        { cwd: root },
      );
      const file = (await readdir(folder)).find(
        (name) => name === `image-${index}` || name.startsWith(`image-${index}.`),
      );
      if (!file) throw new Error('CLI did not produce an image file');
      resource.status = 'downloaded';
      resource.file = join(folder, file);
    } catch (error) {
      resource.status = 'unavailable';
      warnings.push(`Image ${index}: ${redact(error.message)}`);
    }
  }
  await writeJson(join(folder, 'source.json'), snapshot);
  await writeFile(join(folder, kind === 'lark' ? 'content.xml' : 'content.md'), snapshot.content);
  return { id, file: join(folder, 'source.json'), warnings };
}
