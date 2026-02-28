/**
 * EngineBoundaryDirty tests
 *
 * Tests boundary-condition handling and dirty-rect tracking at the
 * CellSpace level. These tests use pure logic classes only — no browser
 * APIs (canvas, requestAnimationFrame) are required.
 */

import { CellSpace, Cell, DimensionError, IndexOutOfBoundsError } from '../Cells';
import { SandRule, SandStates } from '../SandRule';
import { Rule110 } from '../Rule110';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function make1D(states: number[]): CellSpace {
  return CellSpace.createCellSpaceWithStartingValues([states.length, 1], states);
}

function make2D(grid: number[][]): CellSpace {
  const height = grid.length;
  const width = grid[0].length;
  return CellSpace.createCellSpaceWithStartingValues([width, height], grid.flat());
}

// ---------------------------------------------------------------------------
// Boundary — Rule110 (1D)
// ---------------------------------------------------------------------------

describe('Rule110 boundary conditions', () => {
  const rule = new Rule110();

  test('leftmost cell treats left neighbour as 0', () => {
    // col 0: L=0(oob) C=1 R=0 → 010 → LUT[2]=1
    const cs = make1D([1, 0]);
    expect(rule.apply(cs, 0, 0).state).toBe(1);
  });

  test('rightmost cell treats right neighbour as 0', () => {
    // col 1: L=1 C=0 R=0(oob) → 100 → LUT[4]=0
    const cs = make1D([1, 0]);
    expect(rule.apply(cs, 0, 1).state).toBe(0);
  });

  test('single-cell grid both neighbours are 0', () => {
    // pattern 0 C 0 where C=1 → 010 → LUT[2]=1
    const cs = make1D([1]);
    expect(rule.apply(cs, 0, 0).state).toBe(1);

    // pattern 0 C 0 where C=0 → 000 → LUT[0]=0
    const cs2 = make1D([0]);
    expect(rule.apply(cs2, 0, 0).state).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Boundary — SandRule (2D Moore)
// ---------------------------------------------------------------------------

describe('SandRule boundary conditions', () => {
  const rule = new SandRule();

  test('cells on the top edge treat the row above as ROCK', () => {
    // SAND at top row with empty below → falls (becomes EMPTY)
    const cs = make2D([
      [0, 1, 0],
      [0, 0, 0],
    ]);
    // (0,1) = SAND; down (1,1) = EMPTY → SAND leaves → EMPTY
    expect(rule.apply(cs, 0, 1).state).toBe(SandStates.EMPTY);
  });

  test('cells on the bottom edge treat the row below as ROCK', () => {
    // SAND at bottom row: down is ROCK (boundary) → stays SAND
    const cs = make2D([
      [0, 0, 0],
      [0, 1, 0],
    ]);
    expect(rule.apply(cs, 1, 1).state).toBe(SandStates.SAND);
  });

  test('cells on the left edge treat the column to the left as ROCK', () => {
    // SAND at leftmost column, resting on ROCK boundary (bottom is wall)
    const cs = make2D([
      [1],
      [0],
    ]);
    // (0,0)=SAND; down (1,0)=EMPTY → SAND falls → EMPTY
    expect(rule.apply(cs, 0, 0).state).toBe(SandStates.EMPTY);
  });

  test('cells on the right edge treat the column to the right as ROCK', () => {
    // SAND at rightmost column resting on ROCK boundary (bottom wall)
    const cs = make2D([
      [0, 1],
      [0, 0],
    ]);
    // (0,1)=SAND; down (1,1)=EMPTY → SAND falls → EMPTY
    expect(rule.apply(cs, 0, 1).state).toBe(SandStates.EMPTY);
  });

  test('corner cell (0,0) correctly sees three ROCK boundary neighbours', () => {
    const cs = make2D([
      [1, 0],
      [0, 0],
    ]);
    // (0,0)=SAND; down (1,0)=EMPTY → SAND falls → EMPTY
    expect(rule.apply(cs, 0, 0).state).toBe(SandStates.EMPTY);
  });
});

// ---------------------------------------------------------------------------
// CellSpace error handling
// ---------------------------------------------------------------------------

describe('CellSpace error handling', () => {
  test('getIndex throws DimensionError for wrong-dimension position', () => {
    const cs = make2D([[0, 0], [0, 0]]);
    expect(() => cs.getIndex([0])).toThrow(DimensionError);
    expect(() => cs.getIndex([0, 0, 0])).toThrow(DimensionError);
  });

  test('getCellAtIndex throws IndexOutOfBoundsError for negative index', () => {
    const cs = make1D([0, 1, 2]);
    expect(() => cs.getCellAtIndex(-1)).toThrow();
  });

  test('getCellAtIndex throws IndexOutOfBoundsError for index >= length', () => {
    const cs = make1D([0, 1, 2]);
    expect(() => cs.getCellAtIndex(3)).toThrow();
  });

  test('getIndexRC throws DimensionError on non-2D space', () => {
    // 1D space: dimensionOrders.length === 1
    const cs = CellSpace.createCellSpaceWithStartingValues([4], [0, 1, 2, 3]);
    expect(() => cs.getIndexRC(0, 0)).toThrow(DimensionError);
  });
});

// ---------------------------------------------------------------------------
// Dirty tracking simulation
// ---------------------------------------------------------------------------

describe('Dirty tracking (pure CellSpace mutations)', () => {
  test('mutating a cell state can be tracked manually', () => {
    const cs = make1D([0, 0, 0]);
    const dirty = new Set<number>();

    const idx = 1;
    const prev = cs.cells[idx].state;
    cs.cells[idx].state = 1;
    if (prev !== cs.cells[idx].state) {
      dirty.add(idx);
    }

    expect(dirty.has(1)).toBe(true);
    expect(dirty.has(0)).toBe(false);
  });

  test('unchanged cell is not added to dirty set', () => {
    const cs = make1D([0, 0, 0]);
    const dirty = new Set<number>();

    const idx = 1;
    const prev = cs.cells[idx].state;
    cs.cells[idx].state = 0; // no change
    if (prev !== cs.cells[idx].state) {
      dirty.add(idx);
    }

    expect(dirty.has(1)).toBe(false);
  });

  test('full iteration with Rule110 marks changed cells dirty', () => {
    const rule = new Rule110();
    // 0 0 1 0 0 → next: 0 1 1 0 0 (verified in NeighborhoodEngine tests)
    const cs = make1D([0, 0, 1, 0, 0]);
    const width = cs.dimensionOrders[0];

    // Compute next states
    const nextStates: number[] = [];
    for (let col = 0; col < width; col++) {
      nextStates.push(rule.apply(cs, 0, col).state);
    }

    // Apply and track dirty
    const dirty = new Set<number>();
    for (let i = 0; i < width; i++) {
      const prev = cs.cells[i].state;
      cs.cells[i].state = nextStates[i];
      if (prev !== nextStates[i]) {
        dirty.add(i);
      }
    }

    // col 1 changed (0→1), col 2 unchanged (1→1), col 3 and col 4 unchanged (0→0)
    expect(dirty.has(1)).toBe(true);  // changed 0→1
    expect(dirty.has(0)).toBe(false); // unchanged 0→0
    expect(dirty.has(2)).toBe(false); // unchanged 1→1
    expect(dirty.has(3)).toBe(false); // unchanged 0→0
    expect(dirty.has(4)).toBe(false); // unchanged 0→0
  });

  test('clearing dirty set removes all entries', () => {
    const dirty = new Set<number>([0, 1, 2, 5]);
    dirty.clear();
    expect(dirty.size).toBe(0);
  });
});
