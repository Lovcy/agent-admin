import { z } from 'zod';
import { join } from 'node:path';
import { readJson } from './io.mjs';

const configSchema = z.object({
  version: z.literal(1),
  agents: z.array(z.enum(['codex', 'claude', 'cursor', 'trae'])),
  api: z.object({
    mode: z.enum(['local', 'yapi']),
    localContract: z.string().default('contracts/local.openapi.json'),
    yapiContract: z.string().default('contracts/yapi.openapi.json'),
    yapi: z
      .object({
        baseUrl: z.string().url(),
        projects: z
          .array(z.object({ id: z.number().int().positive(), tokenEnv: z.string() }))
          .min(1),
      })
      .optional(),
  }),
  lark: z.object({ executable: z.string().default('lark-cli') }).default({}),
  zentao: z
    .object({
      baseUrl: z.string().url(),
      tokenEnv: z.string().default('ZENTAO_TOKEN'),
      productIds: z.array(z.number().int().positive()).min(1),
    })
    .optional(),
});
export async function loadConfig(root) {
  return configSchema.parse(await readJson(join(root, 'admin-kit.config.json')));
}
