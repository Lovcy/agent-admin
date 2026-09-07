import { computed, ref, type InjectionKey } from 'vue';
import {
  filterProjects,
  validateProject,
  type Project,
  type ProjectDraft,
  type ProjectRepository,
  type ProjectStatus,
} from '../domain/project';

export const projectRepositoryKey: InjectionKey<ProjectRepository> = Symbol('ProjectRepository');
export function useProjects(repository: ProjectRepository) {
  const projects = ref<Project[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref('');
  const query = ref('');
  const status = ref<ProjectStatus | ''>('');
  const filtered = computed(() => filterProjects(projects.value, query.value, status.value));
  async function load() {
    loading.value = true;
    error.value = '';
    try {
      projects.value = await repository.list();
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : '加载失败';
    } finally {
      loading.value = false;
    }
  }
  async function create(draft: ProjectDraft) {
    const invalid = validateProject(draft);
    if (invalid) throw new Error(invalid);
    saving.value = true;
    try {
      const created = await repository.create({
        name: draft.name.trim(),
        owner: draft.owner.trim(),
      });
      projects.value = [created, ...projects.value];
    } finally {
      saving.value = false;
    }
  }
  return { projects, loading, saving, error, query, status, filtered, load, create };
}
