# Design Brief

## Repo Direction

Fresh, clean, and child-friendly Pokemon discovery experience for iPad.

## Scope Boundary

This document defines visual/UI design only.
Repo behavior (search logic, matching rules, navigation semantics, data semantics) is defined in `docs/repo/*`.
All user-facing copy language is German and must remain German in UI implementation.

## Document Relationship

- Use this document for cross-feature UI rules, reusable component standards, responsive behavior, accessibility, and overall visual language.
- Use `docs/repo/features/01-search-and-results.md` for search/result-specific screen composition and UI acceptance.
- Use `docs/repo/features/02-pokemon-detail.md` for detail-screen-specific hierarchy and UI acceptance.
- Use `docs/repo/features/03-evolution-navigation.md` for evolution-navigation-specific composition and UI acceptance.
- Feature documents should reference this brief for global rules instead of duplicating token, accessibility, motion, or generic state guidance.

## Experience Principles

1. Clarity over decoration.
2. Touch confidence over density.
3. Playful tone without visual noise.
4. Fast feedback for every action.
5. One strong focus per screen.

## UI Direction Refinement

The current UI direction should not drift toward a generic utility search tool.
It should feel like a focused Pokemon discovery surface for children on iPad.

This means:

- keep the current scope small and obvious
- increase visual identity through composition, scale, and emphasis rather than extra features
- make the most important content recognizable in one glance
- use stronger hierarchy before adding more metadata
- treat iPad widths as a chance to improve composition, not merely enlarge mobile blocks

Do not introduce:

- extra filters, tabs, segmented controls, or settings surfaces
- decorative illustrations that compete with Pokemon artwork
- dense encyclopedic data groupings
- trend-driven effects that reduce readability or touch confidence

## Layout

- Mobile/tablet first.
- Single column.
- Sticky top search area on search/results screen.
- Content width capped for readability.
- Detail screen should feel like a clear mode switch from browsing to exploring.
- Internal sub-grids are allowed inside a screen section when they improve scanability on iPad, but the page itself must still read as one primary column.

Implementation guidance:

- Treat the page as one strong reading rail from top to bottom.
- Use section spacing to signal hierarchy before using more borders or more labels.
- Prefer one strong card per semantic block instead of many visually similar boxes competing at once.
- On tablet widths, use the extra width to improve proportion, alignment, and grouping inside sections.
- Avoid layouts where every block has identical visual weight.

Recommended sizing:

- Max content width: `760px`
- Side padding: `20px`
- Vertical section gap: `20-24px`

## Responsive Behavior

### `320-559px`

- Keep the full app in one strict column.
- Search input and search button stack vertically.
- Result cards use a compact media/object layout with image left, content right.
- Fact cards stay one per row.
- Evolution items stay one per row on narrow widths so the full chain remains easy to scan.

### `560-767px`

- Keep the page single-column.
- Search input and search button may sit in one row.
- Result cards stay stacked, but image size and inner spacing can increase slightly.
- Fact cards may move to `2` columns only if each card still feels large and touch-safe.

### `768-1024px`

- Keep one primary reading column centered on the page.
- Search stays sticky and should remain visible without covering more than the top utility area.
- Detail hero can switch to a two-column internal layout: artwork block + text/meta block.
- Key facts can use a `2`-column internal grid.
- Evolution summary should favor one ordered sequence that can wrap into stacked rows without losing the chronological chain order.

Implementation guidance for tablet widths:

- Search/results screen should feel denser in quality, not denser in content.
- Increase visual rhythm through stronger image-to-text proportion and cleaner alignment.
- Preserve one-column page flow even when internal sections use two columns.
- Avoid "stretched mobile" layouts where controls and content simply become wider without clearer hierarchy.

### iPad Landscape Priority

- On a typical iPad landscape viewport, the user should see the page title/search area and at least the first result card without crowding.
- On detail pages, the user should see back action, hero, and the start of the evolution summary above the fold when content is available.
- Do not create layouts that require horizontal scrolling.
- Avoid overly tall hero blocks that push all meaningful facts below the fold.

## Design Tokens

### Colors

