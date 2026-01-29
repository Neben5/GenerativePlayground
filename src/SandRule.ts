import { Vector } from "@geometric/vector";
import { CellSpace, Cell } from "./Cells";
import { CARule, NeighborhoodType } from "./CARule";

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
  debug = {
    iteration: false,
  };

  apply(cellSpace: CellSpace, position: Vector): number {
    const self = this.getNeighbor(cellSpace, position, 0, 0).state;
    const up = this.getNeighbor(cellSpace, position, -1, 0).state;
    const upLeft = this.getNeighbor(cellSpace, position, -1, -1).state;
    const upRight = this.getNeighbor(cellSpace, position, -1, 1).state;
    const left = this.getNeighbor(cellSpace, position, 0, -1).state;
    const right = this.getNeighbor(cellSpace, position, 0, 1).state;
    const down = this.getNeighbor(cellSpace, position, 1, 0).state;
    const downLeft = this.getNeighbor(cellSpace, position, 1, -1).state;
    const downRight = this.getNeighbor(cellSpace, position, 1, 1).state;

    if (this.debug.iteration)
      console.log(`Neighborhood states at position ${position}: \n\
        ${upLeft} ${up} ${upRight} :  (${position[0] - 1}, ${position[1] - 1})  (${position[0]}, ${position[1] - 1})  (${position[0] + 1}, ${position[1] - 1}) \n\
        ${left} ${self} ${right} : (${position[0] - 1}, ${position[1]})  (${position[0]}, ${position[1]})  (${position[0] + 1}, ${position[1]}) \n\
        ${downLeft} ${down} ${downRight} : (${position[0] - 1}, ${position[1] + 1})  (${position[0]}, ${position[1] + 1})  (${position[0] + 1}, ${position[1] + 1}) \n`);

    switch (self) {
      case SandStates.EMPTY:
        if (up == SandStates.SAND) {
          return SandStates.SAND;
        }
        if (upRight == SandStates.SAND && right != SandStates.EMPTY && up == SandStates.EMPTY) {
          return SandStates.SAND;
        }
        if (left == SandStates.COMPACTED_SAND && upLeft == SandStates.SAND && downLeft != SandStates.EMPTY) {
          return SandStates.SAND;
        }
        return SandStates.EMPTY;
      case SandStates.SAND:
        if (down == SandStates.EMPTY) {
          return SandStates.EMPTY;
        }
        if (downLeft == SandStates.EMPTY && left == SandStates.EMPTY) {
          return SandStates.EMPTY;
        }
        if (down && (up == SandStates.SAND || up == SandStates.COMPACTED_SAND)) {
          return SandStates.COMPACTED_SAND;
        }
        if (down == SandStates.COMPACTED_SAND && right == SandStates.EMPTY && downRight == SandStates.EMPTY) {
          return SandStates.EMPTY;
        }
        return SandStates.SAND;
      case SandStates.COMPACTED_SAND:
        if (down == SandStates.EMPTY) {
          return SandStates.SAND;
        }
        if (down == SandStates.SAND) {
          return SandStates.SAND;
        }
        if (up == SandStates.EMPTY || up == SandStates.ROCK) {
          return SandStates.SAND;
        }
        return SandStates.COMPACTED_SAND;
      case SandStates.ROCK:
        return SandStates.ROCK;
    }
  }

  private getNeighbor(cellSpace: CellSpace, position: Vector, dy: number, dx: number): Cell {
    const ny = position[0] + dy;
    const nx = position[1] + dx;

    if (nx < 0 || nx >= cellSpace.dimensionOrders[0] || ny < 0 || ny >= cellSpace.dimensionOrders[1]) {
      // Boundary: return rock (solid wall)
      return new Cell(SandStates.ROCK);
    }
    return cellSpace.getCellAtIndex(cellSpace.getIndex(new Vector(ny, nx)));
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
