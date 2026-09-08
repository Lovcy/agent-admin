# 开发与修复工作流

## 自然语言入口

- 根据 docs/examples/feature.md 开发项目筛选，计划后直接执行并验证。
- 根据这份飞书文档开发：<文档链接>。
- 修复 docs/examples/bug.md 描述的问题，完成后直接运行验证。
- 修复禅道 Bug 1234，不回写禅道。

AI 读取对应 Skill 后执行。CLI 不提供独立模型执行器，也不会后台调用模型计费。

## 手动检查与任务记录

`pnpm source:read md docs/examples/feature.md` 返回源快照路径。随后 `pnpm task create feature <source-json-path>` 或 `pnpm task create bug <source-json-path>` 建立任务。使用以下操作管理状态：

```sh
pnpm task status <id> running
pnpm task evidence <id> "复现测试和结果路径"
pnpm task attempt <id> stable-issue-key
pnpm task block <id> "接口缺失"
pnpm task resolve <id> "接口缺失"
pnpm task status <id> verifying
pnpm verify
pnpm task status <id> complete
```

任务完成要求无阻塞、存在证据和任务创建后的通过报告。记录目录位于 `.agent-admin/runs/<id>`，不默认提交。该状态机辅助执行，验收证据仍须人工或 AI 实际审阅，不能仅写一条 evidence 就假定满足需求。

恢复时继续原任务 ID，核对代码、分支、契约与来源快照。修改代码后旧验证结果失效，应重新运行。三轮失败按同一问题计数，不能通过重建任务绕过。外部文档更新需要新的需求任务，不在执行中自动更换原快照。

## 完成报告

说明功能变化或 Bug 原因、来源快照、修改范围、已执行命令、测试数量/结果、浏览器检查、Mock/真实后端验证范围和未完成项。任何必需步骤未运行或被阻塞，整体标为部分完成。Bug 自动化回归需保留修复前失败与修复后通过证据；不能自动化时记录人工步骤与实际结果。
