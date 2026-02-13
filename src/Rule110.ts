import { CellSpace, Cell } from "./Cells";
import { CARule, NeighborhoodType } from "./CARule";

export enum Rule110States {
  OFF = 0,
  ON = 1,
}

/**
 * Wolfram's Rule 110 - Elementary Cellular Automaton
 * Works with 1D neighborhoods (left, center, right)
 * Uses binary states (0 = white/off, 1 = black/on)
 * Boundary: cells outside grid are treated as 0 (off)
 */
export class Rule110 implements CARule {
  name = "Rule 110";
  // dont want to deal with typical AbstractSingletonBeanFactory nonsense
  static RuleName = "rule110";
  ruleName = "rule110";
  neighborhoodType = NeighborhoodType.ELEMENTARY;

  private static EmptyCell = new Cell(0);

  static StaticCells = new Map<Rule110States, Cell>(Object.entries(Rule110States).map(([key, value]) => [value as Rule110States, new Cell(value as Rule110States)]));

  apply(cellSpace: CellSpace, row: number, col: number): Cell {
    const left = this.getNeighbor(cellSpace, row, col, -1).state;
    const center = this.getNeighbor(cellSpace, row, col, 0).state;
    const right = this.getNeighbor(cellSpace, row, col, 1).state;

    // Wolfram Rule 110 lookup table
    const pattern = (left << 2) | (center << 1) | right;
    const lut = [0, 1, 1, 1, 0, 1, 1, 0]; // Rule 110 in binary: 01101110
    return Rule110.StaticCells.get(lut[pattern] as Rule110States) as Cell;
  }

  private getNeighbor(cellSpace: CellSpace, row: number, col: number, offset: number): Cell {
    const nx = col + offset;

    if (nx < 0 || nx >= cellSpace.dimensionOrders[0]) {
      // Boundary: return empty cell (0)
      return Rule110.EmptyCell;
    }
    return cellSpace.getCellAtRowCol(row, nx);
  }

  /**
   * Get the color for a given state in this rule
   * Rule110 uses binary: 0 = white, 1 = black
   */
  getColor(state: number): string {
    return state === 0 ? "white" : "black";
  }

  /**
   * Get available states for Rule110 (binary: 0 and 1)
   */
  getAvailableStates(): number[] {
    return [0, 1];
  }

  /**
   * Get a human-readable label for a state value
   */
  getStateLabel(state: number): string {
    return state === 0 ? "Off (0)" : "On (1)";
  }
}
