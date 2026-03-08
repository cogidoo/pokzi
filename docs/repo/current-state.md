# Current Repo

## Current Repo Scope

The current repo includes:

- search input for German Pokemon names and numeric IDs
- tolerant German-name search for umlaut/ss variants and minor typos
- live-updating search results below the input
- touch-friendly result cards with German labels
- scroll-reactive compact/expanded header behavior in search results view
- dedicated Pokemon detail pages
- stage-based visual evolution board (`Basis`, `Phase 1`, `Phase 2`) inside the detail page
- branch-readable evolution summary with subtle directional cues and German type chips on evolution items
- hash-based deep linking for Pokemon detail pages (`#/pokemon/:id`)
- back navigation to preserved search and results context when detail was opened from results
- back navigation from direct detail deep links to the neutral search start state
- localized German display names and German type labels
- clear neutral-start, invalid-query, loading, success, no-results, not-found, and error states where relevant

## Current Repo Priorities

Prioritize work that strengthens:

- search quality and clarity
- result browsing on iPad
- detail comprehension for children
- responsive and reliable API behavior
- navigational stability and state preservation
- language quality in German UI output

## Not In Current Repo Scope

The following items remain outside the current repo scope unless explicitly approved and documented:

- favorites
- team builder
- compare mode between multiple Pokemon
- offline mode
- auth/accounts
- dense battle-analysis screens
- move encyclopedias or breeding/training systems
- full evolution-chain exploration UI
- graph-like evolution tree views

## Scope Guardrails

- New requirements must improve the repo, not dilute the core discovery flow.
- Additions must be explainable in child-friendly language and work well on iPad.
- Features that create dense navigation, heavy configuration, or technical overload require explicit approval.
- Every approved behavior change must land in a dedicated feature concept or a documented update to an existing feature file.
