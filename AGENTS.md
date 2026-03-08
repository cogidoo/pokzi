# AGENTS

## Purpose

Execution guide for coding agents working in this repository.

## Runtime Prerequisite

- Ensure `node` and `npm` are available in the active shell.

## Documentation Contract

- `CONCEPT.md` is the repo-doc overview.
- `docs/repo/*` is the source of truth for repo behavior and scope.
- `docs/architecture/*` stores internal architecture outputs such as refactor plans, architecture reviews, and technical decision records.
- `docs/architecture/*` must be written in English as developer-facing documentation.
- `DESIGN_BRIEF.md` is the single source of truth for visual/UI direction.
- `INSTRUCTIONS.md` stays high-level and must not duplicate detailed behavior logic.
- If behavior changes, update the relevant file in `docs/repo/` first, then align implementation.
- If technical structure changes or needs planning without changing behavior, document it in `docs/architecture/`.
- Every new feature must include a full Markdown documentation review. Update every impacted `.md` file in the repository, not only the primary feature document.
- Developer-facing code documentation uses TSDoc/JSDoc blocks in English.

## Local Codex Skills

- Local repo skills live under `.codex/skills/`.
- Use `.codex/skills/orchestrator-agent/SKILL.md` when the user wants routing, workflow selection, review-loop control, standardized handoffs, or one entrypoint coordinating specialist skills.
- Use `.codex/skills/anforderungs-agent/SKILL.md` when the user asks for requirement intake, scope review, concept writing, acceptance criteria, user flows, or translating vague stakeholder input into a repo-ready concept.
- Use `.codex/skills/umsetzungs-agent/SKILL.md` when the user asks for implementation, bugfixing, refactoring, hardening, code review, or senior delivery of scoped work in this repository.
- Use `.codex/skills/ux-ui-agent/SKILL.md` when the user asks for UX/UI direction, visual concepting, accessibility-focused design review, child-friendly interaction design, screen-level refinement, or implementation-ready interface guidance.
- Use `.codex/skills/software-architekt-agent/SKILL.md` when the user asks for architecture review, technical structure, module boundaries, state/service design, refactor planning, or pragmatic software architecture guidance in this repository.
- Use `.codex/skills/qa-agent/SKILL.md` when the user asks for QA review, test strategy, requirement validation from a quality perspective, regression-risk analysis, accessibility QA, release-readiness review, or child-friendly/mobile-first quality assessment in this repository.
- The trigger phrases `orchestrator-agent`, `delivery orchestrator`, `workflow orchestrator`, and `review until clean` should explicitly activate that local skill for this repository.
- The trigger phrases `anforderungs-agent` and `requirements lead` should explicitly activate that local skill for this repository.
- The trigger phrases `umsetzungs-agent`, `implementierungs-agent`, and `implementation lead` should explicitly activate that local skill for this repository.
- The trigger phrases `ux-ui-agent`, `design-agent`, `ui-agent`, and `ux-agent` should explicitly activate that local skill for this repository.
- The trigger phrases `software-architekt-agent`, `architektur-agent`, `software architect`, and `architecture lead` should explicitly activate that local skill for this repository.
- The trigger phrases `qa-agent`, `qa agent`, `test-agent`, `quality engineer`, and `qa review` should explicitly activate that local skill for this repository.

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

## Delivery System

The repository uses one shared delivery operating system:

1. `AGENTS.md` defines the constitution and default operating rules.
2. `orchestrator-agent` is the required routing layer for multi-stage work.
3. Specialist skills provide domain depth, not overall task governance.
4. Every multi-stage task must map to one of the standard workflows below.

### Standard Workflow Types

- `bugfix`
- `refactor`
- `feature`
- `maintenance`
- `audit`
- `requirement-intake`

### Workflow Routing Rules

- `bugfix`: default `implementation -> qa`; add `requirements`, `architecture`, or `ux-ui` only when the defect demands it.
- `refactor`: default `requirements -> architecture -> implementation -> qa`; requirements stay mandatory so invariants are explicit.
- `feature`: default `requirements -> implementation -> qa`; add `ux-ui` for UI/copy/a11y work and `architecture` for structural decisions.
- `maintenance`: default `implementation -> qa`; keep overhead low unless structural impact exists.
- `audit`: default `requirements -> architecture/ux-ui/qa`; analysis only unless the user explicitly asks for follow-up delivery.
- `requirement-intake`: `requirements -> feature workflow`; no implementation before the intake result is execution-ready.

### Shared Handoff Schema

Every orchestrated handoff must use the shared template in `.codex/skills/orchestrator-agent/templates/handoff-template.md`.

Required keys:

- `task_type`
- `goal`
- `scope_in`
- `scope_out`
- `constraints`
- `assumptions`
- `risks`
- `acceptance_criteria`
- `affected_surfaces`
- `findings`
- `evidence`
- `patch_plan`
- `changed_files`
- `tests`
- `severity`
- `review_status`
- `next_step`

### Role-Specific Required Outputs

- Requirements: `problem`, `user_value`, `scope_in`, `scope_out`, `acceptance_criteria`, `assumptions`, `risks`
- UX/UI: `affected_views`, `affected_states`, `ux_risks`, `copy_notes`, `a11y_notes`, `edge_cases`
- Architecture: `technical_decision`, `alternatives`, `tradeoffs`, `affected_modules`, `migration_impact`, `test_impact`
- Implementation: `patch_plan`, `changed_files`, `tests_changed`, `residual_risks`
- QA: `findings`, `severity`, `repro_or_rationale`, `missing_tests`, `review_status`

