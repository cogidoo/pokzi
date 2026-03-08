# Evolution Branch Readability And Types

## Goal

Children can understand branching evolutions at a glance and use German type chips plus clear `KP` on each visible evolution item for faster orientation.

## Design Reference

- Global UI rules, tokens, accessibility, motion, and responsive behavior live in `DESIGN_BRIEF.md`.
- This feature extends evolution-navigation behavior from `03-evolution-navigation.md`.
- This feature remains inside the detail-page context defined in `02-pokemon-detail.md`.

## User Value

The evolution section stays easy to scan on iPad even when chains branch, and children can compare visible stages faster using familiar German type labels.

## Scope

- Clear branch-readable composition for visible evolution paths in detail view
- One persistent stage board (`Basis`, `Phase 1`, `Phase 2`) that keeps order obvious
- Branch groups for reachable later evolution options when multiple paths exist
- German type chips on each evolution item (`1-2` chips)
- Base HP (`KP`) on each evolution item when API stat data is available
- Stable tap navigation behavior for every visible non-current evolution item

## Non-Scope

- graph connectors or full tree-visualization UIs
- technical evolution conditions (level, item, time, friendship)
- new filters, tabs, or expanded encyclopedia content
- clickable type chips or type-based navigation

## Entry Points

- Any Pokemon detail page that has at least one evolution relation
- Any in-detail evolution navigation jump to another related Pokemon

## Primary Flow

1. User opens a Pokemon detail page with evolution data.
2. App shows one ordered evolution summary with a clear stage board and the current evolution stage label.
3. If later branches exist, app shows all reachable options in grouped, readable order based on the PokeAPI evolution-chain order.
4. Each visible evolution item shows image, German name, and German type chips.
5. Each visible evolution item also shows `KP`, when available from API stat data.
6. User taps any non-current evolution item and opens that Pokemon detail page in the same detail context.

## Interaction Rules

- Keep chronological order explicit: earlier stages first, then current, then reachable later stages.
- Keep one visually clear shared path from earliest visible stage to the current Pokemon.
- Show later branching options as grouped follow-up blocks tied to the branching point.
- Keep directional hints subtle and calm; no heavy connector graphics.
- Keep branch-group order stable by following the PokeAPI `evolves_to` array order of the branching node.
- Keep the order inside each branch chronological from the nearest later stage to deeper later stages.
- Keep all visible non-current evolution items as full-tile tap targets.
- Current Pokemon remains highlighted and not tappable.
- Type chips are informational only and never interactive.
- Show at most `2` type chips per evolution item.
- Show `KP` only when a valid API value exists; do not invent fallback values.
- Do not introduce horizontal scrolling for the evolution section on `320-1024px`.
- Preserve the existing detail-page back-navigation rules after one or multiple in-detail evolution jumps.

## Content And Language Rules

- Evolution item names use German Pokemon names.
- Evolution item type chips use German type labels.
- Evolution item `KP` label stays short and child-friendly (`KP` + clear number).
- All supporting copy remains German and short.
- Keep type-chip emphasis secondary to image and name.

## States And Edge Cases

### Neutral

- Hide the full evolution summary when no evolution relation exists.

### Loading

- Keep section structure stable while loading related detail data after an evolution tap.
- Avoid layout resets that break spatial orientation.

### Success

- Show shared path plus branch groups in one readable, ordered section.
- Keep the current evolution stage label visible as part of the evolution summary.
- Show German type chips for each evolution item when type data is available.

### Empty Or No Results

- No dedicated empty state inside this feature beyond hidden section behavior.

### Error

- If evolution-specific data fails while core detail succeeds, keep detail page usable and hide evolution section.

### Missing Data

- Missing image: keep item visible and tappable with name and available types.
- Missing type data: keep item visible and tappable without type chips.
- Long German names: keep readable wrapping/truncation without breaking order cues.

## UX/UI Handoff

### Evolution Section Composition

- The section appears as one compact card-like block below the hero and before the key facts.
- The block reads in three clear layers: section header, stage board, optional branch groups.
- The stage board remains the visual spine of the section and always includes the current Pokemon.
- Later branch options appear only after the shared path, never mixed back into earlier stages.
- Branch groups must feel connected to the branching point without turning into a graph view.

Implementation notes:

- Treat the section as one ordered reading surface, not as a grid of equal cards.
- Keep the strongest contrast and spacing around the shared path so it stays readable first.
- Branch groups should feel like follow-up choices from the current path, not like a separate gallery.
- On iPad widths, improve alignment and grouping inside the section before increasing the number of columns.

### Shared Path Layout

