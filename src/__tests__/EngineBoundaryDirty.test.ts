import { CA } from "../ECA";
import { Cell, CellSpace } from "../Cells";
import { NeighborhoodType } from "../CARule";
import { Rule110 } from "../Rule110";
import { SandRule, SandStates } from "../SandRule";
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

describe("Boundary behavior and dirty tracking", () => {
  it("uses OFF boundary for Rule110 edge cells", () => {
    const rule = new Rule110();
    const space = new CellSpace([4, 1], [new Cell(1), new Cell(0), new Cell(1), new Cell(1)]);

    const leftEdge = rule.apply(space, 0, 0).state;
    const rightEdge = rule.apply(space, 0, 4).state;

    expect(leftEdge).toBe(1);
    expect(rightEdge).toBe(0);
  });

  it("uses ROCK boundary for SandRule when evaluating top edge", () => {
    const rule = new SandRule();
    const states = [
      SandStates.EMPTY, SandStates.COMPACTED_SAND, SandStates.EMPTY,
      SandStates.EMPTY, SandStates.ROCK, SandStates.EMPTY,
      SandStates.EMPTY, SandStates.EMPTY, SandStates.EMPTY,
    ];
    const space = new CellSpace([3, 3], states.map((value) => new Cell(value)));

    const next = rule.apply(space, 0, 1).state;
    expect(next).toBe(SandStates.SAND);
  });

  it("tracks exactly changed indices after iterate", () => {
    const canvas = createMockCanvas(320, 80);
    const ca = new CA(
      8,
      2,
      { left: 0, top: 0, width: 320, height: 80 },
      NeighborhoodType.ELEMENTARY,
      new Rule110(),
      canvas
    );

    ca.clearDirty();
    const before = ca.cellSpace.cells.map((cell) => cell.state);

    ca.iterate();

    const after = ca.cellSpace.cells.map((cell) => cell.state);
    const expectedDirty = new Set<number>();
    for (let index = 0; index < before.length; index++) {
      if (before[index] !== after[index]) {
        expectedDirty.add(index);
      }
    }

    expect(ca.getDirtyRects()).toEqual(expectedDirty);
  });

  it("does not mark dirty for no-op scuffCell", () => {
    const canvas = createMockCanvas(320, 80);
    const ca = new CA(
      8,
      2,
      { left: 0, top: 0, width: 320, height: 80 },
      NeighborhoodType.ELEMENTARY,
      new Rule110(),
      canvas
    );

    ca.clearDirty();
    const existingState = ca.getCellAtRowCol(0, 0).state;
    ca.scuffCell([0, 0], existingState);

    expect(ca.getDirtyRects().size).toBe(0);
  });
});
