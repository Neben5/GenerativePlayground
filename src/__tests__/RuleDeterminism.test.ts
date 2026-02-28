import { Cell, CellSpace } from "../Cells";
import { Rule110 } from "../Rule110";
import { SandRule, SandStates } from "../SandRule";
import { describe, expect, it } from "vitest";

function createSpace(width: number, height: number, states: number[]): CellSpace {
  return new CellSpace([width, height], states.map((state) => new Cell(state)));
}

function stepRule(space: CellSpace, applyFn: (space: CellSpace, row: number, col: number) => Cell): CellSpace {
  const width = space.dimensionOrders[0];
  const height = space.dimensionOrders[1];
  const nextStates: number[] = [];

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      nextStates.push(applyFn(space, row, col).state);
    }
  }

  return createSpace(width, height, nextStates);
}

describe("Rule determinism", () => {
  it("matches expected one-step Rule110 transition", () => {
    const rule = new Rule110();
    const initial = createSpace(5, 1, [1, 1, 0, 1, 0]);

    const next = stepRule(initial, (space, row, col) => rule.apply(space, row, col));
    expect(next.cells.map((cell) => cell.state)).toEqual([1, 1, 1, 1, 0]);
  });

  it("produces identical multi-step Rule110 output from same initial state", () => {
    const rule = new Rule110();
    const seed = [0, 1, 1, 0, 1, 0, 0, 1];

    let runA = createSpace(8, 1, seed);
    let runB = createSpace(8, 1, seed);

    for (let step = 0; step < 25; step++) {
      runA = stepRule(runA, (space, row, col) => rule.apply(space, row, col));
      runB = stepRule(runB, (space, row, col) => rule.apply(space, row, col));
    }

    expect(runA.cells.map((cell) => cell.state)).toEqual(runB.cells.map((cell) => cell.state));
  });

  it("produces identical multi-step SandRule output from same initial state", () => {
    const rule = new SandRule();
    const seed = [
      SandStates.ROCK, SandStates.ROCK, SandStates.ROCK, SandStates.ROCK,
      SandStates.ROCK, SandStates.SAND, SandStates.EMPTY, SandStates.ROCK,
      SandStates.ROCK, SandStates.EMPTY, SandStates.COMPACTED_SAND, SandStates.ROCK,
      SandStates.ROCK, SandStates.ROCK, SandStates.ROCK, SandStates.ROCK,
    ];

    let runA = createSpace(4, 4, seed);
    let runB = createSpace(4, 4, seed);

    for (let step = 0; step < 12; step++) {
      runA = stepRule(runA, (space, row, col) => rule.apply(space, row, col));
      runB = stepRule(runB, (space, row, col) => rule.apply(space, row, col));
    }

    expect(runA.cells.map((cell) => cell.state)).toEqual(runB.cells.map((cell) => cell.state));
  });
});
