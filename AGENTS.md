# Agent Admin scaffolding repository

This repository builds a project generator. Runtime changes belong in `templates/admin`; CLI behavior in `packages/cli`; contract, source and task commands in `packages/tooling`; shared agent instructions in `agent-assets`. Generated applications receive independent copies of tooling and agent assets.

Read `docs/architecture.md` before changing application layers. Edit source contracts and run the generator rather than modifying `templates/admin/src/api/generated`. Preserve strict TypeScript and meaningful assertions.

Run `pnpm test` for tooling changes and the template's relevant checks for runtime changes. For generator changes, create a disposable project under `.tmp` and verify it separately. Keep credentials, task snapshots and temporary outputs out of release packages. `docs/verification.md` distinguishes automated fixture tests from actual external-service and AI-client validation.

Source and bug workflows are read-only toward Feishu and ZenTao. Git commits, pushes, GitHub repository creation and publishing require a separate user instruction; creating local release archives is part of delivery preparation.
