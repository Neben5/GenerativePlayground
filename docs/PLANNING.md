# Margolus + Hilbert Refactor Planning Hub

## Problem Outset
The current simulation engine is structured around per-cell ticking, but the target modified Margolus approach is fundamentally neighborhood/block-based (2x2 updates with phase shifts). This mismatch limits direct implementation and can create complexity if handled as per-cell emulation only.

## Motivation
- Support modified Margolus behavior natively and safely.
- Preserve existing rule behavior during migration.
- Raise engine reliability through stronger tests and explicit merge gates.
- Evaluate Hilbert-layout locality gains using evidence before runtime adoption.

## Research Summary
- Existing engine loop computes next state per cell in [src/ECA.ts](src/ECA.ts).
- Rule contract is per-cell in [src/CARule.ts](src/CARule.ts).
- UI and persistence already support rule/neighborhood selection and state roundtrip.
- Modified Margolus requires phased block updates and clear boundary policy.
- Hilbert mapping likely helps locality but should be benchmark-gated before production changes.

## Program Decisions
- Migration strategy: hybrid (legacy per-cell + new neighborhood-step path).
- Modified Margolus rollout: deterministic MVP first.
- Phase ownership: rule-internal for modified Margolus.
- Boundary handling: paper-like partial edge updates.
- Hilbert rollout: benchmark-only prototype before adoption decision.

## PR Tracking

| PR | Title | Status | Primary Outputs | Handoff |
|---|---|---|---|---|
| PR1 | Test Foundation and CI Gate | Complete | Vitest setup, baseline tests, CI test gate | [docs/PR1_Handoff.md](docs/PR1_Handoff.md) |
| PR2 | Dual Interfaces and Compatibility | Complete | Neighborhood-step interfaces, iterate dual path, parity tests | [docs/PR2_Handoff.md](docs/PR2_Handoff.md) |
| PR3 | Neighborhood Scheduler Core | Planned | Scheduler/commit robustness, parity retention | [docs/PR3_Handoff.md](docs/PR3_Handoff.md) |
| PR4 | Deterministic Modified Margolus Rule | Planned | New rule integration, phase cycle, persistence checks | [docs/PR4_Handoff.md](docs/PR4_Handoff.md) |
| PR5 | Benchmark Harness and Baseline | Planned | `bench` commands, artifact schema, CI smoke benchmark | [docs/PR5_Handoff.md](docs/PR5_Handoff.md) |
| PR6 | Hilbert Prototype (Benchmark-Only) | Planned | Hilbert adapter prototype, measured comparison, recommendation | [docs/PR6_Handoff.md](docs/PR6_Handoff.md) |

## Quality and Merge Gates
- Required per PR:
  - `npm run build`
  - `npm test`
- Keep scope narrow to PR objective.
- No unrelated behavior changes.
- Update this plan and [docs/TEST_MATRIX.md](docs/TEST_MATRIX.md) when test scope changes.

## Supporting Docs
- Test strategy: [docs/TEST_MATRIX.md](docs/TEST_MATRIX.md)
- Research draft: [docs/Hilbert-Margolus.md](docs/Hilbert-Margolus.md)

## Open Risks
- Hidden parity regressions during scheduler migration.
- Boundary edge-case divergence for modified Margolus.
- Overstating Hilbert gains without reproducible benchmark controls.

## Next Action
Execute PR3 according to [docs/PR3_Handoff.md](docs/PR3_Handoff.md) and keep this tracker updated as PR status changes.