- `--bg`: `#F7FAFC`
- `--surface`: `#FFFFFF`
- `--surface-soft`: `#EEF4FF`
- `--text`: `#152238`
- `--text-muted`: `#4A607A`
- `--primary`: `#1E66F5`
- `--primary-press`: `#174FC2`
- `--accent`: `#FFB703`
- `--success`: `#19A974`
- `--error`: `#D64545`
- `--border`: `#D6E0F0`

Usage rules:

- Use primary for actions, accent sparingly for highlights.
- Keep high contrast for text and controls.
- Avoid large saturated color blocks behind text.

### Typography

- Font stack: `"Atkinson Hyperlegible", "Nunito", "Inter", sans-serif`
- Base size: `18px`
- `h1`: `34px`, `700`, line-height `1.15`
- `h2`: `26px`, `700`, line-height `1.2`
- Body: `18px`, `500`, line-height `1.45`
- Small/support: `16px`, `500`

Implementation guidance:

- Use larger size jumps between heading, title, body, and support text than in a generic form app.
- The screen title and Pokemon names should feel immediately scannable from arm's length on iPad.
- Support text must stay clearly subordinate; do not let helper copy visually compete with headings or names.
- Avoid using all-caps except for very short supporting labels.

### Spacing and Radius

- Spacing scale: `8, 12, 16, 20, 24, 32`
- Card radius: `18px`
- Input/button radius: `14px`
- Chip radius: `999px`

### Elevation

- Card shadow: `0 6px 18px rgba(21,34,56,0.08)`
- Hover/focus elevation can increase slightly, no dramatic motion.

Implementation guidance:

- Use elevation to clarify interactivity and hierarchy, not to decorate every block equally.
- Search surface, result cards, and detail hero may share one family resemblance, but the detail hero should still feel like the dominant object on the page.
- Static informational sections should rely more on spacing and contrast than on stronger shadows.

## Touch and Accessibility

- Minimum tap target: `48x48px`
- Preferred button height: `56px`
- Minimum spacing between interactive elements: `12px`
- Visible focus style for keyboard/switch input.
- Respect `prefers-reduced-motion`.

## Screen Patterns

### Search And Results Screen

- Large headline + search area
- Results as clear stacked cards
- Search context stays visible while browsing the list

### Detail Screen

- Dedicated top back action
- Large hero block at the top
- Short, scan-friendly sections
- Avoid long uninterrupted text
- Keep important facts above the fold on iPad portrait
- Keep the overall detail frame visually stable during in-detail navigation and loading refreshes

## Components

### Search Bar

- Large input with clear examples from the relevant repo docs
- Search button visible and easy to hit
- Input + button both `56px` height
- Optional clear button inside input

Anatomy:

- Label
- Input field
- Optional inline clear action
- Primary search button
- Helper text in neutral start state

Interaction rules:

- Neutral start may show the full helper text.
- Once the user starts interacting or results are visible, the search area may compact slightly, but label, field, and submit action must remain obvious.
- Clear action must not overlap typed content.
- Sticky behavior must feel stable, not jumpy.

Implementation guidance:

- Prefer `type="search"` semantics and a search-oriented keyboard/input experience when possible.
- The full search area should read as one primary interaction zone, not as separate unrelated controls.
- In compact mode, reduce explanatory chrome before reducing the perceived importance of the search field.
- Keep the search field visually stronger than the submit button; the button supports confidence, but the field remains the main control.
- Placeholder text should stay short enough to scan instantly.
- The clear action should look secondary but still touch-safe and obvious for children.
- Do not add autocomplete dropdowns or suggestion pills unless repo scope expands explicitly.

### Result Card

- Prominent artwork
- Large display name line
- `#ID`
- Type chips (German labels)

Card behavior:

- Entire card acts as one tap target
- Gentle pressed feedback (scale 0.99 + shadow reduction)
- Keep card height consistent
- Visual affordance should suggest "tap for more"

Anatomy:

- Artwork
- German display name
- `#ID`
- Evolution stage chip
- Type chips

Layout rules:

- Name and ID share the top line when space allows.
- Metadata should remain visually subordinate to the name.
- Do not add secondary paragraphs or technical data to the card.
- Keep card rhythm consistent across the list.

