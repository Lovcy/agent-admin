import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addFormat('binary', true);
let getToken: () => string | null = () => null;
let unauthorized: () => void = () => undefined;

export function configureTransport(options: {
  token: () => string | null;
  unauthorized: () => void;
}) {
  getToken = options.token;
  unauthorized = options.unauthorized;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
type Scalar = string | number | boolean | undefined;
interface RequestInput {
  path?: Record<string, Scalar>;
  method: string;
  media?: string;
  schema: object;
  bodySchema?: object;
  bodyRequired?: boolean;
  parameters: { name: string; in: string; required?: boolean; schema: object }[];
  query?: Record<string, Scalar>;
  header?: Record<string, Scalar>;
  body?: unknown;
}

export async function request<T>(options: RequestInput & { url?: string }): Promise<T> {
  const route = options.url ?? '';
  const pathParameters = typeof options.path === 'object' ? options.path : {};
  const path = route.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = pathParameters[name];
    if (value === undefined) throw new ApiError(`Missing path parameter: ${name}`, 0);
    return encodeURIComponent(String(value));
  });
  const base = import.meta.env.VITE_API_BASE_URL || '/api';
  const url = new URL(`${base.replace(/\/$/, '')}${path}`, window.location.origin);
  const headers = new Headers({ Accept: 'application/json' });
  for (const [name, value] of Object.entries(options.query ?? {}))
    if (value !== undefined) url.searchParams.set(name, String(value));
  for (const [name, value] of Object.entries(options.header ?? {}))
    if (value !== undefined) headers.set(name, String(value));
  for (const parameter of options.parameters) {
    const values =
      parameter.in === 'path'
        ? pathParameters
        : parameter.in === 'query'
          ? options.query
          : options.header;
    const value = values?.[parameter.name];
    if (value === undefined && parameter.required)
      throw new ApiError(`Missing parameter: ${parameter.name}`, 0);
    if (value !== undefined && !ajv.validate(parameter.schema, value))
      throw new ApiError(`Invalid parameter: ${parameter.name}`, 0);
  }
  let body: BodyInit | undefined;
  if (options.body === undefined && options.bodyRequired)
    throw new ApiError('Missing request body', 0);
  if (options.body !== undefined) {
    if (options.media === 'multipart/form-data') {
      if (!(options.body instanceof FormData)) throw new ApiError('Expected FormData', 0);
      const values = Object.fromEntries(
        [...options.body.entries()].map(([key, value]) => [
          key,
          typeof value === 'string' ? value : value.name,
        ]),
      );
      if (options.bodySchema && !ajv.validate(options.bodySchema, values))
        throw new ApiError('Invalid upload data', 0);
      body = options.body;
    } else {
      if (options.bodySchema && !ajv.validate(options.bodySchema, options.body))
        throw new ApiError('Invalid request data', 0);
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(options.body);
    }
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers,
      body,
      credentials: 'same-origin',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError('网络连接失败或请求超时，请重试', 0);
  }
  if (response.status === 401) unauthorized();
  if (!response.ok)
    throw new ApiError(
      response.status === 401 ? '登录已失效，请重新登录' : `请求失败（${response.status}）`,
      response.status,
    );
  const data: unknown = await response.json();
  const validate = ajv.compile<T>(options.schema);
  if (!validate(data)) throw new ApiError('接口响应与契约不一致', response.status);
  return data;
}
