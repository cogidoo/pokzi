Status: implemented
Created: 2026-03-07
Updated: 2026-03-07
Implemented on: 2026-03-07
Superseded by:

# Decision: Agent Delivery System

## Goal

Define a durable operating system for repository-local agent work so task routing, handoffs, review loops, and completion decisions stop depending on ad-hoc judgment.

## Current Problem Or Trigger

The repository already has specialist skills for requirements, UX/UI, architecture, implementation, and QA.

What it lacked was the operating layer above them:

- no single orchestrator entrypoint
- no mandatory workflow catalog
- no shared handoff schema
- no formal severity model
- no review-loop rule for "review until clean"
- no workflow-specific definition of done

This created three concrete risks:

1. Specialist skills could optimize toward different completion criteria.
2. Agent sequencing stayed manual and inconsistent.
3. Review loops had no hard stop or severity-based completion rule.

## Decision

Introduce a repository-level delivery system with these mandatory components:

1. `AGENTS.md` as the operating constitution
2. one `orchestrator-agent` skill as the routing layer
3. six standard workflows
4. one shared handoff schema
5. one severity model
6. one review-loop rule
7. one workflow-specific definition of done set

## Standard Workflows

### 1. Bugfix

- goal: minimal, behavior-safe correction
- default path: `implementation -> qa`
- optional specialists: `requirements`, `architecture`, `ux-ui`
- stop condition: fix implemented, relevant tests pass, no open `high` or `blocker` findings

### 2. Refactor

- goal: structural improvement without unintended behavior drift
- path: `requirements -> architecture -> implementation -> qa`
- stop condition: target structure reached, invariants preserved, no open relevant findings

### 3. Feature

- goal: deliver a new capability from scoped requirement to clean review
- path: `requirements -> optional ux-ui -> optional architecture -> implementation -> qa`
- stop condition: acceptance criteria met, relevant tests pass, review clean or accepted residual risk documented

### 4. Maintenance

- goal: routine upkeep with minimal process overhead
- path: `implementation -> focused qa`
- stop condition: maintenance objective met, no regression-relevant open findings

### 5. Audit

- goal: assess and prioritize, not silently implement
- path: `requirements -> architecture/ux-ui/qa combination`
- stop condition: findings, severity, evidence, and recommendations documented

### 6. Requirement Intake

- goal: turn rough input into an implementation-ready feature brief
- path: `requirements -> feature workflow`
- stop condition: the intake result is specific enough to execute without guesswork

## Responsibility Boundaries

- Orchestrator: classify, route, enforce handoffs, drive review loops, consolidate completion
- Requirements: define problem, scope, acceptance, assumptions, risks
- UX/UI: define affected views/states, interaction guidance, copy and accessibility notes
- Architecture: define technical decisions, alternatives, tradeoffs, affected modules, migration impact
- Implementation: define patch plan, execute, update tests/docs, report residual risks
- QA: produce findings, severity, rationale, missing tests, and approval status

Specialists do not self-assign the overall workflow. The orchestrator owns sequencing and completion.

## Shared Handoff Contract

All orchestrated work uses the shared handoff template at `.codex/skills/orchestrator-agent/templates/handoff-template.md`.

The execution-time field list lives in `AGENTS.md`.

This contract reduces conversational drift and keeps artifacts reusable across loops.

## Operational Rule Ownership

The following live in `AGENTS.md`, not in this decision record:

- severity model
- review-loop rule
- workflow-specific definition of done
- detailed workflow routing rules

This decision documents the ownership model and architectural intent behind those rules.

## Risks

- More process structure can create unnecessary overhead for tiny tasks.
- Mitigation: the orchestrator chooses the minimal safe path instead of always invoking every specialist.

- Review-loop discipline can degrade into box-ticking if findings are vague.
- Mitigation: require severity, evidence, and next-step fields in every review handoff.

## Non-Goals

- no attempt to build autonomous multi-agent execution infrastructure
- no mandatory separate audit, security, or performance specialist yet
- no change to user-visible product behavior

## Test And Verification Impact

This decision changes repository process documentation and local skill instructions only.

Verification for this implementation should focus on:

- documentation consistency across `AGENTS.md`, `README.md`, and skill files
- presence of the new orchestrator skill and handoff template
- preserved alignment with existing repo rules for testing, documentation, and German UI language

## Documentation Impact

- `AGENTS.md` must define the operating model
- specialist skill files must align to the shared handoff contract
- `README.md` and `CONCEPT.md` should reference the delivery-system layer for contributors
