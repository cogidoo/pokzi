# Search Input Tolerance

## Goal

Children can still find the intended Pokemon when German-name input contains umlaut/`ss` variants or a small typo.

## User Value

Search stays forgiving and confidence-building for touch keyboard input, even when spelling is imperfect.

## Scope

- tolerant matching for German-name text queries only
- equivalence handling for `ä/ae`, `ö/oe`, `ü/ue`, and `ß/ss`
- one-edit typo tolerance for short names and up to two edits for longer names
- stable ranking that keeps exact German-name matches first
- explicit German guidance when only tolerant matches are available

## Non-Scope

- changes to numeric ID query behavior
- autocomplete dropdowns, suggestion chips, or new filter controls
- phonetic search, transliteration across non-German alphabets, or semantic intent search
- expansion beyond bounded result-list behavior

## Entry Points

- search input on the main search/results screen
- visible search button and Enter-triggered search on the same screen

## Primary Flow

1. User enters a German-name query with umlaut variants or a small typo.
2. App runs the baseline text matching defined in `01-search-and-results.md`.
3. If no strong exact/partial match is found, app evaluates tolerant matching rules.
4. App shows ordered matches with exact results first, then tolerant matches.
5. If only tolerant matches are shown, app displays a short German hint that invites refinement without blocking progress.

## Interaction Rules

- Keep the existing debounce and bounded-result behavior from feature `01`.
- Apply tolerance only to non-numeric text queries with at least 2 characters.
- Normalization step for tolerance compares:
  - lowercased query and lowercased German name
  - umlaut and `ß` equivalence variants
- Distance thresholds:
  - name length `2-5`: maximum edit distance `1`
  - name length `6+`: maximum edit distance `2`
- Ranking order for text query results:
  1. exact normalized German-name match
  2. prefix/partial normalized German-name match
  3. tolerant typo matches ordered by lowest edit distance, then alphabetically
- Never suppress a valid exact match because of tolerant alternatives.
- When tolerance yields no candidates, keep existing no-results behavior from feature `01`.

## Content And Language Rules

- All user-visible guidance remains German.
- Tolerant-only helper wording is fixed to:
  - `Meintest du vielleicht:`
- Do not add per-card correction badges or technical distance labels.
- German Pokemon names remain the primary labels on cards.

## States And Edge Cases

### Neutral

- Empty query behavior remains unchanged from feature `01`.

### Loading

- Loading behavior remains unchanged from feature `01`.

### Success

- Result list may include tolerant matches only when exact/partial quality is insufficient.
- Exact and close partial matches always stay ahead of tolerant typo matches.
- If results are tolerant-only, show one refinement hint directly above the results list and below the sticky search area.
- If at least one exact or partial match exists, do not show the tolerant-only refinement hint.

## UX/UI Handoff

### Tolerant-Only Hint Placement

- Use the existing calm state/notice styling family from the search screen.
- Place the hint between the sticky search surface and the first result card.
- Keep one-line priority on iPad widths; allow wrapping on smaller widths without truncating words.
- Keep spacing compact so the first card still appears quickly below the sticky area.

### Tolerant-Only Hint Visual Behavior

- The hint is supportive, not an error or warning.
- Use neutral/supportive emphasis, never error-red treatment.
- Keep icon optional and subtle; text remains the primary carrier.
- Do not change result-card anatomy for tolerant-only output.

### Empty Or No Results

- If no tolerant candidate passes thresholds, show the existing no-results state from feature `01`.

### Error

- Search/network error behavior remains unchanged from feature `01`.

### Missing Data

- If a Pokemon is missing a German localized name in index data, that entry is excluded from tolerant-name matching and keeps existing fallback behavior from the search feature.

## Acceptance Criteria

- Numeric-only queries still use ID search with unchanged behavior.
- Text queries with umlaut/`ss` variants return the same intended Pokemon candidates as their canonical German spelling.
- A one-edit typo in short names can still produce a valid result when matching data exists.
- A two-edit typo in longer names can still produce a valid result when matching data exists.
- Exact German-name matches are always ranked before tolerant typo matches.
- Tolerant-only result sets show a short German refinement hint.
- Tolerant-only refinement hint appears above the list only when all visible matches are tolerant matches.
- Tolerant-only refinement hint uses the exact copy `Meintest du vielleicht:` and no extra punctuation variants.
- Existing invalid-query, loading, no-results, error, and success states remain distinguishable.
- Result-list limits and responsiveness remain aligned with iPad-first scanability rules.

## Open Questions

- None.

## Documentation Impact Check

- Updated `docs/repo/README.md` to register feature `04-search-input-tolerance.md`.
- Updated `docs/repo/current-state.md` to include tolerant German-name search handling in current scope.
- Updated `docs/repo/features/01-search-and-results.md` to reference and align with this tolerance feature.
- Updated `DESIGN_BRIEF.md` to define global visual treatment for tolerant-only search hint states.
- Updated `CONCEPT.md` to reflect tolerant input handling in repo direction.
- Updated `README.md` to align public feature summary with the new search behavior.
