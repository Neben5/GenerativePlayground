import { Cell, CellSpace } from "../Cells";
import { describe, expect, it } from "vitest";

describe("CellSpace indexing", () => {
  it("roundtrips row/col through index and position for a 2D grid", () => {
    const width = 8;
    const height = 2;
    const total = width * height;
    const cells = Array.from({ length: total }, (_, index) => new Cell(index));
    const space = new CellSpace([width, height], cells);

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const index = space.getIndexRC(row, col);
        const [resolvedRow, resolvedCol] = space.getPosition(index);

        expect(index).toBe(row * width + col);
        expect(resolvedRow).toBe(row);
        expect(resolvedCol).toBe(col);
      }
    }
  });

  it("throws for out-of-bounds cell access", () => {
    const space = new CellSpace([4, 2], Array.from({ length: 8 }, () => new Cell(0)));

    expect(() => space.getCellAtIndex(-1)).toThrow();
    expect(() => space.getCellAtIndex(8)).toThrow();
  });
});
