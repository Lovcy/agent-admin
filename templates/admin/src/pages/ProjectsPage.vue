<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { Plus, Refresh, Search, Folder, CircleCheck, VideoPause } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { projectRepositoryKey, useProjects } from '../modules/projects/application/useProjects';
import ProjectTable from '../modules/projects/ui/ProjectTable.vue';
const repository = inject(projectRepositoryKey);
if (!repository) throw new Error('ProjectRepository not provided');
const { projects, loading, saving, error, query, status, filtered, load, create } =
  useProjects(repository);
const page = ref(1);
const visible = ref(false);
const name = ref('');
const owner = ref('');
const formError = ref('');
const rows = computed(() => filtered.value.slice((page.value - 1) * 8, page.value * 8));
watch([query, status], () => {
  page.value = 1;
});
onMounted(load);
async function save() {
  formError.value = '';
  try {
    await create({ name: name.value, owner: owner.value });
    visible.value = false;
    name.value = '';
    owner.value = '';
    page.value = 1;
    ElMessage.success('项目已创建');
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : '创建失败';
  }
}
</script>
<template>
  <section>
    <div class="page-heading">
      <div>
        <div class="section-label">WORKSPACE</div>
        <h1>项目管理</h1>
        <p>项目进度与负责人</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="visible = true">新建项目</el-button>
    </div>
    <div class="metrics">
      <div>
        <el-icon class="metric-icon teal"><Folder /></el-icon
        ><span
          >全部项目<strong>{{ projects.length }}</strong></span
        >
      </div>
      <div>
        <el-icon class="metric-icon green"><CircleCheck /></el-icon
        ><span
          >进行中<strong>{{ projects.filter((p) => p.status === 'active').length }}</strong></span
        >
      </div>
      <div>
        <el-icon class="metric-icon amber"><VideoPause /></el-icon
        ><span
          >已暂停<strong>{{ projects.filter((p) => p.status === 'paused').length }}</strong></span
        >
      </div>
      <div>
        <el-icon class="metric-icon gray"><CircleCheck /></el-icon
        ><span
          >已完成<strong>{{
            projects.filter((p) => p.status === 'completed').length
          }}</strong></span
        >
      </div>
    </div>
    <div class="section-heading">
      <h2>
        项目列表 <span>{{ filtered.length }}</span>
      </h2>
      <el-tooltip content="刷新项目"
        ><el-button :icon="Refresh" aria-label="刷新项目" :loading="loading" circle @click="load"
      /></el-tooltip>
    </div>
    <div class="filterbar">
      <el-input
        v-model="query"
        aria-label="搜索项目"
        placeholder="搜索项目名称或负责人"
        :prefix-icon="Search"
        clearable
      /><el-select v-model="status" aria-label="项目状态" placeholder="全部状态" clearable
        ><el-option label="进行中" value="active" /><el-option
          label="已暂停"
          value="paused" /><el-option label="已完成" value="completed"
      /></el-select>
    </div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <ProjectTable :rows="rows" :loading="loading" />
    <div class="table-footer">
      <span>共 {{ filtered.length }} 个项目</span
      ><el-pagination
        v-model:current-page="page"
        :page-size="8"
        :total="filtered.length"
        layout="prev, pager, next"
      />
    </div>
    <el-dialog v-model="visible" title="新建项目" width="460px" :close-on-click-modal="false"
      ><el-form label-position="top" @submit.prevent="save"
        ><el-form-item label="项目名称"
          ><el-input v-model="name" aria-label="项目名称" maxlength="40" /></el-form-item
        ><el-form-item label="负责人"
          ><el-input v-model="owner" aria-label="负责人" maxlength="30" /></el-form-item
        ><el-alert v-if="formError" :title="formError" type="error" :closable="false" />
        <div class="dialog-actions">
          <el-button @click="visible = false">取消</el-button
          ><el-button type="primary" native-type="submit" :loading="saving">创建项目</el-button>
        </div></el-form
      ></el-dialog
    >
  </section>
</template>
