# PR1 Handoff: Test Foundation and CI Gate

## Objective
Establish a reliable test foundation and CI merge gate before engine architecture changes.

## Scope
- Add and configure Vitest for the TypeScript codebase.
- Add baseline invariant tests for core subsystems.
- Enforce build + test execution in CI for pull requests.

## Out of Scope
- Engine behavior changes.
- Rule algorithm refactors.
- Performance benchmark infrastructure.

## Files to Touch
- [package.json](package.json)
- [package-lock.json](package-lock.json)
- [vitest.config.ts](vitest.config.ts)
- [.github/workflows/webpack.yml](.github/workflows/webpack.yml)
- New tests under [src/__tests__](src/__tests__)

## Implementation Checklist
1. Add `test` and watch scripts for Vitest.
2. Configure Vitest environment for DOM-aware tests.
3. Add baseline tests for:
   - indexing and bounds behavior,
   - iterate invariants,
   - persistence import/export roundtrip.
4. Ensure CI executes `npm run build` and `npm test` on pull requests.

## Test Additions
- [src/__tests__/Cells.test.ts](src/__tests__/Cells.test.ts)
- [src/__tests__/ECA.test.ts](src/__tests__/ECA.test.ts)
- [src/__tests__/Persistence.test.ts](src/__tests__/Persistence.test.ts)

## Merge Gate
- npm run build passes.
- npm test passes.
- CI workflow runs on pull requests and includes tests.

## Reviewer Notes
- Confirm no runtime behavior changes were introduced.
- Confirm test setup remains lightweight and deterministic.
