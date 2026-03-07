# Search And Results

## Goal

Children can quickly find Pokemon by German name or number and see clear, visual results while typing.

## Design Reference

- Global UI rules, tokens, accessibility, motion, and responsive behavior live in `DESIGN_BRIEF.md`.
- This feature document defines only the search/results-specific screen composition and visual acceptance for feature `01`.
- Input-tolerance behavior for umlaut variants and minor typos is defined in `04-search-input-tolerance.md`.

## User Value

The user gets immediate feedback, can refine the query without friction, and can scan large, touch-friendly result cards with confidence.

## Scope

- Search input for German Pokemon names and numeric IDs
- Live-updating results list under the input
- Optional search button and Enter support
- Invalid-query guidance for too-short text input
- Result cards with:
  - German display name
  - official artwork thumbnail
  - Pokemon number (ID)
  - German type labels
  - evolution stage label (`Basis`, `Phase 1`, `Phase 2`)

## Primary Flow

1. User opens the app and sees the search field.
2. User enters a German Pokemon name or numeric ID.
3. After a short debounce, the results list updates automatically.
4. The app shows a loading state while querying.
5. The app displays matching cards or friendly no-results guidance.
6. The user refines the query or opens a result card.

## Interaction Rules

- Primary behavior: live search with `250-300ms` debounce.
- Minimum query length: 2 characters for German-name search.
- Numeric IDs are allowed from 1 digit.
- Empty query stays in a neutral start state with helper guidance.
- A one-character non-numeric query stays in a non-error invalid state with guidance to refine the input.
- Keep a visible search button for confidence and accessibility, but do not require it.
- Do not use a floating autocomplete dropdown.
- While result cards are visible, the sticky header/search surface starts expanded at the top and switches to a compact state after downward list scrolling.
- The sticky header/search surface returns to the expanded state when the user scrolls back to the top of the results page.
- If compact mode makes the page no longer vertically scrollable (borderline list length), an upward scroll intent (mouse wheel up or touch swipe down) must expand the header/search surface again even without native scroll delta.

## Query Rules

- Numeric query (`^\d+$`): search by Pokemon ID.
- Text query: search only against German Pokemon names.
- Trim leading and trailing whitespace before evaluating the query.
- Match text queries case-insensitively.
- Prefer exact German-name matches over partial-name matches when both exist.
- Apply tolerant text-recovery matching rules from `04-search-input-tolerance.md` after exact and partial German-name checks.
- Keep the results list bounded so it remains fast and easy to scan on iPad.

## Content And Language Rules

- All visible UI copy is German.
- Result cards display German Pokemon names and German type labels.
- Labels must stay clear and child-friendly.

## States And Edge Cases

### Neutral Start State

- Empty query shows helper or placeholder guidance.
- Empty query is not an error state.

### Invalid Query

- A non-numeric query with fewer than 2 characters shows refinement guidance instead of loading or no-results.
- Invalid query input does not trigger a text search request.

### Loading

- Show search loading feedback without collapsing the page structure.

### No Results

- Show friendly guidance and allow immediate refinement.

### Error

- Show a clear German explanation and a retry path.

### Success

- Show the results list directly below the search area.
- Keep the current query visible so the user can refine it without losing context.
- If all visible results are tolerant-name matches, show the refinement hint specified in `04-search-input-tolerance.md`.

## UX/UI Handoff

### Search Start Composition

- The first impression is headline first, search second, helper third.
- The search field is the strongest interactive element on screen.
- The helper state should feel inviting, not instructional-heavy.
- Avoid decorative elements that compete with the input.

Implementation notes:

- The header should feel like a compact discovery intro, not like a generic form page.
- Keep the headline and helper copy short enough that the first result can still appear quickly below the sticky search area.
- The search surface should visually read as the primary object on the screen before results are shown.
- Avoid stacking multiple equally prominent containers above the first result.

### Search With Results Composition

- Sticky search remains visible while scrolling results.
- Results begin immediately below the search area with a clear vertical rhythm.
- The first card should be visible quickly after searching, without a large dead zone.
- Once results are shown, explanatory text should reduce and scanability should increase.
- The search header and helper chrome must compact only after the user has scrolled down in the results view.
- Returning to page top (`scrollY` near `0`) must restore the expanded header state.

Implementation notes:

- Compact mode should reduce helper and header weight without making the page feel like a different screen.
- Preserve enough spacing below the sticky search so the first card never feels clipped or trapped under the header.
- The sticky surface should remain visually connected to the results list rather than floating like a separate toolbar.

### Result Card Visual Priority

- Each result card must show artwork, German name, `#ID`, stage, and German type chips.
- The name remains the strongest visual element inside the card.
- Metadata remains visually secondary to the name.
- Cards stay visually consistent across the list and should not grow into mini detail views.

Implementation notes:

- Artwork and name must dominate the scan path.
- The `#ID` should be readable but compact; it should not compete with the title line.
- Stage and type information should be grouped into one calm metadata zone below the identity line.
- If space gets tight on smaller widths, preserve the name and artwork first and let metadata wrap cleanly.
- Keep card heights visually consistent across typical data variations so the list feels reliable to scan.

### Visual State Guidance

- Neutral and invalid states should use the same calm structural pattern, but different copy.
- Invalid query is a guidance state, not an error state.
- Loading should preserve layout rhythm instead of collapsing the page.
- No-results should feel friendly and support immediate refinement.
- Error should keep a clear retry action without technical language.
- Tolerant-only success should use supportive hint styling, not error styling.

Implementation notes:

- Loading should appear close to the results area rather than replacing the overall page identity.
- The neutral state should invite action quickly and avoid sounding like onboarding text.
- Invalid, empty, and error states should be visually distinct through emphasis and tone, but remain part of the same screen family.
- Retry actions must remain large and obvious without becoming visually louder than the search field itself.

## Visual Acceptance Criteria

- Search area is clearly dominant and touch-safe.
- Search field and submit button meet the touch-size rules from `DESIGN_BRIEF.md`.
- Search remains understandable in both expanded and compact states.
- Sticky search does not cover content awkwardly while scrolling.
- Results render as one clear vertical list of tap-safe cards.
- Card pressed and focus states are visible without noisy motion.
- Loading, invalid, no-results, and error states are visually distinct but structurally consistent.
- Tolerant-only hint appears in a consistent location without pushing the first result too far below the sticky search area.
- The first visible result appears quickly below the search area without excessive empty space.
- Search UI reads as a discovery surface rather than a generic utility form.
- Result cards are glanceable in this order: artwork, name, then supporting metadata.
- Expanded header state is shown when results are present but the user is at the top of the page.
- Compact header state is shown only after downward scrolling in the results view and resets to expanded at top.
- In non-scrollable compact edge cases, an explicit upward intent still expands the header.

## Acceptance Criteria

- An empty query shows a neutral helper state and no result cards.
- A one-character non-numeric query shows refinement guidance and does not show loading or no-results.
- A numeric query searches by Pokemon ID from the first digit.
- A text query searches only against German Pokemon names.
- Leading and trailing whitespace do not change the search outcome.
- Text search matching is case-insensitive.
- The result list updates automatically while typing and can also be triggered by the visible search button or Enter.
- Result cards render image, German name, ID, German type labels, and evolution stage.
- When only tolerant matches are shown, the UI displays the fixed German refinement hint from feature `04`.
- Each result card is one clear tap target that opens the detail view without precision tapping.
- All user-facing UI text is German.
- Loading, no-results, error, success, neutral-start, and invalid-query states are all present and distinguishable.
