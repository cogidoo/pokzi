# Architecture Docs

## Purpose

This directory contains internal technical planning and architecture guidance for Pokzi.

Use it for outputs that shape implementation structure but do not define user-visible repo behavior by themselves.

## What Belongs Here

Store documents such as:

- refactor plans
- architecture reviews
- technical decision records
- delivery-system and workflow-governance decisions
- module-boundary proposals
- migration plans for structural cleanup
- scaling notes for approved complexity increases

## What Does Not Belong Here

Do not use this directory for:

- product scope decisions
- feature behavior definitions
- UX/UI direction
- generic TODO lists
- implementation notes that only matter inside one small code diff

Those belong elsewhere:

- `docs/repo/` for behavior and scope
- `DESIGN_BRIEF.md` for visual/UI direction
- code comments or pull request context for tiny local implementation notes

## Why Not `TODO/` Or `tasks/`

`TODO` folders usually decay into mixed intent lists.
`tasks` folders often blend product, engineering, and temporary execution work.

This repo needs a place for durable technical reasoning that stays readable after the immediate task is finished.
`docs/architecture/` makes that purpose explicit.

## Output Types

### Refactor Plan

Use when the goal is to change code structure without changing intended user behavior.

Recommended filename:

- `YYYY-MM-DD-short-topic-refactor-plan.md`

### Architecture Review

Use when assessing the current structure and identifying risks, seams, and recommended next moves.

Recommended filename:

- `YYYY-MM-DD-short-topic-architecture-review.md`

### Decision Record

Use when one technical direction should be chosen and documented with tradeoffs.

Recommended filename:

- `YYYY-MM-DD-short-topic-decision.md`

## Authoring Rules

- Keep documents short, concrete, and implementation-oriented.
- Write architecture documents in English.
- Prefer one decision or plan per file.
- State non-goals explicitly.
- Define what must stay behaviorally unchanged.
- Tie structural recommendations to test strategy and migration order.
- If user-visible behavior changes, update `docs/repo/*` first and reference that document here.

## Document Lifecycle

Architecture documents are not deleted by default after implementation.

Use a small status header at the top of each file:

- `Status`: `proposed`, `in-progress`, `implemented`, or `superseded`
- `Created`: creation date
- `Updated`: last meaningful update date
- `Implemented on`: fill when the planned change is completed
- `Superseded by`: fill only if a newer document replaces this one

Lifecycle rules:

- Keep the document while it still explains a useful technical decision, migration path, or structural invariant.
- Update the document after implementation if the final solution differs from the original plan.
- Mark it as `implemented` when the planned work is complete.
- Mark it as `superseded` instead of deleting it when a newer architecture document replaces it.
- Delete only documents that are clearly disposable scratch work and contain no durable engineering value.

## Completion Update

When a plan has been implemented, add a short closing note:

- what was implemented
- what changed versus the original plan
- whether follow-up work remains

Keep that note short. The file should remain a concise historical and operational reference, not become a changelog.

## Minimum Output Contract

Every architecture document should include:

1. Goal
2. Current problem or trigger
3. Target structure or decision
4. Responsibility boundaries
5. Migration or execution sequence
6. Risks and non-goals
7. Test and verification impact
8. Documentation impact

## Templates

- Use [`refactor-plan-template.md`](/Users/cogidoo/dev/startai/docs/architecture/refactor-plan-template.md) for refactor planning.
