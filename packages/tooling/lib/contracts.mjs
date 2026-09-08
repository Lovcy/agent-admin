import { readFile, mkdir, writeFile, readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import openapiTS, { astToString } from 'openapi-typescript';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import ts from 'typescript';
import { z } from 'zod';
import { inside, readJson, writeJson } from './io.mjs';
import { loadConfig } from './config.mjs';

const methods = ['get', 'post', 'put', 'patch', 'delete'];
export const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function inspectRefs(value) {
  if (!value || typeof value !== 'object') return;
  if (value.$ref && !value.$ref.startsWith('#/'))
    throw new Error('Only local contract references are supported');
  for (const child of Object.values(value)) inspectRefs(child);
}
function assertSchema(schema, where) {
  if (!schema || typeof schema !== 'object') throw new Error(`Missing schema: ${where}`);
  if (schema.$ref) return;
  if (schema['x-unknown'] === true) return;
  if (!schema.type && !schema.enum && !schema.oneOf && !schema.anyOf && !schema.allOf)
    throw new Error(
      `Incomplete schema at ${where}. Define a type or explicitly use x-unknown: true.`,
    );
  if (schema.type === 'object') {
    if (!schema.properties && schema.additionalProperties === undefined)
      throw new Error(`Unspecified object structure: ${where}`);
    for (const [key, child] of Object.entries(schema.properties ?? {}))
      assertSchema(child, `${where}.${key}`);
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object')
      assertSchema(schema.additionalProperties, `${where}.*`);
  }
  if (schema.type === 'array') assertSchema(schema.items, `${where}[]`);
  for (const key of ['oneOf', 'anyOf', 'allOf'])
    for (const child of schema[key] ?? []) assertSchema(child, where);
}

export async function compileContract(input) {
  if (input.openapi !== '3.0.3') throw new Error('Contract must use OpenAPI 3.0.3');
  inspectRefs(input);
  const doc = await $RefParser.dereference(structuredClone(input), {
    dereference: { circular: false },
  });
  const operations = [];
  const ids = new Set();
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    if (!path.startsWith('/') || /[?#]/.test(path))
      throw new Error(`Invalid OpenAPI path: ${path}`);
    for (const method of Object.keys(item)) {
      if (['head', 'options', 'trace'].includes(method))
        throw new Error(`Unsupported method: ${method}`);
    }
    for (const method of methods) {
      const operation = item[method];
      if (!operation) continue;
      const id = operation.operationId;
      const scanner = ts.createScanner(
        ts.ScriptTarget.Latest,
        false,
        ts.LanguageVariant.Standard,
        id ?? '',
      );
      if (
        !/^[a-zA-Z_$][\w$]*$/.test(id ?? '') ||
        scanner.scan() !== ts.SyntaxKind.Identifier ||
        ['request', 'definitions'].includes(id) ||
        ids.has(id)
      )
        throw new Error(`Invalid or duplicate operationId: ${id}`);
      ids.add(id);
      const parameters = [...(item.parameters ?? []), ...(operation.parameters ?? [])];
      for (const p of parameters) {
        if (!['query', 'path', 'header'].includes(p.in) || !/^[\w-]+$/.test(p.name))
          throw new Error(`Unsupported parameter in ${id}`);
        assertSchema(p.schema, `${id}.${p.name}`);
        if (!['string', 'number', 'integer', 'boolean'].includes(p.schema.type))
          throw new Error(`Only scalar parameters are supported: ${id}.${p.name}`);
      }
      for (const match of path.matchAll(/\{([^}]+)\}/g)) {
        if (!parameters.some((p) => p.in === 'path' && p.name === match[1] && p.required))
          throw new Error(`Missing required path parameter: ${id}.${match[1]}`);
      }
      const successes = Object.entries(operation.responses ?? {}).filter(([status]) =>
        /^2\d\d$/.test(status),
      );
      if (successes.length !== 1)
        throw new Error(`Exactly one success response is required: ${id}`);
      const [status, response] = successes[0];
      const responseSchema = response.content?.['application/json']?.schema;
      if (!responseSchema) throw new Error(`Only JSON success responses are supported: ${id}`);
      assertSchema(responseSchema, `${id}.response`);
      const content = operation.requestBody?.content;
      const media = content ? Object.keys(content)[0] : undefined;
      if (
        content &&
        (Object.keys(content).length !== 1 ||
          !['application/json', 'multipart/form-data'].includes(media))
      )
        throw new Error(`Unsupported request content: ${id}`);
      const bodySchema = media ? content[media].schema : undefined;
      if (content) assertSchema(bodySchema, `${id}.body`);
      operations.push({
        id,
        path,
        method,
        parameters,
        status,
        responseSchema,
        bodySchema,
        media,
        bodyRequired: operation.requestBody?.required === true,
      });
    }
  }
  if (!operations.length) throw new Error('Contract contains no operations');
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  for (const op of operations) {
    ajv.compile(op.responseSchema);
    if (op.bodySchema) ajv.compile(op.bodySchema);
  }
  return { doc, operations };
}

export async function renderContract(input) {
  const { operations } = await compileContract(input);
  const types = astToString(await openapiTS(input));
  function inspectTypes(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) throw new Error('Generator produced forbidden any');
    ts.forEachChild(node, inspectTypes);
  }
  inspectTypes(ts.createSourceFile('types.ts', types, ts.ScriptTarget.Latest, true));
  const clients = operations
    .map((op) => {
      const operationType = `operations[${JSON.stringify(op.id)}]`;
      const parts = [];
      for (const location of ['query', 'path', 'header']) {
        const params = op.parameters.filter((p) => p.in === location);
        if (params.length)
          parts.push(
            `${location}${params.some((p) => p.required) ? '' : '?'}: NonNullable<${operationType}['parameters']['${location}']>`,
          );
      }
      if (op.bodySchema)
        parts.push(
          `body${op.bodyRequired ? '' : '?'}: ${op.media === 'multipart/form-data' ? 'FormData' : `NonNullable<${operationType}['requestBody']>['content']['application/json']`}`,
        );
      const optional = parts.every((p) => p.includes('?:'));
      return `export function ${op.id}(${parts.length ? `input: { ${parts.join('; ')} }${optional ? ' = {}' : ''}` : ''}) {\n  return request<${operationType}['responses'][${op.status}]['content']['application/json']>({ ...definitions[${JSON.stringify(op.id)}]${parts.length ? ', ...input' : ''} });\n}`;
    })
    .join('\n\n');
  const defs = Object.fromEntries(
    operations.map((op) => [
      op.id,
      {
        url: op.path,
        method: op.method.toUpperCase(),
        media: op.media,
        schema: op.responseSchema,
        bodySchema: op.bodySchema,
        bodyRequired: op.bodyRequired,
        parameters: op.parameters,
      },
    ]),
  );
  return {
    'types.ts': `// Generated by agent-admin. Regenerate from the contract.\n${types}`,
    'client.ts': `// Generated by agent-admin. Regenerate from the contract.\nimport type { operations } from './types';\nimport { request } from '../transport/request';\nimport definitions from './definitions.json';\n\n${clients}\n`,
    'definitions.json': `${JSON.stringify(defs, null, 2)}\n`,
    'manifest.json': `${JSON.stringify({ generator: 'agent-admin@0.1.0', contractHash: digest(input) }, null, 2)}\n`,
  };
}

