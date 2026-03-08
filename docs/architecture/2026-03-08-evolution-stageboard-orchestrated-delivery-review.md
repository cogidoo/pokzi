# Evolution Stage Board Orchestrated Delivery Review

- Status: implemented
- Created: 2026-03-08
- Updated: 2026-03-08
- Implemented on: 2026-03-08
- Superseded by:

## Goal

Re-run the full multi-stage delivery flow for the evolution redesign in strict orchestrated order:
requirements -> concept -> UX/UI -> architecture -> implementation assessment.

## Trigger

The feature was already implemented, but the delivery process should be re-executed formally with explicit stage handoffs and a clean end-to-end audit of what is done vs what should still change.

## Workflow Classification

Primary workflow: `refactor`

Reason: The work improves structure and presentation of an existing feature without expanding repo scope.

## Stage 1: Requirements Handoff

```yaml
task_type: refactor
goal: Make evolution rendering visually clearer and remove legacy model debt.
problem: Evolution UI felt like a plain list; legacy previous/next compatibility fields created avoidable model complexity.
user_value: Children can read evolution progression faster; team gets a single clean evolution contract.
scope_in:
  - Evolution section layout and readability
  - Evolution data contract cleanup
  - Regression-safe migration in tests and docs
scope_out:
  - New app features
  - Graph/tree explorer UI
  - Changes to search/result behavior
constraints:
  - Keep UI copy German
  - Keep child-friendly iPad-first interaction
  - Keep no-graph/no-heavy-connector policy
assumptions:
  - Real data only requires Basis/Phase1/Phase2 depth
  - Subtle arrows are acceptable orientation cues
risks:
  - Legacy tests may still encode previous/next assumptions
  - E2E selectors can fail after semantics change
acceptance_criteria:
  - Evolution section reads as stage progression
  - Current tile remains clear and non-interactive
  - All non-current visible tiles navigable
  - Legacy previous/next removed from TS/service/app/tests
  - Lint/check/tests/e2e all pass
affected_surfaces:
  - src/components/EvolutionSummary.svelte
  - src/services/pokemonApi.ts
  - src/types/pokemon.ts
findings: []
evidence:
  - PokeAPI verification run (all chains) confirmed no "double split" case at basis->phase1->phase2 pattern.
patch_plan:
  - Move to strict sharedPath + branchGroups contract
  - Introduce stage board UI
  - Align tests and docs
changed_files: []
tests: []
severity: []
review_status: in_progress
next_step: Concept delta aligned to docs/repo source of truth.
```

## Stage 2: Concept Handoff

```yaml
task_type: refactor
goal: Convert requirement into executable behavior definition.
scope_in:
  - Stage-based evolution summary behavior
  - Branch readability rules
scope_out:
  - Any non-evolution scope changes
constraints:
  - docs/repo remains behavior source-of-truth
assumptions:
  - Stage order is always Basis -> Phase 1 -> Phase 2
risks:
  - Drift between feature docs and implementation wording
acceptance_criteria:
  - Feature docs explicitly describe stage-board reading order
  - Branching remains readable without graph connectors
affected_surfaces:
  - docs/repo/features/02-pokemon-detail.md
  - docs/repo/features/03-evolution-navigation.md
  - docs/repo/features/05-evolution-branch-readability-and-types.md
  - docs/repo/current-state.md
findings: []
evidence:
  - Concept language updated to stage-board semantics and subtle directional cues.
patch_plan:
  - Update feature docs and current-state language
changed_files:
  - docs/repo/features/02-pokemon-detail.md
  - docs/repo/features/03-evolution-navigation.md
  - docs/repo/features/05-evolution-branch-readability-and-types.md
  - docs/repo/current-state.md
tests: []
severity: []
review_status: completed
next_step: UX/UI handoff for concrete visual behavior.
```

## Stage 3: UX/UI Handoff

```yaml
task_type: refactor
goal: Produce a calm, clean visual structure for evolution progression.
affected_views:
  - Pokemon detail evolution section
affected_states:
  - success with linear chain
  - success with branch groups
  - missing artwork fallback
  - no phase-2 entries
ux_risks:
  - Too many visual connectors reduce readability
  - Overly loud branch containers compete with hero
copy_notes:
  - Keep labels short German: Basis, Phase 1, Phase 2, Entwicklung
  - Keep support text minimal
a11y_notes:
  - Maintain full-tile tap targets
  - Keep non-current tiles as buttons; current tile as article with aria-current
  - Preserve clear section labeling
edge_cases:
  - Branches from basis with no shared intermediate tile
  - Current tile in phase-2 grouped rendering with missing image
scope_in:
  - Stage board + subtle arrow cues + grouped phase-2 rendering
scope_out:
  - Graph connectors, technical evolution condition labels
constraints:
  - No horizontal scrolling in 320-1024px
assumptions:
  - One-column reading remains primary; tablet allows internal rhythm only
risks:
  - Selector changes break existing tests
acceptance_criteria:
  - Stage board is readable on phone and iPad
  - Current tile remains visually anchored
  - Branch groups remain subordinate to stage spine
affected_surfaces:
  - src/components/EvolutionSummary.svelte
  - src/styles/app.css
findings: []
evidence:
  - New board layout, stage headers, subtle arrow cues, calm branch grouping delivered.
patch_plan:
  - Implement board structure and CSS refinements
changed_files:
  - src/components/EvolutionSummary.svelte
  - src/styles/app.css
tests:
  - src/components/EvolutionSummary.test.ts
severity: []
review_status: completed
next_step: Architecture check for durable data/module boundaries.
```

