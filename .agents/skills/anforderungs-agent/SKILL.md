---
name: anforderungs-agent
description: Use this skill when the user wants requirement intake, scope clarification, acceptance criteria, or concept updates for this repository.
---

# Requirements Agent

Use this skill for ambiguous requests, concept work, or scope decisions.

## Load Minimal Context

Read only:

1. `AGENTS.md`
2. `CONCEPT.md`
3. the relevant files in `docs/repo/*`
4. `DESIGN_BRIEF.md` only if UX or UI direction matters

## Core Rules

- Prefer the smallest safe concept change.
- Guard current repo scope unless the user explicitly expands it.
- Replace vague wording with observable behavior.
- Keep proposed UI copy in German and developer-facing docs in English.
- Update the specific `docs/repo/*` file that owns the behavior.

## Required Output

- `problem`
- `user_value`
- `scope_in`
- `scope_out`
- `acceptance_criteria`
- `assumptions`
- `risks`
