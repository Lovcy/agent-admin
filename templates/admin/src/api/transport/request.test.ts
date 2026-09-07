import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureTransport, request } from './request';
const schema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string' } },
  additionalProperties: false,
};
afterEach(() => {
  vi.unstubAllGlobals();
  configureTransport({ token: () => null, unauthorized: () => undefined });
});
describe('contract transport', () => {
  it('encodes path values, sends authentication and validates the response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: '1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    configureTransport({ token: () => 'secret', unauthorized: () => undefined });
    expect(
      await request<{ id: string }>({
        url: '/items/{id}',
        path: { id: 'a/b' },
        method: 'GET',
        schema,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      }),
    ).toEqual({ id: '1' });
    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain('/api/items/a%2Fb');
    expect((call?.[1] as RequestInit).headers).toBeInstanceOf(Headers);
  });
  it('rejects a malformed successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 })),
    );
    await expect(request({ url: '/items', method: 'GET', schema, parameters: [] })).rejects.toThrow(
      '接口响应与契约不一致',
    );
  });
  it('invalidates the session on unauthorized responses', async () => {
    const expired = vi.fn();
    configureTransport({ token: () => 'old', unauthorized: expired });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    await expect(request({ url: '/items', method: 'GET', schema, parameters: [] })).rejects.toThrow(
      '登录已失效',
    );
    expect(expired).toHaveBeenCalledOnce();
  });
  it('rejects missing required input before sending any request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      request({
        url: '/items',
        method: 'GET',
        schema,
        parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string' } }],
      }),
    ).rejects.toThrow('Missing parameter');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
