# PR6 Handoff: Hilbert Prototype (Benchmark-Only Path)

## Objective
Implement a Hilbert layout prototype in benchmark context only, compare against row-major, and decide promotion based on measured improvement.

## Scope
- Add Hilbert mapping utilities and adapter path used only by benchmarks.
- Compare row-major versus Hilbert under identical scenarios.
- Produce adoption recommendation from measured results.

## Out of Scope
- Default runtime switch to Hilbert.
- UI toggle for layout selection in production.

## Decision Gate
Adopt beyond prototype only if there is measurable positive tick-time improvement.

## Files to Touch
- New mapping/adaptation files expected under:
  - [src/layout](src/layout)
- Benchmark integration:
  - [src/bench](src/bench)
- Compatibility considerations:
  - [src/Persistence.ts](src/Persistence.ts)
  - [src/Cells.ts](src/Cells.ts)

## Implementation Checklist
1. Implement Hilbert index and inverse mapping with strict bijection guarantees.
2. Add adapter abstractions for benchmark-only execution.
3. Keep production default on row-major.
4. Compare metrics under fixed seeds, dimensions, and rule mixes.
5. Document outcome with recommendation and evidence.

## Test Additions
- Bijection tests for index and inverse functions.
- Neighborhood equivalence tests between row-major and Hilbert logical neighborhoods.
- Adapter path correctness tests in benchmark context.

## Merge Gate
- npm run build passes.
- npm test passes.
- Benchmark comparison report generated and attached.
- Recommendation documented with measured deltas.

## Reviewer Notes
- Confirm no production behavior change unless explicitly approved in follow-up PR.
- Confirm persistence format remains backward compatible unless migration is intentionally introduced.
