import { Cell, CellSpace } from "./Cells";

/**
 * Types of neighborhoods available in the system
 */
export enum NeighborhoodType {
  ELEMENTARY = "elementary",  // 1D: left, center, right
  MOORE = "moore",            // 2D: 3x3 square
  MARGOLUS = "margolus",      // 2D: 2x2 block (alternating offset)
}

/**
 * Metadata for neighborhoods: labels and descriptions
 */
export const NEIGHBORHOOD_METADATA: { [key in NeighborhoodType]: { label: string; description: string; neighborhoodSize: number } } = {
  [NeighborhoodType.MOORE]: {
    label: "Moore (3×3)",
    description: "2D neighborhood with 8 adjacent cells in a square pattern",
    neighborhoodSize: 9,
  },
  [NeighborhoodType.ELEMENTARY]: {
    label: "Elementary (1D)",
    description: "1D neighborhood with left and right neighbors",
    neighborhoodSize: 3,
  },
  [NeighborhoodType.MARGOLUS]: {
    label: "Margolus (2×2)",
    description: "2D block neighborhood: alternates between even/odd 2×2 block partitions each tick",
    neighborhoodSize: 4,
  },
};

/**
 * Abstract base class for cellular automata rules.
 * Each rule defines its own neighborhood type, boundary handling, and visualization.
 */
export abstract class CARule {
  abstract name: string;
  abstract ruleName: string;
  abstract neighborhoodType: NeighborhoodType;

  /**
   * Apply the rule to compute the next state.
   * Rules are responsible for querying the cellSpace and handling boundaries.
   */
  abstract apply(cellSpace: CellSpace, row: number, col: number): Cell;

  /**
   * Get the display color for a given cell state.
   * Rules can define their own color schemes.
   */
  abstract getColor(state: number): string;

  /**
   * Get the available state values for this rule.
   * Used by the paintbrush tool to determine which states can be painted.
   */
  abstract getAvailableStates(): number[];

  /**
   * Get a human-readable label for a given state value.
   * Used by the paintbrush tool to display state options.
   */
  abstract getStateLabel(state: number): string;
}

/**
 * Abstract base class for Margolus neighborhood rules.
 *
 * Margolus rules operate on 2×2 blocks rather than individual cells.
 * On even ticks the grid is partitioned into non-overlapping 2×2 blocks
 * starting at (0,0); on odd ticks the partition is shifted by (1,1).
 * Each block is updated atomically by `applyToBlock`.
 */
export abstract class MargolusRule extends CARule {
  readonly neighborhoodType = NeighborhoodType.MARGOLUS;

  /**
   * Apply the rule to a single 2×2 block.
   *
   * @param tl  Cell at top-left of block
   * @param tr  Cell at top-right of block
   * @param bl  Cell at bottom-left of block
   * @param br  Cell at bottom-right of block
   * @param tick  Current tick index (even vs. odd selects partition phase)
   * @returns New states as [topLeft, topRight, bottomLeft, bottomRight]
   */
  abstract applyToBlock(
    tl: Cell,
    tr: Cell,
    bl: Cell,
    br: Cell,
    tick: number,
  ): [Cell, Cell, Cell, Cell];

  /**
   * Not used for Margolus rules — iteration is performed block-wise via
   * `applyToBlock`.  Throws if called accidentally.
   */
  apply(_cellSpace: CellSpace, _row: number, _col: number): Cell {
    throw new Error(
      "MargolusRule.apply() is not supported; use applyToBlock() via iterateMargolus()"
    );
  }
}
