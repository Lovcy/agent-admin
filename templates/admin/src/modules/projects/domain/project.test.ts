import { describe, expect, it } from 'vitest';
import { filterProjects, validateProject, type Project } from './project';

const projects: Project[] = [
  { id: '1', name: 'Customer Service', owner: 'Lin', status: 'active', updatedAt: '2026-09-06' },
  { id: '2', name: 'Inventory', owner: 'Chen', status: 'completed', updatedAt: '2026-09-05' },
];
describe('project rules', () => {
  it('combines normalized keyword and status without mutating the source', () => {
    expect(filterProjects(projects, '  LIN  ', 'active').map((p) => p.id)).toEqual(['1']);
    expect(filterProjects(projects, 'Lin', 'completed')).toEqual([]);
    expect(filterProjects(projects, '', '')).toHaveLength(2);
    expect(projects).toHaveLength(2);
  });
  it('rejects whitespace-only fields and invalid name boundaries', () => {
    expect(validateProject({ name: ' a ', owner: 'Lin' })).not.toBeNull();
    expect(validateProject({ name: 'Valid', owner: '  ' })).not.toBeNull();
    expect(validateProject({ name: 'a'.repeat(41), owner: 'Lin' })).not.toBeNull();
    expect(validateProject({ name: ' Valid ', owner: 'Lin' })).toBeNull();
  });
});
