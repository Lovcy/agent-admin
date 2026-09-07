# Admin Kit

Vue 3 + TypeScript + Element Plus 后台项目脚手架。支持 Codex、Claude Code、Cursor、Trae 的需求开发与 Bug 修复工作流。通过本地 Markdown、飞书文档或禅道 Bug ID 获取输入；接口以 YApi 或显式本地契约为来源。

## 运行模板

```sh
pnpm install
pnpm --dir templates/admin api:generate
pnpm --dir templates/admin exec msw init public --save
pnpm --dir templates/admin exec playwright install chromium
pnpm dev
```

演示账号：admin / admin123，仅开发 Mock 模式可用。生产构建禁用 Mock，不提供真实后端服务。

## 创建独立项目

```sh
pnpm run create my-admin
```

非交互：`node packages/cli/index.mjs create my-admin --yes --agents codex,claude,cursor,trae`。默认在当前目录创建；使用 `--directory <父目录>` 指定位置。现有目录不会覆盖。进入新项目后按 [配置说明](docs/setup.md) 安装依赖和浏览器。

## 文档

- [开发前完整配置](docs/setup.md)
- [分层架构与契约边界](docs/architecture.md)
- [需求与 Bug 工作流](docs/workflows.md)
- [设计输入扩展](docs/design-adapters.md)
- [验证记录与限制](docs/verification.md)
- [GitHub 分发](docs/distribution.md)

## 检查

`pnpm test` 检查脚手架工具；`pnpm --dir templates/admin verify` 检查模板；`pnpm verify` 执行两者。接口生成物通过重新生成校验，禁止直接编辑。真实服务及各 AI 客户端需要另外验证，不能用 Mock 结果替代。
