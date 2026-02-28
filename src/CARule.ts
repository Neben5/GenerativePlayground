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

export interface NeighborhoodStepContext {
  tick: number;
  width: number;
  height: number;
}

export interface NeighborhoodWrite {
  index: number;
  state: number;
}

export interface NeighborhoodStepRule {
  applyNeighborhood(cellSpace: CellSpace, context: NeighborhoodStepContext): NeighborhoodWrite[];
}

export function isNeighborhoodStepRule(rule: CARule): rule is CARule & NeighborhoodStepRule {
  return typeof (rule as CARule & Partial<NeighborhoodStepRule>).applyNeighborhood === "function";
}

/**
 * Abstract base class for rules that use the Modified Margolus neighborhood.
 *
 * The Modified Margolus neighborhood (Gustavsson & Jonsson 2020, §3) is a
 * 2×2 block-based cellular automaton scheme.  On each tick the grid is
 * partitioned into non-overlapping 2×2 blocks according to a phase offset:
 *   even tick → blocks anchored at (0, 0)
 *   odd  tick → blocks anchored at (1, 1)
 *
 * Modification vs. standard Margolus: partial blocks at the grid boundary
 * are also processed ("paper-like partial edge updates").  A block that
 * extends outside the grid passes `null` for the out-of-bounds positions,
 * so every in-bounds cell participates in every applicable phase.
 *
 * Concrete rule subclasses implement `applyToBlock` for the 2×2 transition
 * logic.  The scheduler (this class) drives block enumeration and write
 * collection; individual rule logic stays in `applyToBlock`.
 */
export abstract class MargolusRule extends CARule implements NeighborhoodStepRule {
  readonly neighborhoodType = NeighborhoodType.MARGOLUS;

  /**
   * Margolus rules must not be called per-cell via the legacy path.
   * Use `applyNeighborhood` (NeighborhoodStepRule) instead.
   */
  apply(_cellSpace: CellSpace, _row: number, _col: number): Cell {
    throw new Error(
      "MargolusRule.apply() is not supported; use applyNeighborhood() via the neighborhood-step path"
    );
  }

  /**
   * Apply the rule to a single 2×2 block.
   *
   * @param tl  Cell at top-left of the block, or null if out of bounds.
   * @param tr  Cell at top-right of the block, or null if out of bounds.
   * @param bl  Cell at bottom-left of the block, or null if out of bounds.
   * @param br  Cell at bottom-right of the block, or null if out of bounds.
   * @param tick  Current tick index (even/odd encodes phase).
   * @returns New states as [newTl, newTr, newBl, newBr].
   *          Entries whose corresponding input was null are ignored.
   */
  abstract applyToBlock(
    tl: Cell | null,
    tr: Cell | null,
    bl: Cell | null,
    br: Cell | null,
    tick: number,
  ): [number, number, number, number];

  /**
   * Modified Margolus scheduler — implements NeighborhoodStepRule.
   *
   * Iterates over all 2×2 block origins for the current phase (even/odd
   * tick selects offset 0 or 1).  Partial blocks at grid edges are included:
   * out-of-bounds positions are passed as null to `applyToBlock`, and only
   * writes for in-bounds positions are emitted.
   */
  applyNeighborhood(cellSpace: CellSpace, context: NeighborhoodStepContext): NeighborhoodWrite[] {
    const { tick, width, height } = context;
    const offset = tick % 2;
    const writes: NeighborhoodWrite[] = [];

    for (let row = offset; row < height; row += 2) {
      for (let col = offset; col < width; col += 2) {
        const tl = (row     < height && col     < width) ? cellSpace.getCellAtRowCol(row,     col    ) : null;
        const tr = (row     < height && col + 1 < width) ? cellSpace.getCellAtRowCol(row,     col + 1) : null;
        const bl = (row + 1 < height && col     < width) ? cellSpace.getCellAtRowCol(row + 1, col    ) : null;
        const br = (row + 1 < height && col + 1 < width) ? cellSpace.getCellAtRowCol(row + 1, col + 1) : null;

        const [newTl, newTr, newBl, newBr] = this.applyToBlock(tl, tr, bl, br, tick);

        if (tl !== null) writes.push({ index: cellSpace.getIndexRC(row,     col    ), state: newTl });
        if (tr !== null) writes.push({ index: cellSpace.getIndexRC(row,     col + 1), state: newTr });
        if (bl !== null) writes.push({ index: cellSpace.getIndexRC(row + 1, col    ), state: newBl });
        if (br !== null) writes.push({ index: cellSpace.getIndexRC(row + 1, col + 1), state: newBr });
      }
    }

    return writes;
  }
}
