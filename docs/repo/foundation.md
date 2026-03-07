# Repo Foundation

## Repo

Pokemon discovery app for children, optimized for iPad touch usage.

## Repo Direction

Children can discover Pokemon through a simple, visual, touch-first flow:

1. Search quickly by German name or number.
2. Scan a clear results list.
3. Open one Pokemon and explore its most important details without overload.

## Target Users

- Children as primary users
- Parents as occasional co-users

## Experience Principles

1. Clarity over feature noise.
2. Touch confidence over density.
3. Fast feedback for every action.
4. One strong focus per screen.
5. Simple language and calm presentation.

## Platform And Interaction Constraints

- iPad-first layout and interaction design
- Single-column scan pattern for primary browsing flows
- Large touch targets and readable typography
- Stable deep links via hash routing for detail pages
- Preserved search/results state when returning from detail view

## Language Rules

- All visible UI copy must be German.
- German Pokemon names are the primary display labels.
- Pokemon type chips must use German labels.
- Developer-facing code documentation remains in English.

## Repo Behavior Rules

- Search supports German-name lookup and numeric ID lookup.
- Detail pages open from result-card interaction and direct hash deep links.
- Loading, empty, no-results, success, and error states must be explicit when relevant.
- Child-friendly presentation takes priority over encyclopedic completeness.

## Repo Quality Standard

- The repo must feel clear, touch-safe, and easy to scan.
- Repo behavior must be specific enough for design, engineering, and QA to execute without interpretation gaps.
- Scope changes must be documented before implementation changes start.
