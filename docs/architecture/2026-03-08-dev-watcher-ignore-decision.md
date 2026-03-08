# Dev Watcher Ignore Decision

- Status: implemented
- Created: 2026-03-08
- Updated: 2026-03-08
- Implemented on: 2026-03-08
- Superseded by:

## Goal

Keep the Vite dev server stable and quiet when generated artifacts or documentation files change outside the app runtime flow.

## Current Problem Or Trigger

`npm run dev` watches the project root. Vite default ignore rules do not include `coverage/` or `playwright-report/`, and `docs/` changes can also trigger watcher work that is unrelated to runtime UI behavior.

## Technical Decision

Add explicit `server.watch.ignored` rules in `vite.config.ts`:

- `**/coverage/**`
- `**/playwright-report/**`
- `**/docs/**`

## Responsibility Boundaries

- Vite dev server watcher rules: `vite.config.ts`
- Product behavior and UI scope: unchanged
- Test/lint artifact generation: unchanged

## Migration Or Execution Sequence

1. Extend `server.watch.ignored` in Vite config.
2. Run quality gates (`lint`, `format:check`, `check`, `test`, `test:e2e`).

## Risks And Non-Goals

### Risks

- Changes under `docs/` no longer trigger dev-server reload behavior.

### Non-Goals

- No change to application runtime features.
- No change to build output or test coverage strategy.

## Test And Verification Impact

- No new test cases required; this is dev tooling configuration.
- Existing automated checks remain the verification source.

## Documentation Impact

- This decision record documents the watcher-ignore scope and rationale.

## Completion Update

Implemented by extending Vite watcher ignore patterns for generated reports and repository docs. No behavior-level follow-up is required.
