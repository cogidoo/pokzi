---
name: orchestrator-agent
description: Use this skill when the user wants explicit workflow routing, specialist sequencing, or a review loop for this repository.
---

# Orchestrator-Agent

Use this skill only when the user asks for workflow orchestration or the task clearly needs multi-stage routing.

## Load Minimal Context

Read only:

1. `AGENTS.md`
2. `docs/architecture/2026-04-12-token-efficient-agentic-delivery-decision.md`
3. the specific docs or code needed for the current task
4. only the specialist skill files you actually plan to invoke

## Core Rules

- Single-agent execution stays the default unless escalation is justified.
- Choose the smallest safe workflow for the task.
- Invoke only the specialists that materially reduce risk.
- Pass only delta in handoffs: goal, scope, changes, risks, tests, next step.
- Say explicitly when orchestration is unnecessary.

## Default Workflow Hints

- `bugfix`: implementation, then optional QA
- `refactor`: architecture only when structure or invariants are affected
- `feature`: requirements first only when scope is unclear
- `maintenance`: implementation only unless risk justifies review
- `audit`: analysis only unless the user asks for implementation

## Required Output

- `workflow`
- `why_this_path`
- `current_stage`
- `next_step`
- `changes`
- `risks`
- `tests`

Add specialist-specific fields only when a downstream handoff needs them.
