# Pokzi

Pokzi is a playful, iPad-first Pokemon search app for children.

Find Pokemon in seconds:

- Type a German name (`schiggy`)
- Or type a number (`7`)
- Keep finding results even with umlaut/`ss` variants or small typos
- Get clear, touch-friendly cards instantly
- Open a dedicated detail view for one Pokemon

Built to feel easy for children and maintainable for teams.

## For Parents

- Child-friendly search flow with immediate feedback.
- Large, easy-to-tap controls for tablet use.
- German UI text throughout.
- Dedicated detail page with key facts, a short description in the hero, and a stage-based evolution board with readable branching.
- Clear messages for loading, no results, and errors.

## For Developers

- Svelte + TypeScript + Vite baseline.
- Service-driven API layer (`src/services`) for testability.
- Strong quality gates (lint, type-check, unit tests, E2E smoke tests).
- TSDoc/JSDoc enforced for key TypeScript structures.
- Local specialist skills plus an orchestrator skill for workflow routing and review-until-clean delivery.

## Quick Start

1. `npm install`
2. `npm run dev`

## Repo Docs

- Repo docs overview: `CONCEPT.md`
- Structured repo docs: `docs/repo/`
- Architecture and refactor planning docs: `docs/architecture/`
- Visual/UI direction: `DESIGN_BRIEF.md`
- Engineering/agent rules: `AGENTS.md`
- Agent delivery decision: `docs/architecture/2026-03-07-agent-delivery-system-decision.md`
- High-level framing: `INSTRUCTIONS.md`

## Developer Notes

- Code comments are English.
- User-facing UI copy remains German.
- Detail deep-links use hash routing (`#/pokemon/:id`) for GitHub Pages compatibility.

## Useful Commands

- `npm run lint`
- `npm run format:check`
- `npm run check`
- `npm test`
- `npm run test:e2e`
