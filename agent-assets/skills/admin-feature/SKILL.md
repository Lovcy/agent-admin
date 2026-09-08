---
name: admin-feature
description: Implement admin features from a prompt, a local Markdown requirement, or a Feishu document. Use for new pages and requirement changes; use admin-bugfix for defects.
---

# Requirement-driven development

1. Read `.agent-admin/rules/core.md`, `agent-admin.config.json` and the relevant module. Run `pnpm doctor`. A source connector is needed only when that source is requested.
2. Import the source using `pnpm source:read md <path>` or `pnpm source:read lark <url>`. For a prompt-only task, write the user's requirement to a local Markdown snapshot first. Read the resulting content and warnings. Inspect required images; unavailable information becomes a blocker, never an assumed requirement.
3. Run `pnpm task create feature <source-json-path>`. Record the task ID. Record a plan in that task directory mapping every requirement to a page, contract operation and acceptance case. An explicit user override takes precedence; ask when conflicting sources have no explicit precedence.
4. Set task status to running. Sync YApi or edit the local contract and generate. Verify the contract contains the required fields. In YApi mode, a missing contract blocks dependent work; local fixtures cannot fill the gap.
5. Implement in the existing layers. Use `.agent-admin/skills/admin-frontend/SKILL.md` for Vue and UI work. Keep the plan and task status current. Record unresolved requirements with `pnpm task block <id> <reason>`.
6. Set status to verifying. Run requirement-derived unit/component tests and `pnpm verify`. Inspect the rendered workflows with Chrome DevTools MCP if available. Record screenshots, console/network findings and unavailable checks. Fix failures with `pnpm task attempt <id> <stable-issue-key>` after each failed repair. Stop a problem at three failed attempts.
7. Record evidence with `pnpm task evidence <id> <note>`. Mark complete only with current passing checks and no blockers; otherwise partial or failed. Deliver changed behavior, verification scope and remaining blockers. Real backend and AI-client end-to-end validation must be reported separately from Mock tests and generated configuration.

For task recovery, read the existing task, source and plan before acting. Compare current branch, code and contract to the previous run; invalidate affected evidence. Do not reset attempts by creating another task for the same unfinished issue.
