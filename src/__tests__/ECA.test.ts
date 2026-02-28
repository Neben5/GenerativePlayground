import { CA } from "../ECA";
import { NeighborhoodType } from "../CARule";
import { Rule110 } from "../Rule110";
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

describe("CA iterate invariants", () => {
  it("keeps cell count stable and dirty indices in-bounds", () => {
    const canvas = createMockCanvas(320, 80);
    const ca = new CA(
      8,
      2,
      { left: 0, top: 0, width: 320, height: 80 },
      NeighborhoodType.ELEMENTARY,
      new Rule110(),
      canvas
    );

    const beforeLength = ca.cellSpace.cells.length;
    ca.clearDirty();
    ca.iterate();

    expect(ca.cellSpace.cells.length).toBe(beforeLength);

    for (const index of ca.getDirtyRects()) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(beforeLength);
    }
  });

  it("produces only binary states for Rule110", () => {
    const canvas = createMockCanvas(320, 80);
    const ca = new CA(
      8,
      2,
      { left: 0, top: 0, width: 320, height: 80 },
      NeighborhoodType.ELEMENTARY,
      new Rule110(),
      canvas
    );

    ca.iterate();

    const states = ca.cellSpace.cells.map((cell) => cell.state);
    expect(states.every((value) => value === 0 || value === 1)).toBe(true);
  });
});
