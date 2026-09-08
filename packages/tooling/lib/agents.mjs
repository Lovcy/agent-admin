import { cp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { loadConfig } from './config.mjs';

async function preserveWrite(path, content, conflicts) {
  await mkdir(dirname(path), { recursive: true });
  const old = await readFile(path, 'utf8').catch(() => null);
  if (old !== null && old !== content) {
    const suggestion = `${path}.agent-admin-new`;
    await writeFile(suggestion, content);
    conflicts.push(suggestion);
  } else await writeFile(path, content);
}
export async function setupAgents(root, assets) {
  const { agents } = await loadConfig(root);
  const conflicts = [];
  await mkdir(join(root, '.agent-admin'), { recursive: true });
  await cp(join(assets, 'rules'), join(root, '.agent-admin/rules'), {
    recursive: true,
    force: false,
    errorOnExist: false,
  });
  await cp(join(assets, 'skills'), join(root, '.agent-admin/skills'), {
    recursive: true,
    force: false,
    errorOnExist: false,
  });
  const pointer =
    '# Agent Admin project\n\nRead `.agent-admin/rules/core.md` before modifying this project.\nFor feature requests read `.agent-admin/skills/admin-feature/SKILL.md`.\nFor bug documents or ZenTao IDs read `.agent-admin/skills/admin-bugfix/SKILL.md`.\nFor UI, Vue, Vite, Pinia, Router or Element Plus work read `.agent-admin/skills/admin-frontend/SKILL.md`.\n';
  const mcp = {
    mcpServers: {
      'chrome-devtools': {
        command: 'npx',
        args: ['-y', 'chrome-devtools-mcp@0.20.0', '--isolated'],
      },
    },
  };
  await preserveWrite(join(root, 'AGENTS.md'), pointer, conflicts);
  for (const agent of agents) {
    const folder = agent === 'codex' ? '.agents' : `.${agent}`;
    await mkdir(join(root, folder, 'skills'), { recursive: true });
    for (const name of ['admin-feature', 'admin-bugfix', 'admin-frontend']) {
      await mkdir(join(root, folder, 'skills', name), { recursive: true });
      const original = await readFile(join(assets, 'skills', name, 'SKILL.md'), 'utf8');
      await preserveWrite(join(root, folder, 'skills', name, 'SKILL.md'), original, conflicts);
    }
    if (agent === 'codex') {
      await mkdir(join(root, '.codex'), { recursive: true });
      await preserveWrite(
        join(root, '.codex/config.toml'),
        '[mcp_servers.chrome-devtools]\ncommand = "npx"\nargs = ["-y", "chrome-devtools-mcp@0.20.0", "--isolated"]\n',
        conflicts,
      );
    } else if (agent === 'claude') {
      await preserveWrite(join(root, 'CLAUDE.md'), pointer, conflicts);
      await preserveWrite(join(root, '.mcp.json'), `${JSON.stringify(mcp, null, 2)}\n`, conflicts);
    } else {
      await mkdir(join(root, folder, 'rules'), { recursive: true });
      const rule =
        agent === 'cursor'
          ? `---\ndescription: Agent Admin project workflow\nalwaysApply: true\n---\n${pointer}`
          : pointer;
      await preserveWrite(
        join(root, folder, 'rules', agent === 'cursor' ? 'agent-admin.mdc' : 'project_rules.md'),
        rule,
        conflicts,
      );
      await preserveWrite(
        join(root, folder, 'mcp.json'),
        `${JSON.stringify(mcp, null, 2)}\n`,
        conflicts,
      );
    }
  }
  // Assets ship with generated projects so setup never depends on the original repository.
  if (
    !(await access(join(root, 'scripts/agent-assets')).then(
      () => true,
      () => false,
    ))
  )
    await cp(assets, join(root, 'scripts/agent-assets'), { recursive: true });
  return { agents, conflicts };
}
