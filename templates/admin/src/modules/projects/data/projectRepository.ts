import { createProject, listProjects } from '../../../api/generated/client';
import type { ProjectRepository } from '../domain/project';

export const projectRepository: ProjectRepository = {
  async list() {
    const result = await listProjects();
    return result.items.map((item) => ({ ...item }));
  },
  async create(draft) {
    return { ...(await createProject({ body: draft })) };
  },
};
