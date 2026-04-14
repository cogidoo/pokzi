Status: implemented
Created: 2026-04-14
Updated: 2026-04-14
Implemented on: 2026-04-14
Superseded by:

# Decision: Calibrate Lean Agentic Defaults For Daily Repo Work

## Goal

Refine the already-slimmer agentic setup so default Codex work stays efficient, calm, and high quality without forcing shallow reasoning or default orchestration.

## Current Problem Or Trigger

The repository already moved in the right direction:

- root `AGENTS.md` was reduced to a lightweight default contract
- specialist skills and repo-defined agents were already optional
- `.codex/config.toml` already exposed `fast`, `balanced`, and `deep` profiles
- token-heavy workflow detail had already moved into optional architecture material

The remaining issues were calibration and consistency issues, not a missing system:

- the global config still defaulted to `low` reasoning even though the active profile was `balanced`
- some repo docs still implied broad Markdown review instead of targeted doc ownership
- plan support for long-horizon work was implicit rather than explicitly lightweight

## Target Structure Or Decision

Keep the layered delivery model from `2026-04-12-token-efficient-agentic-delivery-decision.md`, with these refinements:

1. `balanced` is the real default for everyday development and uses `medium` reasoning.
2. `fast` remains available for trivial local work.
3. `deep` remains available for architecture, ambiguity, risky refactors, and difficult debugging.
4. Root `AGENTS.md` stays short and operational, with adaptive depth and optional escalation called out explicitly.
5. `PLANS.md` exists as a lightweight optional planning surface for multi-step or multi-session work.
6. Repo docs require targeted updates, not full Markdown-tree review.
7. No additional local `AGENTS.md` files are added yet because the current repo shape does not justify more segmented defaults.

## Responsibility Boundaries

- `AGENTS.md`: default operating behavior
- `.codex/config.toml`: runtime defaults and explicit profiles
- `.agents/skills/*` and `.codex/agents/*`: optional specialist behavior
- `PLANS.md`: temporary large-work coordination only
- `docs/repo/*`: user-visible behavior and scope
- `docs/architecture/*`: durable technical workflow and structure decisions

## Migration Or Execution Sequence

1. Preserve the current lean default path.
2. Align config defaults with the intended balanced operating mode.
3. Remove broad documentation-update expectations from repo templates.
4. Add explicit lightweight planning guidance.
5. Validate the setup against representative task shapes.

## Risks And Non-Goals

### Risks

- A medium default may spend more tokens than an aggressively cheap baseline on trivial tasks.
- Optional QA and orchestration still depend on good escalation judgment.

### Mitigations

- Keep `fast` available for trivial local work.
- Keep escalation triggers explicit in `AGENTS.md`.
- Keep specialist guidance available without making it default overhead.

### Non-Goals

- No return to mandatory orchestrator-first delivery.
- No mandatory QA pass for every change.
- No repo-wide context loading by default.
- No extra local instruction files unless future repo growth creates a clear boundary.

## Test And Verification Impact

Validate the setup against four common task shapes:

1. Small bugfix: should stay single-agent, local, and lightly verified.
2. Medium feature: should stay balanced by default and touch only relevant docs/code.
3. Ambiguous request: should trigger plan mode or requirements clarification, not repo-wide exploration.
4. Larger refactor: should justify deep reasoning, optional architecture support, and possibly `PLANS.md`.

## Documentation Impact

- `AGENTS.md` now states adaptive reasoning depth and lightweight self-validation more clearly.
- `PLANS.md` now defines when long-horizon planning is appropriate.
- `docs/repo/README.md` and `docs/repo/features/_template.md` now favor targeted documentation updates.
