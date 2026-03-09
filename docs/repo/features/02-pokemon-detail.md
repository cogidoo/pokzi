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
- Flip-ready artwork card inside the hero for a compact attack back side
- Curated key facts section
- Full attack list section at the bottom of the detail page
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
6. The user first sees the hero with the short description, then the evolution summary, then the key facts, and finally the full attack list.
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
4. Full attack list

## Hero Summary

Must show:

- official artwork
- German display name
- base HP (`KP`) close to the name when API stat data is available
- Pokemon number (`#001`)
- German type chips
- one visible flip hint inside the artwork card corner

When available, the artwork card may also reveal a back side with:

- `1` to `2` official attacks selected from Pokemon move data
- German attack names
- official attack damage strings when available, including variable values such as `40+` or `30x`
- German attack type labels
- a short German fallback message when no suitable attacks are available

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

## Full Attack List

- Show this section as the lowest tile in the detail flow.
- List all official attacks from Pokemon move data.
- Every attack row must show:
  - German attack name
  - short German attack description
  - German attack type
  - compact damage value (`{value}`) when a value exists
- If a move has no official damage value, hide the damage chip and keep the type chip visible.
- The damage value should be right-aligned in each row to support fast scanning, similar to `KP` chips in evolution items.
- Keep `KP` and `Schaden` visually distinct by using different chip colors.
- Keep the section card-based and scan-friendly on phone and iPad widths.
- The full attack section may load after the main detail shell and must not block hero, evolution, or fact rendering.

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

### Error

- Show a friendly German explanation.
- Keep a clear retry action.
- Keep a clear route back to the search/results screen.

### Not Found

- Show a dedicated not-found state when the route contains a Pokemon ID that cannot be resolved.
- Keep the back action available from the not-found state.

### Missing Data

- Hide unavailable optional sub-sections instead of showing raw placeholders.
- Keep the screen stable when one optional field is unavailable.
- Missing optional hero description must not cause the core hero identity block to noticeably jump between related Pokemon.
- If no suitable official attacks remain after filtering, keep the artwork-card back side usable and show a short German fallback message instead of leaving the surface empty.
- If only one suitable official attack remains after filtering, show exactly one attack item instead of filler content.
- If no official attacks are available for the full attack list section, show a short German empty message in that section.
- If one or more move endpoints fail while loading the full attack section, keep already loaded rows visible and show a section-level partial warning with retry action.

### Attack Back Side

- Only the artwork card flips; the rest of the hero stays visually stable.
- The entire artwork card is the tap target, not only the corner hint.
- The corner hint remains visible on both sides so the interaction stays discoverable.
- Prefer `2` attacks when possible; otherwise show `1`.
- Use only official attack data; do not invent attacks, effects, or damage values.
- Exclude attacks that do not expose an official damage value at all.
- Prefer earlier, simpler attacks over stronger later attacks when multiple suitable moves exist.
- For evolved Pokemon, prefer attacks that are not already shown by earlier visible evolution stages when suitable alternatives exist.
- Sort the visible attack rows by damage so the lighter shown attack appears first.
- Keep the attack back side limited to attack name, damage, and attack type.
- A faint Pokemon sprite may sit behind the attack list only when text contrast stays strong.

## UX/UI Handoff

### Detail Screen Composition

- Back action appears first and stays visually stable across loading, error, not-found, and success.
- The hero is the strongest section on the page.
- Supporting description appears inside the hero when available.
- Evolution appears before key facts.
- Each section should feel short enough to scan independently.

Implementation notes:

- The page should feel like entering one focused Pokemon mode, not like opening another generic stacked-card screen.
- The back action should remain clear but visually secondary to the hero once the content loads.
- The first viewport on iPad should prioritize back action, hero, and the beginning of evolution content before deeper facts.

### Hero Visual Hierarchy

- Artwork is the dominant visual anchor.
- German name is the primary heading.
- `#ID` is clearly secondary to the name.
- Type chips and stage badge sit close to the identity block and support, rather than compete with, the title.
- The hero should feel like a mode switch away from result browsing toward one focused Pokemon.
- The artwork card may add one compact, clearly functional flip affordance in the lower-right corner without making the hero feel busier.
- On tablet widths, the identity block should align from a stable top edge rather than vertically re-center based on text amount.
- A two-line hero description must keep the same reserved text area as a three-line hero description so the hero composition does not slide vertically between Pokemon.
- A related-Pokemon switch inside the detail flow must preserve the perceived hero structure as much as possible.

