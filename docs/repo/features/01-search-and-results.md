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
- The search input must disable browser autocomplete, autocorrect, autocapitalization, and spellcheck so German Pokemon names are not "fixed" by mobile keyboards.
- Do not use a floating autocomplete dropdown.

## Query Rules

- Numeric query (`^\d+$`): search by Pokemon ID.
- Text query: search only against German Pokemon names.
- Trim leading and trailing whitespace before evaluating the query.
- Match text queries case-insensitively.
- Prefer exact German-name matches over prefix partial-name matches when both exist.
- Rank text partial matches first by normalized name prefix, then by normalized mid-name substring matches.
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

- The first impression is one clear headline first, search second, helper third.
- The search field is the strongest interactive element on screen.
- The helper state should feel inviting, not instructional-heavy.
- Avoid decorative elements that compete with the input.
- Do not stack multiple intro messages above the search field.
- The search field may rely on headline, placeholder, and helper text instead of a separate visible field label when the input keeps an accessible programmatic label.

Implementation notes:

- The header should feel like a compact discovery intro, not like a generic form page.
- Use a single visible headline above the search surface.
- Do not pair the headline with an additional eyebrow and explanatory subheadline on the start screen.
- If the visible field label is removed for compactness, preserve an accessible label on the input and keep the placeholder short and explicit.
- Keep the headline and the search surface compact enough that the first result can appear quickly below it.
- The search surface should visually read as the primary object on the screen before results are shown.
- Avoid stacking multiple equally prominent containers above the first result.
- The helper sentence about minimum input length belongs in the neutral or invalid feedback card below the search surface, not as persistent text under the input.

### Search With Results Composition

- The rounded search hero stays at the top of the document flow and scrolls away naturally with the page.
- Results begin immediately below the search hero with a clear vertical rhythm.
- The first card should be visible quickly after searching, without a large dead zone.
- Once results are shown, explanatory text should reduce and scanability should increase.

Implementation notes:

- Use one stable hero layout across start, loading, invalid, empty, and results states.
- Avoid sticky, compact, keyboard-aware, or scroll-threshold variants for the search hero.
- Keep all four corners rounded on the search hero at every viewport size.
- Preserve enough spacing below the hero so the first card never feels clipped.

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
- Search remains understandable without secondary compact states.
- Results render as one clear vertical list of tap-safe cards.
- Card pressed and focus states are visible without noisy motion.
- Loading, invalid, no-results, and error states are visually distinct but structurally consistent.
- Tolerant-only hint appears in a consistent location and keeps the first result close enough for quick scanning.
- The first visible result appears quickly below the search area without excessive empty space.
- Search UI reads as a discovery surface rather than a generic utility form.
- Result cards are glanceable in this order: artwork, name, then supporting metadata.

## Acceptance Criteria

- An empty query shows a neutral helper state and no result cards.
- A one-character non-numeric query shows refinement guidance and does not show loading or no-results.
- A numeric query searches by Pokemon ID from the first digit.
- A text query searches only against German Pokemon names.
- Leading and trailing whitespace do not change the search outcome.
- Text search matching is case-insensitive.
- Text search partial matching prefers the start of the normalized German name and may include later substring matches after prefix matches.
- The result list updates automatically while typing and can also be triggered by the visible search button or Enter.
- Result cards render image, German name, ID, German type labels, and evolution stage.
- When only tolerant matches are shown, the UI displays the fixed German refinement hint from feature `04`.
- Each result card is one clear tap target that opens the detail view without precision tapping.
- All user-facing UI text is German.
- Loading, no-results, error, success, neutral-start, and invalid-query states are all present and distinguishable.
