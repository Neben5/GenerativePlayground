# GenerativePlayground

![Build Status](https://github.com/Neben5/GenerativePlayground/actions/workflows/.github/workflows/webpack.yml/badge.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![License](https://img.shields.io/badge/license-GPL3-green)

A cellular automata playground for exploring rule-based simulations and emergent behavior.

[Try it live](https://neben5.github.io/GenerativePlayground/index.html)

## Features

### Implemented

| Feature | Description |
|---------|-------------|
| Neighborhood-Rule Matching | Switch between Elementary (1D) and Moore (3×3) neighborhoods with rule-specific implementations |
| Wolfram's Rule 110 | Elementary cellular automaton with binary state visualization |
| Sand Physics | 2D particle simulation with gravity and compaction |
| Simulation Control | Play/pause with tick rate adjustment (0-255 Hz) |
| Grid Configuration | Configurable dimensions and initial cell states |
| Paintbrush tool | Paintable states on the canvas |

### In Progress

- Additional rule implementations (Langton's Ant, Game of Life)
- Grid state persistence (save/load)

## Architecture

**Core Modules:**
- `CARule.ts` - Rule abstraction with neighborhood type definition
- `Rule110.ts` - Elementary cellular automaton
- `SandRule.ts` - 2D sand physics simulation
- `ECA.ts` - Simulation engine and rule registry
- `UI.ts` - User interface and event handling
- `Cells.ts` - N-dimensional grid management

**Design:**
- Each rule manages its own neighborhood queries and boundary handling
- UI and simulation logic are decoupled
- State iteration uses buffer swapping to avoid per-frame allocations
- Rule registry enables extensibility for new automata

## Usage

1. Select a neighborhood type (Elementary or Moore)
2. Choose a rule compatible with the selected neighborhood
3. Configure grid dimensions and initial state
4. Control simulation playback and speed (or tick manually with spacebar)
5. Observe pattern evolution

## Roadmap

| Priority | Item | Rationale |
|----------|------|-----------|
| High | Additional rules | Tests rule system extensibility |
| High | State persistence | Required for workflow continuity |
| Medium | Zoom/pan | Necessary for large grids |
| Medium | Frame stepping | Improves analysis capability |
| Low | GPU acceleration | Performance optimization for future scale |

## Future Directions

**Simulation:**
- Multi-rule interactions
- Temperature/energy transport (higher dimensional states)
- Fluid mechanics
- Chemical reactions

**Interaction:**
- Visualization modes
- Timeline scrubbing

**Rule System:**
- Rule versioning and persistence
- Probability-based rules
- Custom neighborhood definitions
- Rule composition framework

**Performance:**
- Active region optimization
- Profiling and benchmarking
- Parallel computation
- Serialization/deserialization