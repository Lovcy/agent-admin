---
name: admin-frontend
description: Build Vue 3 admin pages using TypeScript, Element Plus, Router, Pinia and Vite within Admin Kit's layered architecture and default UI system.
---

# Frontend implementation

Read `docs/architecture.md` before adding a module and `src/shared/theme/base.css` before changing appearance. Reuse the installed package versions and existing controls. Consult official documentation for version-sensitive APIs: Vue https://vuejs.org/guide/ ; Router https://router.vuejs.org/ ; Pinia https://pinia.vuejs.org/ ; Element Plus https://element-plus.org/ ; Vite https://vite.dev/guide/ . Do not assume a framework-specific MCP is installed.

Use script setup with typed props and emits. UI components receive data and emit intent; route pages compose application hooks. Domain validation and transformations are pure functions, tested without mounting Vue. Application hooks own loading/error state and depend on repository interfaces; Pinia is for shared state, not every form field. Data adapters convert generated DTOs into domain models and call generated client functions. App setup supplies concrete adapters.

Default pages use a restrained work-focused layout: compact page heading, filters, table or form, explicit loading/empty/error states, predictable pagination and accessible labels. Use Element Plus controls and its icons. Keep themes in shared tokens, verify light/dark appearance and a narrow viewport. Avoid decorative landing pages or oversized dashboard headings.

For a design URL, first check `docs/design-adapters.md`. This release does not implement Figma/Axure extraction; record that limitation and request accessible exports only if design information is required. Do not silently substitute a default layout while claiming fidelity to an unread design.

After implementation run the affected unit/component tests and the project verification workflow. Verify actual interactions, focus, overflow, responsive navigation, empty/error states and browser console/network behavior. Upload and login constraints must follow the selected contract rather than hardcoded assumptions about a future backend.
