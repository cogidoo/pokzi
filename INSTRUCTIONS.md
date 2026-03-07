# INSTRUCTIONS

## Repo Goal

Build a child-friendly Pokemon app as a Single-Page Application (SPA) for iPad.

## Source of Truth

- Repo behavior and interaction rules: `docs/repo/*`
- Visual language and UI tokens: `DESIGN_BRIEF.md`
- Agent execution and engineering rules: `AGENTS.md`

Do not duplicate detailed behavior rules in this file.

## Audience

- Children (touch-first usage)
- Parents as co-users

## Current Repo Scope

- Search Pokemon by German name or numeric ID
- Browse a touch-friendly results list
- Open a dedicated Pokemon detail view from search results
- Data from public API (PokeAPI)
- Fast, reliable touch-first interaction on iPad
- German UI language for all user-facing copy
- Result labels and type chips shown in German

## Technical Direction

- Language: TypeScript (required)
- Framework baseline: Svelte + Vite
- Architecture: component-based UI with isolated API/service layer
- Routing strategy: hash routing for stable GitHub Pages deep-links (`#/pokemon/:id`)
- State: local/component state first
- Code quality: ESLint (flat config) with type-aware strict rules
- Code documentation: enforce TSDoc/JSDoc via ESLint for TypeScript interfaces, type aliases, classes, methods, and functions
- Documentation language: English for code comments (UI copy remains German)
- Code style: Prettier as single formatter source of truth

## Delivery Baseline

- Required quality checks before handoff:
  - `npm run format:check`
  - `npm run lint`
  - `npm run check`
  - `npm test`
  - `npm run test:e2e` (when E2E environment is available)
- Commit discipline:
  - keep commits small and focused
  - use descriptive commit messages
  - avoid committing generated output artifacts (coverage, build, reports)

## Data Source

- Primary source: PokeAPI (`https://pokeapi.co/api/v2/`)
- Prefer official artwork endpoints where available
- User-friendly handling of network/API failures

## Quality Bar

- Clear loading, empty, and error states
- Reliable touch targets and readable typography
- Strong automated test coverage with stable CI checks
- Deterministic E2E smoke coverage for critical user flows
- Lint and formatting checks must pass in CI (`npm run lint` + `npm run format:check`)
