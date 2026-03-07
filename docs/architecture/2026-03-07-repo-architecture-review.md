Status: in-progress
Created: 2026-03-07
Updated: 2026-03-07
Implemented on:
Superseded by:

# Architecture Review: Top 3 Structural Risks

## Goal

Prioritize the three largest structural risks in the current repo and define a concrete, executable remediation plan for each one.

## Scope

- `src/App.svelte`
- `src/services/pokemonApi.ts`
- `src/**/*.test.ts` and `e2e/app.smoke.spec.ts`
- no change to current user-visible behavior

## System Snapshot

- Quality checks are stable: `npm run lint`, `npm run check`, `npm test`, and `npm run test:e2e` are green.
- Coverage is high (`branches` > 95%).
- At the same time, central files are very large:
  - `src/App.svelte`: 729 lines
  - `src/services/pokemonApi.ts`: 1237 lines
  - `src/App.test.ts`: 1054 lines
  - `src/services/pokemonApi.test.ts`: 2207 lines

## Top 3 Structural Risks

## 1) App orchestration as a monolith (`src/App.svelte`)

### Current problem

- One file mixes routing, search workflow, detail workflow, history semantics, and rendering.
- Relevant hotspots live in the same scope blocks:
  - State + route model: `src/App.svelte:16-55`
  - Search orchestration: `src/App.svelte:224-276`
  - Detail orchestration: `src/App.svelte:328-378`
  - Navigation/history logic: `src/App.svelte:298-321`, `src/App.svelte:395-411`, `src/App.svelte:435-469`
  - Large template branches: `src/App.svelte:472-729`
- Result: high change cost for new detail/search variants and high navigation regression risk.

### Target structure

- `App.svelte` remains only a shell/composition layer.
- Extracted view-model hooks or controller modules:
  - `src/features/search/searchController.ts`
  - `src/features/detail/detailController.ts`
  - `src/features/navigation/hashRouter.ts`
- Presentation components:
  - `src/features/search/SearchView.svelte`
  - `src/features/detail/DetailView.svelte`
  - `src/features/detail/EvolutionSummary.svelte`

### Responsibility rules

- `App.svelte`: composition plus top-level route switching only.
- Controllers: async workflows, cancellation, UI state models.
- Views: rendering plus user events only.
- Router module: parse/build hash URLs plus history rules.

### Invariants

- Hash routing (`#/pokemon/:id`) remains unchanged.
- Back behavior (with and without search context) remains unchanged.
- All UI copy remains German.

### Refactoring steps

1. Extract router functions (`parseRoute`, `detailHash`, `searchUrl`) into `hashRouter.ts`.
2. Encapsulate search state plus `performSearch` in `searchController.ts`.
3. Encapsulate detail state plus `loadDetail` in `detailController.ts`.
4. Split markup into `SearchView.svelte` and `DetailView.svelte`.
5. Reduce `App.svelte` to a thin composition layer.

### Test plan

- Split existing `App.test.ts` cases into controller unit tests plus view integration tests.
- Cover router rules explicitly with unit tests.
- Keep existing E2E smoke cases unchanged as a safety net.

### Risks

- Intermediate states can temporarily create duplicate state sources.
- Mitigation: extract only one partial controller per PR, no big-bang migration.

### Non-goals

- No global store framework.
- No switch to a different routing system.

## 2) Service monolith plus global caches without clear lifetime (`src/services/pokemonApi.ts`)

### Current problem

- One file contains transport, error mapping, index building, tolerant search, evolution resolution, localization, and caching.
- Global mutable caches live at module level:
  - `speciesIndexCache`, `localizedScanCursor`, `germanIndexById`, `evolutionItemCache`, `detailCache` in `src/services/pokemonApi.ts:152-157`
- The search strategy is performance-critical and complex (`findGermanMatches` in `src/services/pokemonApi.ts:1024-1125`) and hard to test in isolation.

### Target structure

- Split into clearly separated modules:
  - `src/services/http/pokeApiClient.ts` (fetch + timeout + error mapping)
  - `src/services/index/speciesIndexRepository.ts` (index + cache lifecycle)
  - `src/services/search/germanSearchEngine.ts` (exact/partial/tolerant ranking)
  - `src/services/evolution/evolutionResolver.ts` (stage + chain summary)
  - `src/services/pokemonService.ts` (public facade for UI)

