<script setup lang="ts">
import { inject } from 'vue';
import { UploadFilled, Document } from '@element-plus/icons-vue';
import type { UploadFile } from 'element-plus';
import { fileRepositoryKey, useFiles } from '../modules/files/application/useFiles';
const repository = inject(fileRepositoryKey);
if (!repository) throw new Error('FileRepository not provided');
const { files, uploading, error, upload } = useFiles(repository);
function change(file: UploadFile) {
  if (file.raw) void upload(file.raw);
}
</script>
<template>
  <section>
    <div class="page-heading">
      <div>
        <div class="section-label">WORKSPACE</div>
        <h1>文件中心</h1>
        <p>本次会话上传的文件</p>
      </div>
    </div>
    <el-upload
      drag
      :auto-upload="false"
      :show-file-list="false"
      :disabled="uploading"
      :on-change="change"
      ><el-icon class="upload-icon"><UploadFilled /></el-icon>
      <p>{{ uploading ? '正在上传…' : '选择文件或拖放到此处' }}</p>
      <small>单个文件不超过 5 MB</small></el-upload
    ><el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <div class="section-heading">
      <h2>
        上传记录 <span>{{ files.length }}</span>
      </h2>
    </div>
    <el-table :data="files" empty-text="暂无上传记录"
      ><el-table-column label="文件名" min-width="220"
        ><template #default="{ row }"
          ><el-icon><Document /></el-icon> {{ row.name }}</template
        ></el-table-column
      ><el-table-column label="大小" width="140"
        ><template #default="{ row }"
          >{{ (row.size / 1024).toFixed(1) }} KB</template
        ></el-table-column
      ><el-table-column label="状态" width="120"
        ><el-tag type="success" effect="plain">上传成功</el-tag></el-table-column
      ></el-table
    >
  </section>
</template>
