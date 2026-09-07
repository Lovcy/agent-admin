import { describe, expect, it, vi } from 'vitest';
import { useProjects } from './useProjects';
import type { ProjectRepository } from '../domain/project';

describe('project use cases', () => {
  it('surfaces failures and releases loading state', async () => {
    const repository: ProjectRepository = {
      list: vi.fn().mockRejectedValue(new Error('offline')),
      create: vi.fn(),
    };
    const state = useProjects(repository);
    await state.load();
    expect(state.error.value).toBe('offline');
    expect(state.loading.value).toBe(false);
  });
  it('validates before I/O and normalizes accepted drafts', async () => {
    const create = vi.fn<ProjectRepository['create']>().mockImplementation(async (draft) => ({
      ...draft,
      id: '1',
      status: 'active',
      updatedAt: '2026-09-06',
    }));
    const state = useProjects({ list: async () => [], create });
    await expect(state.create({ name: ' ', owner: '' })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
    await state.create({ name: ' New project ', owner: ' Lin ' });
    expect(create).toHaveBeenCalledWith({ name: 'New project', owner: 'Lin' });
    expect(state.projects.value[0]?.name).toBe('New project');
    expect(state.saving.value).toBe(false);
  });
});
