import { ref, watch } from 'vue';
import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', () => {
  const dark = ref(localStorage.getItem('admin-kit.theme') === 'dark');
  const tabs = ref<{ path: string; title: string }[]>([{ path: '/projects', title: '项目管理' }]);
  watch(
    dark,
    (value) => {
      document.documentElement.classList.toggle('dark', value);
      localStorage.setItem('admin-kit.theme', value ? 'dark' : 'light');
    },
    { immediate: true },
  );
  function visit(path: string, title: string) {
    if (!tabs.value.some((tab) => tab.path === path)) tabs.value.push({ path, title });
  }
  function close(path: string) {
    if (path !== '/projects') tabs.value = tabs.value.filter((tab) => tab.path !== path);
  }
  function reset() {
    tabs.value = [{ path: '/projects', title: '项目管理' }];
  }
  return { dark, tabs, visit, close, reset };
});
