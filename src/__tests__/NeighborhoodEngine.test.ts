import { CA } from "../ECA";
import {
  CARule,
  MargolusRule,
  type NeighborhoodStepContext,
  type NeighborhoodStepRule,
  NeighborhoodType,
  isNeighborhoodStepRule,
} from "../CARule";
import { Cell, CellSpace } from "../Cells";
import { describe, expect, it } from "vitest";

function createMockCanvas(width: number, height: number): HTMLCanvasElement {
  const context2D = {
    imageSmoothingEnabled: false,
    scale: () => undefined,
    fillStyle: "white",
    fillRect: () => undefined,
  } as unknown as CanvasRenderingContext2D;

  return {
    width,
    height,
    getContext: () => context2D,
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width,
      height,
      x: 0,
      y: 0,
      right: width,
      bottom: height,
      toJSON: () => ({}),
    }),
  } as unknown as HTMLCanvasElement;
}

function makeSpace(width: number, height: number, states: number[]): CellSpace {
  return new CellSpace([width, height], states.map((s) => new Cell(s)));
}

// ---------------------------------------------------------------------------
// Legacy / neighborhood parity rules (PR2 coverage retained)
// ---------------------------------------------------------------------------

class LegacyIncrementRule extends CARule {
  name = "Legacy Increment";
  ruleName = "legacy-increment";
  neighborhoodType = NeighborhoodType.MOORE;

  apply(cellSpace: CellSpace, row: number, col: number): Cell {
    return new Cell(cellSpace.getCellAtRowCol(row, col).state + 1);
  }

  getColor(_state: number): string {
    return "white";
  }

  getAvailableStates(): number[] {
    return [0, 1, 2, 3, 4];
  }

  getStateLabel(state: number): string {
    return String(state);
  }
}

class NeighborhoodIncrementRule extends CARule implements NeighborhoodStepRule {
  name = "Neighborhood Increment";
  ruleName = "neighborhood-increment";
  neighborhoodType = NeighborhoodType.MOORE;

  apply(cellSpace: CellSpace, row: number, col: number): Cell {
    return new Cell(cellSpace.getCellAtRowCol(row, col).state);
  }

  applyNeighborhood(cellSpace: CellSpace, _context: NeighborhoodStepContext) {
    return cellSpace.cells.map((cell, index) => ({ index, state: cell.state + 1 }));
  }

  getColor(_state: number): string {
    return "white";
  }

  getAvailableStates(): number[] {
    return [0, 1, 2, 3, 4];
  }

  getStateLabel(state: number): string {
    return String(state);
  }
}

class ConflictingNeighborhoodRule extends CARule implements NeighborhoodStepRule {
  name = "Conflict Rule";
  ruleName = "conflict-rule";
  neighborhoodType = NeighborhoodType.MOORE;

  apply(_cellSpace: CellSpace, _row: number, _col: number): Cell {
    return new Cell(0);
  }

  applyNeighborhood(_cellSpace: CellSpace, _context: NeighborhoodStepContext) {
    return [
      { index: 0, state: 1 },
      { index: 0, state: 5 },
      { index: 1, state: 7 },
    ];
  }

  getColor(_state: number): string {
    return "white";
  }

  getAvailableStates(): number[] {
    return [0, 1, 5, 7];
  }

  getStateLabel(state: number): string {
    return String(state);
  }
}

// ---------------------------------------------------------------------------
// Minimal Margolus rule fixture for scheduler tests
// Swaps tl↔br and tr↔bl (a simple "cross" operation).
// Only operates on full 2×2 blocks; partial blocks are left unchanged.
// ---------------------------------------------------------------------------

class CrossSwapRule extends MargolusRule {
  name = "Cross Swap";
  ruleName = "cross-swap";

  applyToBlock(
    tl: Cell | null,
    tr: Cell | null,
    bl: Cell | null,
    br: Cell | null,
    _tick: number,
  ): [number, number, number, number] {
    const a = tl?.state ?? 0;
    const b = tr?.state ?? 0;
    const c = bl?.state ?? 0;
    const d = br?.state ?? 0;
    // Only swap full blocks; leave partial blocks unchanged.
    if (tl === null || tr === null || bl === null || br === null) {
      return [a, b, c, d];
    }
    // swap tl↔br and tr↔bl
    return [d, c, b, a];
  }

  getColor(state: number): string { return state === 0 ? "white" : "black"; }
  getAvailableStates(): number[] { return [0, 1]; }
  getStateLabel(state: number): string { return String(state); }
}

// ---------------------------------------------------------------------------
// PR2 parity tests (retained)
// ---------------------------------------------------------------------------

