# AGENTS

## Purpose

Execution guide for coding agents working in this repository.

## Runtime Prerequisite

- Ensure `node` and `npm` are available in the active shell.

## Documentation Contract

- `CONCEPT.md` is the repo-doc overview.
- `docs/repo/*` is the source of truth for repo behavior and scope.
- `DESIGN_BRIEF.md` is the single source of truth for visual/UI direction.
- `INSTRUCTIONS.md` stays high-level and must not duplicate detailed behavior logic.
- If behavior changes, update the relevant file in `docs/repo/` first, then align implementation.
- Every new feature must include a full Markdown documentation review. Update every impacted `.md` file in the repository, not only the primary feature document.
- Developer-facing code documentation uses TSDoc/JSDoc blocks in English.

## Local Codex Skills

- Local repo skills live under `.codex/skills/`.
- Use `.codex/skills/anforderungs-agent/SKILL.md` when the user asks for requirement intake, scope review, concept writing, acceptance criteria, user flows, or translating vague stakeholder input into a repo-ready concept.
- Use `.codex/skills/umsetzungs-agent/SKILL.md` when the user asks for implementation, bugfixing, refactoring, hardening, code review, or senior delivery of scoped work in this repository.
- Use `.codex/skills/ux-ui-agent/SKILL.md` when the user asks for UX/UI direction, visual concepting, accessibility-focused design review, child-friendly interaction design, screen-level refinement, or implementation-ready interface guidance.
- The trigger phrases `anforderungs-agent` and `requirements lead` should explicitly activate that local skill for this repository.
- The trigger phrases `umsetzungs-agent`, `implementierungs-agent`, and `implementation lead` should explicitly activate that local skill for this repository.
- The trigger phrases `ux-ui-agent`, `design-agent`, `ui-agent`, and `ux-agent` should explicitly activate that local skill for this repository.

## Repository Map

- App entry: `src/main.ts`, `src/App.svelte`
- UI components: `src/components/*`
- API/service layer: `src/services/pokemonApi.ts`
- Shared types: `src/types/*`
- Styling tokens/base styles: `src/styles/*`
- Unit/integration tests: `src/**/*.test.ts`
- E2E smoke tests: `e2e/app.smoke.spec.ts`
- Tooling config: `eslint.config.js`, `tsconfig*.json`, `vite.config.ts`, `playwright.config.ts`

## Current Repo Reality (Must Preserve)

- Current repo scope includes search, results list, and dedicated Pokemon detail view.
- Search supports:
  - Numeric input => Pokemon ID search.
  - Text input => German-name search.
- Detail view supports:
  - Open from result-card tap/Enter.
  - Direct deep-link entry by Pokemon ID hash route (`#/pokemon/:id`).
  - Back navigation to preserved search/results state when opened from results.
- UI displays German Pokemon names as the primary display label.
- All UI copy is German.
- Pokemon type chips are rendered with German type labels.

## Engineering Rules

1. Keep implementation simple and testable.
2. Isolate API/data logic in `src/services`.
3. Keep UI components focused and small.
4. Prefer explicit behavior over hidden magic.
5. Handle cancellation/timeouts and user-facing failure states.
6. Enforce strict linting via ESLint flat config for TypeScript + Svelte.
7. Enforce one formatting standard via Prettier.
8. Do not introduce lint bypasses (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`) unless explicitly approved.
9. Keep exported and core internal TypeScript constructs documented with TSDoc.

## Testing Rules

- Maintain strong automated tests for service + UI behavior.
- Keep coverage gate at/above 95% (branches included).
- Keep `src` at 100% coverage when feasible; add focused tests for every uncovered branch introduced by changes.
- Add regression tests for any bugfix that changes behavior.
- Avoid flaky timing tests; prefer deterministic assertions.
- Maintain deterministic E2E smoke tests for critical search flows (use mocked API responses).

## API Rules

- Primary API: PokeAPI.
- Localize display names using species localization data.
- Localize Pokemon type labels to German for UI output.
- Do not cache rejected index promises.
- Keep request limits bounded for responsive UI.

## UX Rules (Children + iPad)

- Touch target minimum: `48x48px`.
- Base text size: `18px`.
- One-column result scan pattern.
- Clear loading, empty, no-results, and error states.

## Agent Workflow

1. Read `CONCEPT.md` and the relevant files in `docs/repo/` before behavior edits.
2. Read `DESIGN_BRIEF.md` before visual edits.
3. For every new feature, review all repository Markdown files and update every impacted document.
4. Implement smallest safe change.
5. Add/update TSDoc comments for changed TypeScript behavior (English, concise, junior-friendly).
6. Run `npm run lint` and `npm run format:check` before handoff.
7. Run `npm run check` and `npm test` before handoff.
8. Run `npm run test:e2e` before handoff when E2E setup exists.
9. Report what changed and why, with file links.

## Handoff Checklist

- Confirm no new lint/type suppressions were added.
- Confirm all user-visible copy remains German.
- Confirm result labels use German names and German type chips.
- Confirm new/changed TS APIs and logic paths include TSDoc comments in English.
- Report exact command outcomes, including any sandbox/elevation requirement for E2E.
