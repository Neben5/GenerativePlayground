/**
 * NeighborhoodEngine tests
 *
 * Tests the Margolus (per-block) iteration engine in isolation from
 * rendering concerns.  All tests use the `CellSpace` / `MargolusRule`
 * interfaces directly so that no browser globals are required.
 */

import { Cell, CellSpace } from "../Cells";
import { MargolusRule, NeighborhoodType } from "../CARule";
import { RotationRule, RotationStates } from "../RotationRule";
import { buildHilbertOrder, hilbertToXY, nextPowerOfTwo, xyToHilbert } from "../HilbertCurve";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a 2D CellSpace from a row-major array of state numbers. */
function makeCellSpace(width: number, height: number, states: number[]): CellSpace {
  return CellSpace.createCellSpaceWithStartingValues([width, height], states);
}

/** Read out all states in row-major order from a CellSpace. */
function readStates(cs: CellSpace): number[] {
  return cs.cells.map((c) => c.state);
}

// ---------------------------------------------------------------------------
// MargolusRule interface
// ---------------------------------------------------------------------------

describe("MargolusRule.apply throws", () => {
  it("should throw when apply() is called directly", () => {
    const rule = new RotationRule();
    const cs = makeCellSpace(4, 4, new Array(16).fill(0));
    expect(() => rule.apply(cs, 0, 0)).toThrow();
  });
});

describe("RotationRule.neighborhoodType", () => {
  it("should report MARGOLUS", () => {
    const rule = new RotationRule();
    expect(rule.neighborhoodType).toBe(NeighborhoodType.MARGOLUS);
  });
});

// ---------------------------------------------------------------------------
// RotationRule block transitions
// ---------------------------------------------------------------------------

describe("RotationRule.applyToBlock", () => {
  const rule = new RotationRule();
  const E = new Cell(RotationStates.EMPTY);
  const P = new Cell(RotationStates.PARTICLE);

  // Helper to run a block and return state tuple
  function runBlock(
    tl: number, tr: number, bl: number, br: number, tick: number,
  ): [number, number, number, number] {
    const [a, b, c, d] = rule.applyToBlock(
      new Cell(tl), new Cell(tr), new Cell(bl), new Cell(br), tick,
    );
    return [a.state, b.state, c.state, d.state];
  }

  // --- even tick (clockwise) ---
  test("even tick: particle at TL rotates to TR (CW)", () => {
    expect(runBlock(1, 0, 0, 0, 0)).toEqual([0, 1, 0, 0]);
  });

  test("even tick: particle at TR rotates to BR (CW)", () => {
    expect(runBlock(0, 1, 0, 0, 0)).toEqual([0, 0, 0, 1]);
  });

  test("even tick: particle at BR rotates to BL (CW)", () => {
    expect(runBlock(0, 0, 0, 1, 0)).toEqual([0, 0, 1, 0]);
  });

  test("even tick: particle at BL rotates to TL (CW)", () => {
    expect(runBlock(0, 0, 1, 0, 0)).toEqual([1, 0, 0, 0]);
  });

  // --- odd tick (counter-clockwise) ---
  test("odd tick: particle at TL rotates to BL (CCW)", () => {
    expect(runBlock(1, 0, 0, 0, 1)).toEqual([0, 0, 1, 0]);
  });

  test("odd tick: particle at BL rotates to BR (CCW)", () => {
    expect(runBlock(0, 0, 1, 0, 1)).toEqual([0, 0, 0, 1]);
  });

  test("odd tick: particle at BR rotates to TR (CCW)", () => {
    expect(runBlock(0, 0, 0, 1, 1)).toEqual([0, 1, 0, 0]);
  });

  test("odd tick: particle at TR rotates to TL (CCW)", () => {
    expect(runBlock(0, 1, 0, 0, 1)).toEqual([1, 0, 0, 0]);
  });

  // --- stable blocks ---
  test("empty block stays empty", () => {
    expect(runBlock(0, 0, 0, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(runBlock(0, 0, 0, 0, 1)).toEqual([0, 0, 0, 0]);
  });

  test("full block stays unchanged", () => {
    expect(runBlock(1, 1, 1, 1, 0)).toEqual([1, 1, 1, 1]);
    expect(runBlock(1, 1, 1, 1, 1)).toEqual([1, 1, 1, 1]);
  });

  test("two-particle block stays unchanged (even)", () => {
    expect(runBlock(1, 1, 0, 0, 0)).toEqual([1, 1, 0, 0]);
    expect(runBlock(1, 0, 1, 0, 0)).toEqual([1, 0, 1, 0]);
  });

  test("three-particle block stays unchanged", () => {
    expect(runBlock(1, 1, 1, 0, 0)).toEqual([1, 1, 1, 0]);
  });
});

// ---------------------------------------------------------------------------
// Four full rotations restore original state
// ---------------------------------------------------------------------------

describe("RotationRule full-cycle invariant", () => {
  const rule = new RotationRule();

  // Clockwise: 4 rotations restore original (all even ticks)
  const singleParticleBlocks: Array<[number, number, number, number]> = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];

  test.each(singleParticleBlocks)(
    "4 CW rotations restore original: block [%d,%d,%d,%d]",
    (tl, tr, bl, br) => {
      let state: [number, number, number, number] = [tl, tr, bl, br];
      for (let i = 0; i < 4; i++) {
        const cells = state.map((s) => new Cell(s)) as [Cell, Cell, Cell, Cell];
        const result = rule.applyToBlock(...cells, 0 /* even */);
        state = result.map((c) => c.state) as [number, number, number, number];
      }
      expect(state).toEqual([tl, tr, bl, br]);
    },
  );
});

// ---------------------------------------------------------------------------
// Margolus engine: iterateMargolus via a thin test harness
// ---------------------------------------------------------------------------

/**
 * Minimal stand-in for CA that exercises the Margolus iteration logic
 * without browser / canvas dependencies.
 */
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
    return readStates(this.cellSpace);
  }
}

