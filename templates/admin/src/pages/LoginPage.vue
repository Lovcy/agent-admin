<script setup lang="ts">
import { inject, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { sessionRepositoryKey, useSessionStore } from '../modules/session/application/sessionStore';
const repository = inject(sessionRepositoryKey);
if (!repository) throw new Error('SessionRepository not provided');
const session = useSessionStore();
const route = useRoute();
const router = useRouter();
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
async function submit() {
  if (!username.value.trim() || !password.value) {
    error.value = '请输入账号和密码';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    session.accept(await repository!.login(username.value.trim(), password.value));
    const redirect = route.query.redirect;
    await router.replace(
      typeof redirect === 'string' &&
        redirect.startsWith('/') &&
        !redirect.startsWith('//') &&
        !redirect.startsWith('/login')
        ? redirect
        : '/projects',
    );
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <main class="login-page">
    <div class="login-brand"><span class="brand-mark">A</span>Admin Kit</div>
    <section class="login-form">
      <div class="section-label">WORKSPACE</div>
      <h1>登录管理中心</h1>
      <el-form label-position="top" @submit.prevent="submit"
        ><el-form-item label="账号"
          ><el-input
            v-model="username"
            aria-label="账号"
            autocomplete="username"
            size="large" /></el-form-item
        ><el-form-item label="密码"
          ><el-input
            v-model="password"
            aria-label="密码"
            type="password"
            autocomplete="current-password"
            show-password
            size="large" /></el-form-item
        ><el-alert v-if="error" :title="error" type="error" :closable="false" show-icon /><el-button
          type="primary"
          native-type="submit"
          size="large"
          :loading="loading"
          class="login-submit"
          >登录</el-button
        ></el-form
      >
    </section>
    <footer>Admin Kit / 管理中心</footer>
  </main>
</template>
