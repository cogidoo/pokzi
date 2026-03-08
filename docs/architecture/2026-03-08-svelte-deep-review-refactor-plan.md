# Refactor Plan: Svelte Deep Review and Structural Cleanup

Status: implemented
Created: 2026-03-08
Updated: 2026-03-08
Implemented on: 2026-03-08
Superseded by:

## Goal

Reduce structural complexity in the main Svelte surface without changing documented repo behavior, while aligning implementation with current Svelte 5 best practices.

## Current Problem

- `src/App.svelte` mixed business flow, browser event wiring, and view-state synchronization in multiple manual listener effects.
- `src/components/EvolutionSummary.svelte` repeated the same tile markup logic across basis/phase lanes, increasing maintenance risk.
- The current shape made behavior-preserving changes slower because one UI concern was represented in several duplicated blocks.

## Scope

In scope:

- Replace manual `window.addEventListener` setup/teardown in `App.svelte` with top-level `<svelte:window>` bindings.
- Keep search header compaction logic but centralize routing/event handlers as named functions.
- Refactor `EvolutionSummary.svelte` tile rendering by extracting a dedicated `EvolutionTile` component to remove template duplication.
- Keep the same German UI copy, semantics, and routing behavior.

Out of scope:

- Product behavior changes in search/detail/evolution.
- Visual redesign or CSS token changes.
- API/service-layer refactors.

## Target Structure

- `App.svelte` keeps orchestration responsibilities but uses explicit handler functions plus one `<svelte:window>` integration point for global browser events.
- `EvolutionSummary.svelte` keeps evolution-shape derivation logic in script and reuses one dedicated tile component across all stage lanes.

## Responsibility Rules

- `App.svelte` owns route/search/detail orchestration and page-level interaction state.
- Child components remain presentational and callback-driven.
- `EvolutionSummary.svelte` owns visual stage rendering and tile navigation affordances only; it does not own route history behavior.

## Invariants

- Hash-route deep links (`#/pokemon/:id`) continue to work.
- Back-to-search behavior and preserved results-context behavior remain unchanged.
- German copy, German Pokemon labels, and German type chips remain unchanged.
- Existing loading/error/empty/not-found states remain unchanged.

## Refactoring Steps

1. Gather Svelte MCP guidance for current best practices (`$effect`, `<svelte:window>`, modern composition patterns).
2. Refactor `App.svelte` window-event wiring to `<svelte:window>` with explicit handlers.
3. Refactor `EvolutionSummary.svelte` duplicated tile markup into one reusable tile component.
4. Run lint/format/type/tests and confirm behavior parity.

## Risks

- Regression risk in scroll-driven compact header transitions if event timing differs.
- Regression risk in evolution tile interactivity/ARIA labels after template deduplication.

## Non-Goals

- Introducing experimental async Svelte features.
- Changing testing framework or coverage strategy.
- Splitting App orchestration into new modules in this change.

## Test Plan

- Run `npm run lint`.
- Run `npm run format:check`.
- Run `npm run check`.
- Run `npm test` (coverage + component/integration contracts).
- Run `npm run test:e2e` for smoke flow parity.

## Documentation Impact

- `docs/repo/*` unchanged because user-visible behavior is intentionally unchanged.
- Add one architecture refactor document in `docs/architecture/` to capture the structural decision and verification approach.

## Implementation Notes

- Svelte MCP guidance applied directly:
  - use `<svelte:window>` over manual listener lifecycle logic
  - prefer focused child components when local snippet syntax conflicts with active linting constraints

## Completion Note

Implemented as planned with no intended behavior changes:

- `App.svelte` now binds global events via `<svelte:window>` and uses centralized handlers.
- `EvolutionSummary.svelte` now renders shared tile markup via `EvolutionTile.svelte`.

No follow-up migration is required for this refactor batch.
