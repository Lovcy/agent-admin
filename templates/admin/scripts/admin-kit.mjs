// The CLI copies the self-contained tooling here when creating a project.
const local = new URL('./tooling/index.mjs', import.meta.url);
const development = new URL('../../../packages/tooling/index.mjs', import.meta.url);
const { access } = await import('node:fs/promises');
await import(
  await access(local).then(
    () => local.href,
    () => development.href,
  )
);
