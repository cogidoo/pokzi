# Repo Docs

## Purpose

This directory contains the repo documentation for Pokzi.

It defines product behavior and scope, not internal architecture planning.

## Read Order

1. `foundation.md`
2. `current-state.md`
3. relevant file in `features/`
4. `DESIGN_BRIEF.md` for visual direction

## Document Roles

### `foundation.md`

Stable repo truths:

- audience
- direction
- experience principles
- language rules
- platform constraints
- cross-feature behavior rules

### `current-state.md`

Current repo definition:

- what the repo currently includes
- what stays outside the current repo scope
- hard scope guardrails
- delivery priorities

### `features/*.md`

Feature-level concepts:

- user value
- flows
- interaction rules
- states and edge cases
- acceptance criteria

Each new requirement that changes behavior should become a dedicated feature document or an update to an existing one.

Current feature documents:

- `01-search-and-results.md`
- `02-pokemon-detail.md`
- `03-evolution-navigation.md`
- `04-search-input-tolerance.md`

## Authoring Rules

- Update the relevant file in this directory before implementation.
- For every new feature, review all repository Markdown files and update every impacted document.
- Keep behavior decisions here, not in `INSTRUCTIONS.md`.
- Keep refactor plans, architecture reviews, and technical decisions in `docs/architecture/`, not in this directory.
- Keep visual direction in `DESIGN_BRIEF.md`.
- Keep code and workflow rules in `AGENTS.md`.
- Use separate feature files for feature-specific repo decisions.
- Number feature files with two digits, for example `01-search-and-results.md` and `02-pokemon-detail.md`.
