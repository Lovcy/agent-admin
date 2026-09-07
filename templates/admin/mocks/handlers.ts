import { http, HttpResponse } from 'msw';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { components } from '../src/api/generated/types';
import definitions from '../src/api/generated/definitions.json';
const ajv = new Ajv({ strict: false });
addFormats(ajv);
type Project = components['schemas']['Project'];
const initial: Project[] = [
  {
    id: 'PRJ-1001',
    name: '客户服务平台',
    owner: '陈晓',
    status: 'active',
    updatedAt: '2026-09-06',
  },
  {
    id: 'PRJ-1002',
    name: '供应链管理系统',
    owner: '林悦',
    status: 'active',
    updatedAt: '2026-09-05',
  },
  {
    id: 'PRJ-1003',
    name: '数据分析工作台',
    owner: '王浩',
    status: 'paused',
    updatedAt: '2026-09-04',
  },
  {
    id: 'PRJ-1004',
    name: '企业知识库',
    owner: '周宁',
    status: 'completed',
    updatedAt: '2026-09-03',
  },
  {
    id: 'PRJ-1005',
    name: '采购审批中心',
    owner: '李思',
    status: 'active',
    updatedAt: '2026-09-02',
  },
  {
    id: 'PRJ-1006',
    name: '资产管理平台',
    owner: '张帆',
    status: 'completed',
    updatedAt: '2026-09-01',
  },
];
let projects = structuredClone(initial);
function json(operation: keyof typeof definitions, data: object) {
  if (!ajv.validate(definitions[operation].schema, data))
    throw new Error(`Invalid mock: ${operation}`);
  return HttpResponse.json(data);
}
function authorized(request: Request) {
  return request.headers.get('Authorization') === 'Bearer mock-session';
}
export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body: unknown = await request.json();
    const validate = ajv.compile<{ username: string; password: string }>(
      definitions.login.bodySchema,
    );
    if (!validate(body)) return HttpResponse.json({ message: 'Invalid input' }, { status: 400 });
    if (body.username !== 'admin' || body.password !== 'admin123')
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    projects = structuredClone(initial);
    return json('login', { token: 'mock-session', name: '管理员' });
  }),
  http.get('/api/projects', ({ request }) =>
    authorized(request)
      ? json('listProjects', { items: projects })
      : new HttpResponse(null, { status: 401 }),
  ),
  http.post('/api/projects', async ({ request }) => {
    if (!authorized(request)) return new HttpResponse(null, { status: 401 });
    const body: unknown = await request.json();
    const validate = ajv.compile<components['schemas']['ProjectInput']>(
      definitions.createProject.bodySchema,
    );
    if (!validate(body)) return new HttpResponse(null, { status: 400 });
    const project: Project = {
      ...body,
      id: `PRJ-${crypto.randomUUID().slice(0, 8)}`,
      status: 'active',
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    projects.unshift(project);
    return json('createProject', project);
  }),
  http.post('/api/files', async ({ request }) => {
    if (!authorized(request)) return new HttpResponse(null, { status: 401 });
    const body = await request.formData();
    const file = body.get('file');
    if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024)
      return new HttpResponse(null, { status: 400 });
    return json('uploadFile', { id: crypto.randomUUID(), name: file.name, size: file.size });
  }),
];
