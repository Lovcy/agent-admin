---
name: admin-bugfix
description: Diagnose and fix admin defects from local or Feishu bug documents or a ZenTao Bug ID, then immediately run regression and verification tests.
---

# Bug repair

1. Read `.agent-admin/rules/core.md`, `agent-admin.config.json` and the relevant module. Import the bug using `pnpm source:read md <path>`, `pnpm source:read lark <url>` or `pnpm source:read zentao <id>`. ZenTao requires configured product mapping. Read metadata including module, affected version and image references.
2. Check the current project and branch against the bug. Ask if they mismatch; do not switch repository or branch. Use `pnpm task create bug <source-json-path>` and retain its ID for recovery.
3. Reproduce using the supplied steps. When steps are missing, investigate code, logs, screenshots and browser behavior. Record expected and actual results plus the command, test or manual sequence demonstrating failure. Missing accounts, data or environment are blockers. Do not make speculative changes before obtaining evidence.
4. For an automatable defect, add a regression assertion derived from that evidence and run it against the unfixed code. Record the failing result. Identify the causal path before making the smallest coherent repair. Follow the contract and layering rules; YApi defects cannot be fixed by changing generated code.
5. Proceed directly to verification without asking for plan approval. Run the regression test, related tests and `pnpm verify`; inspect the repaired browser flow through Chrome DevTools MCP when available. A failed repair increments `pnpm task attempt <id> <stable-issue-key>`. At three failures, stop that issue, preserve evidence and report the blocker.
6. Record original failure, root cause, changed behavior and post-fix evidence in the task directory. Record non-automatable validation as manual, and absent verification as not run. Set complete only when requirements and current checks pass; otherwise partial or failed.

ZenTao access is read-only. Do not update status, add comments, resolve or close the remote bug. Feishu is also read-only. Git commit and publication are outside this workflow.
