Status: implemented
Created: 2026-03-07
Updated: 2026-03-07
Implemented on: 2026-03-07
Superseded by:

# Refactor Plan: Feature 05 Evolution Branch Readability and Type Chips

## 1. Goal

Implement `docs/repo/features/05-evolution-branch-readability-and-types.md` with a structure that stays simple, keeps current navigation behavior stable, and makes branching evolution data explicit and testable.

## 2. Current Problem

Current implementation is behaviorally close to feature `03`, but not structurally ready for feature `05`:

- `src/App.svelte` renders evolution UI inline and mixes layout, navigation, and view rules.
- `PokemonEvolutionSummary` in `src/types/pokemon.ts` exposes only `previous` and `next`, which flattens branch semantics.
- `src/services/pokemonApi.ts` resolves reachable nodes, but the output shape does not express a shared path plus ordered branch groups.
- Evolution items in detail view do not carry German type-chip data.
- Existing tests verify basic evolution navigation, but not feature-05-specific ordering/grouping contracts.

## 3. Scope

In scope:

- Refactor detail-evolution data model to represent shared path and branch groups.
- Add localized type-chip payload to evolution summary items (`max 2` chips for UI rendering).
- Extract evolution section rendering from `App.svelte` into a dedicated detail feature component.
- Add contract/integration tests for branch ordering and item payload shape.

Out of scope:

- Graph connectors, full tree visualization, or advanced evolution-condition explanations.
- Changes to search behavior, hash routing semantics, or detail back-navigation rules.

## 4. Target Structure

### 4.1 Domain Types

Update `src/types/pokemon.ts` to make branch readability explicit:

- `PokemonEvolutionTile`
  - `id`, `displayName`, `image`, `types: PokemonType[]`
- `PokemonEvolutionBranchGroup`
  - `originId`: numeric id of branch origin tile in shared path
  - `items`: ordered tiles in this branch (`nearest to deepest`)
- `PokemonEvolutionSummary`
  - `stage`
  - `sharedPath`: ordered tiles up to and including current Pokemon
  - `branchGroups`: ordered list of later branch groups

Notes:

- `sharedPath` contains the current Pokemon tile and keeps chronological reading order.
- `branchGroups` expresses only later reachable options and preserves PokeAPI `evolves_to` order.

### 4.2 Service Boundary

Inside `src/services/pokemonApi.ts`, introduce a small private composition seam:

- Keep PokeAPI fetching and localization in the service layer.
- Add internal mapping logic that converts the evolution tree to:
  - one shared path
  - N branch groups
- Keep failure fallback behavior unchanged (`empty evolution summary` when evolution resolution fails).

Optional internal split (same PR only if it reduces complexity):

- `src/services/evolution/evolutionSummaryBuilder.ts` as pure transformation logic.

### 4.3 UI Boundary

Introduce a dedicated component:

- `src/components/EvolutionSummary.svelte` (or `src/features/detail/EvolutionSummary.svelte`)

Responsibilities:

- Render heading/support note inputs from parent.
- Render shared path first, then branch groups.
- Render full-tile tap targets for non-current tiles.
- Render current tile as visually active and non-interactive.
- Render up to two German type chips per tile.

`App.svelte` responsibility after extraction:

- Provide detail data and callbacks (`onSelectEvolution`), but no branch layout rules.

## 5. Responsibility Rules

- `pokemonApi` owns evolution data retrieval, localization, ordering, and fallback behavior.
- Evolution transformation logic owns branch semantics; it does not know UI copy.
- Evolution component owns rendering and interaction affordance; it does not fetch data.
- `App.svelte` remains orchestration shell for route/detail state only.

## 6. Invariants

Must remain unchanged during this refactor:

- German UI copy.
- Hash deep-link route format: `#/pokemon/:id`.
- Back behavior for result-opened vs direct-deeplink detail.
- Evolution section hidden when no visible relations exist.
- Non-current tiles remain full-tile tap targets.
- No horizontal scrolling in evolution section for `320-1024px`.

## 7. Refactoring Steps

1. Type model migration

- Introduce new evolution summary interfaces in `src/types/pokemon.ts`.
- Keep temporary compatibility mapping in service layer while UI migrates.

2. Service mapping migration

- Replace `previous/next` composition with `sharedPath + branchGroups`.
- Attach localized type labels to each evolution tile.
- Ensure branch-group order and in-branch order match feature `05` contract.

3. UI extraction

- Create `EvolutionSummary` component.
- Move evolution section markup and class names from `App.svelte` into component.
- Keep existing callbacks and in-detail loading-frame behavior unchanged.

4. App integration cleanup

- Switch `App.svelte` to new summary shape.
- Remove obsolete inline evolution helpers and duplicate rendering logic.

5. CSS stabilization

- Scope evolution styles to the new component.
- Preserve existing token usage and touch targets.

## 8. Risks and Mitigations

- Risk: Order regression for branching chains.
  - Mitigation: Add contract tests that assert exact output order from PokeAPI-like trees.
- Risk: Visual regression in detail layout stability during in-detail navigation.
  - Mitigation: Keep existing `detailTransitioning` behavior and add focused UI test assertions.
- Risk: Increased coupling if branch logic remains inline in `pokemonApi.ts`.
  - Mitigation: Keep a pure builder seam (module or private function cluster) with dedicated tests.

## 9. Non-Goals

- No global state/store introduction.
- No router redesign.
- No redesign of unrelated detail sections (hero/facts).
- No backend/proxy layer changes.

## 10. Test Plan

Add or update tests with module-aligned intent:

- `src/services/pokemonApi.integration.test.ts`
  - shared path contains current pokemon and earlier stages in order
  - branch groups follow PokeAPI `evolves_to` order
  - each tile exposes localized type chips and caps to two for UI contract
  - fallback behavior stays unchanged on evolution-specific failures
- `src/App.test.ts` (or new `EvolutionSummary` component tests)
  - current tile non-clickable and visually active
  - non-current tiles clickable across shared path and branch groups
  - evolution section hidden when summary has no relations
  - type chips rendered per tile when provided

Quality gates before handoff:

- `npm run format:check`
- `npm run lint`
- `npm run check`
- `npm test`
- `npm run test:e2e`

## 11. Documentation Impact

Behavior definition already exists in `docs/repo/features/05-evolution-branch-readability-and-types.md`.

Documentation updates required during implementation:

- `docs/repo/current-state.md` only if final behavior differs from current text.
- `docs/architecture/2026-03-07-repo-architecture-review.md` only if this work changes broader architecture priorities.
- Update this plan status to `implemented` once complete and add a short completion note.

## 12. Completion Note

Feature `05` is now implemented with a normalized `sharedPath + branchGroups` evolution model, localized type chips per evolution tile, extracted evolution UI component, and regression coverage for service + UI behavior.