- Earlier stages, current Pokemon, and the branch origin remain visible in one obvious chronological line or stacked flow.
- The current Pokemon tile is the clearest visual anchor inside the shared path.
- Progression cues between shared-path items should be lightweight and readable without decorative connector graphics.
- If the path wraps on smaller widths, the order must still read top-to-bottom without ambiguity.

Implementation notes:

- Use spacing, subtle directional separators, and grouping to communicate order.
- Avoid strong arrows, heavy lines, or game-like progression chrome.
- Keep the current tile visually calm but unmistakably active through border, surface, and elevation changes.

### Branch Group Layout

- Each later branch group starts with the first branching evolution tile, followed by any deeper reachable stages in that same branch.
- Multiple branch groups stack vertically on narrow widths and may use a simple internal two-column rhythm only on tablet widths when chronology stays obvious.
- Branch group labels, if used, stay short and supportive in German; they must not introduce technical evolution language.
- The order of branch groups follows the source data order and must stay visually stable between renders.

Implementation notes:

- Use one subtle group container per branch to show belonging.
- Keep branch groups visually lighter than the shared path so the section still reads as one journey first.
- Do not use mirrored layouts that make branch order feel interchangeable.

### Evolution Item Anatomy

- Each item shows artwork, German display name, a compact `KP` badge when available, and up to `2` German type chips.
- The current item may also show the stage emphasis most clearly, but stage context must remain understandable across the full section.
- Non-current items behave like tiles, not like primary buttons.
- Type chips stay compact, visually secondary, and aligned as one metadata row beneath the name.
- `KP` should be visible near the name as an immediate orientation cue.

Implementation notes:

- Keep image recognition primary, then name, then types.
- Long names may wrap to a second line, but the tile height should remain controlled.
- Missing artwork should preserve the same tile shell so the section rhythm does not break.

### Interaction And Feedback

- Every non-current tile is a full tap target with clear pressed feedback.
- Hover states may exist on pointer devices but must remain secondary to touch feedback.
- Keyboard focus must outline the full tile clearly without relying on color alone.
- Tapping a branch option should preserve the section frame and overall detail-page orientation while content refreshes.

Implementation notes:

- Use gentle press feedback instead of CTA-style animation.
- Keep loading transitions inside the existing section frame whenever possible.
- Avoid collapsing and rebuilding the whole evolution block during in-detail navigation.

### Copy And Section Labels

- Section heading should stay short and child-friendly in German, for example `Entwicklung`.
- Support labels should clarify current context, not explain mechanics.
- Avoid technical labels for branch logic, requirements, or hidden stats.

Implementation notes:

- If a supporting label is needed for the active tile, prefer plain wording such as `Aktuell`.
- If a supporting label is needed for later options, prefer neutral wording that reads as orientation, not instruction.

## Visual Acceptance Criteria

- The evolution summary reads as one ordered section with a dominant shared path and clearly subordinate branch groups.
- The current Pokemon is the strongest visual anchor inside the section without overpowering the page hero.
- Every visible evolution item shows German name and, when available, German type chips and `KP` in a stable compact layout.
- Multiple later branches remain understandable on `320-1024px` without horizontal scrolling or graph-like connectors.
- Non-current items are obviously tappable, while the current item is clearly inactive.
- In-detail navigation through evolution items preserves spatial orientation through stable section framing and non-jarring loading behavior.

## Acceptance Criteria

- Branching evolution paths are displayed in a way that preserves one clear shared path plus grouped later options.
- Multiple later branch groups follow the PokeAPI evolution-chain order; the UI does not re-sort them alphabetically or by Dex number.
- All visible reachable later stages remain visible; no branch is reduced to direct-neighbor-only output.
- Every visible non-current evolution item can be opened directly from the section.
- The current Pokemon is clearly highlighted and not tappable.
- Each visible evolution item renders German type chips when type data exists.
- Each visible evolution item renders `KP` when base HP data exists.
- Type chips remain informational and non-interactive.
- The current evolution stage label remains visible in the evolution summary.
- Evolution section remains readable and touch-safe on `320-1024px` without horizontal scrolling.
- After one or multiple evolution jumps inside detail view, the back action still follows the existing rules from `02-pokemon-detail.md`.
- In-detail evolution navigation keeps the user in one stable detail context without jarring full-layout resets.

## Open Questions

- None.

## Documentation Impact Check

- Updated `docs/repo/features/03-evolution-navigation.md` to reference this extension feature.
- Updated `docs/repo/features/02-pokemon-detail.md` to align detail-level evolution references with this feature.
- Updated `docs/repo/README.md` to register this feature document.
- Updated `docs/repo/current-state.md` to include branch-readable evolution summary and per-item type chips.
- Updated `CONCEPT.md` and `README.md` to align top-level repo direction summaries.
- Updated `DESIGN_BRIEF.md` to define evolution-item type-chip composition guidance.
