import { Vector } from "@geometric/vector";
import { CellSpace, Cell, states } from "./Cells";
import { CARule, NeighborhoodType } from "./CARule";

/**
 * Wolfram's Rule 110 - Elementary Cellular Automaton
 * Works with 1D neighborhoods (left, center, right)
 * Uses binary states (0 = white/off, 1 = black/on)
 * Boundary: cells outside grid are treated as 0 (off)
 */
export class Rule110 extends CARule {
  name = "Rule 110";
  neighborhoodType = NeighborhoodType.ELEMENTARY;

  apply(cellSpace: CellSpace, position: Vector): number {
    const left = this.getNeighbor(cellSpace, position, -1).state;
    const center = this.getNeighbor(cellSpace, position, 0).state;
    const right = this.getNeighbor(cellSpace, position, 1).state;

    // Wolfram Rule 110 lookup table
    const pattern = (left << 2) | (center << 1) | right;
    const lut = [0, 1, 1, 1, 0, 1, 1, 0]; // Rule 110 in binary: 01101110
    return lut[pattern];
  }

  private getNeighbor(cellSpace: CellSpace, position: Vector, offset: number): Cell {
    const nx = position[1] + offset;

    if (nx < 0 || nx >= cellSpace.dimensionOrders[0]) {
      // Boundary: return empty cell (0)
      return new Cell(0);
    }
    return cellSpace.getCellAtIndex(cellSpace.getIndex(new Vector(position[0], nx)));
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
