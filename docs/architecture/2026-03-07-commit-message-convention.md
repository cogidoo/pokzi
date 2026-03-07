Status: implemented
Created: 2026-03-07
Updated: 2026-03-07
Implemented on: 2026-03-07
Superseded by:

# Commit Message Convention

## Goal

Define one consistent commit message format for this repository.

## Format

Use this structure for every commit title line:

`<type>(<scope>): <imperative summary>`

Examples:

- `feat(evolution): render shared path with grouped branches`
- `fix(detail): keep hash and visible detail in sync on failed evolution fetch`
- `test(e2e): cover delayed branch split and failed evolution navigation`
- `docs(feature-05): align architecture plan and repo docs`

## Allowed Types

- `feat`: new user-visible capability
- `fix`: behavior correction / bugfix
- `refactor`: structure change without intended behavior change
- `test`: tests only
- `docs`: documentation only
- `chore`: tooling, maintenance, or repository housekeeping

## Recommended Scopes

- `search`
- `detail`
- `evolution`
- `api`
- `a11y`
- `e2e`
- `docs`
- `repo`

## Rules

1. Keep the title line concise and specific.
2. Use imperative wording (`add`, `fix`, `extract`, `cover`), not past tense.
3. Keep one logical change per commit.
4. If a commit mixes behavior + tests + docs for one feature, use the primary behavior type (`feat` or `fix`) and explain supporting changes in the body.
5. Optional body should explain:
   - why the change is needed
   - key implementation decision(s)
   - important risk or migration notes

## Non-Goals

- Enforcing this with a hard pre-commit hook right now.
- Rewriting existing history.
