/**
 * Hilbert curve utilities for 2D ↔ 1D index mapping.
 *
 * A 2D Hilbert curve provides a space-filling curve mapping that improves
 * cache locality when iterating over grid cells: cells that are nearby in 2D
 * tend to be nearby in the 1D array index.
 *
 * The grid must be square with a side length that is a power of two (order n
 * means a 2^n × 2^n grid).  The helpers below work with any power-of-two
 * side length and are the standard rotate/un-rotate algorithm.
 *
 * Reference: https://en.wikipedia.org/wiki/Hilbert_curve
 */

/**
 * Convert a (x, y) position in an n×n grid to its Hilbert curve distance d.
 *
 * @param n  Side length of the grid — must be a power of two (e.g. 2, 4, 8, …)
 * @param x  Column index in [0, n)
 * @param y  Row index in [0, n)
 * @returns  Hilbert curve distance in [0, n*n)
 */
export function xyToHilbert(n: number, x: number, y: number): number {
  let rx: number;
  let ry: number;
  let d = 0;
  for (let s = Math.floor(n / 2); s > 0; s = Math.floor(s / 2)) {
    rx = (x & s) > 0 ? 1 : 0;
    ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    [x, y] = hilbertRotate(s, x, y, rx, ry);
  }
  return d;
}

/**
 * Convert a Hilbert curve distance d back to (x, y) in an n×n grid.
 *
 * @param n  Side length of the grid — must be a power of two
 * @param d  Hilbert curve distance in [0, n*n)
 * @returns  `{ x, y }` where x is column and y is row
 */
export function hilbertToXY(n: number, d: number): { x: number; y: number } {
  let rx: number;
  let ry: number;
  let t = d;
  let x = 0;
  let y = 0;
  for (let s = 1; s < n; s *= 2) {
    rx = 1 & Math.floor(t / 2);
    ry = 1 & (t ^ rx);
    [x, y] = hilbertRotate(s, x, y, rx, ry);
    x += s * rx;
    y += s * ry;
    t = Math.floor(t / 4);
  }
  return { x, y };
}

/**
 * Build a look-up table of length `width * height` where
 * `hilbertOrder[hilbertIndex]` gives the flat row-major cell index.
 *
 * When `width` or `height` is not a power of two the curve is computed on
 * the smallest enclosing power-of-two square, and indices that fall outside
 * the `width × height` rectangle are simply omitted.
 *
 * @param width   Grid width (number of columns)
 * @param height  Grid height (number of rows)
 * @returns  Array of flat cell indices in Hilbert-curve order
 */
export function buildHilbertOrder(width: number, height: number): number[] {
  const n = nextPowerOfTwo(Math.max(width, height));
  const order: number[] = [];
  for (let d = 0; d < n * n; d++) {
    const { x, y } = hilbertToXY(n, d);
    if (x < width && y < height) {
      order.push(y * width + x);
    }
  }
  return order;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Rotate / flip a quadrant for the Hilbert curve. */
function hilbertRotate(
  n: number,
  x: number,
  y: number,
  rx: number,
  ry: number,
): [number, number] {
  if (ry === 0) {
    if (rx === 1) {
      x = n - 1 - x;
      y = n - 1 - y;
    }
    [x, y] = [y, x];
  }
  return [x, y];
}

/** Return the smallest power of two that is ≥ v. */
export function nextPowerOfTwo(v: number): number {
  if (v <= 0) return 1;
  let p = 1;
  while (p < v) p <<= 1;
  return p;
}
