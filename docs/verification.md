# 验证记录

验证日期：2026-09-07（Asia/Shanghai）。本机 Windows，Node.js 24.14.0、pnpm 9.4.0；项目声明 pnpm 10.11.0，尚未用该版本单独复测。以下结果来自实际命令运行。

| 检查            | 结果                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------- |
| 工具自动化测试  | 13 项通过；含 CLI 生成、目录保护、生成物校验、分层检查、任务状态、禅道只读和飞书图片读取       |
| YApi 适配器测试 | 本地 HTTP 测试服务分页同步通过；不完整契约拒绝、离线不回退、路径参数转换和首次本地契约对比通过 |
| 模板完整验收    | 格式、契约、Lint、分层、类型、单元测试、生产构建、E2E 全部通过                                 |
| 单元/组件测试   | 10 项通过；领域规则、应用状态、Element Plus 表格和请求响应校验                                 |
| Playwright E2E  | Chromium 7 项通过，其中 3 项为冒烟用例；登录、表单、上传、主题、标签页、移动导航和会话失效     |
| 独立生成项目    | .tmp/release-check 使用自身依赖和复制的工具执行完整 verify 通过                                |
| Skill 结构      | admin-feature、admin-bugfix、admin-frontend 均通过官方 quick_validate.py                       |
| 截图            | 1440px 桌面、390px 手机、深色主题已检查；无页面异常或整页横向溢出                              |
| 生产 Mock 隔离  | 产物中未检出演示密码、Mock token 或 MSW 标识；构建不复制 public worker                         |

模板验收报告在 `templates/admin/.agent-admin/runs/latest-verification.json`；独立项目报告在 `.tmp/release-check/.agent-admin/runs/latest-verification.json`；截图在 `artifacts/preview/`。这些是本机产物，不默认纳入 GitHub 包。后续修改后应重新验证，不沿用旧报告。

## 尚未验证

- 真实 YApi 服务、实际飞书应用授权和禅道账号未提供。连接器测试采用本地 HTTP 或 CLI 响应替身，不能宣称真实服务联调完成。
- Codex、Claude Code、Cursor、Trae 已提供对应配置生成与 Skill，但尚未分别在客户端执行完整需求/Bug 任务。Trae 具体产品版本仍需确认。
- Chrome DevTools MCP 固定版本已确认存在，但没有在本轮建立实际 MCP 会话。浏览器检查由 Playwright 完成。
- macOS、Linux、Firefox、WebKit 未运行。Figma/Axure 仅预留扩展，GitHub 未推送或发布。

## 已知限制

Element Plus 当前全量注册，生产入口 JS 约 1.21 MB，gzip 约 396 KB，Vite 有体积提示。已保留该提示；可在后续采用组件按需引入优化。部分开发依赖属于较早的主要版本，依赖升级应单独验证，不能直接用 latest 替换锁文件。

YApi/OpenAPI 支持边界见 architecture.md。二进制响应、204、多成功响应和复杂参数序列化未实现，遇到时会阻塞而非猜测。文档中仅有 URL、没有可下载素材 token 的图片会明确报告未读取。
