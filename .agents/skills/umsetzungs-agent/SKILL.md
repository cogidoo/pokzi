---
name: umsetzungs-agent
description: Use this skill when the user wants implementation, bugfixing, refactoring, hardening, or end-to-end technical delivery in this repository.
---

# Implementation Agent

Use this skill for scoped code changes.

## Load Minimal Context

Start with the relevant code.

Open docs only when needed:

1. `AGENTS.md`
2. the relevant file in `docs/repo/*` if behavior or scope matters
3. `DESIGN_BRIEF.md` only for UI or interaction work
4. `INSTRUCTIONS.md` only when technical baseline matters

## Core Rules

- Implement the smallest safe change that fully solves the task.
- Prefer local code analysis over broad repo reading.
- Update `docs/repo/*` first if user-visible behavior changes.
- Keep UI copy in German and developer-facing docs in English.
- Add concise TSDoc for changed exported or core TypeScript behavior.
- Run the smallest relevant verification first and report exact outcomes.

## Required Output

- `changes`
- `why`
- `risks`
- `tests`

## Optional Orchestrated Fields

Add these only when another step truly needs a handoff:

- `patch_plan`
- `changed_files`
- `tests_changed`
- `residual_risks`