### Review Standard

- QA findings must be reported with `severity`, `evidence` or rationale, and a concrete next step.
- `blocker` and `high` findings must be fixed before completion.
- `medium` findings must be fixed or explicitly accepted in the final handoff.
- `low` findings may remain only as documented residual risk.
- Default review focus order: correctness, regression risk, test gaps, accessibility, performance, maintainability, documentation drift.

### Review Loop Rule

Use the explicit loop for `feature`, `refactor`, and non-trivial `bugfix` work:

1. implement
2. QA review
3. fix findings
4. QA re-review
5. repeat until clean

Rules:

- maximum automatic iterations: `3`
- unresolved `blocker` or `high` findings after iteration `3` => task status `unresolved`
- audits do not auto-convert into implementation; they must spawn a follow-up workflow intentionally

### Workflow-Specific Definition Of Done

- `bugfix`: bug understood, fix implemented, relevant tests green, no open `blocker`/`high`, medium findings resolved or accepted explicitly
- `refactor`: target structure reached, intended behavior preserved, tests updated for invariants, no open relevant findings
- `feature`: acceptance criteria satisfied, required UX/a11y/architecture concerns addressed, tests added, no open `blocker`/`high`
- `maintenance`: maintenance objective reached, required docs/tests aligned, no regression-relevant open findings
- `audit`: scope assessed, prioritized findings documented with evidence and recommendations, no hidden implementation mixed in
- `requirement-intake`: implementation-ready brief produced with explicit scope, acceptance criteria, assumptions, and risks

### Handoff Format

Every final handoff must state:

- workflow used
- what was done
- what was intentionally not done
- tests run and exact outcomes
- remaining risks or accepted findings
- whether merge/release is recommended

## Quality Overlays

Treat these as mandatory overlays, not optional afterthoughts:

- Accessibility: review on every UI-affecting task; issues blocking independent use are at least `high`.
- Security: review on dependency changes, API/client changes, input handling, routing, config, or generated artifacts.
- Performance: review on search behavior, data-fetching, rendering, caching, list/detail transitions, and bundle/tooling changes.

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

## Build And Verification Commands

- Development: `npm run dev`
- Production build: `npm run build`
- GitHub Pages build: `npm run build:pages`
- Preview build: `npm run preview`
- Lint: `npm run lint`
- Format check: `npm run format:check`
- Type and Svelte checks: `npm run check`
- Unit/integration tests: `npm test`
- E2E smoke tests: `npm run test:e2e`

## Git and Commit Rules

1. Make small, traceable commits with one logical change per commit.
2. Use clear, descriptive commit messages that explain what changed and why.
3. Separate cleanup/refactor commits from behavior changes whenever possible.
4. Do not commit generated artifacts (`coverage/`, `dist/`, `playwright-report/`, `test-results/`).
5. Before handoff, verify the staged diff only contains intended files.
6. Follow the commit title pattern `<type>(<scope>): <imperative summary>` from `docs/architecture/2026-03-07-commit-message-convention.md`.

## Testing Rules

- Maintain strong automated tests for service + UI behavior.
- Keep coverage gate at/above 95% (branches included).
- Keep `src` at 100% coverage when feasible; add focused tests for every uncovered branch introduced by changes.
- Add regression tests for any bugfix that changes behavior.
- Avoid flaky timing tests; prefer deterministic assertions.
- Maintain deterministic E2E smoke tests for critical search flows (use mocked API responses).
- Use component test boundaries consistently:
  - Test real Svelte components by default; avoid child-component stubs unless external boundaries or non-determinism force isolation.
  - Leaf/presentational components (`SearchBar`, `ResultCard`, `StatusState`, `EvolutionTile`) get direct UI-focused unit tests.
  - Parent/orchestrator components (`EvolutionSummary`, `App`) should emphasize integration contracts (state/routing/callback orchestration) while still rendering real children in normal unit tests.
  - Child markup, fallback visuals, and micro-a11y details must be asserted in the child component's own test file.
  - Rule of thumb (mandatory): assert each behavior at the lowest responsible layer once.
    - Leaf details (markup/fallback/chip rendering/micro-a11y) belong only to the leaf test.
    - Parent tests must not duplicate leaf detail assertions unless the parent transforms that detail.
    - Parent tests focus on composition contracts: visibility, ordering, state transitions, callback/routing flow.

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

1. Read `AGENTS.md` first for workflow and completion rules.
2. Read `CONCEPT.md` and the relevant files in `docs/repo/` before behavior edits.
3. Read `docs/architecture/*` when planning or changing technical structure.
4. Read `DESIGN_BRIEF.md` before visual edits.
5. Classify the task into one workflow type and choose the minimal safe specialist path.
6. For every new feature, review all repository Markdown files and update every impacted document.
7. Implement the smallest safe change or produce the correct non-implementation artifact for the workflow.
8. Add/update TSDoc comments for changed TypeScript behavior (English, concise, junior-friendly).
9. Run `npm run lint` and `npm run format:check` before handoff.
10. Run `npm run check` and `npm test` before handoff.
11. Run `npm run test:e2e` before handoff when E2E setup exists.
12. Report what changed and why, with file links and the required handoff format.

## Handoff Checklist

- Confirm no new lint/type suppressions were added.
- Confirm all user-visible copy remains German.
- Confirm result labels use German names and German type chips.
- Confirm new/changed TS APIs and logic paths include TSDoc comments in English.
- Report exact command outcomes, including any sandbox/elevation requirement for E2E.
