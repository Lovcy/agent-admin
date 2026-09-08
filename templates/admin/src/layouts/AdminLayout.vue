<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  FolderOpened,
  Files,
  Setting,
  Moon,
  Sunny,
  SwitchButton,
  Close,
  Menu,
} from '@element-plus/icons-vue';
import { useUiStore } from '../app/uiStore';
import { useSessionStore } from '../modules/session/application/sessionStore';
const route = useRoute();
const router = useRouter();
const ui = useUiStore();
const session = useSessionStore();
const menuOpen = ref(false);
const navigation = [
  { path: '/projects', title: '项目管理', icon: FolderOpened },
  { path: '/files', title: '文件中心', icon: Files },
  { path: '/settings', title: '个人设置', icon: Setting },
];
function logout() {
  session.clear();
  ui.reset();
  void router.push('/login');
}
function close(path: string) {
  ui.close(path);
  if (route.path === path) void router.push(ui.tabs.at(-1)?.path ?? '/projects');
}
</script>
<template>
  <div class="admin-shell">
    <button v-if="menuOpen" class="nav-backdrop" aria-label="关闭导航" @click="menuOpen = false" />
    <aside class="sidebar" :class="{ open: menuOpen }">
      <router-link class="brand" to="/projects"
        ><span class="brand-mark">A</span><span>Agent Admin<small>管理中心</small></span></router-link
      >
      <div class="workspace-label">工作空间</div>
      <nav aria-label="主导航">
        <router-link
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          @click="menuOpen = false"
          ><el-icon><component :is="item.icon" /></el-icon>{{ item.title }}</router-link
        >
      </nav>
      <div class="sidebar-footer"><span class="status-dot" />工作空间已连接</div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="breadcrumb">
          <el-button
            class="mobile-menu"
            aria-label="打开导航"
            :icon="Menu"
            text
            @click="menuOpen = true"
          /><span>工作空间</span><span>/</span><strong>{{ route.meta.title }}</strong>
        </div>
        <div class="topbar-actions">
          <el-tooltip :content="ui.dark ? '切换浅色主题' : '切换深色主题'"
            ><el-button
              :icon="ui.dark ? Sunny : Moon"
              circle
              aria-label="切换主题"
              @click="ui.dark = !ui.dark" /></el-tooltip
          ><span class="user-name">{{ session.session?.name }}</span
          ><el-tooltip content="退出登录"
            ><el-button :icon="SwitchButton" circle aria-label="退出登录" @click="logout"
          /></el-tooltip>
        </div>
      </header>
      <div class="page-tabs" aria-label="已打开页面">
        <div
          v-for="tab in ui.tabs"
          :key="tab.path"
          :class="['page-tab', { active: route.path === tab.path }]"
        >
          <router-link :to="tab.path">{{ tab.title }}</router-link
          ><button
            v-if="tab.path !== '/projects'"
            :aria-label="`关闭${tab.title}`"
            @click="close(tab.path)"
          >
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </div>
      <main class="page-content"><slot /></main>
      <footer class="main-footer"><span>Agent Admin</span><span>工作空间 / 默认项目</span></footer>
    </div>
  </div>
</template>