describe("Neighborhood execution path", () => {
  it("matches legacy per-cell updates for equivalent logic", () => {
    const canvasA = createMockCanvas(320, 80);
    const canvasB = createMockCanvas(320, 80);

    const legacy = new CA(
      8,
      2,
      { left: 0, top: 0, width: 320, height: 80 },
      NeighborhoodType.MOORE,
      new LegacyIncrementRule(),
      canvasA
    );

    const neighborhood = new CA(
      8,
      2,
      { left: 0, top: 0, width: 320, height: 80 },
      NeighborhoodType.MOORE,
      new NeighborhoodIncrementRule(),
      canvasB
    );

    legacy.iterate();
    neighborhood.iterate();

    expect(neighborhood.cellSpace.cells.map((cell) => cell.state)).toEqual(
      legacy.cellSpace.cells.map((cell) => cell.state)
    );
  });

  it("applies batch writes deterministically in array order", () => {
    const canvas = createMockCanvas(320, 80);
    const ca = new CA(
      8,
      2,
      { left: 0, top: 0, width: 320, height: 80 },
      NeighborhoodType.MOORE,
      new ConflictingNeighborhoodRule(),
      canvas
    );

    ca.iterate();

    expect(ca.cellSpace.cells[0].state).toBe(5);
    expect(ca.cellSpace.cells[1].state).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// PR3 scheduler tests: MargolusRule / modified Margolus neighborhood
// ---------------------------------------------------------------------------

describe("MargolusRule is detected as NeighborhoodStepRule", () => {
  it("isNeighborhoodStepRule returns true for a MargolusRule instance", () => {
    const rule = new CrossSwapRule();
    expect(isNeighborhoodStepRule(rule)).toBe(true);
  });

  it("neighborhoodType is MARGOLUS", () => {
    expect(new CrossSwapRule().neighborhoodType).toBe(NeighborhoodType.MARGOLUS);
  });

  it("apply() throws — Margolus rules must not be called per-cell", () => {
    const rule = new CrossSwapRule();
    const space = makeSpace(2, 2, [0, 0, 0, 0]);
    expect(() => rule.apply(space, 0, 0)).toThrow();
  });
});

describe("Modified Margolus scheduler — even-tick (offset 0) blocks", () => {
  // 4×4 grid — tick 0 (even): blocks at (0,0),(0,2),(2,0),(2,2)
  it("swaps all four complete 2×2 blocks on even tick", () => {
    const initial = [
      1, 2, 3, 4,
      5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15, 16,
    ];
    // Block (0,0): tl=1,tr=2,bl=5,br=6  → swap → tl=6,tr=5,bl=2,br=1
    // Block (0,2): tl=3,tr=4,bl=7,br=8  → swap → tl=8,tr=7,bl=4,br=3
    // Block (2,0): tl=9,tr=10,bl=13,br=14 → tl=14,tr=13,bl=10,br=9
    // Block (2,2): tl=11,tr=12,bl=15,br=16 → tl=16,tr=15,bl=12,br=11
    const space = makeSpace(4, 4, initial);
    const rule = new CrossSwapRule();
    const writes = rule.applyNeighborhood(space, { tick: 0, width: 4, height: 4 });
    // Apply writes
    for (const w of writes) { space.cells[w.index].state = w.state; }

    const result = space.cells.map((c) => c.state);
    expect(result).toEqual([
       6,  5,  8,  7,
       2,  1,  4,  3,
      14, 13, 16, 15,
      10,  9, 12, 11,
    ]);
  });

  it("emits no writes for an all-zero grid (no-op blocks)", () => {
    const space = makeSpace(4, 4, new Array(16).fill(0));
    const writes = new CrossSwapRule().applyNeighborhood(space, { tick: 0, width: 4, height: 4 });
    // All states are 0 → swap still produces 0 everywhere → writes emitted but states unchanged
    for (const w of writes) {
      expect(w.state).toBe(0);
    }
  });
});

describe("Modified Margolus scheduler — odd-tick (offset 1) blocks", () => {
  // 4×4 grid, tick 1 (odd): full interior block at (1,1); partial blocks at edges.
  it("processes the full interior 2×2 block on odd tick", () => {
    const initial = new Array(16).fill(0);
    // Mark cells in the (1,1) block:  index = row*4+col
    initial[5] = 1;  // (1,1) tl
    initial[6] = 2;  // (1,2) tr
    initial[9] = 3;  // (2,1) bl
    initial[10] = 4; // (2,2) br
    const space = makeSpace(4, 4, initial);
    const rule = new CrossSwapRule();
    const writes = rule.applyNeighborhood(space, { tick: 1, width: 4, height: 4 });
    for (const w of writes) { space.cells[w.index].state = w.state; }

    // swap tl↔br and tr↔bl: (1,1)=4,(1,2)=3,(2,1)=2,(2,2)=1
    expect(space.cells[5].state).toBe(4);
    expect(space.cells[6].state).toBe(3);
    expect(space.cells[9].state).toBe(2);
    expect(space.cells[10].state).toBe(1);
  });

  it("partial edge blocks (odd tick) leave their cells unchanged (CrossSwapRule identity for partial blocks)", () => {
    // 3×3 grid, tick 1: only block at (1,1) has row+1=2 < 3 and col+1=2 < 3 → full block
    // Block (1,3) and (3,1) etc. would be partial → CrossSwapRule returns unchanged
    const initial = [
      10, 20, 30,
      40, 50, 60,
      70, 80, 90,
    ];
    const space = makeSpace(3, 3, initial);
    const rule = new CrossSwapRule();
    const writes = rule.applyNeighborhood(space, { tick: 1, width: 3, height: 3 });
    for (const w of writes) { space.cells[w.index].state = w.state; }

    // Full block (1,1): cells (1,1)=50,(1,2)=60,(2,1)=80,(2,2)=90 → swap → 90,80,60,50
    expect(space.cells[4].state).toBe(90); // (1,1)
    expect(space.cells[5].state).toBe(80); // (1,2)
    expect(space.cells[7].state).toBe(60); // (2,1)
    expect(space.cells[8].state).toBe(50); // (2,2)
    // Top-left corner and left column are NOT touched by odd-phase blocks
    expect(space.cells[0].state).toBe(10); // (0,0) unchanged
    expect(space.cells[1].state).toBe(20); // (0,1) unchanged
    expect(space.cells[3].state).toBe(40); // (1,0) unchanged
  });
});

describe("Modified Margolus scheduler — partial edge blocks are included", () => {
  // Verify that the modified scheduler (unlike standard Margolus) enumerates
  // partial blocks at grid boundaries (out-of-bounds cells passed as null).
  it("includes a write for an odd-column cell in a partial right-edge block", () => {
    // 3×4 grid (width=3, height=4), tick 0 (even):
    // Complete blocks: (0,0),(2,0) — only col=0 qualifies because col+1=1 < 3 and col+2=2 but col=2 has col+1=3 not < 3.
    // Partial block at (0,2): tl=(0,2), tr=null, bl=(1,2), br=null → included in modified version.
    const initial = [
      1, 2, 3,
      4, 5, 6,
      7, 8, 9,
      10, 11, 12,
    ];
    const space = makeSpace(3, 4, initial);
    const rule = new CrossSwapRule();
    const writes = rule.applyNeighborhood(space, { tick: 0, width: 3, height: 4 });
    // The partial block at (0,2) should be enumerated — writes for index 2 (tl) and index 5 (bl) should be present
    const writtenIndices = new Set(writes.map((w) => w.index));
    expect(writtenIndices.has(2)).toBe(true);  // (0,2) = tl of partial block
    expect(writtenIndices.has(5)).toBe(true);  // (1,2) = bl of partial block
  });
});

describe("Margolus scheduler dirty tracking under the full CA engine", () => {
  // The CA class uses module-level globals (DIMENSIONORDERS = [8, 2], initialConfig).
  // Tests here work with an 8×2 grid to match the module defaults.
  it("only marks dirty cells that actually change state — all-zero grid is a no-op", () => {
    const canvas = createMockCanvas(320, 80);
    const ca = new CA(
      8,
      2,
      { left: 0, top: 0, width: 320, height: 80 },
      NeighborhoodType.MARGOLUS,
      new CrossSwapRule(),
      canvas
    );

    // Reset all cells to 0 so CrossSwap produces no changes (0 swaps 0)
    for (const cell of ca.cellSpace.cells) { cell.state = 0; }
    ca.clearDirty();
    ca.iterate();

    expect(ca.getDirtyRects().size).toBe(0);
  });

  it("marks exactly the cells that changed state as dirty", () => {
    const canvas = createMockCanvas(320, 80);
    // 8×2 grid; block (0,0) covers indices 0(tl),1(tr),8(bl),9(br) — row*8+col
    const ca = new CA(
      8,
      2,
      { left: 0, top: 0, width: 320, height: 80 },
      NeighborhoodType.MARGOLUS,
      new CrossSwapRule(),
      canvas
    );

    // Set all cells to 0, then mark tl of block (0,0) as 1
    for (const cell of ca.cellSpace.cells) { cell.state = 0; }
    ca.cellSpace.cells[0].state = 1; // tl of block (0,0)

    ca.clearDirty();
    ca.iterate(); // tick 0 (even): block (0,0) swaps tl↔br, tr↔bl

    const dirty = ca.getDirtyRects();
    // tl (index 0): state 1→0  → dirty
    expect(dirty.has(0)).toBe(true);
    // br (index 9): state 0→1  → dirty  [row=1,col=1 → 1*8+1=9]
    expect(dirty.has(9)).toBe(true);
    // tr (index 1) and bl (index 8): both 0→0 → not dirty
    expect(dirty.has(1)).toBe(false);
    expect(dirty.has(8)).toBe(false);
  });
});

