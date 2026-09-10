# Agent Admin

Vue 3 + TypeScript + Element Plus 后台项目脚手架。支持 Codex、Claude Code、Cursor、Trae 的需求开发与 Bug 修复工作流。通过本地 Markdown、飞书文档或禅道 Bug ID 获取输入；接口以 YApi 或显式本地契约为来源。

## 功能特性

- **项目生成器** — 一条命令生成独立可运行的 Vue 3 后台项目，完全脱离脚手架仓库
- **AI 辅助开发** — 内置 Codex、Claude Code、Cursor、Trae 四种工具的规则与 Skill
- **契约驱动** — OpenAPI 3.0.3 统一接口契约，支持本地模式与 YApi 同步模式
- **分层架构** — 装配、页面路由、UI、应用、领域、数据六层强制约束
- **需求工作流** — 读取飞书文档、禅道 Bug 或本地 Markdown 创建开发任务
- **完整验证** — 单元测试 + E2E 测试 + 分层检查 + 契约校验 + 生产构建一体化验收
- **Mock 开发** — MSW 拦截 HTTP 请求，无需真实后端即可开发调试
- **npm create 支持** — 发布到 npm 后支持 `npm create @lovcy/agent-admin` 一键创建

## 技术栈

| 领域 | 技术 |
| ---- | ---- |
| 前端框架 | Vue 3.5 + TypeScript 5.8 |
| UI 库 | Element Plus 2.9 |
| 状态管理 | Pinia 3 |
| 构建工具 | Vite 6 |
| 路由 | Vue Router 4 |
| 接口契约 | OpenAPI 3.0.3 + openapi-typescript |
| 单元测试 | Vitest |
| E2E 测试 | Playwright |
| Mock | MSW (Mock Service Worker) |
| 代码规范 | ESLint 9 + Prettier |
| 包管理 | pnpm 10 + workspace |

## 环境要求

- Node.js >= 22.16.0
- pnpm 10
- Chrome 浏览器（E2E 测试与 DevTools 检查）

## 快速开始

### 方式一：在脚手架仓库中直接运行模板

```sh
pnpm install
pnpm --dir templates/admin api:generate
pnpm --dir templates/admin exec msw init public --save
pnpm --dir templates/admin exec playwright install chromium --no-shell
pnpm dev
```

演示账号：`admin` / `admin123`，仅开发 Mock 模式可用。生产构建禁用 Mock，不提供真实后端服务。

### 方式二：生成独立项目（推荐）

在脚手架仓库根目录执行：

```sh
pnpm run create my-admin
```

非交互式创建：

```sh
node packages/cli/index.mjs create my-admin --yes --agents codex,claude,cursor,trae
```

可选参数：

| 参数 | 说明 | 示例 |
| ---- | ---- | ---- |
| `--yes` / `-y` | 跳过交互提示，使用默认值 | |
| `--agents` | 指定 AI 工具，逗号分隔 | `--agents codex,trae` |
| `--mode` | 接口模式 `local` 或 `yapi` | `--mode yapi` |
| `--directory` | 指定创建位置（默认当前目录） | `--directory D:\projects` |

生成后初始化：

```sh
cd my-admin
pnpm install
pnpm exec msw init public --save
pnpm exec playwright install chromium --no-shell
pnpm doctor
pnpm dev
```

### 方式三：通过 npm create（发布后可用）

```sh
npm create @lovcy/agent-admin@latest my-admin

# 非交互式
npm create @lovcy/agent-admin@latest my-admin -- --yes --agents trae
```

等价写法：

```sh
npx @lovcy/create-agent-admin@latest my-admin
```

## 项目结构

