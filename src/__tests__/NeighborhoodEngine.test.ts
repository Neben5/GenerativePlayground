/**
 * NeighborhoodEngine tests
 *
 * Tests the core CA engine tick, rule dispatch, and neighbourhood
 * computation using the pure-logic classes (CellSpace, Rule110,
 * SandRule) — no browser APIs required.
 */

import { CellSpace, Cell } from '../Cells';
import { Rule110 } from '../Rule110';
import { SandRule, SandStates } from '../SandRule';
import { NeighborhoodType } from '../CARule';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a 1D CellSpace (single row) from an array of state values. */
function make1D(states: number[]): CellSpace {
  return CellSpace.createCellSpaceWithStartingValues([states.length, 1], states);
}

/** Build a 2D CellSpace from a row-major 2D array of state values. */
function make2D(grid: number[][]): CellSpace {
  const height = grid.length;
  const width = grid[0].length;
  const flat = grid.flat();
  return CellSpace.createCellSpaceWithStartingValues([width, height], flat);
}

/** Apply a rule to every cell of a CellSpace and return the next-state array. */
function applyAll(cellSpace: CellSpace, rule: Rule110 | SandRule): number[] {
  const width = cellSpace.dimensionOrders[0];
  const height = cellSpace.dimensionOrders[1] ?? 1;
  const results: number[] = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      results.push(rule.apply(cellSpace, row, col).state);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Rule110 — Elementary 1D CA
// ---------------------------------------------------------------------------

describe('Rule110', () => {
  const rule = new Rule110();

  test('has the correct neighborhood type', () => {
    expect(rule.neighborhoodType).toBe(NeighborhoodType.ELEMENTARY);
  });

  test('all-zeros input stays all-zeros', () => {
    const cs = make1D([0, 0, 0, 0, 0]);
    const next = applyAll(cs, rule);
    expect(next).toEqual([0, 0, 0, 0, 0]);
  });

  test('single-cell seed produces known Rule110 pattern (one generation)', () => {
    // Starting pattern: 0 0 1 0 0
    // Rule 110 LUT: [0,1,1,1,0,1,1,0]
    // pattern at each position:
    //   col 0: L=0(boundary) C=0 R=0 → 000 → LUT[0]=0
    //   col 1: L=0 C=0 R=1 → 001 → LUT[1]=1
    //   col 2: L=0 C=1 R=0 → 010 → LUT[2]=1
    //   col 3: L=1 C=0 R=0 → 100 → LUT[4]=0
    //   col 4: L=0 C=0 R=0(boundary) → 000 → LUT[0]=0
    const cs = make1D([0, 0, 1, 0, 0]);
    const next = applyAll(cs, rule);
    expect(next).toEqual([0, 1, 1, 0, 0]);
  });

  test('boundary cells treat out-of-grid neighbours as 0', () => {
    // Left boundary: pattern is 0 (implicit) L | C | R
    const cs = make1D([1, 0, 0]);
    // col 0: L=0(oob) C=1 R=0 → 010 → LUT[2]=1
    expect(rule.apply(cs, 0, 0).state).toBe(1);
    // col 2: L=0 C=0 R=0(oob) → 000 → LUT[0]=0
    expect(rule.apply(cs, 0, 2).state).toBe(0);
  });

  test('getAvailableStates returns [0, 1]', () => {
    expect(rule.getAvailableStates()).toEqual([0, 1]);
  });

  test('getStateLabel returns human-readable labels', () => {
    expect(rule.getStateLabel(0)).toBe('Off (0)');
    expect(rule.getStateLabel(1)).toBe('On (1)');
  });

  test('getColor returns white for 0 and black for 1', () => {
    expect(rule.getColor(0)).toBe('white');
    expect(rule.getColor(1)).toBe('black');
  });
});

// ---------------------------------------------------------------------------
// SandRule — 2D Moore neighbourhood
// ---------------------------------------------------------------------------

describe('SandRule', () => {
  const rule = new SandRule();

  test('has the correct neighborhood type', () => {
    expect(rule.neighborhoodType).toBe(NeighborhoodType.MOORE);
  });

  test('ROCK cell remains ROCK', () => {
    // 3×3 grid: all empty except centre which is ROCK
    const cs = make2D([
      [0, 0, 0],
      [0, -1, 0],
      [0, 0, 0],
    ]);
    expect(rule.apply(cs, 1, 1).state).toBe(SandStates.ROCK);
  });

  test('SAND cell above EMPTY falls down (SAND becomes EMPTY)', () => {
    // Single SAND particle with empty cell below
    const cs = make2D([
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
    // centre cell (1,1) = 0 (EMPTY); the cell above (0,1) = 1 (SAND)
    // The SAND cell at (0,1) should become EMPTY when down is empty
    expect(rule.apply(cs, 0, 1).state).toBe(SandStates.EMPTY);
  });

  test('SAND above occupied cell stays SAND when diagonal escape is blocked', () => {
    // SAND pinned by ROCK below and SAND on the left (no diagonal exit)
    const cs = make2D([
      [1, 1, 0],
      [0, -1, 0],
      [0, 0, 0],
    ]);
    // SAND at (0,1): down=ROCK, left=SAND → cannot fall or slide left
    expect(rule.apply(cs, 0, 1).state).toBe(SandStates.SAND);
  });

  test('EMPTY cell with SAND directly above becomes SAND', () => {
    const cs = make2D([
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
    // Empty cell at (1,1) has SAND above (0,1) — receives SAND
    expect(rule.apply(cs, 1, 1).state).toBe(SandStates.SAND);
  });

  test('boundary cells are treated as ROCK', () => {
    // Single SAND at top-left corner; left & top are ROCK (boundary)
    const cs = make2D([
      [1, 0],
      [0, 0],
    ]);
    // Cell (0,0) = SAND; down (1,0) = EMPTY → SAND falls → becomes EMPTY
    expect(rule.apply(cs, 0, 0).state).toBe(SandStates.EMPTY);
  });

  test('getAvailableStates covers all sand states', () => {
    const states = rule.getAvailableStates();
    expect(states).toContain(SandStates.EMPTY);
    expect(states).toContain(SandStates.SAND);
    expect(states).toContain(SandStates.COMPACTED_SAND);
    expect(states).toContain(SandStates.ROCK);
  });

  test('getStateLabel returns human-readable labels', () => {
    expect(rule.getStateLabel(SandStates.EMPTY)).toBe('Empty (0)');
    expect(rule.getStateLabel(SandStates.SAND)).toBe('Sand (1)');
    expect(rule.getStateLabel(SandStates.COMPACTED_SAND)).toBe('Compacted Sand (2)');
    expect(rule.getStateLabel(SandStates.ROCK)).toBe('Rock (-1)');
  });
});

// ---------------------------------------------------------------------------
// CellSpace indexing
// ---------------------------------------------------------------------------

describe('CellSpace', () => {
  test('getIndex / getPosition round-trip for 2D space', () => {
    const cs = make2D([
      [0, 1, 2],
      [3, 4, 5],
    ]);
    // width=3, height=2
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = cs.getIndexRC(row, col);
        const pos = cs.getPosition(idx);
        expect(cs.getIndexRC(pos[0] as number, pos[1] as number)).toBe(idx);
      }
    }
  });

  test('getCellAtRowCol returns correct initial state', () => {
    const cs = make2D([
      [10, 20],
      [30, 40],
    ]);
    expect(cs.getCellAtRowCol(0, 0).state).toBe(10);
    expect(cs.getCellAtRowCol(0, 1).state).toBe(20);
    expect(cs.getCellAtRowCol(1, 0).state).toBe(30);
    expect(cs.getCellAtRowCol(1, 1).state).toBe(40);
  });

  test('getCellAtIndex throws for out-of-bounds index', () => {
    const cs = make1D([0, 1, 2]);
    expect(() => cs.getCellAtIndex(-1)).toThrow();
    expect(() => cs.getCellAtIndex(3)).toThrow();
  });

  test('getPositionIsValid rejects out-of-bounds positions', () => {
    const cs = make2D([[0, 0], [0, 0]]);
    expect(cs.getPositionIsValid([-1, 0])).toBe(false);
    expect(cs.getPositionIsValid([0, -1])).toBe(false);
    expect(cs.getPositionIsValid([2, 0])).toBe(false);
    expect(cs.getPositionIsValid([0, 2])).toBe(false);
    expect(cs.getPositionIsValid([0, 0])).toBe(true);
    expect(cs.getPositionIsValid([1, 1])).toBe(true);
  });
});
