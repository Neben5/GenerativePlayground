# GenerativePlayground

A cellular automata playground -- maybe eventually a game

[neben5.github.io/GenerativePlayground/index.html](https://neben5.github.io/GenerativePlayground/index.html)

### Goals / Features
| Name | Description |
|- |- |
| Neighborhood-Rule Matching | Define a set of neighborhoods and rules that can correspond. A 3x3 rule obviously cannot apply to an eca |
| Paintbrush | Each rule relies on a set of states. Add the ability to select one of those states and 'paint' with it |
| Simple neighborhood caching | Instead of calculating every neighborhood -- map neighborhood 'hashes' to an output and only calculate on cache misses |
| Dynamic rule generation | Rules get exponentially more complicated as more states are introduced. Add an editor |
| Forces | Add 'traits' and 'forces' that act on them |
| WebGPU | Turns out gpu is good at do lot of little thing many time | 

### Potential Features

| Category | Ideas |
|- |- |
| **Simulation Depth** | Multi-rule interactions (gravity + compaction simultaneously); Temperature/energy propagation; Fluid mechanics (water pressure, flow, pooling); Chemical reactions (sand + fire = glass) |
| **Visual & Interaction** | Zoom & pan for large grids; Pause + frame-by-frame scrubbing; Multi-layer overlays (density, temperature, flow); Preset brushes for painting patterns |
| **Rule Creation** | Rule versioning/persistence (save custom rulesets); Probability-based rules (80% chance to apply); Time-delayed rules (cell age tracking); Constrained neighborhoods (slope-triggered avalanches) |
| **Performance** | Active region chunking (only compute falling sand/spreading fire); Rule optimization profiler; Grid serialization (save/load states) |
| **Game Mechanics** | Challenge modes (tunnel to bottom, build structures); Entity system (agents that interact with cells); Undo/redo stack; Animation keyframes & export |
| **Technical** | Rule composition DSL/GUI builder; 3D slices & cross-sections; Performance benchmark suite |