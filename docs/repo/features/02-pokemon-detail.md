# Pokemon Detail

## Goal

A selected Pokemon opens into a dedicated detail view that explains the most important information in a large, friendly, easy-to-scan format.

## Design Reference

- Global UI rules, tokens, accessibility, motion, and responsive behavior live in `DESIGN_BRIEF.md`.
- This feature document defines only the detail-screen-specific hierarchy, composition, and visual acceptance for feature `02`.
- Evolution-specific UI behavior is refined further in `03-evolution-navigation.md`.
- Branch readability and evolution-item type-chip extensions are defined in `05-evolution-branch-readability-and-types.md`.

## User Value

The detail page turns a search result into a simple learning moment without forcing the child through dense data tables or complex navigation.

## Entry Points

- Tap on an entire result card.
- Press Enter on a focused result card.
- Open a direct deep link by Pokemon ID via `#/pokemon/:id`.

## Scope

- Dedicated detail page for one selected Pokemon
- Prominent hero area with artwork, German name, ID, and German type chips
- Curated key facts section
- Optional TCG cards section for German-language Pokemon cards when localized card data is available
- Evolution summary with stage-based visual navigation across the visible chain path
- Back action to the preserved search/results context
- Loading, error, and retry states for detail fetch
- Optional short German flavor text integrated into the hero when a clean German localized entry is available

## Primary Flow

1. User sees the results list.
2. User opens one result card.
3. The app navigates to the Pokemon detail view.
4. The app shows a loading shell or skeleton immediately.
5. Detail data resolves and the page renders the content.
6. The user first sees the hero with the short description, then the evolution summary, then the key facts, and finally an optional cards section when card data is available.
7. The user uses the back action and returns to the preserved search/results state.

## Navigation Rules

- Use a dedicated route/page for the detail view.
- Use the Pokemon ID in the URL hash, for example `#/pokemon/25`.
- Preserve search query and result-list state when the detail page was opened from search results.
- Return to the neutral search start state when the detail page was opened directly via deep link without prior search context.
- Keep one obvious back action at the top of the detail screen.
- Keep hash routing as the canonical strategy for GitHub Pages compatibility.

## Information Architecture

1. Hero summary
2. Evolution summary
3. Key facts
4. Optional cards gallery

## Hero Summary

Must show:

- official artwork
- German display name
- Pokemon number (`#001`)
- German type chips

May also show:

- one short German flavor text excerpt directly inside the hero card when a clean localized entry is available
- stage badge (`Basis`, `Phase 1`, `Phase 2`)

## Key Facts

Recommended attributes:

- height
- weight
- category/species label in German, if available

Presentation rules:

- Prefer plain-language labels in German.
- Avoid competitive or technical terminology when not necessary.
- Show facts as large cards or tiles, not as a dense table.

## Cards Gallery

- Place the cards section after key facts so the core Pokemon learning flow remains intact.
- Show the section only when German-language card data is available for the current Pokemon.
- Prefer German cards first when multiple localized card variants exist.
- Present cards as a horizontal, touch-friendly gallery with snap behavior rather than a dense list or table.
- Support opening one card into a focused fullscreen viewer without leaving the Pokemon detail page.
- Keep each card item visually focused on the real card artwork.
- Show only lightweight supporting metadata per card, such as localized card name, set name, and card number.
- Keep the section exploratory and collectible in tone, but visually subordinate to the hero and evolution summary.

Presentation rules:

- Do not introduce filters, tabs, or sort controls in the initial detail experience.
- Do not let card chrome or pagination UI compete with the Pokemon hero.
- Keep the section valuable even when only one or two cards are available.
- Avoid card layouts that require horizontal page scrolling outside the section itself.
- Prefer cards with a usable image before cards without one.
- Cards without images must still remain understandable and accessible instead of disappearing silently.

## Evolution Summary

