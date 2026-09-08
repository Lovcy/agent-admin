# 开发前配置

## 1. 安装运行环境

使用 Node.js 22.16+ 和 pnpm 10。项目 `package.json` 指定包管理器；实际验证版本见 `docs/verification.md`。在生成项目目录运行：

```sh
pnpm install
pnpm exec msw init public --save
pnpm exec playwright install chromium --no-shell
pnpm doctor
pnpm dev
```

Linux 安装浏览器系统依赖可使用 `pnpm exec playwright install --with-deps chromium`，可能需要系统管理员权限。项目文件夹和本机路径可包含中文，但项目 package 名称使用小写英文、数字及连字符。

默认使用本地契约和 Mock。演示账号 `admin`，密码 `admin123`，只在开发模式生效。错误账号会失败。关闭页面会结束浏览器会话；退出会清理会话与标签。主题保留在当前浏览器。

复制 `.env.example` 为 `.env.local` 并按需填写。真实开发设置 `VITE_MOCK=false` 和 `VITE_API_BASE_URL`。不要把 `VITE_MOCK=true` 放进通用 `.env`；生产构建检测到它会报错。测试服务器单独设置 Mock。真实跨域认证、代理、Cookie 策略需按后端配置，不默认启用通配代理。

## 2. AI 工具

运行 `pnpm ai:setup` 根据 `agent-admin.config.json` 的 agents 列表生成入口。已有自定义内容不会被覆盖，冲突建议写入同目录 `.agent-admin-new` 文件，需检查合并。四种工具共享 `.agent-admin/rules/core.md` 和同源 Skill。

| 工具        | 规则/Skill 入口                             | MCP 配置                |
| ----------- | ------------------------------------------- | ----------------------- |
| Codex       | AGENTS.md、.agents/skills                   | .codex/config.toml      |
| Claude Code | CLAUDE.md、.claude/skills                   | .mcp.json               |
| Cursor      | .cursor/rules/agent-admin.mdc、.cursor/skills | .cursor/mcp.json        |
| Trae        | .trae/rules/project_rules.md、.trae/skills  | .trae/mcp.json 导入配置 |

安装并登录选定工具，在工具内打开项目，按客户端要求信任项目、启用规则和 MCP。Trae 不同产品/版本配置入口可能不同；若未自动加载，在 MCP 设置导入模板并确认项目规则生效。不要因为文件存在就认为客户端配置已验证。

各客户端执行自然语言验收：要求其说明当前接口模式和分层规则，再运行 doctor，读取本地示例需求，执行一个开发或 Bug 修复任务。确认运行了项目命令并提供报告。系统权限或工具审批弹窗仍由客户端控制，Skill 不会绕过它们。

## 3. Chrome DevTools MCP

模板配置官方 `chrome-devtools-mcp`，使用独立浏览器 profile。需要可用 Chrome、Node/npm/npx 和包下载网络。先在终端运行 `npx -y chrome-devtools-mcp@0.20.0 --help`，然后在 AI 工具内确认 MCP 已连接。若该固定版本与本机 Chrome 不兼容，核实官方说明后更新四种配置并重新验证。

用工具打开开发地址，检查项目页、上传、主题切换、控制台与请求错误。Playwright 由项目测试命令直接执行，不依赖 Playwright MCP。DevTools 不能连接时报告未验证，不能伪造浏览器检查结果。

## 4. 飞书 lark-cli

来源：https://github.com/larksuite/cli 。此接入只读取文档和图片，不提供写回命令。

```sh
npx @larksuite/cli@latest install
lark-cli config init
lark-cli auth login
lark-cli auth status
lark-cli docs +fetch --help
```

在配置和登录过程中按 CLI 提示在浏览器完成授权。应用需要目标文档和知识库访问权限；文档图片另需素材读取权限。最小权限应以实际 CLI 提示与飞书应用权限列表核对，不要求消息发送或文档写权限。

```sh
pnpm source:read lark "https://你的租户.feishu.cn/docx/文档token"
```

也支持 `/wiki/` 中指向文档的链接。适配器使用 XML 格式读取完整结构，保留正文、表格和图片引用，不处理评论、不递归读取链接。文内 img 的素材 token 会通过 `docs +media-download` 下载到快照目录，AI 再检查实际图片。只有 URL、无 token 的图片会报告未读取；图片无法访问时记录阻塞。电子表格、多维表格、附件正文不在本版范围。

若本机 CLI 输出协议不同，保留脱敏错误，核对该版本 `docs +fetch --help` 后适配；禁止把解析失败当作空需求继续。401/403 检查登录和文档分享权限；CLI 不存在时检查 PATH，或在 config 的 lark.executable 指定可执行文件路径。

## 5. YApi

编辑 agent-admin.config.json 的 api.mode 为 yapi，并在 api 下加入 yapi.baseUrl 和 projects。每个项目包含数字 id 和 tokenEnv（环境变量名，例如 YAPI_TOKEN_MAIN）。服务地址保留部署子路径，不以 /api 结尾。

配置示例（地址和 ID 必须替换为你的服务信息）：

```json
{
  "version": 1,
  "agents": ["codex", "claude", "cursor", "trae"],
  "api": {
    "mode": "yapi",
    "localContract": "contracts/local.openapi.json",
    "yapiContract": "contracts/yapi.openapi.json",
    "yapi": {
      "baseUrl": "https://yapi.example.com",
      "projects": [{ "id": 1, "tokenEnv": "YAPI_TOKEN_MAIN" }]
    }
  },
  "lark": { "executable": "lark-cli" },
  "zentao": {
    "baseUrl": "https://zentao.example.com",
    "tokenEnv": "ZENTAO_TOKEN",
    "productIds": [1]
  }
}
```

不接入禅道时省略 zentao。Token 存入本机 `.env.local` 的同名变量，不写入共享 JSON。运行 `pnpm api:sync` 后执行 `pnpm api:check`。接口需要开启 JSON Schema，query/path 参数需要明确类型。服务接口为 `/api/interface/list` 和 `/api/interface/get`；二次开发版本需真实联调验证。

本地切换到 YApi 不保留演示接口作为补充。阅读 `.agent-admin/incoming/yapi-diff.json`，改造各模块 data 适配器及 Mock；字段语义不清晰时停止相关模块。网络错误、未授权、schema 缺陷不会触发本地模式回退。

## 6. 禅道

当前适配 RESTful API v1；官方说明该 API 在开源版 16.5 之后引入。实际部署版本及商业版差异需确认。配置 zentao.baseUrl（部署根地址）、tokenEnv（默认 ZENTAO_TOKEN）、productIds（允许的产品 ID）。Token 由使用者在本机取得并存入 `.env.local`，不要向 AI 对话发送账号密码。

```sh
pnpm source:read zentao 1234
```

仅发送带 Token header 的 `GET /api.php/v1/bugs/1234`，不会关闭或更新 Bug。产品不匹配直接阻塞。模块、影响版本及当前分支由 Bug 工作流进一步核对；截图和附件引用必须实际检查，报告不能声称读取了未获取的图片。404 检查 API 版本和 baseUrl；401/403 检查 token 和产品权限。

官方参考：https://www.zentao.net/book/api/1397.html 。YApi、飞书、禅道未配置时仍可运行本地 Markdown 工作流。
