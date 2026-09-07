import { createRouter, createWebHistory } from 'vue-router';
import { useSessionStore } from '../modules/session/application/sessionStore';
import { useUiStore } from '../app/uiStore';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/projects' },
    {
      path: '/login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { title: '登录', public: true },
    },
    {
      path: '/projects',
      component: () => import('../pages/ProjectsPage.vue'),
      meta: { title: '项目管理' },
    },
    {
      path: '/files',
      component: () => import('../pages/FilesPage.vue'),
      meta: { title: '文件中心' },
    },
    {
      path: '/settings',
      component: () => import('../pages/SettingsPage.vue'),
      meta: { title: '个人设置' },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../pages/NotFoundPage.vue'),
      meta: { title: '页面不存在' },
    },
  ],
});
router.beforeEach((to) => {
  const session = useSessionStore();
  if (!to.meta.public && !session.session)
    return { path: '/login', query: { redirect: to.fullPath } };
  if (to.path === '/login' && session.session) return '/projects';
});
router.afterEach((to) => {
  document.title = `${String(to.meta.title ?? '管理中心')} · Admin Kit`;
  if (!to.meta.public && to.matched[0]?.path !== '/:pathMatch(.*)*')
    useUiStore().visit(to.path, String(to.meta.title));
});
