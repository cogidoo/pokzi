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
- Use `PLANS.md` only for large refactors, architectural changes, multi-step features, or work that is likely to span sessions.
- Keep all Markdown files in English.
- Keep user-facing UI copy in German. Keep developer-facing docs, TSDoc, JSDoc, comments, and agent-operating docs in English.
- Keep chat with the user in German unless the user asks for another language.
- Keep API/data logic in `src/services` and keep UI components focused and testable.
- Do not add lint or type suppressions unless explicitly approved.
- Prefer minimal, high-confidence changes and avoid unrelated edits.
- Preserve documented repo behavior unless the task intentionally updates the owning docs first.

## Default Working Behavior

- Single agent by default.
- Analyze only the files needed for the current task.
- Prefer local code analysis before loading docs.
- Use balanced reasoning depth for normal work, go lower only for trivial local tasks, and go deeper for ambiguity, risky refactors, architecture, or hard debugging.
- Use plan mode only when the task is multi-step, ambiguous, architectural, or a non-local refactor.
- Use repo skills or repo-defined agents only when the user asks for them or the task clearly needs escalation.
- Keep QA, visual review, and orchestration optional escalation paths for large diffs, critical logic, architecture work, or explicit review requests.
- Run the smallest relevant verification first. Run broader checks only when the change is cross-cutting, risky, or close to handoff.
- Keep summaries concise and handoffs minimal: what changed, why, risks, and tests.

## Definition Of Done

- The requested change or review outcome is complete.
- Touched docs and code are aligned.
- The changed logic was self-validated locally, obvious edge cases were checked, and relevant checks were run or explicitly skipped.
- Unrelated files were not changed without reason.
- No known high-risk issue is being hidden.
- Final handoff states: what changed, why, risks, and tests.
