import { Cell } from "../Cells";
import { describe, expect, it } from "vitest";
import {
  cellsToInitialConfig,
  exportStateToJSON,
  getStateInitializationData,
  importStateFromJSON,
} from "../Persistence";
import { NeighborhoodType } from "../CARule";

describe("Persistence helpers", () => {
  it("serializes cells into initialization config", () => {
    expect(cellsToInitialConfig([1, 0, -1, 2])).toBe("1,0,-1,2");
  });

  it("imports valid full state JSON", () => {
    const json = JSON.stringify({
      name: "state-1",
      neighborhood: NeighborhoodType.MOORE,
      rule: "sand",
      width: 3,
      height: 2,
      cells: [0, 1, -1, 2, 0, 1],
      tickCount: 9,
      timestamp: 123,
    });

    const state = importStateFromJSON(json);
    expect(state).not.toBeNull();
    expect(state?.width).toBe(3);
    expect(state?.height).toBe(2);
    expect(state?.cells).toEqual([0, 1, -1, 2, 0, 1]);

    const init = getStateInitializationData(state!);
    expect(init).toEqual({
      width: 3,
      height: 2,
      initialPattern: "0,1,-1,2,0,1",
    });
  });

  it("rejects invalid state JSON shape", () => {
    const invalid = JSON.stringify({
      name: "bad",
      width: 3,
      height: 3,
      cells: [1, 2, 3],
    });

    expect(importStateFromJSON(invalid)).toBeNull();
  });

  it("returns null for malformed JSON input", () => {
    expect(importStateFromJSON("{not-valid-json")).toBeNull();
  });

  it("rejects payloads missing required fields", () => {
    const missingNeighborhood = JSON.stringify({
      name: "bad-1",
      rule: "sand",
      width: 2,
      height: 2,
      cells: [0, 1, 0, 1],
    });
    const missingRule = JSON.stringify({
      name: "bad-2",
      neighborhood: NeighborhoodType.MOORE,
      width: 2,
      height: 2,
      cells: [0, 1, 0, 1],
    });
    const missingCells = JSON.stringify({
      name: "bad-3",
      neighborhood: NeighborhoodType.MOORE,
      rule: "sand",
      width: 2,
      height: 2,
    });

    expect(importStateFromJSON(missingNeighborhood)).toBeNull();
    expect(importStateFromJSON(missingRule)).toBeNull();
    expect(importStateFromJSON(missingCells)).toBeNull();
  });

  it("exports full state JSON from CA-like object", () => {
    const mockCA = {
      currentNeighborhoodType: NeighborhoodType.ELEMENTARY,
      currentRule: { ruleName: "rule110" },
      canvasSpace: { width_count: 4, height_count: 2 },
      cellSpace: {
        cells: [new Cell(0), new Cell(1), new Cell(1), new Cell(0), new Cell(1), new Cell(0), new Cell(0), new Cell(1)],
      },
    } as any;

    const json = exportStateToJSON(mockCA, "snapshot", 42);
    const parsed = JSON.parse(json);

    expect(parsed.name).toBe("snapshot");
    expect(parsed.rule).toBe("rule110");
    expect(parsed.neighborhood).toBe(NeighborhoodType.ELEMENTARY);
    expect(parsed.width).toBe(4);
    expect(parsed.height).toBe(2);
    expect(parsed.tickCount).toBe(42);
    expect(parsed.cells).toEqual([0, 1, 1, 0, 1, 0, 0, 1]);
    expect(typeof parsed.timestamp).toBe("number");
  });
});
