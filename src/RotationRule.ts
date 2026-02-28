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
 * This produces a visually interesting circular-motion effect and is easy
 * to reason about in unit tests.
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

  private static readonly CELLS = new Map<RotationStates, Cell>([
    [RotationStates.EMPTY, new Cell(RotationStates.EMPTY)],
    [RotationStates.PARTICLE, new Cell(RotationStates.PARTICLE)],
  ]);

  private static cell(state: RotationStates): Cell {
    return RotationRule.CELLS.get(state)!;
  }

  applyToBlock(
    tl: Cell,
    tr: Cell,
    bl: Cell,
    br: Cell,
    tick: number,
  ): [Cell, Cell, Cell, Cell] {
    const a = tl.state as RotationStates;
    const b = tr.state as RotationStates;
    const c = bl.state as RotationStates;
    const d = br.state as RotationStates;

    const count = (a === RotationStates.PARTICLE ? 1 : 0)
                + (b === RotationStates.PARTICLE ? 1 : 0)
                + (c === RotationStates.PARTICLE ? 1 : 0)
                + (d === RotationStates.PARTICLE ? 1 : 0);

    // Only rotate when there is exactly one particle (preserves reversibility)
    if (count !== 1) {
      return [tl, tr, bl, br];
    }

    const E = RotationRule.cell(RotationStates.EMPTY);
    const P = RotationRule.cell(RotationStates.PARTICLE);

    if (tick % 2 === 0) {
      // Clockwise: tl→tr, tr→br, br→bl, bl→tl
      if (a === RotationStates.PARTICLE) return [E, P, E, E]; // tl → tr
      if (b === RotationStates.PARTICLE) return [E, E, E, P]; // tr → br
      if (d === RotationStates.PARTICLE) return [E, E, P, E]; // br → bl
      /* c */                            return [P, E, E, E]; // bl → tl
    } else {
      // Counter-clockwise: tl→bl, bl→br, br→tr, tr→tl
      if (a === RotationStates.PARTICLE) return [E, E, P, E]; // tl → bl
      if (c === RotationStates.PARTICLE) return [E, E, E, P]; // bl → br
      if (d === RotationStates.PARTICLE) return [E, P, E, E]; // br → tr
      /* b */                            return [P, E, E, E]; // tr → tl
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
