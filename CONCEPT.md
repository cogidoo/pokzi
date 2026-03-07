# Repo Docs

## Purpose

Pokzi uses structured repo documentation for behavior, scope, and feature concepts.

## Read Order

1. `docs/repo/README.md`
2. `docs/repo/foundation.md`
3. `docs/repo/current-state.md`
4. relevant files in `docs/repo/features/`

## Documentation Rules

- Keep repo behavior in `docs/repo/*`.
- Keep visual/UI direction in `DESIGN_BRIEF.md`.
- Keep technical and workflow guidance in `INSTRUCTIONS.md` and `AGENTS.md`.
- If behavior changes, update the relevant file in `docs/repo/` first.
- Add new feature concepts as separate files under `docs/repo/features/`.
- Number feature files with two digits in execution order, for example `01-...`, `02-...`.

## Current Repo Direction

Pokzi is a child-friendly, iPad-first Pokemon discovery repo with German-first UX.

The current repo foundation centers on:

- search by German Pokemon name or numeric ID
- a clear, touch-friendly results list
- a dedicated Pokemon detail view
- simple visual evolution chain inside the detail flow
- strong language, touch, and clarity constraints for children

## Repo Documents

- Repo map and reading guide: `docs/repo/README.md`
- Repo foundation: `docs/repo/foundation.md`
- Current repo definition: `docs/repo/current-state.md`
- Feature concepts: `docs/repo/features/`
