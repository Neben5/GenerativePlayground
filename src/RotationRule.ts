import { Cell } from "./Cells";
import { MargolusRule } from "./CARule";

/**
 * States for the RotationRule.
 */
export enum RotationStates {
  EMPTY = 0,
  PARTICLE = 1,
}

/**
 * Margolus Rotation Rule
 *
 * A classic Margolus neighborhood demonstration rule.
 * Within each 2×2 block the single particle (if any) is rotated:
 *   - even ticks: clockwise
 *   - odd ticks: counter-clockwise
 *
 * Blocks with zero or two-or-more particles are left unchanged so that
 * particle count is conserved.
 *
 * Null cell positions (boundary/out-of-bounds) are treated as empty,
 * immovable walls: a particle cannot rotate into a null position and
 * instead remains in place.
 *
 * Block layout:
 *   tl tr
 *   bl br
 *
 * Clockwise rotation of positions:  tl→tr→br→bl→tl
 * Counter-clockwise:                tl→bl→br→tr→tl
 */
export class RotationRule extends MargolusRule {
  name = "Rotation (Margolus)";
  static RuleName = "rotation";
  ruleName = "rotation";

  applyToBlock(
    tl: Cell | null,
    tr: Cell | null,
    bl: Cell | null,
    br: Cell | null,
    tick: number,
  ): [number, number, number, number] {
    // Read states; treat null (boundary) as EMPTY.
    const a = tl?.state ?? RotationStates.EMPTY;
    const b = tr?.state ?? RotationStates.EMPTY;
    const c = bl?.state ?? RotationStates.EMPTY;
    const d = br?.state ?? RotationStates.EMPTY;

    const count = (a === RotationStates.PARTICLE ? 1 : 0)
                + (b === RotationStates.PARTICLE ? 1 : 0)
                + (c === RotationStates.PARTICLE ? 1 : 0)
                + (d === RotationStates.PARTICLE ? 1 : 0);

    // Only rotate when there is exactly one particle (preserves reversibility).
    if (count !== 1) {
      return [a, b, c, d];
    }

    const E = RotationStates.EMPTY;
    const P = RotationStates.PARTICLE;

    if (tick % 2 === 0) {
      // Clockwise: tl→tr, tr→br, br→bl, bl→tl
      // If the destination is a boundary (null), the particle stays in place.
      if (a === P) return tr !== null ? [E, P, c, d] : [a, b, c, d]; // tl → tr
      if (b === P) return br !== null ? [a, E, c, P] : [a, b, c, d]; // tr → br
      if (d === P) return bl !== null ? [a, b, P, E] : [a, b, c, d]; // br → bl
      /* c === P */ return tl !== null ? [P, b, E, d] : [a, b, c, d]; // bl → tl
    } else {
      // Counter-clockwise: tl→bl, bl→br, br→tr, tr→tl
      if (a === P) return bl !== null ? [E, b, P, d] : [a, b, c, d]; // tl → bl
      if (c === P) return br !== null ? [a, b, E, P] : [a, b, c, d]; // bl → br
      if (d === P) return tr !== null ? [a, P, c, E] : [a, b, c, d]; // br → tr
      /* b === P */ return tl !== null ? [P, E, c, d] : [a, b, c, d]; // tr → tl
    }
  }

  getColor(state: number): string {
    switch (state) {
      case RotationStates.EMPTY:    return "white";
      case RotationStates.PARTICLE: return "#3a7bd5";
      default:                      return "black";
    }
  }

  getAvailableStates(): number[] {
    return [RotationStates.EMPTY, RotationStates.PARTICLE];
  }

  getStateLabel(state: number): string {
    switch (state) {
      case RotationStates.EMPTY:    return "Empty (0)";
      case RotationStates.PARTICLE: return "Particle (1)";
      default:                      return `State ${state}`;
    }
  }
}
