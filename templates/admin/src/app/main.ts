import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import '../shared/theme/base.css';
import App from './App.vue';
import { router } from '../router';
import { projectRepository } from '../modules/projects/data/projectRepository';
import { projectRepositoryKey } from '../modules/projects/application/useProjects';
import { sessionRepository } from '../modules/session/data/sessionRepository';
import { sessionRepositoryKey, useSessionStore } from '../modules/session/application/sessionStore';
import { fileRepository } from '../modules/files/data/fileRepository';
import { fileRepositoryKey } from '../modules/files/application/useFiles';
import { configureTransport } from '../api/transport/request';
import { useUiStore } from './uiStore';

async function start() {
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_CONTRACT_MODE === 'local' &&
    import.meta.env.VITE_MOCK !== 'false'
  ) {
    const { worker } = await import('../../mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
  }
  const app = createApp(App);
  app.use(createPinia());
  const session = useSessionStore();
  configureTransport({
    token: () => session.session?.token ?? null,
    unauthorized: () => {
      session.clear();
      useUiStore().reset();
      void router.replace({
        path: '/login',
        query: { redirect: router.currentRoute.value.fullPath },
      });
    },
  });
  app.provide(projectRepositoryKey, projectRepository);
  app.provide(sessionRepositoryKey, sessionRepository);
  app.provide(fileRepositoryKey, fileRepository);
  app.use(ElementPlus, { locale: zhCn }).use(router);
  await router.isReady();
  app.mount('#app');
}
void start();
