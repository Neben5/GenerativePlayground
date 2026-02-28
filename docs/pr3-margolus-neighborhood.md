# PR3 — Modified Margolus Neighborhood

## Summary

Implement the **Margolus neighborhood** as a new rule/engine pair. The grid is partitioned into 2×2 blocks that alternate between an *even phase* (top-left corner at even coordinates) and an *odd phase* (blocks offset by (1,1)) each tick. Rules operate on entire 2×2 blocks atomically, enabling reversible and conservation-law cellular automata.

## Background

The Margolus neighborhood was introduced in Toffoli & Margolus (1987) as a way to implement physics-like simulations on a grid with conservation laws. It is the foundation for:

- **Critters** — a reversible billiard-ball–style CA
- **HPP gas** — a simple lattice-gas model for fluid dynamics
- **Diffusion** — randomised block swaps model diffusion accurately

The key property is **atomicity**: all four cells in a 2×2 block are read and written together within a single tick, so no cell can "move twice" in one tick.

## Interface

### `MargolusRule` (new file `src/MargolusRule.ts`)

```ts
export interface BlockState {
  topLeft:     number;
  topRight:    number;
  bottomLeft:  number;
  bottomRight: number;
}

export interface BlockNext {
  topLeft:     number;
  topRight:    number;
  bottomLeft:  number;
  bottomRight: number;
}

/**
 * Base class for 2×2 Margolus block rules.
 * Implement applyBlock() to define block transformation.
 */
export abstract class MargolusRule extends CARule {
  readonly neighborhoodType = NeighborhoodType.MARGOLUS;

  /**
   * Transform a 2×2 block.
   * @param block  current states of the four cells
   * @param phase  0 = even phase, 1 = odd phase
   * @returns      next states of the four cells
   */
  abstract applyBlock(block: BlockState, phase: 0 | 1): BlockNext;

  // CARule.apply() is implemented in terms of applyBlock() — do not override.
  apply(cellSpace: CellSpace, row: number, col: number): Cell { … }
}
```

### `NeighborhoodType` (in `src/CARule.ts`)

Add `MARGOLUS = "margolus"` to the enum.

### Example: `CrittersRule` (in `src/MargolusRule.ts`)

Critters is a reversible rule: if no occupied cell in a block, rotate the block 90°; if all occupied, rotate 180°; otherwise keep.

```ts
export class CrittersRule extends MargolusRule {
  name = "Critters";
  ruleName = "critters";

  applyBlock(block: BlockState, phase: 0 | 1): BlockNext {
    const sum = block.topLeft + block.topRight +
                block.bottomLeft + block.bottomRight;
    if (sum === 0 || sum === 4) {
      // Rotate 180°
      return { topLeft: block.bottomRight, topRight: block.bottomLeft,
               bottomLeft: block.topRight, bottomRight: block.topLeft };
    }
    // Rotate 90° clockwise
    return { topLeft: block.bottomLeft, topRight: block.topLeft,
             bottomLeft: block.bottomRight, bottomRight: block.topRight };
  }
}
```

## Tick Mechanism

`CA.iterate()` detects `neighborhoodType === NeighborhoodType.MARGOLUS` and switches to Margolus tick logic:

```
phase = tick_count % 2          // 0 = even, 1 = odd
offset = phase === 0 ? 0 : 1

for blockRow in 0 .. (height / 2):
  for blockCol in 0 .. (width / 2):
    r = blockRow * 2 + offset
    c = blockCol * 2 + offset
    read 2×2 block at (r, c)   (wrapping boundary)
    next = rule.applyBlock(block, phase)
    write 2×2 block back
```

## Testable Interface

All test cases live in `src/__tests__/MargolusNeighborhood.test.ts`.

| Test | What it checks |
|---|---|
| `CrittersRule.applyBlock` — empty block rotates 180° | Rule table correctness |
| `CrittersRule.applyBlock` — full block rotates 180° | Rule table correctness |
| `CrittersRule.applyBlock` — mixed block rotates 90° | Rule table correctness |
| `CA.iterate()` even phase processes blocks at (0,0),(0,2),(2,0),(2,2)…  | Even phase block alignment |
| `CA.iterate()` odd phase processes blocks at (1,1),(1,3),(3,1),(3,3)…  | Odd phase block alignment |
| Phase alternates every tick | Phase counter increments |
| Particle count conserved over 100 ticks (Critters) | Conservation law |
| Round-trip: applying Critters 2× returns to original state | Reversibility |

## Files Touched

- `src/CARule.ts` — add `NeighborhoodType.MARGOLUS` and metadata entry
- `src/MargolusRule.ts` — new file: `MargolusRule`, `CrittersRule`
- `src/ECA.ts` — Margolus tick path in `CA.iterate()`
- `src/__tests__/MargolusNeighborhood.test.ts` — new test file
