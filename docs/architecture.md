# 分层架构

## 两套目录

脚手架仓库包含 `packages/cli`（创建与分发）、`packages/tooling`（契约与工作流命令）、`templates/admin`（Vue 模板）、`agent-assets`（共享规则与工具入口）、`tests`（工具测试）。生成的新项目不依赖原始仓库，工具源码与 AI 资产复制到 `scripts`。

## 应用层次

| 层       | 目录                                 | 允许的依赖                           |
| -------- | ------------------------------------ | ------------------------------------ |
| 装配     | src/app                              | 路由、具体仓储、应用状态、插件       |
| 页面路由 | src/pages、src/router、src/layouts   | 应用用例、UI、布局；路由负责认证守卫 |
| UI       | src/modules/*/ui、src/shared/ui      | Props、事件、业务类型、Element Plus  |
| 应用     | src/modules/*/application            | Vue 状态、Pinia、领域规则、仓储接口  |
| 领域     | src/modules/*/domain                 | 纯 TypeScript 及其他领域类型         |
| 数据     | src/modules/*/data                   | 生成 API、领域模型与仓储接口         |
| 接口     | src/api/generated、src/api/transport | 生成契约、统一请求执行与运行时校验   |

纯业务规则不得依赖 Vue、Router、Pinia、DOM 或接口生成类型。领域仓储接口由数据层实现，通过 app 提供给应用层。页面不得直接导入数据仓储或生成 API。`pnpm lint` 包含分层检查。

模块按实际需要建目录。不要为仅有展示内容的页面创建空仓储。通用组件达到跨模块复用时再移至 shared。接口 DTO 只在数据层处理；业务字段名称与接口名称不一致时显式转换。

## 契约来源

OpenAPI 3.0.3 为统一格式。本地模式的 `contracts/local.openapi.json` 可按需求修改。YApi 模式下 `contracts/yapi.openapi.json` 和来源清单只能同步生成。`src/api/generated` 的类型、请求函数、校验定义和清单都属于生成物。

生成工具支持 GET/POST/PUT/PATCH/DELETE、标量 query/path/header、JSON 请求与响应、multipart 上传及本地 schema 引用。当前要求每个操作一个明确的 JSON 成功响应。多成功响应、204、流式或二进制响应、复杂参数序列化、循环/远程 schema 引用会报错，不能静默丢弃。遇到实际契约需要这些能力时先扩展适配器及测试。

YApi 转换要求请求/响应启用 JSON Schema；示例 JSON 不能作为可靠类型契约。YApi 未提供成功 HTTP 状态时当前适配器使用 200；实际服务必须核实这一约定。生成 ID 使用项目 ID 与接口 ID，避免标题修改导致函数重命名。

`api:check` 重新生成并逐文件比较；本地文件可写时该机制是验收约束，不是绝对防篡改边界。YApi 同步失败不启用本地契约。首次切换后业务仓储和 Mock 必须适配真实契约，旧演示接口不会与 YApi 合并。

## 测试环境

Mock 仅在 Vite 开发模式运行，生产构建不包含 Mock worker。演示认证令牌只对 MSW 生效。登录采用 sessionStorage 的演示会话方案，真实认证通过 sessionRepository 与 transport 适配，不能据此假设后端使用 Bearer token。

单元测试与代码就近放置；E2E 在 tests/e2e。Playwright 创建独立测试服务器，固定端口占用时失败，避免连接到错误应用。冒烟是同一批 E2E 中的 @smoke 子集。Mock 测试不能证明真实认证、文件存储或接口联调成功。