export async function generate(root, check = false) {
  const config = await loadConfig(root);
  const file = config.api.mode === 'yapi' ? config.api.yapiContract : config.api.localContract;
  const input = await readJson(inside(root, file));
  if (config.api.mode === 'yapi') {
    const provenance = await readJson(join(root, 'contracts/yapi.source.json'));
    if (provenance.hash !== digest(input)) throw new Error('YApi snapshot changed. Run api:sync.');
  }
  const output = await renderContract(input);
  const target = join(root, 'src/api/generated');
  if (check) {
    const files = await readdir(target);
    if (files.sort().join() !== Object.keys(output).sort().join())
      throw new Error('Unexpected or missing generated file');
    for (const [name, body] of Object.entries(output)) {
      if ((await readFile(join(target, name), 'utf8')).replaceAll('\r\n', '\n') !== body)
        throw new Error(`Generated file changed: ${name}. Run api:generate.`);
    }
  } else {
    await mkdir(target, { recursive: true });
    const existing = await readdir(target);
    if (existing.some((name) => !(name in output)))
      throw new Error('Unexpected file in generated directory; review before generation');
    for (const [name, body] of Object.entries(output)) {
      const temp = join(target, `${name}.tmp`);
      await writeFile(temp, body);
      await rename(temp, join(target, name));
    }
  }
  return Object.keys(output);
}