describe("MargolusEngine: even-tick block partitioning (4×4 grid)", () => {
  // 4×4 grid, one particle at position (0,0) (top-left)
  // On even tick (offset=0): block (row=0,col=0) contains indices 0,1,4,5
  // Particle at TL should rotate to TR on even tick
  test("particle at (0,0) moves to (0,1) on first tick", () => {
    const states = new Array(16).fill(0);
    states[0] = 1; // (row=0, col=0)
    const engine = new MargolusEngine(4, 4, states);
    engine.iterate(new RotationRule());
    const result = engine.getStates();
    expect(result[1]).toBe(1); // (row=0, col=1)
    expect(result[0]).toBe(0);
  });

  test("particle count is conserved across one tick", () => {
    const states = [
      1, 0, 1, 0,
      0, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
    ];
    const engine = new MargolusEngine(4, 4, states);
    const before = states.filter((s) => s === 1).length;
    engine.iterate(new RotationRule());
    const after = engine.getStates().filter((s) => s === 1).length;
    expect(after).toBe(before);
  });
});

describe("MargolusEngine: odd-tick offset", () => {
  // After the first (even) tick the engine is at tick 1 (odd).
  // Odd partition offset=1: the single block in a 4×4 grid covers rows 1-2, cols 1-2.
  test("odd tick uses (1,1) offset — particle cascades through two ticks", () => {
    // Start with particle at (0,1):
    //   tick 0 (even): particle is TR of block(0,0) → CW → moves to BR=(1,1)=index5
    //   tick 1 (odd):  particle is TL of block(1,1) → CCW → moves to BL=(2,1)=index9
    const states = new Array(16).fill(0);
    states[1] = 1; // row=0, col=1 → index = 0*4+1 = 1
    const engine = new MargolusEngine(4, 4, states);
    engine.iterate(new RotationRule()); // tick 0 (even)
    engine.iterate(new RotationRule()); // tick 1 (odd)
    const result = engine.getStates();
    expect(result[9]).toBe(1); // row=2, col=1 → index = 2*4+1 = 9
    expect(result[1]).toBe(0);
    expect(result[5]).toBe(0);
  });
});

describe("MargolusEngine: dirty-rect tracking", () => {
  test("only changed cells are marked dirty", () => {
    // One particle in top-left block, rest empty
    const states = new Array(16).fill(0);
    states[0] = 1;
    const engine = new MargolusEngine(4, 4, states);
    engine.iterate(new RotationRule());
    // The particle moved from index 0 to index 1 → both should be dirty
    expect(engine.dirtyIndices.has(0)).toBe(true); // vacated
    expect(engine.dirtyIndices.has(1)).toBe(true); // now occupied
    // Cells that didn't change should not be marked dirty
    expect(engine.dirtyIndices.has(4)).toBe(false);
    expect(engine.dirtyIndices.has(5)).toBe(false);
  });

  test("no dirty cells when nothing changes (empty grid)", () => {
    const states = new Array(16).fill(0);
    const engine = new MargolusEngine(4, 4, states);
    engine.iterate(new RotationRule());
    expect(engine.dirtyIndices.size).toBe(0);
  });

  test("no dirty cells when full grid (all particles)", () => {
    const states = new Array(16).fill(1);
    const engine = new MargolusEngine(4, 4, states);
    engine.iterate(new RotationRule());
    expect(engine.dirtyIndices.size).toBe(0);
  });
});
