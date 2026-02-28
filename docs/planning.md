# GenerativePlayground — Improvement Planning

## Problem Statement

The current cellular automaton engine uses a **per-cell tick** model: each cell's next state is computed independently, one cell at a time, reading from the current generation. This works for elementary CAs and simple Moore-neighborhood rules but has two structural limitations:

1. **No intra-tick coordination** — neighborhoods cannot share information within a single tick, making it impossible to implement reversible or conservation-law CAs (e.g., Margolus neighborhood).
2. **Poor cache locality** — the 2D cell grid is stored in row-major order; iterating over the full grid with large working sets causes cache misses that become the performance bottleneck at large grid sizes.

## Motivation

| Capability | Current | Target |
|---|---|---|
| Reversible CAs | ✗ | ✓ (Margolus) |
| Conservation laws | ✗ | ✓ (Margolus) |
| Cache-friendly layout | ✗ | ✓ (Hilbert curve) |
| Per-neighborhood atomicity | ✗ | ✓ (PR1 tick model) |

## Research Notes

### Modified Margolus Neighborhood
- Divides the grid into 2×2 blocks; blocks alternate between *even phase* (top-left aligned) and *odd phase* (offset by 1 in both axes) each tick.
- Within each block, the rule sees all 4 cells atomically and writes all 4 back atomically — no inter-block dependencies.
- Enables reversible automata (e.g., Critters), gas simulations, and billiard-ball models.
- Reference: Toffoli & Margolus, *Cellular Automata Machines* (MIT Press, 1987).

### Hilbert Curve Mapping
- A Hilbert curve of order *n* provides a bijection between `{0, …, 4^n − 1}` and a 2^n × 2^n grid such that spatially adjacent cells are also close in 1D index.
- Reduces cache-miss rate for rules with 3×3 or larger neighborhoods compared with row-major order.
- The mapping is computed once at construction time and stored in a lookup table.

### Per-Neighborhood Tick Model
- Instead of iterating over every cell index and computing the next state individually, the engine iterates over *neighborhoods* as atomic units.
- For a Margolus neighborhood, a neighborhood is a 2×2 block; for Moore, a neighborhood is still a single center cell but reads its 8 neighbors atomically.
- Simplifies the CA rule interface: a rule receives the entire neighborhood (all cell states), not a single (row, col) coordinate.

## PR Tracking

| # | Title | Status | Doc |
|---|---|---|---|
| PR1 | Per-Neighborhood Tick Model | Planned | [pr1-per-neighborhood-tick.md](pr1-per-neighborhood-tick.md) |
| PR2 | Hilbert Curve Grid Mapping | Planned | [pr2-hilbert-curve.md](pr2-hilbert-curve.md) |
| PR3 | Modified Margolus Neighborhood | Planned | [pr3-margolus-neighborhood.md](pr3-margolus-neighborhood.md) |
