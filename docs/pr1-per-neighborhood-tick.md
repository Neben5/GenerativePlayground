# PR1 — Per-Neighborhood Tick Model

## Summary

Replace the current per-cell iteration in `CA.iterate()` with a per-neighborhood iteration. Instead of computing `nextState(cell_i)` for every index `i` independently, the engine groups cells into neighborhoods and applies the rule atomically to each neighborhood.

## Motivation

The current `iterate()` loop calls `currentRule.apply(cellSpace, row, col)` for every cell. Rules can already read their full neighborhood from `cellSpace`, so there are no correctness issues — but:

- A Margolus rule **must** write all 4 cells of a block at once; per-cell dispatch makes this impossible without side effects.
- Per-neighborhood dispatch is the natural fit for rules that express transformations on blocks (Margolus, HPP gas, etc.).
- Benchmark target: per-neighborhood dispatch should match or beat per-cell dispatch for Moore rules.

## Interface Changes

### `CARule` (in `src/CARule.ts`)

Add an optional `applyNeighborhood` method. Rules that want to use the new model implement this; existing rules fall back to the current `apply` per-cell path.

```ts
export abstract class CARule {
  // existing per-cell apply — still required for Moore / Elementary rules
  abstract apply(cellSpace: CellSpace, row: number, col: number): Cell;

  /**
   * Optional: apply rule to an entire neighborhood block.
   * Receives neighborhood coordinates and writes next states into `out`.
   * Default implementation calls apply() for each cell in the block.
   * @param cellSpace - current cell space
   * @param blockRow  - top-left row of the neighborhood block
   * @param blockCol  - top-left col of the neighborhood block
   * @param out       - output buffer to write next states into (pre-allocated)
   */
  applyNeighborhood?(
    cellSpace: CellSpace,
    blockRow: number,
    blockCol: number,
    out: Cell[]
  ): void;
}
```

### `CA.iterate()` (in `src/ECA.ts`)

New iteration path when `currentRule.applyNeighborhood` is defined:

```ts
iterate() {
  if (typeof this.currentRule.applyNeighborhood === 'function') {
    this.iterateByNeighborhood();
  } else {
    this.iterateByCell(); // existing path
  }
}
```

## Testable Interface

All test cases live in `src/__tests__/NeighborhoodEngine.test.ts`.

| Test | What it checks |
|---|---|
| `iterate() produces correct next state for Rule110` | Per-cell fallback still works |
| `iterate() produces correct next state for SandRule` | Moore neighborhood produces same result as before |
| `applyNeighborhood() is called for Margolus-type rules` | Per-neighborhood dispatch path |
| `iterate() with block rule writes all cells in block` | Block atomicity |
| `iterate() dirty tracking works for neighborhood changes` | Changed cells are marked dirty |
| `iterate() unchanged cells are not dirty` | Unchanged cells not in dirty set |

## Files Touched

- `src/CARule.ts` — add optional `applyNeighborhood`
- `src/ECA.ts` — add `iterateByNeighborhood()` dispatch
- `src/__tests__/NeighborhoodEngine.test.ts` — new test file
