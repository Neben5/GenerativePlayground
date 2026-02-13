import { CellSpace, Cell } from "./Cells";
import { CARule, NeighborhoodType } from "./CARule";
import { getDebugConfig } from "./DebugConfig";

/**
 * Sand physics states - used exclusively by SandRule
 */
export enum SandStates {
  EMPTY = 0,
  SAND = 1,
  COMPACTED_SAND = 2,
  ROCK = -1,
}

/**
 * Sand Physics Rule - 2D cellular automaton
 * Works with 3x3 Moore neighborhoods
 * Boundary: cells outside grid are treated as ROCK (solid walls)
 */
export class SandRule implements CARule {
  name = "Sand Physics";
  // dont want to deal with typical AbstractSingletonBeanFactory nonsense
  static RuleName = "sand";
  ruleName = "sand";
  neighborhoodType = NeighborhoodType.MOORE;

  static StaticCells = new Map<SandStates, Cell>(Object.entries(SandStates).map(([key, value]) => [value as SandStates, new Cell(value as SandStates)]));

  apply(cellSpace: CellSpace, row: number, col: number): Cell {
    const self = this.getNeighbor(cellSpace, row, col, 0, 0).state;
    const up = this.getNeighbor(cellSpace, row, col, -1, 0).state;
    const upLeft = this.getNeighbor(cellSpace, row, col, -1, -1).state;
    const upRight = this.getNeighbor(cellSpace, row, col, -1, 1).state;
    const left = this.getNeighbor(cellSpace, row, col, 0, -1).state;
    const right = this.getNeighbor(cellSpace, row, col, 0, 1).state;
    const down = this.getNeighbor(cellSpace, row, col, 1, 0).state;
    const downLeft = this.getNeighbor(cellSpace, row, col, 1, -1).state;
    const downRight = this.getNeighbor(cellSpace, row, col, 1, 1).state;

    if (getDebugConfig().getRuleIterationDebug())
      console.log(`Neighborhood states at position ${row}, ${col}: \n\
        ${upLeft} ${up} ${upRight} :  (${row - 1}, ${col - 1})  (${row}, ${col - 1})  (${row + 1}, ${col - 1}) \n\
        ${left} ${self} ${right} : (${row - 1}, ${col})  (${row}, ${col})  (${row + 1}, ${col}) \n\
        ${downLeft} ${down} ${downRight} : (${row - 1}, ${col + 1})  (${row}, ${col + 1})  (${row + 1}, ${col + 1}) \n`);

    switch (self) {
      case SandStates.EMPTY:
        if (up == SandStates.SAND) {
          return this.getStaticCell(SandStates.SAND);
        }
        if (upRight == SandStates.SAND && right != SandStates.EMPTY && up == SandStates.EMPTY) {
          return this.getStaticCell(SandStates.SAND);
        }
        if (left == SandStates.COMPACTED_SAND && upLeft == SandStates.SAND && downLeft != SandStates.EMPTY) {
          return this.getStaticCell(SandStates.SAND);
        }
        return this.getStaticCell(SandStates.EMPTY);
      case SandStates.SAND:
        if (down == SandStates.EMPTY) {
          return this.getStaticCell(SandStates.EMPTY);
        }
        if (downLeft == SandStates.EMPTY && left == SandStates.EMPTY) {
          return this.getStaticCell(SandStates.EMPTY);
        }
        if (down && (up == SandStates.SAND || up == SandStates.COMPACTED_SAND)) {
          return this.getStaticCell(SandStates.COMPACTED_SAND);
        }
        if (down == SandStates.COMPACTED_SAND && right == SandStates.EMPTY && downRight == SandStates.EMPTY) {
          return this.getStaticCell(SandStates.EMPTY);
        }
        return this.getStaticCell(SandStates.SAND);
      case SandStates.COMPACTED_SAND:
        if (down == SandStates.EMPTY) {
          return this.getStaticCell(SandStates.SAND);
        }
        if (down == SandStates.SAND) {
          return this.getStaticCell(SandStates.SAND);
        }
        if (up == SandStates.EMPTY || up == SandStates.ROCK) {
          return this.getStaticCell(SandStates.SAND);
        }
        return this.getStaticCell(SandStates.COMPACTED_SAND);
      case SandStates.ROCK:
        return this.getStaticCell(SandStates.ROCK);
    }
  }
  private getStaticCell(state: SandStates): Cell {
    return SandRule.StaticCells.get(state);
  }

  private getNeighbor(cellSpace: CellSpace, row: number, col: number, dy: number, dx: number): Cell {
    const ny = row + dy;
    const nx = col + dx;

    if (nx < 0 || nx >= cellSpace.dimensionOrders[0] || ny < 0 || ny >= cellSpace.dimensionOrders[1]) {
      // Boundary: return rock (solid wall)
      return SandRule.StaticCells.get(SandStates.ROCK);
    }
    return cellSpace.getCellAtRowCol(ny, nx);
  }

  /**
   * Get the color for a given state in this rule
   */
  getColor(state: number): string {
    switch (state) {
      case SandStates.EMPTY: return "white";
      case SandStates.SAND: return "#f5c264";
      case SandStates.COMPACTED_SAND: return "#bc7b3aff";
      case SandStates.ROCK: return "grey";
      default: return "black";
    }
  }

  /**
   * Get available states for SandRule (EMPTY, SAND, COMPACTED_SAND, ROCK)
   */
  getAvailableStates(): number[] {
    return [SandStates.EMPTY, SandStates.SAND, SandStates.COMPACTED_SAND, SandStates.ROCK];
  }

  /**
   * Get a human-readable label for a state value
   */
  getStateLabel(state: number): string {
    switch (state) {
      case SandStates.EMPTY: return "Empty (0)";
      case SandStates.SAND: return "Sand (1)";
      case SandStates.COMPACTED_SAND: return "Compacted Sand (2)";
      case SandStates.ROCK: return "Rock (-1)";
      default: return `State ${state}`;
    }
  }
}