- Show the current evolution stage label.
- Show the current Pokemon inside a compact stage board (`Basis`, `Phase 1`, `Phase 2`).
- Show every earlier stage in the same chain before the current Pokemon.
- Show every reachable later stage after the current Pokemon.
- Support direct navigation to every visible non-current evolution item.
- Keep the section simple and child-friendly; detailed behavior lives in `03-evolution-navigation.md`.

## States And Edge Cases

### Loading

- Show a skeleton layout matching hero and fact cards.
- Keep the back action visible.
- When the user switches between related Pokemon from within the detail page, keep the overall detail frame visually stable instead of replacing the whole page with a noticeably different-height loading shell.
- If the cards section is still loading after the Pokemon detail succeeds, show a local cards-section loading state instead of blocking the full page.

### Error

- Show a friendly German explanation.
- Keep a clear retry action.
- Keep a clear route back to the search/results screen.
- If card loading fails, contain the failure inside the cards section and keep the rest of the detail page usable.

### Not Found

- Show a dedicated not-found state when the route contains a Pokemon ID that cannot be resolved.
- Keep the back action available from the not-found state.

### Missing Data

- Hide unavailable optional sub-sections instead of showing raw placeholders.
- Keep the screen stable when one optional field is unavailable.
- Missing optional hero description must not cause the core hero identity block to noticeably jump between related Pokemon.
- If no German cards are available, replace the gallery with a quiet local empty state or hide the section according to the implementation choice documented for the feature.
- If a card entry has no image, keep the card available with a calm fallback treatment and place it after image-backed cards.

## UX/UI Handoff

### Detail Screen Composition

- Back action appears first and stays visually stable across loading, error, not-found, and success.
- The hero is the strongest section on the page.
- Supporting description appears inside the hero when available.
- Evolution appears before key facts.
- Cards appear after key facts when available.
- Each section should feel short enough to scan independently.

Implementation notes:

- The page should feel like entering one focused Pokemon mode, not like opening another generic stacked-card screen.
- The back action should remain clear but visually secondary to the hero once the content loads.
- The first viewport on iPad should prioritize back action, hero, and the beginning of evolution content before deeper facts.
- The cards section should feel like a discovery bonus lower in the reading flow, not like a second primary mode.

### Hero Visual Hierarchy

- Artwork is the dominant visual anchor.
- German name is the primary heading.
- `#ID` is clearly secondary to the name.
- Type chips and stage badge sit close to the identity block and support, rather than compete with, the title.
- The hero should feel like a mode switch away from result browsing toward one focused Pokemon.
- On tablet widths, the identity block should align from a stable top edge rather than vertically re-center based on text amount.
- A two-line hero description must keep the same reserved text area as a three-line hero description so the hero composition does not slide vertically between Pokemon.
- A related-Pokemon switch inside the detail flow must preserve the perceived hero structure as much as possible.

Implementation notes:

- Keep the artwork block visually generous and distinct from plain metadata containers.
- Group name, id, types, stage, and optional description tightly enough that they read as one identity cluster.
- The optional description must remain visibly subordinate to the name and artwork.
- Avoid adding extra labels, dividers, or badges that make the hero feel busier than the result cards.
- On iPad widths, use proportion and alignment to make the hero feel premium rather than simply wider.

### Key Facts Composition

- Facts are shown as large cards, never as a dense table.
- Facts must stay easy to scan on mobile and iPad without horizontal scrolling.
- The first fact group should remain visually compact and avoid overload.

Implementation notes:

- Limit the first fact group to a few high-value items only.
- Each fact card should expose one label and one strong value without secondary clutter.
- Fact cards should support the hero rather than rival it for attention.

### Cards Gallery Composition

- The cards section should read as a short gallery, not as a catalog-management surface.
- Real card imagery is the primary visual signal inside the section.
- On narrow widths, show one dominant card with a clear hint that more cards can be explored horizontally.
- On tablet widths, allow multiple cards to be visible at once while preserving a strong leading item.
- Keep motion subtle and allow reduced-motion users to explore the section without animated emphasis.
- Tapping a card should open a fullscreen card viewer layered over the detail page instead of navigating away.