```
agent-demo/
├── packages/
│   ├── cli/                  # 项目创建器与 npm 发布包
│   │   ├── index.mjs         # create 命令入口
│   │   ├── pack.mjs          # release:pack 打包脚本
│   │   ├── prepack.mjs        # npm 发布前资源复制
│   │   └── package.json      # @lovcy/create-agent-admin npm 包清单
│   └── tooling/              # 工具命令库（复制到生成项目的 scripts/）
│       ├── index.mjs         # 命令入口
│       └── lib/
│           ├── config.mjs    # 配置加载
│           ├── contracts.mjs # OpenAPI 生成 & YApi 同步
│           ├── agents.mjs    # AI 工具配置生成
│           ├── layers.mjs    # 分层架构检查
│           ├── sources.mjs   # 需求来源读取（md/lark/zentao）
│           ├── tasks.mjs     # 任务状态机管理
│           ├── fingerprint.mjs
│           ├── io.mjs        # 脱敏输出 & JSON 写入
│           └── process.mjs   # 子进程执行
├── agent-assets/            # 共享 AI 规则与 Skill
│   ├── rules/core.md
│   └── skills/
│       ├── admin-feature/   # 需求开发 Skill
│       ├── admin-bugfix/     # Bug 修复 Skill
│       └── admin-frontend/   # 前端实现 Skill
├── templates/admin/         # Vue 模板项目
│   ├── src/
│   │   ├── api/              # 接口层（生成 + transport）
│   │   ├── app/              # 装配层（入口、路由注入）
│   │   ├── layouts/          # 布局组件
│   │   ├── modules/          # 业务模块（按领域分层）
│   │   │   ├── projects/     # 项目管理
│   │   │   ├── files/        # 文件管理
│   │   │   └── session/      # 会话认证
│   │   ├── pages/            # 页面路由
│   │   ├── router/           # 路由配置
│   │   └── shared/           # 共享资源（主题等）
│   ├── contracts/            # OpenAPI 契约
│   ├── mocks/                # MSW Mock handlers
│   ├── tests/e2e/            # Playwright E2E 测试
│   └── agent-admin.config.json  # 项目配置
├── tests/                   # 脚手架自身测试
├── docs/                    # 文档
└── artifacts/               # 打包产物
```

## 分层架构

模板项目采用严格的六层分层架构：

| 层 | 目录 | 职责 | 依赖限制 |
| -- | ---- | ---- | -------- |
| 装配 | `src/app/` | 路由、仓储注入、应用状态 | 可依赖所有层 |
| 页面路由 | `src/pages/`、`src/router/` | 页面组件、路由守卫 | 用例 + UI + 布局 |
| UI | `src/modules/*/ui/`、`src/shared/ui/` | 展示组件 | Props、事件、Element Plus |
| 应用 | `src/modules/*/application/` | Pinia 状态、业务规则 | 仓储接口 |
| 领域 | `src/modules/*/domain/` | 纯 TypeScript 业务类型 | 不依赖 Vue/Router/Pinia |
| 数据 | `src/modules/*/data/` | 生成 API 调用、仓储实现 | 领域模型 + 生成类型 |

纯业务规则不得依赖 Vue、Router、Pinia、DOM 或接口生成类型。页面不得直接导入数据仓储或生成 API。`pnpm lint` 包含分层检查。

## 接口契约

### 本地模式（默认）

使用 `contracts/local.openapi.json` 作为契约来源，配合 MSW Mock 进行开发。

```sh
pnpm api:generate    # 生成类型和请求函数
pnpm api:check       # 重新生成并逐文件比较，校验一致性
```

### YApi 模式

编辑 `agent-admin.config.json`，设置 `api.mode` 为 `yapi`，配置服务地址和项目 ID：

```json
{
  "api": {
    "mode": "yapi",
    "yapi": {
      "baseUrl": "https://yapi.example.com",
      "projects": [{ "id": 1, "tokenEnv": "YAPI_TOKEN_MAIN" }]
    }
  }
}
```

```sh
pnpm api:sync       # 同步远端接口
pnpm api:check      # 校验生成物一致性
```

`src/api/generated` 目录下的所有文件都是生成物，禁止手动编辑。

## 需求与 Bug 工作流

### 需求来源

支持三种输入方式：

| 来源 | 命令 | 说明 |
| ---- | ---- | ---- |
| 本地 Markdown | `pnpm source:read md docs/examples/feature.md` | 读取本地需求文档 |
| 飞书文档 | `pnpm source:read lark "https://租户.feishu.cn/docx/token"` | 通过 lark-cli 只读读取 |
| 禅道 Bug | `pnpm source:read zentao 1234` | RESTful API 只读获取 Bug |

### 任务管理

```sh
pnpm task create feature <source-json-path>   # 创建需求任务
pnpm task create bug <source-json-path>       # 创建 Bug 任务
pnpm task status <id> running                 # 更新状态
pnpm task evidence <id> "测试结果路径"          # 记录证据
pnpm task attempt <id> stable-issue-key       # 记录尝试
pnpm task block <id> "阻塞原因"                 # 记录阻塞
pnpm task resolve <id> "解决说明"              # 记录解决
pnpm task status <id> verifying               # 进入验证
pnpm verify                                    # 运行完整验收
pnpm task status <id> complete                # 完成任务
```

