# PR2 — Hilbert Curve Grid Mapping

## Summary

Replace the row-major 2D → 1D index mapping in `CellSpace` with a Hilbert curve–based mapping. The Hilbert curve preserves spatial locality: cells that are close in 2D are also close in the 1D array, reducing cache misses when rules access neighborhoods.

## Motivation

Current row-major indexing:
```
index = row * width + col
```

For a 3×3 Moore neighborhood centred at (row, col), the 9 accessed indices span up to `2*width + 2` positions apart. On large grids (e.g., 512×512), this causes cache-line misses on every row-crossing access.

Hilbert curve indexing keeps all 9 Moore-neighborhood cells within a small 1D window, typically improving L1/L2 cache hit rate by 30–60% for neighborhood-intensive rules.

## Interface Changes

### New export: `hilbertIndex` (in `src/Cells.ts`)

```ts
/**
 * Compute the Hilbert curve index for a 2D position within a grid of side 2^order.
 * @param x     column (0-based)
 * @param y     row    (0-based)
 * @param order curve order — grid side = 2^order
 * @returns Hilbert 1D index in [0, 4^order)
 */
export function hilbertIndex(x: number, y: number, order: number): number;

/**
 * Convert a Hilbert 1D index back to (x, y).
 * @param index Hilbert index in [0, 4^order)
 * @param order curve order
 * @returns [x, y]
 */
export function hilbertToXY(index: number, order: number): [number, number];
```

### `CellSpace` — opt-in Hilbert layout

```ts
export class CellSpace {
  /**
   * If true, cells array is laid out in Hilbert order.
   * getIndex / getPosition use the Hilbert lookup tables.
   */
  hilbertLayout: boolean;

  // Pre-computed lookup tables built at construction time when hilbertLayout=true
  private hilbertToFlat: Uint32Array;
  private flatToHilbert: Uint32Array;
}
```

The existing `getIndex(position)` and `getPosition(index)` contracts are preserved; only the backing layout changes.

## Testable Interface

All test cases live in `src/__tests__/HilbertCurve.test.ts`.

| Test | What it checks |
|---|---|
| `hilbertIndex(0,0,1) == 0` | Origin is always index 0 |
| `hilbertIndex / hilbertToXY round-trip` | Bijection property |
| All `4^order` indices appear exactly once | Surjectivity |
| Locality: avg 1D distance of Moore neighbors < row-major | Cache locality property |
| `CellSpace` with `hilbertLayout=true` returns same state via `getIndex` | Layout-transparent API |
| Grid size that is not a power-of-2 side → nearest power-of-2 padded | Odd-size grids |

## Files Touched

- `src/Cells.ts` — add `hilbertIndex`, `hilbertToXY`, Hilbert layout support in `CellSpace`
- `src/__tests__/HilbertCurve.test.ts` — new test file

## Notes

- Only square grids of side 2^n are natively supported. Non-power-of-2 grids are handled by padding to the next power of 2 and masking out-of-range cells.
- The lookup tables are `Uint32Array` for compact memory footprint.
- Hilbert layout is opt-in (off by default) to avoid breaking existing tests.
