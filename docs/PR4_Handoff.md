# PR4 Handoff: Deterministic Modified Margolus Rule

## Objective
Add a deterministic modified Margolus rule implementation that runs on the neighborhood-step engine path and supports existing sand-state semantics.

## Scope
- Add modified Margolus neighborhood/rule integration.
- Implement deterministic 2x2 block transition behavior.
- Keep phase state internal to the rule.

## Out of Scope
- Probabilistic toppling parameter p.
- Hilbert layout adoption.
- Benchmark infra.

## Agreed Behavioral Decisions
- Deterministic MVP only.
- Internal rule-managed phase cycle.
- Paper-like partial edge updates.
- Reuse existing sand states (including ROCK as immovable obstacle).

## Files to Touch
- [src/CARule.ts](src/CARule.ts)
- [src/ECA.ts](src/ECA.ts)
- New file expected:
  - [src/ModifiedMargolusSandRule.ts](src/ModifiedMargolusSandRule.ts)
- Integration verification touchpoints:
  - [src/UI.ts](src/UI.ts)
  - [src/Persistence.ts](src/Persistence.ts)

## Implementation Checklist
1. Add neighborhood metadata and selectable rule registry entry.
2. Implement 4-phase cycle offsets in rule internals.
3. Compute active 2x2 anchor per cell/block for current phase.
4. Apply deterministic transition map for complete active blocks.
5. Leave edge cells unchanged when no complete block applies.
6. Ensure rule selectable and persisted/reloaded correctly.

## Test Additions
- Phase cycle correctness over 4 ticks.
- Canonical 2x2 transition fixtures.
- Edge partial-update semantics.
- Save/load roundtrip with rule selected.

## Merge Gate
- npm run build passes.
- npm test passes with all existing and new tests.
- Deterministic replay from fixed initial states is stable.

## Reviewer Notes
- Verify no stochastic behavior was introduced.
- Verify compatibility with existing sand paint states.
