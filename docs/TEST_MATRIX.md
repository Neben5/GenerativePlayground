# Engine Test Matrix (Pre-Refactor Hardening)

This matrix defines minimum test coverage before neighborhood-tick refactors.

## Risk Levels
- **P0**: correctness regressions that break simulation or state integrity
- **P1**: behavior regressions with user-visible impact
- **P2**: tooling/ergonomics regressions

## Coverage Matrix

| Area | Risk | Test Cases | Pass Criteria |
|---|---:|---|---|
| Rule determinism (`Rule110`, `SandRule`) | P0 | Golden one-step transitions; repeated multi-step runs from same initial state | Identical outputs across duplicate runs; expected one-step vectors match |
| Boundary semantics | P0 | Rule edge behavior (off-grid lookup) for elementary and Moore rules | Rule-specific boundary policy is observed (`Rule110=OFF`, `SandRule=ROCK`) |
| Dirty index tracking | P0 | Dirty set after iterate equals exact changed index set; scuff no-op doesn’t mark dirty | Dirty index set exactly matches delta and excludes unchanged cells |
| Persistence parser/exporter | P0 | Import malformed payloads; import valid payloads; export schema fields | Invalid payloads return `null`; valid payloads preserve required fields |
| Tick lifecycle controls | P1 | `setTickRate`, pause/resume toggles, loop-driven tick count increase | Rate updates reflected, running state toggles correctly, ticks advance while running |
| CI gate wiring | P1 | Build + tests on PR | Workflow includes `pull_request` and runs `npm test` |

## Exit Gate Before PR2
1. All tests in `src/__tests__` pass locally via `npm test`.
2. Build passes via `npm run build`.
3. No behavior changes to engine contracts in this hardening PR.
4. New failures must be resolved or explicitly documented with rationale.
