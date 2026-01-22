import { Vector } from "@geometric/vector";
import { CellSpace } from "./Cells";

/**
 * Types of neighborhoods available in the system
 */
export enum NeighborhoodType {
  ELEMENTARY = "elementary",  // 1D: left, center, right
  MOORE = "moore",            // 2D: 3x3 square
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
};

/**
 * Abstract base class for cellular automata rules.
 * Each rule defines its own neighborhood type, boundary handling, and visualization.
 */
export abstract class CARule {
  abstract name: string;
  abstract neighborhoodType: NeighborhoodType;

  /**
   * Apply the rule to compute the next state.
   * Rules are responsible for querying the cellSpace and handling boundaries.
   */
  abstract apply(cellSpace: CellSpace, position: Vector): number;

  /**
   * Get the display color for a given cell state.
   * Rules can define their own color schemes.
   */
  abstract getColor(state: number): string;
}
