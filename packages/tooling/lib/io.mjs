import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';

export const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temp, path);
}
export function inside(root, path) {
  const full = resolve(root, path);
  const rel = relative(resolve(root), full);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Path must stay inside project');
  return full;
}
export function redact(value) {
  let text = String(value);
  for (const [key, secret] of Object.entries(process.env)) {
    if (/TOKEN|SECRET|PASSWORD|API_KEY/i.test(key) && secret && secret.length > 3)
      text = text.replaceAll(secret, '[REDACTED]');
  }
  return text.replace(/([?&](?:token|access_token|password)=)[^&\s]+/gi, '$1[REDACTED]');
}
