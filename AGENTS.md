# AGENTS

Lightweight default instructions for agent work in this repository.

## Repo Overview

- App entry: `src/main.ts`, `src/App.svelte`
- UI components: `src/components/*`
- Service/data logic: `src/services/*`
- Shared types: `src/types/*`
- Repo behavior docs: `docs/repo/*`
- Architecture/process docs: `docs/architecture/*`

## Commands

- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Format check: `npm run format:check`
- Type and Svelte checks: `npm run check`
- Unit/integration tests: `npm test`
- E2E smoke tests: `npm run test:e2e`

## Core Rules

- Ensure `node` and `npm` are available in the active shell.
- Start with the smallest useful local context. Inspect relevant files first and prefer targeted `rg` over broad repo scans.
- Do not read entire doc trees by default. Open only the specific files needed for the current task.
- Treat `docs/repo/*` as the source of truth for user-visible behavior and scope.
- If behavior changes, update the relevant file in `docs/repo/*` first, then align implementation.
- If technical structure or agent workflow changes, document it in `docs/architecture/*`.
- Keep all Markdown files in English.
- Keep user-facing UI copy in German. Keep developer-facing docs, TSDoc, JSDoc, comments, and agent-operating docs in English.
- Keep chat with the user in German unless the user asks for another language.
- Keep API/data logic in `src/services` and keep UI components focused and testable.
- Do not add lint or type suppressions unless explicitly approved.
- Prefer minimal, high-confidence changes and avoid unrelated edits.

## Default Working Mode

- Single agent by default.
- Analyze only the files needed for the current task.
- Prefer local code analysis before loading docs.
- Use plan mode only when the task is multi-step, ambiguous, architectural, or a non-local refactor.
- Use repo skills or repo-defined agents only when the user asks for them or the task clearly needs escalation.
- Run the smallest relevant verification first. Run broader checks only when the change is cross-cutting, risky, or close to handoff.

## Repo Invariants

- Preserve documented current behavior unless the docs are intentionally changed first.
- Search supports German-name input and numeric ID input.
- The app has a dedicated Pokemon detail flow with hash-route deep links.
- German Pokemon names remain the primary display labels.
- German type labels remain the UI labels for type chips.

## Optional Escalation

- Optional delivery-system details live in `docs/architecture/2026-04-12-token-efficient-agentic-delivery-decision.md`.
- Use the orchestrator path only for explicit workflow routing, multi-stage work, or review loops.
- Use QA/review as an escalation step for large diffs, critical logic, risky refactors, or when the user explicitly asks.

## Definition Of Done

- The requested change or review outcome is complete.
- Touched docs and code are aligned.
- Relevant checks were run, or any skipped checks were called out explicitly.
- No known high-risk issue is being hidden.
- Final handoff states: what changed, why, risks, and tests.
