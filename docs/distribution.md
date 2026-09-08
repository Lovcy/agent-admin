# GitHub 分发

本仓库不依赖私有 npm。源码可推送到用户指定的 GitHub 仓库；GitHub 账号密码不应发送到 AI 对话。发布时在本机通过 GitHub CLI 的浏览器登录或系统凭据管理器授权。

`pnpm release:pack` 生成 `artifacts/agent-admin-0.1.0.tar.gz`，可作为 GitHub Release 附件。解压后运行 `pnpm install`，再执行 `node packages/cli/index.mjs create my-admin`。包内包含模板、工具源码、规则和说明；新项目可以独立运行。

发布前运行根目录和模板验证，核对打包内容不含凭据、任务快照或 node_modules。创建 GitHub 仓库、推送、创建 Release 属于单独的发布动作，本次不会自动执行。未确定开源许可证前，不应假定仓库可供第三方自由再分发。

生成项目升级目前只支持 AI 配置建议合并，不做全量模板覆盖。后续公共 npm 发布可以提供一条 npx 创建命令，当前不宣称该包已存在于 npm。
