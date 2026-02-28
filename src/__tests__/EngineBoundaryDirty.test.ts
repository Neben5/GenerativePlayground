/**
 * EngineBoundaryDirty tests
 *
 * Tests for boundary conditions in Margolus block partitioning and
 * dirty-rect tracking.  Covers edge cases such as grids with odd
 * dimensions, single-cell grids, and grids where the block partition
 * offset produces no valid blocks.
 */

import { Cell, CellSpace } from "../Cells";
import { MargolusRule } from "../CARule";
import { RotationRule, RotationStates } from "../RotationRule";
import { buildHilbertOrder, hilbertToXY, nextPowerOfTwo, xyToHilbert } from "../HilbertCurve";

// ---------------------------------------------------------------------------
// Helpers (same thin harness as NeighborhoodEngine.test.ts)
// ---------------------------------------------------------------------------

function makeCellSpace(width: number, height: number, states: number[]): CellSpace {
  return CellSpace.createCellSpaceWithStartingValues([width, height], states);
}

class MargolusEngine {
  cellSpace: CellSpace;
  private tickCount = 0;
  dirtyIndices: Set<number> = new Set();

  constructor(width: number, height: number, states: number[]) {
    this.cellSpace = makeCellSpace(width, height, states);
  }

  iterate(rule: MargolusRule): void {
    const width  = this.cellSpace.dimensionOrders[0];
    const height = this.cellSpace.dimensionOrders[1];
    const offset = this.tickCount % 2;

    for (let row = offset; row + 1 < height; row += 2) {
      for (let col = offset; col + 1 < width; col += 2) {
        const tlIdx = this.cellSpace.getIndexRC(row,     col);
        const trIdx = this.cellSpace.getIndexRC(row,     col + 1);
        const blIdx = this.cellSpace.getIndexRC(row + 1, col);
        const brIdx = this.cellSpace.getIndexRC(row + 1, col + 1);

        const tl = this.cellSpace.cells[tlIdx];
        const tr = this.cellSpace.cells[trIdx];
        const bl = this.cellSpace.cells[blIdx];
        const br = this.cellSpace.cells[brIdx];

        const [newTl, newTr, newBl, newBr] = rule.applyToBlock(tl, tr, bl, br, this.tickCount);

        if (tl.state !== newTl.state) { tl.state = newTl.state; this.dirtyIndices.add(tlIdx); }
        if (tr.state !== newTr.state) { tr.state = newTr.state; this.dirtyIndices.add(trIdx); }
        if (bl.state !== newBl.state) { bl.state = newBl.state; this.dirtyIndices.add(blIdx); }
        if (br.state !== newBr.state) { br.state = newBr.state; this.dirtyIndices.add(brIdx); }
      }
    }
    this.tickCount++;
  }

  getStates(): number[] {
    return this.cellSpace.cells.map((c) => c.state);
  }

  get tick(): number {
    // expose for assertions
    return (this as any).tickCount;
  }
}

// ---------------------------------------------------------------------------
// Boundary: grids with odd dimensions
// ---------------------------------------------------------------------------

describe("Margolus boundary: 3×3 grid (odd dimension)", () => {
  // A 3×3 grid has only one 2×2 block at (0,0) on even ticks.
  // The rightmost column and bottom row have no partner → untouched.
  test("even tick: only block (0,0)→(1,1) is processed, border cells unchanged", () => {
    //  layout (row, col):
    //  [0,0] [0,1] [0,2]
    //  [1,0] [1,1] [1,2]
    //  [2,0] [2,1] [2,2]
    // Place a particle at (0,0); even-tick block → particle should rotate CW to (0,1)
    const states = [
      1, 0, 0,
      0, 0, 0,
      0, 0, 0,
    ];
    const engine = new MargolusEngine(3, 3, states);
    engine.iterate(new RotationRule());
    const result = engine.getStates();
    expect(result[1]).toBe(1); // (0,1)
    expect(result[0]).toBe(0); // (0,0) vacated
    // Border cells should be untouched
    expect(result[2]).toBe(0); // (0,2)
    expect(result[5]).toBe(0); // (1,2)
    expect(result[6]).toBe(0); // (2,0)
    expect(result[7]).toBe(0); // (2,1)
    expect(result[8]).toBe(0); // (2,2)
  });

  test("odd tick: offset=1, one 2×2 block fits in 3×3 at (1,1)–(2,2)", () => {
    // Start particle at (0,1):
    //   tick 0 (even): particle is TR of block(0,0) → CW → moves to BR=(1,1)=index4
    //   tick 1 (odd):  particle is TL of block(1,1) → CCW → moves to BL=(2,1)=index7
    const states = [
      0, 1, 0,
      0, 0, 0,
      0, 0, 0,
    ];
    const engine = new MargolusEngine(3, 3, states);
    engine.iterate(new RotationRule()); // tick 0 (even)
    engine.iterate(new RotationRule()); // tick 1 (odd) — block at (1,1)
    const result = engine.getStates();
    // row=2, col=1 → index = 2*3+1 = 7
    expect(result[7]).toBe(1);
    expect(result[4]).toBe(0); // (1,1) vacated
  });
});