Implementation notes:

- Prefer horizontal scroll with snap points over a heavy carousel framework.
- Any previous/next controls must remain touch-safe, keyboard-reachable, and visually secondary to the card artwork.
- Avoid pagination dots unless they materially improve orientation without adding noise.
- Keep per-card metadata short enough that card images remain the strongest repeated pattern.
- Inline gallery images should load lazily so the section can appear before every card image has downloaded.
- In the fullscreen viewer, support next/previous navigation with both explicit controls and horizontal swipe gestures on touch devices.
- A card without an image should still open in the fullscreen viewer with a strong metadata fallback rather than a broken zoom state.

### Optional Content Behavior

- Optional hero description and optional sections such as category disappear cleanly when data is missing.
- Missing optional data must not create awkward gaps or placeholder-heavy layouts.
- Flavor text is supporting reading content inside the hero, not a separate dominant section.
- The optional hero description should enrich the hero when present, but its absence must not move the main identity elements enough to feel like a layout jump.

Implementation notes:

- Missing optional content should collapse cleanly inside the existing section rather than insert fallback copy.
- Preserve the same overall hero frame even when optional content is unavailable.
- Optional content should never create the impression that the detail page is unfinished.

## Visual Acceptance Criteria

- Back action is visible first and remains stable across all main states.
- Detail hero clearly reads as the page focus.
- Artwork, German name, `#ID`, type chips, optional stage badge, and optional short description form one cohesive identity block.
- Key facts are rendered as cards and remain easy to scan.
- When present, the cards section is visually distinct from facts and reads as a lightweight gallery of real cards.
- The cards section opens a focused fullscreen card viewer that feels connected to the current detail page rather than like a route change.
- Optional sections disappear cleanly when data is unavailable.
- The detail page remains readable and touch-friendly on phone and iPad widths defined in `DESIGN_BRIEF.md`.
- Switching between related Pokemon from inside the detail page does not cause a full-page loading jump that breaks the user's spatial orientation.
- The hero identity block remains visually anchored even when the optional short description changes in length or disappears.
- The detail page feels more expressive and focused than the search/results screen without introducing extra features or denser navigation.
- The cards gallery remains clearly secondary to the hero and does not push the detail page toward a crowded collector dashboard.

## Acceptance Criteria

- The detail page opens from result-card tap and keyboard activation.
- Direct deep-link entry by Pokemon ID works.
- If the detail page was opened from search results, the back action returns the user to the preserved search query and results context.
- If the detail page was opened directly via deep link, the back action returns the user to the neutral search start state.
- The hero area shows artwork, German name, ID, and German type chips.
- When available, the short German flavor text appears inside the hero instead of as a separate later section.
- The evolution summary appears before the key facts section.
- The page exposes an evolution summary with the current stage and visual navigation for all visible chain items when available.
- When German card data is available, the page shows a cards gallery after the key facts section.
- The cards gallery presents localized card artwork and short supporting metadata in a horizontal touch-friendly format.
- Tapping a card opens a fullscreen viewer with clear close, previous, and next controls.
- The fullscreen viewer supports touch-friendly horizontal swipe navigation on iPad widths.
- Cards without a usable image appear after image-backed cards in the gallery and still expose a readable fallback in both gallery and fullscreen states.
- A cards-section loading or error state does not replace the full detail page state.
- The back action remains visible in loading, error, and not-found states.
- Loading, error, retry, not-found, and missing-data behavior are all present and distinguishable.
- Optional hero description and category are hidden completely when their required data is unavailable or not suitable for child-friendly display.
- The cards section hides cleanly or shows a calm local empty state when no suitable German cards are available for the current Pokemon.
- In-detail navigation between related Pokemon keeps the user inside one stable detail context without a jarring layout reset.
