# Search Localization Performance Refactor (2026-03-08)

- Status: implemented
- Created: 2026-03-08
- Updated: 2026-03-08
- Implemented on: 2026-03-08

## Context

Cold-start German text search previously localized names by calling `/pokemon-species/{id}` per index entry.
For broad/partial/tolerant queries this could trigger more than 1000 HTTP requests before first results appeared.

## Problem

- Initial search latency was dominated by per-species localization network round trips.
- Request volume was unnecessarily high for first-use sessions.
- UX degraded because result rendering waited for localization scan progress.

## Decision

Use a static German species-name index committed in the repository and sourced from the official PokeAPI dataset:

- Source dataset: `pokemon_species_names.csv` from the official PokeAPI repository.
- New local index: `src/data/pokemonGermanSpeciesIndex.ts` (`id -> German name`).
- Search index localization now resolves from this local map instead of per-species API calls.
- Runtime API usage for search remains focused on:
  - one species index list request (`/pokemon-species?limit=1400`)
  - result detail requests (`/pokemon/{id}`)
  - per-result species/evolution requests already needed for stage mapping.

## Tradeoffs

### Benefits

- Large reduction in cold-search request fan-out.
- Significantly faster first visible search results for German-name queries.
- Stable matching behavior (exact/partial/tolerant) kept intact.

### Costs

- Repository now contains a generated static data file.
- German name updates from upstream PokeAPI require re-generating this index.

## Drift Control

To reduce stale-index risk after upstream name changes, the repository now includes a deterministic sync script:

- Script: `scripts/pokemonGermanSpeciesIndex.mjs`
- Check command: `npm run index:de:check`
- Update command: `npm run index:de:update`

The check command compares the committed index file against a fresh generation from the official upstream CSV and fails on drift.
The update command regenerates `src/data/pokemonGermanSpeciesIndex.ts` with sorted `id -> German name` entries.

## Verification Impact

Integration tests were updated to validate the new performance contract:

- No per-index species-localization requests during German text search.
- Cold-cache search request volume stays bounded.
- Result limiting and tolerant matching behavior remain covered.