describe("Margolus boundary: 1×1 grid", () => {
  test("no block is ever processed — cell never changes", () => {
    const engine = new MargolusEngine(1, 1, [1]);
    engine.iterate(new RotationRule()); // even
    engine.iterate(new RotationRule()); // odd
    expect(engine.getStates()).toEqual([1]);
    expect(engine.dirtyIndices.size).toBe(0);
  });
});

describe("Margolus boundary: 2×2 grid (exactly one block)", () => {
  test("even tick: exactly one block covers the whole grid", () => {
    const states = [1, 0, 0, 0];
    const engine = new MargolusEngine(2, 2, states);
    engine.iterate(new RotationRule()); // tick 0 (even): particle at TL→TR
    expect(engine.getStates()).toEqual([0, 1, 0, 0]);
  });

  test("odd tick: offset=1, no block fits — grid unchanged", () => {
    const states = [1, 0, 0, 0];
    const engine = new MargolusEngine(2, 2, states);
    engine.iterate(new RotationRule()); // tick 0 (even)  → [0,1,0,0]
    engine.iterate(new RotationRule()); // tick 1 (odd)   → no block fits, unchanged
    expect(engine.getStates()).toEqual([0, 1, 0, 0]);
  });

  test("two full ticks are one CW + one no-op — not the same as two CW", () => {
    const states = [1, 0, 0, 0];
    const engine = new MargolusEngine(2, 2, states);
    engine.iterate(new RotationRule()); // even → TL→TR
    engine.iterate(new RotationRule()); // odd  → no-op
    expect(engine.getStates()).toEqual([0, 1, 0, 0]);
  });
});

// ---------------------------------------------------------------------------
// Dirty-rect: boundary cells that are never in a block stay clean
// ---------------------------------------------------------------------------

describe("Dirty-rect: boundary cells in odd-dimension grid", () => {
  test("right-column border cells never get marked dirty (even ticks, 3×3)", () => {
    // All particles on the right column (col=2); they never appear in any block.
    const states = [
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
    ];
    const engine = new MargolusEngine(3, 3, states);
    engine.iterate(new RotationRule());
    // indices for col=2: 2, 5, 8
    expect(engine.dirtyIndices.has(2)).toBe(false);
    expect(engine.dirtyIndices.has(5)).toBe(false);
    expect(engine.dirtyIndices.has(8)).toBe(false);
  });

  test("bottom-row border cells never get marked dirty (even ticks, 3×3)", () => {
    // All particles on the bottom row (row=2)
    const states = [
      0, 0, 0,
      0, 0, 0,
      1, 1, 1,
    ];
    const engine = new MargolusEngine(3, 3, states);
    engine.iterate(new RotationRule());
    // indices for row=2: 6, 7, 8
    expect(engine.dirtyIndices.has(6)).toBe(false);
    expect(engine.dirtyIndices.has(7)).toBe(false);
    expect(engine.dirtyIndices.has(8)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hilbert curve utilities
// ---------------------------------------------------------------------------

describe("nextPowerOfTwo", () => {
  test.each([
    [1, 1], [2, 2], [3, 4], [4, 4],
    [5, 8], [7, 8], [8, 8], [9, 16],
  ])("nextPowerOfTwo(%d) === %d", (v, expected) => {
    expect(nextPowerOfTwo(v)).toBe(expected);
  });
});

describe("xyToHilbert / hilbertToXY round-trip", () => {
  const sizes = [2, 4, 8];
  for (const n of sizes) {
    test(`round-trip for n=${n}`, () => {
      for (let x = 0; x < n; x++) {
        for (let y = 0; y < n; y++) {
          const d = xyToHilbert(n, x, y);
          const { x: rx, y: ry } = hilbertToXY(n, d);
          expect(rx).toBe(x);
          expect(ry).toBe(y);
        }
      }
    });
  }
});

describe("xyToHilbert produces unique values", () => {
  test("all n*n distances are distinct for n=4", () => {
    const n = 4;
    const distances = new Set<number>();
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        distances.add(xyToHilbert(n, x, y));
      }
    }
    expect(distances.size).toBe(n * n);
  });
});

describe("buildHilbertOrder", () => {
  test("returns all flat indices exactly once for a 4×4 grid", () => {
    const order = buildHilbertOrder(4, 4);
    expect(order.length).toBe(16);
    const set = new Set(order);
    expect(set.size).toBe(16);
    for (let i = 0; i < 16; i++) {
      expect(set.has(i)).toBe(true);
    }
  });

  test("returns all flat indices exactly once for a non-power-of-two 3×5 grid", () => {
    const order = buildHilbertOrder(3, 5);
    expect(order.length).toBe(15);
    const set = new Set(order);
    expect(set.size).toBe(15);
    for (let i = 0; i < 15; i++) {
      expect(set.has(i)).toBe(true);
    }
  });

  test("returns correct single index for 1×1 grid", () => {
    expect(buildHilbertOrder(1, 1)).toEqual([0]);
  });
});

describe("CellSpace.getIndexRC boundary behaviour", () => {
  test("getIndexRC returns correct flat index for known positions", () => {
    const cs = makeCellSpace(4, 3, new Array(12).fill(0));
    // row-major: index = row * width + col
    expect(cs.getIndexRC(0, 0)).toBe(0);
    expect(cs.getIndexRC(0, 3)).toBe(3);
    expect(cs.getIndexRC(2, 3)).toBe(11);
    expect(cs.getIndexRC(1, 2)).toBe(6);
  });
});
