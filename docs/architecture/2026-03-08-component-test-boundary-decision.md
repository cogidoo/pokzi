# Decision: Svelte Component Test Boundaries

Status: implemented
Created: 2026-03-08
Updated: 2026-03-08
Implemented on: 2026-03-08
Superseded by:

## Goal

Keep unit tests maintainable without drifting away from Svelte Testing Library best practices.

## Trigger

We needed clearer boundaries between leaf-component detail tests and parent orchestration tests, while avoiding Vue-style default stubbing as the primary test mode.

## Decision

Adopt a real-component-first strategy:

1. Default test mode

- Render real Svelte components in unit tests by default.
- Prefer user-visible behavior assertions over implementation-detail assertions.

2. Leaf component tests

- Cover component-level markup details, fallback rendering, local accessibility, and emitted callbacks.
- Current leaf set: `SearchBar`, `ResultCard`, `StatusState`, `EvolutionTile`.

3. Parent component tests

- Cover data shaping, stage/group structure, callback forwarding, route/state orchestration, and integration contracts.
- Parent tests still render real children in normal cases.

4. Limited mocking rule

- Child-component stubs are allowed only when isolation is required for non-deterministic/external boundaries.
- Stubs must not become the default strategy for normal component-unit coverage.

## Applied Mapping

- `src/components/EvolutionTile.test.ts`: direct detail tests.
- `src/components/EvolutionSummary.test.ts`: real child rendering with parent-contract assertions.
- `src/App.test.ts`: real component integration across child surfaces.

## Tradeoffs

Benefits:

- Matches Svelte Testing Library guidance and ecosystem norms.
- Better confidence in real component integration behavior.
- Less synthetic test scaffolding.

Costs:

- Parent tests can be more sensitive to child behavior changes.
- Requires discipline in assertion scope to avoid brittle over-specification.

## Non-Goals

- Replacing E2E coverage.
- Reducing branch coverage requirements.
- Changing service-layer testing strategy.

## Verification

- Lint/format/type checks pass.
- Unit suite passes with coverage gate still satisfied.
- E2E smoke suite remains green.

## Documentation Impact

- `AGENTS.md` Testing Rules now explicitly require real-component-first testing.
- This architecture note records rationale and boundaries for future agents.
