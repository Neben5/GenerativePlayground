# GenerativePlayground

A cellular automata playground -- maybe eventually a game

[neben5.github.io/GenerativePlayground/index.html](https://neben5.github.io/GenerativePlayground/index.html)

### Goals / Features
| | |
|-|-|
| Neighborhood-Rule Matching | Define a set of neighborhoods and rules that can correspond. A 3x3 rule obviously cannot apply to an eca |
| Paintbrush | Each rule relies on a set of states. Add the ability to select one of those states and 'paint' with it |
| Simple neighborhood caching | Instead of calculating every neighborhood -- map neighborhood 'hashes' to an output and only calculate on cache misses |
| Dynamic rule generation | Rules get exponentially more complicated as more states are introduced. Add an editor |
| Forces | Add 'traits' and 'forces' that act on them |
| WebGPU | Turns out gpu is good at do lot of little thing many time | 