任务记录位于 `.agent-admin/runs/<id>`，不默认提交。

## AI 工具集成

运行 `pnpm ai:setup` 根据 `agent-admin.config.json` 生成各工具的配置入口：

| 工具 | 规则/Skill 入口 | MCP 配置 |
| ---- | --------------- | -------- |
| Codex | `AGENTS.md`、`.agents/skills` | `.codex/config.toml` |
| Claude Code | `CLAUDE.md`、`.claude/skills` | `.mcp.json` |
| Cursor | `.cursor/rules/agent-admin.mdc`、`.cursor/skills` | `.cursor/mcp.json` |
| Trae | `.trae/rules/project_rules.md`、`.trae/skills` | `.trae/mcp.json` |

四种工具共享 `.agent-admin/rules/core.md` 和同源 Skill。已有自定义内容不会被覆盖，冲突会生成 `.agent-admin-new` 文件供人工合并。

## 命令一览

### 脚手架根目录

| 命令 | 说明 |
| ---- | ---- |
| `pnpm run create <name>` | 生成交互式创建新项目 |
| `pnpm dev` | 启动模板开发服务器 |
| `pnpm test` | 运行脚手架工具测试 |
| `pnpm verify` | 执行完整验收（工具测试 + 模板检查） |
| `pnpm format` | 格式化代码 |
| `pnpm release:pack` | 生成发布 tar.gz 包 |

### 生成的项目

| 命令 | 说明 |
| ---- | ---- |
| `pnpm dev` | 启动开发服务器（Vite） |
| `pnpm build` | 类型检查 + 生产构建 |
| `pnpm preview` | 预览生产构建 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm lint` | ESLint + 分层架构检查 |
| `pnpm test:unit` | 运行单元测试（Vitest） |
| `pnpm test:smoke` | 运行冒烟测试（Playwright @smoke） |
| `pnpm test:e2e` | 运行全部 E2E 测试（Playwright） |
| `pnpm doctor` | 检查环境是否就绪 |
| `pnpm ai:setup` | 生成 AI 工具配置 |
| `pnpm api:generate` | 生成接口类型和请求函数 |
| `pnpm api:sync` | 同步 YApi 接口 |
| `pnpm api:check` | 校验生成物一致性 |
| `pnpm source:read` | 读取需求来源 |
| `pnpm task` | 管理任务状态 |
| `pnpm verify` | 运行完整验收流程 |

## 发布

### 发布到 npm

```sh
cd packages/cli
npm whoami              # 确认登录
npm pack --dry-run      # 预览包含的文件
npm publish             # 发布到 npm
```

发布后用户可通过 `npm create @lovcy/agent-admin@latest` 创建项目。

### 生成 Release 包

```sh
pnpm release:pack
```

生成 `artifacts/agent-admin-0.1.0.tar.gz`，可作为 GitHub Release 附件。

## 文档

- [开发前完整配置](docs/setup.md) — 环境安装、AI 工具、飞书、YApi、禅道配置
- [分层架构与契约边界](docs/architecture.md) — 六层架构、契约来源、测试环境
- [需求与 Bug 工作流](docs/workflows.md) — 自然语言入口、任务记录、完成报告
- [设计输入扩展](docs/design-adapters.md) — Figma/Axure 预留扩展
- [验证记录与限制](docs/verification.md) — 验证结果与已知限制
- [GitHub 分发](docs/distribution.md) — 打包发布流程

## 验证

`pnpm test` 检查脚手架工具；`pnpm --dir templates/admin verify` 检查模板；`pnpm verify` 执行两者。接口生成物通过重新生成校验，禁止直接编辑。真实服务及各 AI 客户端需要另外验证，不能用 Mock 结果替代。

## 约束

- 源码和 Bug 工作流对飞书和禅道只读，不回写
- Git 提交、推送、仓库创建和发布需要单独的用户指令
- 生成物（`src/api/generated`）不可手动编辑
- Mock 测试通过不代表真实服务联调成功
- 凭据、任务快照和临时输出不纳入发布包
