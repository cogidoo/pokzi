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
- Keep internal architecture and refactor planning in `docs/architecture/*`.
- Keep visual/UI direction in `DESIGN_BRIEF.md`.
- Keep technical and workflow guidance in `INSTRUCTIONS.md` and `AGENTS.md`.
- Treat `AGENTS.md` as the delivery operating system for local agent work, including workflow routing, review loops, and handoff rules.
- If behavior changes, update the relevant file in `docs/repo/` first.
- Add new feature concepts as separate files under `docs/repo/features/`.
- Number feature files with two digits in execution order, for example `01-...`, `02-...`.

## Current Repo Direction

Pokzi is a child-friendly, iPad-first Pokemon discovery repo with German-first UX.

The current repo foundation centers on:

- search by German Pokemon name or numeric ID
- tolerant German-name search input handling (umlaut/ss variants and minor typos)
- a clear, touch-friendly results list
- a dedicated Pokemon detail view
- stage-based visual evolution board inside the detail flow
- readable evolution branching with subtle directional cues and German type chips per visible evolution item
- strong language, touch, and clarity constraints for children

## Repo Documents

- Repo map and reading guide: `docs/repo/README.md`
- Repo foundation: `docs/repo/foundation.md`
- Current repo definition: `docs/repo/current-state.md`
- Feature concepts: `docs/repo/features/`
- Architecture and refactor planning docs: `docs/architecture/`
- Agent delivery system decision: `docs/architecture/2026-03-07-agent-delivery-system-decision.md`
