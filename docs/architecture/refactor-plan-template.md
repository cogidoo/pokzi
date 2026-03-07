# Refactor Plan: <short title>

Status: proposed
Created: YYYY-MM-DD
Updated: YYYY-MM-DD
Implemented on:
Superseded by:

## Goal

State the structural improvement in one or two sentences.

## Current Problem

- Describe the concrete technical pain.
- Name the files, modules, or responsibilities involved.
- Explain why the current shape will become harder to extend or test.

## Scope

In scope:

- List the structural changes that are intended.

Out of scope:

- List what will intentionally stay unchanged.

## Target Structure

- Describe the target module split or dependency model.
- Name the files or folders to introduce, change, or simplify.
- Keep the structure small and specific to the actual need.

## Responsibility Rules

- Define what each affected module or layer owns.
- Define what each affected module or layer must not own.
- Make the dependency direction explicit.

## Invariants

- List the user-visible behavior that must stay unchanged.
- List any testing or routing guarantees that must remain true.

## Refactoring Steps

1. Describe the first safe step.
2. Continue in delivery order.
3. End with cleanup and removal of superseded structure.

## Risks

- List concrete regression or migration risks.

## Non-Goals

- List changes that are intentionally not part of this plan.

## Test Plan

- List the unit, integration, or E2E coverage that must protect the change.
- Call out any missing coverage that should be added first.

## Documentation Impact

- State whether `docs/repo/*` must change.
- State whether only internal technical docs change.

## Implementation Notes

- Add only the minimum notes needed to execute safely.

## Completion Note

- Summarize the final implemented outcome once the plan is complete.
- Note any meaningful deviation from the original plan.
- Mention follow-up work only if it is still relevant.
