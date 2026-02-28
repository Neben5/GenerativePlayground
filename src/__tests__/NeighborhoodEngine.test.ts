import { CA } from "../ECA";
import {
  CARule,
  type NeighborhoodStepContext,
  type NeighborhoodStepRule,
  NeighborhoodType,
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
