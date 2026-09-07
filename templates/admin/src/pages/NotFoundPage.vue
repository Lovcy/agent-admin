<template>
  <el-result icon="warning" title="页面不存在" sub-title="该页面可能已移动或删除"
    ><template #extra
      ><router-link to="/projects"
        ><el-button type="primary">返回项目管理</el-button></router-link
      ></template
    ></el-result
  >
</template>
