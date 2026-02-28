# PR5 Handoff: Benchmark Harness and Baseline Metrics

## Objective
Add reproducible benchmark infrastructure for engine and mapping performance, with CI smoke execution and result artifacts.

## Scope
- Add benchmark command(s) and runner.
- Collect baseline row-major metrics.
- Add machine-readable output for trend comparison.

## Out of Scope
- Switching default runtime layout.
- Production behavior changes in simulation logic.

## Files to Touch
- [package.json](package.json)
- New benchmark files under:
  - [src/bench](src/bench)
- Optional docs updates:
  - [docs/TEST_MATRIX.md](docs/TEST_MATRIX.md)
  - [README.md](README.md)

## Benchmark Design
- Micro benchmarks:
  - index mapping throughput
  - neighborhood fetch throughput
- Engine benchmarks:
  - median and p95 tick duration
  - ticks per second under fixed seeds and dimensions
- Optional render-coupled metrics if stable in CI.

## Implementation Checklist
1. Add npm scripts for full benchmark and smoke benchmark.
2. Implement deterministic fixture setup (seeded states, fixed dimensions).
3. Emit JSON artifact with metric schema and metadata.
4. Keep benchmark runtime bounded for CI smoke.
5. Document how to compare runs.

## Test Additions
- Benchmark runner smoke test.
- JSON artifact schema validation test.

## Merge Gate
- npm run build passes.
- npm test passes.
- Benchmark smoke command passes and emits valid artifact.

## Reviewer Notes
- Ensure benchmark runs do not mutate production code paths.
- Ensure metrics are stable enough for relative comparisons.
