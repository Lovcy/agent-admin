import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readJson, writeJson, inside } from './io.mjs';
import { run } from './process.mjs';
import { projectFingerprint } from './fingerprint.mjs';

const statuses = ['pending', 'running', 'waiting', 'verifying', 'complete', 'partial', 'failed'];
const transitions = {
  pending: ['running', 'waiting'],
  running: ['waiting', 'verifying', 'partial', 'failed'],
  waiting: ['running', 'partial', 'failed'],
  verifying: ['complete', 'running', 'partial', 'failed'],
  partial: ['running', 'waiting'],
  failed: ['running'],
  complete: [],
};
export async function createTask(root, kind, sourcePath) {
  if (!['feature', 'bug'].includes(kind)) throw new Error('Task kind must be feature or bug');
  const source = await readJson(inside(root, sourcePath));
  const id = randomUUID();
  const branch = await run('git', ['branch', '--show-current'], { cwd: root }).then(
    (r) => r.stdout.trim(),
    () => null,
  );
  const task = {
    id,
    kind,
    status: 'pending',
    branch,
    createdAt: new Date().toISOString(),
    source,
    issues: {},
    evidence: [],
    blockers: [],
  };
  await writeJson(join(root, '.admin-kit/runs', id, 'task.json'), task);
  return task;
}
export async function updateTask(root, id, action, value) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Invalid task ID');
  const file = join(root, '.admin-kit/runs', id, 'task.json');
  const task = await readJson(file);
  if (action === 'status') {
    if (!statuses.includes(value) || !transitions[task.status]?.includes(value))
      throw new Error(`Invalid task transition: ${task.status} -> ${value}`);
    if (value === 'complete') {
      const report = await readJson(join(root, '.admin-kit/runs/latest-verification.json'));
      if (!report.passed || report.startedAt < task.createdAt || task.blockers.length)
        throw new Error(
          'Completion requires passing verification after task creation and no blockers',
        );
      if (report.fingerprint !== (await projectFingerprint(root)))
        throw new Error('Code changed after verification. Run verify again.');
      if (!task.evidence.length)
        throw new Error('Record requirement or regression evidence before completion');
      task.verification = report;
    }
    task.status = value;
  } else if (action === 'attempt') {
    task.issues[value] = (task.issues[value] ?? 0) + 1;
    if (task.issues[value] >= 3) {
      task.status = 'waiting';
      if (!task.blockers.includes(value)) task.blockers.push(value);
    }
  } else if (action === 'evidence')
    task.evidence.push({ note: value, at: new Date().toISOString() });
  else if (action === 'block') {
    task.blockers.push(value);
    task.status = 'waiting';
  } else if (action === 'resolve') task.blockers = task.blockers.filter((item) => item !== value);
  else throw new Error('Use status, attempt, evidence, block or resolve');
  await writeJson(file, task);
  return task;
}
