# Local Pre-Push Quality Gate Decision

## Context

GitHub `quality.yml` already blocks broken formatting, lint, type checks, tests, and builds on pull requests.
That feedback arrived too late for the desired workflow: local commits and pushes should fail before a broken branch reaches GitHub.

## Decision

Add a repo-local pre-push guard that runs the same core quality steps as GitHub before a push is allowed:

- `npm run index:de:check`
- `npm run format:check`
- `npm run lint`
- `npm run check`
- `npm test`
- `npm run build`
- `npm run build:pages`

Implementation details:

- `scripts/runQualityGate.mjs` runs the gate serially and fails fast on the first broken step.
- `.githooks/pre-push` calls `npm run quality:gate`.
- `npm run hooks:install` sets `core.hooksPath` to `.githooks` for the local clone.

## Consequences

- Broken pushes are rejected locally before GitHub CI is involved.
- The local push path now mirrors the PR quality workflow closely enough to catch the same classes of failures.
- New clones must run `npm run hooks:install` once, unless the local Git config is already set.
