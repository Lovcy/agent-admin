<script setup lang="ts">
import type { Project } from '../domain/project';
defineProps<{ rows: Project[]; loading: boolean }>();
const labels = { active: '进行中', paused: '已暂停', completed: '已完成' } as const;
const colors = { active: 'success', paused: 'warning', completed: 'info' } as const;
</script>
<template>
  <el-table
    v-loading="loading"
    :data="rows"
    row-key="id"
    empty-text="没有符合条件的项目"
    class="project-table"
  >
    <el-table-column label="项目名称" min-width="240"
      ><template #default="{ row }"
        ><div class="project-name">
          <span class="project-monogram">{{ row.name.slice(0, 1) }}</span>
          <div>
            <strong>{{ row.name }}</strong
            ><small>{{ row.id }}</small>
          </div>
        </div></template
      ></el-table-column
    >
    <el-table-column prop="owner" label="负责人" min-width="130" />
    <el-table-column label="状态" min-width="120"
      ><template #default="{ row }: { row: Project }"
        ><el-tag :type="colors[row.status]" effect="plain">{{
          labels[row.status]
        }}</el-tag></template
      ></el-table-column
    >
    <el-table-column prop="updatedAt" label="更新时间" min-width="140" />
  </el-table>
</template>