Implementation guidance:

- The artwork and German display name should be the first two things recognized in under one second.
- The image area should feel generous enough to create recognition, not like a small thumbnail attached to metadata.
- `#ID`, stage, and type chips should support recognition but never overpower the name.
- Keep metadata grouped so the card does not read as five unrelated elements.
- If the card gains visual emphasis on interaction, prefer subtle scale/shadow changes and background contrast rather than large movement.
- On iPad widths, improve proportions and whitespace before adding more card content.

### Detail Hero

- Artwork is the dominant visual anchor
- German Pokemon name is the main heading
- Number and type chips grouped tightly below title
- Optional stage badge can sit beside the title or chips
- Optional short description can sit inside the hero below the identity block

Anatomy:

- Back action above hero
- Artwork block
- Name
- `#ID`
- Type chips
- Stage badge
- Optional short description

Layout rules:

- On smaller screens, artwork sits above meta.
- On iPad widths, artwork may sit left of the text block.
- The hero should feel like a mode switch from list browsing to one focused subject.
- The stage badge should support the hierarchy, not compete with the name.
- The optional short description should support the hero without making it feel text-heavy.
- Hero content should align from a stable top edge on tablet widths; avoid vertical re-centering that makes the identity block jump when description length changes.
- Reserve the same vertical space for up to three lines of hero description on all breakpoints so a two-line excerpt does not shift the artwork or identity block lower than a three-line excerpt.
- The hero should preserve a stable perceived structure when moving between related Pokemon in the detail flow.

Implementation guidance:

- The hero should feel more special than a regular content card.
- Keep artwork, name, id, types, stage, and optional description as one tightly related identity cluster.
- The name and artwork together should carry most of the hero's personality; supporting metadata should stay calm.
- Use spacing and proportion to create emphasis before using stronger colors.
- The optional description must read like a short supporting caption, not like the start of a long article.
- When related Pokemon are opened from the evolution section, preserve the same hero frame, alignment, and approximate visual rhythm.

### State Surfaces

Global guidance for idle, loading, invalid, empty, not-found, and error states:

- Keep the structural container stable across states.
- Vary iconography, copy, tint, and emphasis carefully so states are distinguishable without feeling like unrelated screens.
- Neutral and invalid states should feel calm and helpful, not alarming.
- Error states may use warmer tinting, but avoid harsh warning-page styling.
- Loading states should preserve page rhythm and likely content positions whenever possible.

### Motion

- Motion should reinforce orientation, not decorate transitions.
- Pressed states may use very small scale reduction and shadow decrease.
- Sticky search transitions should feel calm and mechanically stable.
- In-detail navigation should preserve the detail frame and avoid a full-layout reset sensation.
- Respect `prefers-reduced-motion` with non-essential motion removed.

Implementation guidance:

- Prefer 120-180ms transitions for simple emphasis changes.
- Prefer opacity/transform changes over layout-shifting animations.
- Do not animate large blocks vertically in a way that changes reading position.

### Fact Card

- Use large, friendly cards for key facts like height and weight
- Label should be short and clear
- Value should be visually prominent

Layout rules:

- Facts are always shown as cards, never as a table.
- Labels stay short and plain-language.
- Values are the visual focus.
- Avoid more than `3` fact cards in the first fact group.

### Evolution Summary

- Keep it simple and readable
- Prefer a compact visual sequence over a technical graph
- Show artwork and German names for all visible evolution items in the current chain path
- Highlight the current Pokemon clearly inside the sequence
- For branching evolutions, keep the shared earlier path inline and show all reachable later options in reading order without connector lines

Anatomy:

- Section title
- Optional short supporting sentence
- Ordered chain containing every earlier stage, the current Pokemon, and every reachable later stage in the active path
- Additional stacked branch groups only when multiple later evolutions exist

Layout rules:

