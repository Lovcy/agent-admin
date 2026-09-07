export type ProjectStatus = 'active' | 'paused' | 'completed';
export interface Project {
  id: string;
  name: string;
  owner: string;
  status: ProjectStatus;
  updatedAt: string;
}
export interface ProjectDraft {
  name: string;
  owner: string;
}
export interface ProjectRepository {
  list(): Promise<Project[]>;
  create(draft: ProjectDraft): Promise<Project>;
}

export function validateProject(draft: ProjectDraft): string | null {
  if (draft.name.trim().length < 2 || draft.name.trim().length > 40)
    return '项目名称需为 2 至 40 个字符';
  if (!draft.owner.trim() || draft.owner.trim().length > 30) return '请填写 1 至 30 个字符的负责人';
  return null;
}
export function filterProjects(projects: Project[], query: string, status: ProjectStatus | '') {
  const term = query.trim().toLocaleLowerCase();
  return projects.filter(
    (project) =>
      (!status || project.status === status) &&
      `${project.name} ${project.owner}`.toLocaleLowerCase().includes(term),
  );
}