Implementation notes:

- Keep the artwork block visually generous and distinct from plain metadata containers.
- The artwork-card back side should feel like the same object, not a second nested card.
- Group name, id, types, stage, and optional description tightly enough that they read as one identity cluster.
- The optional description must remain visibly subordinate to the name and artwork.
- Avoid adding extra labels, dividers, or badges that make the hero feel busier than the result cards.
- On iPad widths, use proportion and alignment to make the hero feel premium rather than simply wider.
- The corner affordance must look intentionally interactive and remain understandable without extra helper text on the front side.
- On the back side, prioritize large readable attack rows over decorative card chrome.

### Key Facts Composition

- Facts are shown as large cards, never as a dense table.
- Facts must stay easy to scan on mobile and iPad without horizontal scrolling.
- The first fact group should remain visually compact and avoid overload.

Implementation notes:

- Limit the first fact group to a few high-value items only.
- Each fact card should expose one label and one strong value without secondary clutter.
- Fact cards should support the hero rather than rival it for attention.

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
- The artwork card can flip between artwork and attack back side without moving the surrounding hero structure.
- Key facts are rendered as cards and remain easy to scan.
- The full attack list is shown as the lowest detail section and remains readable on phone and iPad widths.
- Every attack row in the full list keeps a short description visible.
- The full attack list can show a loading, partial, or retry state without blocking the rest of the detail page.
- Optional sections disappear cleanly when data is unavailable.
- The detail page remains readable and touch-friendly on phone and iPad widths defined in `DESIGN_BRIEF.md`.
- Switching between related Pokemon from inside the detail page does not cause a full-page loading jump that breaks the user's spatial orientation.
- The hero identity block remains visually anchored even when the optional short description changes in length or disappears.
- The detail page feels more expressive and focused than the search/results screen without introducing extra features or denser navigation.

## Acceptance Criteria

- The detail page opens from result-card tap and keyboard activation.
- Direct deep-link entry by Pokemon ID works.
- If the detail page was opened from search results, the back action returns the user to the preserved search query and results context.
- If the detail page was opened directly via deep link, the back action returns the user to the neutral search start state.
- The hero area shows artwork, German name, ID, and German type chips.
- The artwork card is tappable across its full surface and exposes a visible flip hint in the lower-right corner.
- The artwork card flips to a back side with `1` to `2` official attacks when the user taps it.
- Attack rows show German attack name, official damage value, and German attack type.
- Attack selection prefers earlier, simpler official attacks with a damage value; attacks without any official damage value are excluded.
- For evolved Pokemon, attack selection prefers non-duplicate attacks compared with earlier visible stages when the official data allows it.
- If an evolved Pokemon only has one non-duplicate suitable attack, show that one attack instead of filling the second slot with a duplicate from an earlier stage.
- When two attacks are visible, the lower-damage attack is shown first.
- If only one suitable official attack exists, the back side shows one attack.
- If no suitable official attacks exist, the back side shows a short German fallback message.
- When available, `KP` is visible directly near the hero identity name.
- When available, the short German flavor text appears inside the hero instead of as a separate later section.
- The evolution summary appears before the key facts section.
- The page exposes an evolution summary with the current stage and visual navigation for all visible chain items when available.
- The page exposes a bottom section `Alle Angriffe` with all official attacks of the selected Pokemon.
- Each attack row in that section shows German name, a short German description, German type, and a compact `{damage}` chip only when an official damage value exists.
- Damage labels are right-aligned inside each row.
- Damage and `KP` chips use different colors.
- The full attack section loads independently and must not delay the first successful detail render.
- If the full attack section only loads partially, the UI keeps visible rows and shows a retry action.
- The back action remains visible in loading, error, and not-found states.
- Loading, error, retry, not-found, and missing-data behavior are all present and distinguishable.
- Optional hero description and category are hidden completely when their required data is unavailable or not suitable for child-friendly display.
- In-detail navigation between related Pokemon keeps the user inside one stable detail context without a jarring layout reset.
