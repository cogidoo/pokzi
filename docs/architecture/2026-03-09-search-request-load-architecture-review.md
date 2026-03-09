# Search Request Load Architecture Review

- Status: implemented
- Created: 2026-03-09
- Updated: 2026-03-09
- Implemented on: 2026-03-09
- Superseded by:

## Goal

Reduce repeated network load in search flows without changing user-visible behavior.

## Current Problem / Trigger

The current search implementation can trigger repeated expensive fetch chains while users refine text input:

- same Pokemon IDs appear in consecutive result sets
- each result currently re-runs a `pokemon -> species -> evolution-stage` chain
- debounce already limits frequency, but repeated overlap still causes unnecessary requests and latency

This is especially relevant for iPad/mobile networks and rapid query refinement.

## Target Decision

Adopt a cached result-view-model path for search results:

1. Add an internal cache for `PokemonSearchResult` keyed by Pokemon ID.
2. Reuse cached result view models across text-search refinements.
3. Keep existing error handling and cancellation behavior unchanged.
4. Keep output semantics unchanged (German name, German types, evolution stage labels).

## Options Considered

### Option A: Reduce `SEARCH_RESULT_LIMIT`

- Pros: immediate lower request volume.
- Cons: changes product behavior and discoverability; weaker result scan coverage.
- Decision: reject for now.

### Option B: Remove evolution-stage from result cards

- Pros: large request reduction.
- Cons: violates current documented result-card contract and user expectations.
- Decision: reject.

### Option C: Cache search result view models by ID (chosen)

- Pros: preserves behavior, low risk, straightforward testability, high gain on overlapping result sets.
- Cons: additional in-memory cache, requires invalidation strategy if API schema changes (not expected at runtime).
- Decision: choose.

## Responsibility Boundaries

- `src/services/pokemonApi.ts`
- owns result-cache lifecycle and reuse logic
- keeps API mapping and localization behavior stable

- `src/features/search/searchController.ts`
- unchanged responsibilities (debounce, cancellation, UI state transitions)

- UI components
- unchanged responsibilities; render already-normalized result shape

## Migration / Execution Sequence

1. Introduce a `searchResultCache` map in `pokemonApi.ts` keyed by Pokemon ID.
2. Add cached lookup in `fetchPokemonByIdOrName` and `fetchPokemonById`.
3. Store normalized result models in cache after successful mapping.
4. Add/adjust integration tests to verify cache reuse and unchanged result contract.
5. Run lint, format check, type check, unit/integration tests, and E2E smoke tests.

## Risks And Non-Goals

### Risks

- Cache growth over long sessions (low). Existing service already uses in-memory caches.
- Test fragility if assertions rely on call counts too tightly (medium).

### Non-goals

- no UI behavior changes
- no routing or state-machine changes
- no API contract changes
- no tuning of tolerant matching algorithm in this step

## Test And Verification Impact

- Extend `pokemonApi` integration tests with explicit cache-reuse assertions.
- Keep existing behavioral tests passing unchanged.
- Verify no regressions in debounce, cancellation, and detail navigation flows via existing suites.

## Documentation Impact

- No `docs/repo` behavior update required if behavior remains identical.
- Keep this file as architecture evidence of the performance hardening decision.

## Completion Update

- Implemented `PokemonSearchResult` caching keyed by Pokemon ID in `pokemonApi.ts`.
- Reused cached result view models for both text and numeric searches while preserving query-specific `matchQuality`.
- Added integration tests for repeated-text and repeated-numeric cache reuse plus one additional attack-selection branch coverage test.
- No behavioral scope changes were introduced; no follow-up work is required for this step.
