<script setup lang="ts">
import { useUiStore } from '../app/uiStore';
const ui = useUiStore();
</script>
<template>
  <section>
    <div class="page-heading">
      <div>
        <div class="section-label">PREFERENCES</div>
        <h1>个人设置</h1>
        <p>当前浏览器偏好</p>
      </div>
    </div>
    <div class="setting-row">
      <div>
        <h2>深色主题</h2>
        <p>外观</p>
      </div>
      <el-switch v-model="ui.dark" aria-label="深色主题" />
    </div>
  </section>
</template>
