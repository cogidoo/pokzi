# Evolution Navigation

## Goal

Children can understand a Pokemon's place in its evolution path and jump directly to any visible earlier or later evolution stage from the detail page.

## Design Reference

- Global UI rules, tokens, accessibility, motion, and responsive behavior live in `DESIGN_BRIEF.md`.
- This feature document defines only the evolution-navigation-specific composition and visual acceptance for feature `03`.
- This feature extends the detail page described in `02-pokemon-detail.md`.
- Branch readability refinements and evolution-item type chips are defined in `05-evolution-branch-readability-and-types.md`.

## User Value

The user sees the evolution path as a simple visual sequence instead of plain text and can open any visible earlier or later stage without going back to search.

## Scope

- Stage-based evolution board inside the Pokemon detail page
- Evolution items with official artwork and German display names
- Clear highlight for the currently open Pokemon
- Direct navigation from evolution items to the tapped Pokemon detail page
- Simple handling for complete visible evolution paths, including later branching options
- Baseline navigation behavior for evolution items; branch-readability and type-chip extensions are handled in feature `05`

## Non-Scope

- Full-screen evolution explorer
- Graph-like trees with complex connector lines
- Technical evolution conditions such as level, item, time, or friendship
- Graph-like exploration outside the visible chain structure

## Entry Points

- Open any Pokemon detail page from search results
- Open any Pokemon detail page through a direct hash deep link

## Primary Flow

1. User opens a Pokemon detail page.
2. The page shows a compact stage board with images and German names.
3. The current Pokemon is visibly highlighted inside the sequence.
4. The user taps any earlier or later evolution item.
5. The app opens the tapped Pokemon detail page immediately.

## Interaction Rules

- Show the evolution section only when at least one evolution relation is available.
- Render each evolution item as one clear tap target containing image and German name.
- The currently open Pokemon is not a navigation target; it is highlighted as the active item.
- Earlier stages appear before the current Pokemon in chronological chain order.
- Later stages appear after the current Pokemon in chronological chain order.
- When later evolutions branch, show all reachable later options without hiding deeper stages behind the first next step.
- Tapping a different evolution item must navigate with the same hash-route detail behavior used elsewhere in the app.
- Back navigation after jumping through evolution items must remain stable and predictable within the existing detail-view rules.
- Switching through evolution items should feel like moving within one persistent detail mode, not like opening a fully new page with a reset layout every time.

## Content And Language Rules

- Use German Pokemon names as the primary labels.
- Use official artwork when available for every visible evolution item.
- Keep labels short and avoid explanatory battle or breeding terms.
- Keep all visible UI copy in German.

## States And Edge Cases

### Neutral

- When the Pokemon has no earlier or later evolution, hide the evolution navigation section completely.

### Loading

- The detail page may reserve space with a simple placeholder while evolution data is resolving.
- When the user taps another evolution item, loading treatment should preserve the surrounding detail structure as much as possible to avoid visible jumping.

### Success

- Show a compact, easy-to-scan sequence with the current Pokemon and all visible earlier and later stages.

### Empty Or No Results

- This state does not apply as a separate section; the feature lives inside the detail page.

### Error

- If evolution data fails while core detail data succeeds, hide the evolution navigation section and keep the rest of the detail page usable.

### Missing Data

- If artwork for one evolution item is unavailable, keep the item navigable with the German name.
- If later branches exist, show all reachable later stages in a readable order.
- If a previous stage chain has multiple earlier stages, keep the display compact and ordered from earliest visible stage to current Pokemon.

## UX/UI Handoff

### Evolution Section Composition

- The section only appears when at least one evolution relation exists.
- Linear chains should read through a clear stage order (`Basis` -> `Phase 1` -> `Phase 2`).
- The section should stay compact enough to scan in one glance on iPad landscape.
- Use subtle directional hints (for example lightweight arrows) between stage areas.
- The composition should preserve chronological readability even when the visible chain contains more than three items or later branches.

Implementation notes:

- The evolution section should read as one ordered journey, not as a bag of related cards.
- Spacing and grouping should help the user understand order even when connector graphics are absent.
- On iPad widths, use layout quality to improve readability, but keep the section clearly subordinate to the hero.

### Evolution Item Hierarchy

- Each visible evolution item includes artwork and German name.
- The current Pokemon is clearly highlighted through border, background, and/or elevation difference.
- The current Pokemon is not tappable.
- Previous and next evolution items must look tappable without looking like the page's main CTA.
- The current item highlight should remain calm and should not be the only cue; ordering and grouping must also make the chain understandable.

Implementation notes:

- The current item should feel anchored and selected, not louder than the rest of the page.
- Non-current items should communicate tap affordance through shape, contrast, and pressed feedback rather than button-like loudness.
- Artwork should remain the quickest recognition aid inside each evolution item.

### Linear And Branching Layout

- A linear chain should appear as one compact stage progression.
- The ordered sequence must include all visible earlier and later stages for the current path.
- Later branches may wrap into simple stacked groups when needed, but deeper reachable stages must remain visible.
- No graph-like connectors, technical conditions, or tree-explorer patterns should appear.
- Do not force the sequence into a fixed three-column arrangement when that weakens the reading order of longer visible paths.
- If wrapping is needed, the continuation must still read as one ordered chain, not as unrelated tiles.

Implementation notes:

- Use wrapping only when needed for readability, not as the default tablet treatment.
- If multiple later stages branch, keep their grouping visually tied to the point in the sequence where the branch begins.
- Avoid symmetric gallery layouts that make chronological order ambiguous.

### Missing Data Behavior

- If one evolution item lacks artwork, keep the tile navigable with the German name.
- Reduced data should lower visual richness, not break the section structure.

## Visual Acceptance Criteria

- Evolution section is hidden completely when no relation exists.
- Linear evolution displays as one compact visual sequence, not as body text.
- Each visible evolution item includes artwork and German name when available.
- The current Pokemon is clearly highlighted and is not tappable.
- Earlier and later items remain touch-safe on mobile and iPad widths defined in `DESIGN_BRIEF.md`.
- Multiple later stages remain readable without collapsing the sequence to direct neighbors only.
- The section avoids graph-like connectors and technical evolution explanations.
- Tapping through visible evolution items preserves spatial orientation and does not introduce a jarring full-detail layout reset between items.
- The section reads as a compact ordered path first and as a set of tappable items second.

## Acceptance Criteria

- A Pokemon detail page with evolution relations shows a visual evolution section with image and German name for each visible item in the available chain path.
- The current Pokemon is clearly highlighted in the evolution section.
- Tapping any visible earlier or later evolution item opens that Pokemon's detail page directly.
- A basis Pokemon with a multi-stage linear chain shows all later stages, not only the direct next stage.
- Multiple later evolutions are shown without a branching graph and without hiding deeper reachable stages.
- When no evolution relation exists, the section is hidden completely.
- If evolution-specific data fails but the main detail page still loads, the detail page remains usable without the evolution navigation section.

## Open Questions

- None. The ordered sequence must stay complete and readable even when later evolutions branch.

## Documentation Impact Check

- Updated `README.md` to reflect the visual evolution summary in the user-facing app description.
- Updated `CONCEPT.md` to include a simple visual evolution chain in the repo direction overview.
- Updated `DESIGN_BRIEF.md` to define the visual treatment for the evolution summary component.
- Updated `docs/repo/README.md` to list this feature document alongside the existing feature docs.
- Updated `docs/repo/current-state.md` to mark a simple visual evolution chain as in scope while keeping graph-like evolution trees out of scope.
- Updated `docs/repo/features/02-pokemon-detail.md` to align the detail-page concept with this feature.