### Responsibility rules

- Repositories own cache strategies including TTL/invalidation hooks.
- The search engine stays purely functional (no network requests).
- The service facade orchestrates use cases but contains no low-level fetch details.

### Invariants

- No change to ranking/tolerance rules from `docs/repo/features/04-search-input-tolerance.md`.
- No change to German labels/names.
- No caching of rejected index promises (existing rule remains).

### Refactoring steps

1. Move `fetchJson` plus error classes into `pokeApiClient.ts`.
2. Introduce an index layer with explicit `reset()`/`getStats()` support (used internally first).
3. Extract `findGermanMatches` into `germanSearchEngine.ts`.
4. Move evolution resolution into its own module.
5. Reduce the old file to a facade and then dissolve it.

### Test plan

- Add module unit tests for search ranking, Levenshtein thresholds, and umlaut/`ß` normalization.
- Add repository tests for cache lifecycle and non-caching of failures.
- Keep existing integration tests against the service facade.

### Risks

- Unwanted performance regression during index scanning.
- Mitigation: simple before/after benchmark checks for typical queries (`exact`, `partial`, `tolerant`).

### Non-goals

- No change to the external API.
- No persistence caches (`localStorage`/`IndexedDB`) in this phase.

## 3) Test architecture is file-centric instead of module-centric

### Current problem

- Tests are comprehensive, but very large and tightly coupled to large files:
  - `src/App.test.ts` (1054 lines)
  - `src/services/pokemonApi.test.ts` (2207 lines)
- Structural changes create high update cost even when behavior remains unchanged.
- Architecture rules are not modeled as focused contract tests of their own (for example router/history contract, search-ranking contract, evolution-order contract).

### Target structure

- Reshape the test pyramid around domain contracts:
  - contract tests per module boundary (`router`, `search engine`, `evolution resolver`)
  - slimmer view integration tests
  - E2E still only for critical flows

### Responsibility rules

- Unit/contract tests verify one domain rule.
- Integration tests verify the interaction of 2-3 modules.
- E2E verifies only end-to-end user flows.

### Invariants

- The coverage gate stays at least at the current level.
- Existing smoke flows remain in place.

### Refactoring steps

1. Extract router/history cases from `App.test.ts` into dedicated router contract tests.
2. Move ranking rules out of `pokemonApi.test.ts` into `germanSearchEngine.contract.test.ts`.
3. Reduce per-file integration tests to core paths.
4. Keep the E2E suite aligned only with critical user flows.

### Test plan

- Compare test runtime and flake rate before and after the refactor.
- Ensure every rule from `docs/repo/features/01-04` has at least one contract test.

### Risks

- More test files in the short term.
- Mitigation: standardized test structure per module (`*.contract.test.ts`, `*.integration.test.ts`).

### Non-goals

- No reduction in quality level.
- No replacement of E2E with unit tests.

## Recommended implementation order

1. Start with risk 1 (App monolith), because it reduces change risk in UI and navigation most directly.
2. Follow with risk 2 (service split) to separate search/detail domain logic cleanly.
3. Pull risk 3 (test architecture) along incrementally in parallel with 1 and 2 to actively reduce refactor risk.

## Documentation impact

- This review documents the technical direction in `docs/architecture/`.
- No change to user-visible behavior, so no `docs/repo/*` update is required.

## Progress update

- Phase 1 (routing and search orchestration decoupling) was implemented on 2026-03-07.
- Phase 2 (service split with search-index and transport module separation) was implemented on 2026-03-07.
- Implemented concretely:
  - hash-routing utilities in `src/features/navigation/hashRouter.ts`
  - search orchestration in `src/features/search/searchController.ts`
  - transport and error mapping in `src/services/http/pokeApiClient.ts`
  - search index/tolerance matching in `src/services/search/germanNameSearch.ts`
  - concurrent async helper in `src/services/utils/async.ts`
  - integration in `src/App.svelte` and `src/services/pokemonApi.ts` with unchanged behavior
- Verification for the implemented part:
  - `npm run lint` successful
  - `npm run format:check` successful
  - `npm run check` successful
  - `npm test` successful
  - `npm run test:e2e` successful
