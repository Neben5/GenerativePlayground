# PR2 Handoff: Dual Rule Interfaces and Compatibility Path

## Objective
Introduce dual execution contracts to support neighborhood-step rules while preserving legacy per-cell rule behavior.

## Scope
- Add neighborhood-step rule interfaces and context types.
- Update iterate flow to choose neighborhood path when supported.
- Preserve compatibility for existing Rule110 and SandRule execution.

## Out of Scope
- Scheduler redesign beyond interface-level adaptation.
- Modified Margolus rule implementation.
- Benchmark system integration.

## Files to Touch
- [src/CARule.ts](src/CARule.ts)
- [src/ECA.ts](src/ECA.ts)
- New tests:
  - [src/__tests__/NeighborhoodEngine.test.ts](src/__tests__/NeighborhoodEngine.test.ts)

## Implementation Checklist
1. Add neighborhood-step context and write-batch interfaces.
2. Add runtime capability detection for neighborhood-step rules.
3. Branch `iterate` into:
   - neighborhood write-batch path,
   - legacy per-cell buffer path.
4. Apply batched writes deterministically and safely.
5. Keep dirty tracking behavior unchanged for equivalent outcomes.

## Test Additions
- Parity test: neighborhood path equals equivalent legacy behavior.
- Conflict test: repeated writes to same index resolve deterministically by commit order.
- Existing baseline and hardening tests continue passing.

## Merge Gate
- npm run build passes.
- npm test passes.
- No regressions in existing rule behavior.

## Reviewer Notes
- Verify API changes are additive, not breaking.
- Verify legacy rules do not require rewrites in this PR.