export function convertYapi(records) {
  const required = (value) => value === true || value === 1 || value === '1';
  const paths = {};
  for (const { projectId, detail } of records) {
    const method = detail.method?.toLowerCase();
    const path =
      typeof detail.path === 'string'
        ? detail.path.replace(/:([A-Za-z_]\w*)(?=\/|$)/g, '{$1}')
        : detail.path;
    if (!methods.includes(method) || typeof path !== 'string' || !path.startsWith('/'))
      throw new Error('Invalid YApi path or method');
    if (detail.res_body_type !== 'json' || !required(detail.res_body_is_json_schema))
      throw new Error(
        `YApi ${detail._id}: response must be JSON Schema; examples are not contracts`,
      );
    const parameters = [];
    for (const [key, location] of [
      ['req_query', 'query'],
      ['req_params', 'path'],
      ['req_headers', 'header'],
    ]) {
      for (const p of detail[key] ?? []) {
        if (location === 'header' && /^(content-type|authorization)$/i.test(p.name)) continue;
        if (location !== 'header' && !p.type)
          throw new Error(`YApi ${detail._id}: parameter ${p.name} has no type`);
        parameters.push({
          name: p.name,
          in: location,
          required: location === 'path' || required(p.required),
          schema: { type: p.type || 'string' },
        });
      }
    }
    let requestBody;
    if (detail.req_body_type === 'json' && detail.req_body_other) {
      if (!required(detail.req_body_is_json_schema))
        throw new Error(`YApi ${detail._id}: request must be JSON Schema`);
      requestBody = {
        required: true,
        content: { 'application/json': { schema: JSON.parse(detail.req_body_other) } },
      };
    } else if (detail.req_body_type === 'form') {
      const properties = {};
      const requiredFields = [];
      for (const p of detail.req_body_form ?? []) {
        if (!['file', 'text'].includes(p.type)) throw new Error('Unsupported YApi form field');
        properties[p.name] =
          p.type === 'file' ? { type: 'string', format: 'binary' } : { type: 'string' };
        if (required(p.required)) requiredFields.push(p.name);
      }
      requestBody = {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties,
              required: requiredFields,
              additionalProperties: false,
            },
          },
        },
      };
    } else if (detail.req_body_other) throw new Error('Unsupported YApi request body');
    paths[path] ??= {};
    if (paths[path][method])
      throw new Error(`Duplicate endpoint across YApi projects: ${method} ${path}`);
    paths[path][method] = {
      operationId: `yapi${projectId}Interface${detail._id}`,
      summary: detail.title,
      parameters,
      ...(requestBody ? { requestBody } : {}),
      responses: {
        200: {
          description: 'Success',
          content: { 'application/json': { schema: JSON.parse(detail.res_body) } },
        },
      },
    };
  }
  return { openapi: '3.0.3', info: { title: 'YApi synchronized contract', version: '1' }, paths };
}

export async function syncYapi(root) {
  const config = await loadConfig(root);
  if (config.api.mode !== 'yapi')
    throw new Error('Local contract mode: use api:generate; no YApi sync performed');
  if (!config.api.yapi) throw new Error('Configure api.yapi first');
  const records = [];
  const listSchema = z.object({
    total: z.number().int().nonnegative(),
    count: z.number().int().nonnegative().optional(),
    list: z.array(z.object({ _id: z.number().int().positive() })),
  });
  for (const project of config.api.yapi.projects) {
    const token = process.env[project.tokenEnv];
    if (!token) throw new Error(`Missing environment variable: ${project.tokenEnv}`);
    async function get(endpoint, query) {
      const url = new URL(`${config.api.yapi.baseUrl.replace(/\/$/, '')}/api/${endpoint}`);
      url.search = new URLSearchParams({ ...query, token }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
      if (!response.ok) throw new Error(`YApi HTTP ${response.status}`);
      const json = await response.json();
      if (json.errcode !== 0) throw new Error(`YApi API error ${json.errcode}; check permissions`);
      return json.data;
    }
    const list = listSchema.parse(
      await get('interface/list', {
        project_id: String(project.id),
        limit: '100',
        page: '1',
      }),
    );
    const entries = [...list.list];
    for (let page = 2; page <= Number(list.total); page++) {
      const next = listSchema.parse(
        await get('interface/list', {
          project_id: String(project.id),
          limit: '100',
          page: String(page),
        }),
      );
      entries.push(...next.list);
    }
    if (list.count !== undefined && list.count !== entries.length)
      throw new Error('YApi list changed during pagination; sync again');
    for (const entry of entries) {
      const detail = await get('interface/get', { id: String(entry._id) });
      if (
        detail._id !== entry._id ||
        (detail.project_id !== undefined && detail.project_id !== project.id)
      )
        throw new Error('YApi detail identity mismatch');
      records.push({ projectId: project.id, detail });
    }
  }
  const contract = convertYapi(records);
  await renderContract(contract);
  const previous = await readJson(inside(root, config.api.yapiContract)).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return readJson(inside(root, config.api.localContract)).catch((localError) => {
      if (localError.code !== 'ENOENT') throw localError;
      return null;
    });
  });
  await writeJson(join(root, '.agent-admin/incoming/yapi-diff.json'), {
    previousHash: previous ? digest(previous) : null,
    nextHash: digest(contract),
    previous,
    next: contract,
  });
  await writeJson(inside(root, config.api.yapiContract), contract);
  await writeJson(join(root, 'contracts/yapi.source.json'), {
    hash: digest(contract),
    syncedAt: new Date().toISOString(),
    projects: config.api.yapi.projects.map((p) => p.id),
  });
  return generate(root);
}
