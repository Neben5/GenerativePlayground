# PR3 Handoff: Neighborhood Scheduler Core

## Objective
Implement the neighborhood scheduler core in the engine while preserving behavior parity for existing rules through compatibility execution paths.

## Scope
- Build scheduling and commit flow for neighborhood-driven iteration.
- Keep current user-facing controls unchanged.
- Preserve rendering contract for dirty index updates.

## Out of Scope
- Modified Margolus rule logic.
- Hilbert mapping.
- Benchmark harness.

## Key Interfaces
- Legacy per-cell rule execution remains available.
- Neighborhood-step execution path is used when rule supports neighborhood updates.
- Deterministic write commit policy for batched updates.

## Files to Touch
- [src/ECA.ts](src/ECA.ts)
- Optional minor updates for typing or exports if required:
  - [src/CARule.ts](src/CARule.ts)

## Implementation Checklist
1. Ensure iterate flow chooses neighborhood path when available and fallback path otherwise.
2. Centralize batched write commit with deterministic ordering and bounds protection.
3. Keep dirty set updates based on actual state changes only.
4. Preserve tick controls and monitor hooks with no UX changes.
5. Avoid changing public API surface beyond necessary typing additions.

## Test Additions
- Scheduler path parity against legacy behavior for equivalent logic.
- Deterministic conflict handling for repeated writes to same index in one tick.
- Dirty tracking parity under neighborhood path.
- No regression for existing test suites.

## Merge Gate
- npm run build passes.
- npm test passes.
- No behavior regressions for existing rules.

## Reviewer Notes
- Validate that current Rule110 and SandRule produce expected evolution unchanged.
- Confirm no new UI controls were introduced.
