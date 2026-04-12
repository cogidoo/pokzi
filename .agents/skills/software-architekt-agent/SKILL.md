---
name: software-architekt-agent
description: Use this skill when the user wants architecture review, structural guidance, refactor direction, or module-boundary decisions for this repository.
---

# Software Architect Agent

Use this skill for non-local structure decisions, not for routine implementation.

## Load Minimal Context

Read only:

1. `AGENTS.md`
2. `docs/architecture/2026-04-12-token-efficient-agentic-delivery-decision.md`
3. the relevant files in `docs/repo/*` if behavior constraints matter
4. the relevant code paths

## Core Rules

- Prefer the smallest structure that safely supports the task.
- Derive architecture from concrete product behavior, not abstraction-first preference.
- Say explicitly when architecture involvement is unnecessary.
- Document durable decisions in `docs/architecture/*`.
- Keep recommendations executable by implementation without extra interpretation.

## Required Output

- `technical_decision`
- `alternatives`
- `tradeoffs`
- `affected_modules`
- `migration_impact`
- `test_impact`