- Each evolution item should contain artwork and German name.
- Current Pokemon must be visibly active and not tappable.
- Other evolution items must read as tappable cards or tiles, not plain text links.
- Use simple directional cues through spacing and ordering, not diagram connectors.
- The full sequence must stay understandable when it contains more than three stages.
- When a visible chain no longer fits as one simple row, wrap or group it in a way that preserves chronological reading order.
- Do not force a fixed desktop column count if that makes longer visible chains or later branches feel arbitrary.

Sizing guidance:

- Evolution item image target: `72-88px`
- Evolution item min tap height: `88px`
- Name max: `2` lines before truncation or wrapping strategy is needed
- Keep the full section compact enough that it feels like one scan unit

### Status State

- Use one calm, reusable state card pattern for neutral, invalid, loading, no-results, not-found, and error states.
- Keep title, message, and optional action vertically stacked.
- Use the same structural pattern across states so only meaning changes, not layout logic.

### Type Chips

- Rounded chips with soft tinted backgrounds
- Minimum chip height: `36px`
- Clear text contrast

Usage rules:

- Type chips are informational, not clickable.
- Stage chips may use stronger semantic tinting than type chips.
- Color should support recognition, never become the only carrier of meaning.

## States (Visual)

### Loading

- Search: skeleton cards (2-4 placeholders) or subtle spinner + label
- Detail: skeleton hero + 2-3 fact cards + evolution placeholder
- In-detail navigation loading should prefer stable content replacement over a full-screen structural jump when the user stays inside the same detail mode

### Empty / No Results / Error

- Distinct visual treatment
- Short, friendly copy
- Retry action in error state

### Tolerant-Only Search Hint

- When search results are based only on tolerant-name matching, show one short refinement hint above the result list.
- Keep the hint in the neutral/supportive state family, not in warning/error styling.
- Use concise German wording and keep the result-card layout unchanged.

### State Specs

- Neutral start:
  - Calm helper card below search
  - No warning color
  - No primary CTA beyond the visible search action
- Invalid query:
  - Same structural card as neutral state
  - Guidance tone, not failure tone
  - No error-red treatment
- Loading:
  - Keep layout height stable
  - Prefer skeletons where the destination structure is already known
  - Keep search and back actions available
  - Avoid replacing an already visible detail layout with a substantially taller or shorter loading shell during in-detail navigation
- No results:
  - Friendly dead-end handling
  - Encourage immediate refinement
  - No alarming visual treatment
- Tolerant-only success:
  - Show one short refinement hint between sticky search and first result card
  - Keep the hint visually lighter than error/no-results states
  - Preserve quick first-result visibility on iPad landscape
- Error:
  - Stronger contrast than neutral/no-results
  - Include one clear retry action
  - Avoid technical wording
- Not found:
  - Treat separately from generic errors
  - Keep route back obvious
- Success:
  - Remove unnecessary helper noise
  - Preserve context so the user can continue scanning or refining

## Interaction States

- `default`: calm surface, clear border, readable contrast
- `pressed`: slight scale/shadow reduction only
- `focus-visible`: strong accent outline with no ambiguity
- `disabled`: still readable, clearly inactive, never low-contrast to the point of looking broken
- `active-current-item`: reserved for currently open Pokemon in evolution context

## Content Rules For Children

- Prefer short, concrete German labels.
- Put image and name before explanation text.
- Avoid large uninterrupted paragraphs.
- Keep one primary action per section whenever possible.
- Do not introduce technical Pokemon mechanics unless the feature explicitly requires them.
- Supporting text should explain or reassure, not lecture.
- If a section works without text, prefer less text.

## Motion

- Keep motion short and meaningful (`120-180ms`)
- Use only opacity/translate/scale micro-transitions
- Screen transition to detail should feel calm and direct, not playful or bouncy
- Disable non-essential animation for reduced-motion users

## Implementation Notes

- Keep design tokens in `src/styles/tokens.css`.
- Build reusable primitives: `SearchBar`, `ResultCard`, `StatusState`.
- Add detail-specific primitives only when reuse is weak; likely candidates: `DetailHero`, `FactGrid`, `EvolutionSummary`.
- Test on iPad viewport first, then mobile phone, then desktop.
- When implementing feature `03`, treat `EvolutionSummary` as a dedicated component with explicit active, navigable, hidden, and branching states.
