import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import config from './admin-kit.config.json';

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  if (command === 'build' && env.VITE_MOCK === 'true') {
    throw new Error(
      'Production build forbids VITE_MOCK=true. Remove it from .env or use .env.development.local.',
    );
  }
  if (config.api.mode === 'yapi') {
    const contract: unknown = JSON.parse(readFileSync(config.api.yapiContract, 'utf8'));
    const manifest: { contractHash: string } = JSON.parse(
      readFileSync('src/api/generated/manifest.json', 'utf8'),
    );
    if (
      createHash('sha256').update(JSON.stringify(contract)).digest('hex') !== manifest.contractHash
    )
      throw new Error('YApi contract and generated client differ. Run api:sync.');
  }
  return {
    plugins: [vue()],
    publicDir: command === 'build' ? false : 'public',
    define: { 'import.meta.env.VITE_CONTRACT_MODE': JSON.stringify(config.api.mode) },
    server: { host: '127.0.0.1' },
    build: { sourcemap: false },
  };
});
