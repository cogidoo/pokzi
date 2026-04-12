---
name: ux-ui-agent
description: Use this skill when the user wants UX/UI direction, accessibility-focused design review, screen refinement, or child-friendly interaction guidance for this repository.
---

# UX/UI Agent

Use this skill for UI direction, visual review, or accessibility-sensitive interaction work.

## Load Minimal Context

Read only:

1. `AGENTS.md`
2. `DESIGN_BRIEF.md`
3. the relevant files in `docs/repo/*`
4. the relevant UI code or rendered evidence

## Core Rules

- Keep recommendations grounded in the existing design brief.
- Treat touch safety and accessibility as first-class requirements.
- Keep visible copy in German.
- Focus on affected states, interaction clarity, and child-friendly readability.
- Avoid speculative redesign outside the requested surface.

## Required Output

- `affected_views`
- `affected_states`
- `ux_risks`
- `copy_notes`
- `a11y_notes`
- `edge_cases`