## Stage 4: Architecture Handoff

```yaml
task_type: refactor
goal: Remove transitional evolution contract and keep one durable model.
technical_decision: Use PokemonEvolutionSummary as strict {stage, sharedPath, branchGroups} contract everywhere.
alternatives:
  - Keep previous/next as compatibility fields: rejected (debt, dual semantics)
  - Introduce new staged DTO in service: rejected (extra mapping layer without benefit)
tradeoffs:
  - Test migration effort now vs lower long-term complexity
  - Slightly more component derivation logic vs cleaner source contract
affected_modules:
  - src/types/pokemon.ts
  - src/services/pokemonApi.ts
  - src/App.svelte
  - test suites touching detail evolution payloads
migration_impact:
  - Remove previous/next from type and service payload
  - Delete App fallback adapter to legacy fields
  - Update all fixtures/assertions
test_impact:
  - Integration tests and App/component tests require payload shape updates
scope_in:
  - Data model and rendering boundary cleanup
scope_out:
  - Search controller, navigation architecture, unrelated services
constraints:
  - Preserve behavior parity for navigation and detail loading
assumptions:
  - PokeAPI chain depth constraints remain compatible with stage mapping
risks:
  - Hidden compatibility expectations in e2e or docs
acceptance_criteria:
  - No runtime dependency on legacy fields
  - Full quality gates pass
affected_surfaces:
  - src/types/pokemon.ts
  - src/services/pokemonApi.ts
  - src/App.svelte
findings: []
evidence:
  - Legacy fields removed and consumers updated.
patch_plan:
  - Contract hardening + downstream test/doc alignment
changed_files:
  - src/types/pokemon.ts
  - src/services/pokemonApi.ts
  - src/App.svelte
tests:
  - npm run lint
  - npm run check
  - npm test
  - npm run test:e2e
severity: []
review_status: completed
next_step: Implementation assessment against current repo state.
```

## Stage 5: Implementation Assessment (Developer-Agent View)

```yaml
task_type: refactor
goal: Verify what is already implemented and identify remaining adaptation work.
scope_in:
  - Gap analysis between staged handoffs and current code/docs/tests
scope_out:
  - New feature additions
constraints:
  - Keep existing delivered result
assumptions:
  - Current branch contains full migration attempt
risks:
  - Residual terminology drift in tests/docs
acceptance_criteria:
  - No code-level or test-level legacy dependencies
  - No blocker/high issues
affected_surfaces:
  - Whole changed set listed in git diff
findings:
  - severity: low
    summary: Residual test names still used legacy wording (previous/next).
    repro_or_rationale: Terminology review during orchestration rerun.
    missing_tests: []
    next_step: Rename tests for contract consistency.
evidence:
  - All quality gates passed after cleanup.
patch_plan:
  - Keep implementation
  - Apply small naming consistency cleanup
changed_files:
  - src/App.test.ts
  - src/services/pokemonApi.integration.test.ts
tests_changed:
  - No behavioral test logic changes, only naming/expectation alignment already covered
residual_risks:
  - Playwright NO_COLOR/FORCE_COLOR warning noise only
severity: low
review_status: clean
next_step: Done; merge/release recommended.
```

## Verification Snapshot

- `npm run lint`: pass
- `npm run format:check`: pass
- `npm run check`: pass
- `npm test`: pass (`161 passed`, branch coverage `95.02%`)
- `npm run test:e2e`: pass (`28 passed`)

## Documentation Impact

Behavior/UI/docs were aligned across:

- `docs/repo/current-state.md`
- `docs/repo/features/02-pokemon-detail.md`
- `docs/repo/features/03-evolution-navigation.md`
- `docs/repo/features/05-evolution-branch-readability-and-types.md`
- `DESIGN_BRIEF.md`
- `README.md`
- `CONCEPT.md`

## Closing Note

Implemented result already matched the intended staged flow. The orchestration rerun validated completeness, removed residual naming drift, and confirmed a clean, releasable state.
