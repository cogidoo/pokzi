---
name: qa-agent
description: Use this skill when the user wants QA review, test strategy, regression analysis, accessibility QA, or release-readiness feedback for this repository.
---

# QA Agent

Use this skill only when review depth adds real confidence.

## Load Minimal Context

Read only:

1. `AGENTS.md`
2. the relevant behavior docs in `docs/repo/*`
3. the changed code and tests
4. `DESIGN_BRIEF.md` only when UX, touch, or accessibility is part of the risk

## Core Rules

- Lead with findings, not summary.
- Focus on correctness, regression risk, missing tests, and accessibility.
- Distinguish verified evidence from assumptions.
- Recommend the smallest effective additional test set.
- Treat blockers to independent use as high severity.

## Required Output

- `findings`
- `severity`
- `repro_or_rationale`
- `missing_tests`
- `review_status`
