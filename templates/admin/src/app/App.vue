<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import { useUiStore } from './uiStore';
import AdminLayout from '../layouts/AdminLayout.vue';
const route = useRoute();
const ui = useUiStore();
const pageNames: Record<string, string> = {
  '/projects': 'ProjectsPage',
  '/files': 'FilesPage',
  '/settings': 'SettingsPage',
};
const cachedPages = computed(() =>
  ui.tabs.flatMap((tab) => (pageNames[tab.path] ? [pageNames[tab.path]!] : [])),
);
</script>
<template>
  <router-view v-if="route.meta.public" />
  <AdminLayout v-else
    ><router-view v-slot="{ Component }"
      ><keep-alive :include="cachedPages"
        ><component :is="Component" :key="route.path" /></keep-alive></router-view
  ></AdminLayout>
</template>
