Status: implemented
Created: 2026-04-12
Updated: 2026-04-12
Implemented on: 2026-04-12
Superseded by:

# Decision: Token-Efficient Agentic Delivery

## Goal

Reduce default context cost for local Codex work while preserving high-quality repo guidance and optional specialist workflows.

## Current Problem Or Trigger

The repository already had strong agent guidance, but too much of it lived in the always-loaded default path:

- the root `AGENTS.md` carried detailed workflow logic, review loops, and handoff rules
- the same rules were repeated in skills and repo-defined agent instructions
- specialist routing was easy to trigger even when a single focused agent was enough
- config defaults favored heavier reasoning and broader search than most local tasks need

This increased token usage and made small tasks pay for large-task process overhead.

## Decision

Adopt a layered delivery model:

1. Keep root `AGENTS.md` short and operational.
2. Make single-agent execution the default path.
3. Move detailed workflow and review policy out of the default path into optional architecture and skill material.
4. Keep specialist skills and repo-defined agents available, but treat them as escalation tools.
5. Tune `.codex/config.toml` for lighter defaults plus explicit `fast`, `balanced`, and `deep` profiles.

## Default Path

The default local workflow is now:

1. inspect the smallest relevant local code surface
2. open only the docs needed for the task
3. make the smallest safe change
4. run the smallest relevant verification
5. hand back `changes`, `risks`, and `tests`

This is the expected path for:

- small bugfixes
- local refactors
- narrow documentation edits
- focused implementation work
- lightweight reviews

## Escalation Triggers

Escalate beyond the default path only when at least one is true:

- the user explicitly asks for an agent, skill, workflow, or review loop
- the task spans multiple layers or subsystems
- requirements are ambiguous and need explicit intake
- architecture decisions are part of the work
- the diff is large or the regression surface is unusually risky
- a separate QA or visual review adds real confidence

## Optional Workflow Catalog

These workflow types remain available, but they are no longer the default burden for every task:

- `bugfix`
- `refactor`
- `feature`
- `maintenance`
- `audit`
- `requirement-intake`

Preferred escalation paths:

- `bugfix`: implementation, then optional QA
- `refactor`: requirements or architecture only if the refactor is non-local or changes invariants
- `feature`: requirements first when scope is unclear, then implementation, then optional QA
- `maintenance`: implementation only unless risk justifies review
- `audit`: analysis only unless the user asks for follow-up changes
- `requirement-intake`: requirements first, then a separate implementation path

## Lightweight Handoff Contract

When a handoff is needed, pass only the delta required for the next step:

- `goal`
- `scope`
- `changes`
- `risks`
- `tests`
- `next_step`

Add role-specific fields only when a specialist actually needs them.

## Role-Specific Additions

- Requirements: `problem`, `user_value`, `scope_in`, `scope_out`, `acceptance_criteria`, `assumptions`
- Architecture: `technical_decision`, `tradeoffs`, `affected_modules`, `migration_impact`
- Implementation: `patch_plan`, `changed_files`, `tests_changed`, `residual_risks`
- QA: `findings`, `severity`, `missing_tests`, `review_status`
- UX/UI: `affected_views`, `affected_states`, `ux_risks`, `a11y_notes`

## Configuration Direction

The repository-local Codex config should optimize for:

- low default verbosity
- lower default reasoning for routine work
- explicit profile selection for deeper tasks
- smaller tool-output history
- capped project-doc loading
- cached or disabled web search by default unless fresher web context is truly needed

## Risks

- Too little default guidance could weaken consistency.
- Mitigation: keep strong repo invariants in root `AGENTS.md` and keep optional specialist guidance available.

- Optional QA could miss defects on risky work.
- Mitigation: keep clear escalation triggers for large diffs, critical logic, and explicit review requests.

## Non-Goals

- no removal of repo-defined agents or local skills
- no change to documented product behavior
- no attempt to optimize for every possible Codex runtime at the expense of repo clarity

## Test And Verification Impact

This decision changes repo operating docs and config, not application runtime behavior.

Verification should focus on:

- consistent references between `AGENTS.md`, skills, repo-defined agent instructions, and contributor docs
- valid `.codex/config.toml` structure
- preserved optional escalation paths

## Documentation Impact

- Root `AGENTS.md` becomes the lightweight default contract.
- Detailed workflow policy moves to this decision record and optional skill material.
- Skills and repo-defined agent instructions should reference this file instead of re-embedding the same operating rules.
