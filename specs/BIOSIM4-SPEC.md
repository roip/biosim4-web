# Biosim4 - Biological Evolution Simulator

[← README](../README.md)

## Canonical Document

This is the canonical specification for the Biosim4 project.

---

## Overview

**Biosim4** is a TypeScript port of David Miller's [biosim4](https://github.com/davidrmiller/biosim4) — a biological evolution simulator where creatures with neural networks evolve through natural selection in a 2D grid world.

**Core Concept**: A population of creatures lives in a 2D grid. Each creature has a genome that encodes a simple neural network connecting sensory inputs (location, population density, pheromones, barriers) to action outputs (movement, signaling, killing). At the end of each generation, creatures that satisfy the survival criteria reproduce, passing their genes (with mutations) to the next generation. Over time, the population evolves behaviors adapted to the selection pressure.

**Purpose**:
1. Demonstrate emergent behavior through genetic algorithms and neural networks
2. Interactive exploration of evolutionary dynamics
3. Educational tool for understanding natural selection, mutation, and genetic diversity

**Original**: Based on [github.com/davidrmiller/biosim4](https://github.com/davidrmiller/biosim4) and the video ["I programmed some creatures. They evolved."](https://www.youtube.com/watch?v=N3tRFayqVtk)

---

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Browser Main Thread                     │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Page.tsx    │  │ ControlPanel │  │  StatsPanel    │  │
│  │  (Layout)    │  │ (Parameters) │  │  (Charts)      │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                 │                   │           │
│  ┌──────┴─────────────────┴───────────────────┴────────┐ │
│  │              SimulationCanvas (Canvas 2D)            │ │
│  │              + GenomeViewer (SVG)                    │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │  postMessage                    │
├─────────────────────────┼────────────────────────────────┤
│                    Web Worker                             │
│                         │                                 │
│  ┌──────────────────────┴──────────────────────────────┐ │
│  │                   Simulator                          │ │
│  │  ┌───────┐ ┌───────┐ ┌─────────┐ ┌──────────────┐ │ │
│  │  │ Grid  │ │ Peeps │ │ Signals │ │ Neural Nets  │ │ │
│  │  └───────┘ └───────┘ └─────────┘ └──────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Key Translation Decisions (C++ → TypeScript)

| C++ Concept | TypeScript Implementation |
|---|---|
| `Grid` (2D array of `uint16_t`) | `Uint16Array` (flat, row-major) |
| `Gene` (32-bit packed struct) | Interface with sourceType/Id, sinkType/Id, weight |
| `NeuralNet` (connections + neurons) | Array of `NeuralConnection` + `Neuron` objects |
| OpenMP parallelism | Web Worker (single sim thread, off main thread) |
| `biosim4.ini` config file | TypeScript `SimParams` interface with UI controls |
| CImg/OpenCV video output | Canvas 2D real-time rendering |
| C++ RNG | Seedable xoshiro128** PRNG |
| Move/death queues (single-thread drain) | Same pattern: queue during step, drain at end |

---

## Data Model

### Core Types

```typescript
// Direction (8-way + center)
enum Compass { N, NE, E, SE, S, SW, W, NW, CENTER }

// Grid location
interface Coord { x: number; y: number }

// Gene: one neural connection encoded as 32-bit value
interface Gene {
  sourceType: number;  // 0=neuron, 1=sensor
  sourceId: number;    // 7 bits
  sinkType: number;    // 0=neuron, 1=action
  sinkId: number;      // 7 bits
  weightAsInt: number; // signed 16-bit, /8192 for float
}

// Genome: array of genes
type Genome = Gene[];

// Individual creature
interface Indiv {
  index: number;
  alive: boolean;
  loc: Coord;
  genome: Genome;
  nnet: NeuralNet;
  age: number;
  responsiveness: number;
  oscPeriod: number;
  longProbeDist: number;
}
```

### Grid

- `Uint16Array` of size `sizeX * sizeY`
- Value `0` = empty cell
- Value `0xFFFF` = barrier
- Any other value = index into the Peeps population array (1-based)

### Neural Network

Each individual's genome is converted to a neural network:
1. Map gene source/sink IDs to actual sensor/neuron/action indices
2. Create internal neurons
3. Prune unconnected neurons iteratively
4. Feed-forward: sensors → internal neurons → action outputs
5. Activation function: `tanh` (outputs in [-1, 1])

---

## Sensors (21)

| Sensor | Description |
|---|---|
| LOC_X, LOC_Y | Normalized grid position |
| BOUNDARY_DIST | Distance to nearest boundary |
| BOUNDARY_DIST_X/Y | Distance to nearest X/Y boundary |
| GENETIC_SIM_FWD | Genetic similarity with creature ahead |
| LAST_MOVE_DIR_X/Y | Last movement direction components |
| LONGPROBE_POP_FWD | Population along forward probe |
| LONGPROBE_BARRIER_FWD | Distance to barrier in forward probe |
| POPULATION | Population density in neighborhood |
| POPULATION_FWD | Population ahead |
| POPULATION_LR | Population left vs right |
| OSC1 | Oscillator (sinusoidal) |
| AGE | Age as fraction of generation |
| BARRIER_FWD | Barrier ahead (short range) |
| BARRIER_LR | Barrier left vs right |
| RANDOM | Random value |
| SIGNAL0 | Pheromone density |
| SIGNAL0_FWD | Pheromone ahead |
| SIGNAL0_LR | Pheromone left vs right |

## Actions (17)

| Action | Description |
|---|---|
| MOVE_X, MOVE_Y | Direct X/Y movement |
| MOVE_FORWARD | Move in last direction |
| MOVE_RL | Turn right/left then move |
| MOVE_RANDOM | Random direction movement |
| MOVE_EAST/WEST/NORTH/SOUTH | Cardinal movement |
| MOVE_LEFT/RIGHT/REVERSE | Relative movement |
| SET_OSCILLATOR_PERIOD | Adjust oscillator |
| SET_LONGPROBE_DIST | Adjust probe distance |
| SET_RESPONSIVENESS | Adjust action threshold |
| EMIT_SIGNAL0 | Emit pheromone |
| KILL_FORWARD | Kill creature ahead |

## Survival Criteria (11)

| Criteria | Description |
|---|---|
| CIRCLE | Within circle in center |
| RIGHT_HALF / LEFT_HALF | Right/left half of grid |
| RIGHT_QUARTER / LEFT_QUARTER | Right/left quarter |
| CENTER_WEIGHTED | Closer to center = more likely |
| CORNER_WEIGHTED | Closer to corners = more likely |
| PAIRS | Has at least one neighbor |
| CONTACT | Adjacent to another creature |
| AGAINST_ANY_WALL | On grid boundary |
| TOUCH_ANY_WALL | Within 1 cell of boundary |

## Barrier Types (7)

| Type | Description |
|---|---|
| NONE | No barriers |
| VERTICAL_BAR_CONSTANT | Fixed vertical bar |
| VERTICAL_BAR_RANDOM | Random-position vertical bar |
| FIVE_BLOCKS | Five evenly-spaced blocks |
| HORIZONTAL_BAR_CONSTANT | Fixed horizontal bar |
| FLOATING_ISLANDS | Random circular islands |
| SPOTS | Regularly-spaced circular spots |

---

## File Structure

```
src/lib/biosim4/
  types.ts          — Core types (Coord, Dir, Gene, Genome, NeuralNet, enums)
  config.ts         — SimParams interface and DEFAULT_PARAMS
  random.ts         — Seedable xoshiro128** PRNG
  grid.ts           — Grid class (Uint16Array, visitNeighborhood)
  genome.ts         — Genome operations (random, mutate, crossover, compare)
  neural-net.ts     — Build neural net from genome, feed-forward
  indiv.ts          — Individual (genome, brain, location, color)
  peeps.ts          — Population manager with move/death queues
  sensors.ts        — All 21 sensor implementations
  actions.ts        — All 17 action implementations
  signals.ts        — Pheromone signal layer
  barriers.ts       — Barrier creation functions
  survival.ts       — Survival criteria functions
  spawn.ts          — New generation spawning with mutation
  simulator.ts      — Main simulation orchestrator
  analysis.ts       — Statistics and genome analysis
  worker.ts         — Web Worker entry point

src/app/
  page.tsx           — Main page with layout and state management
  layout.tsx         — Root layout
  globals.css        — Global styles
  components/
    SimulationCanvas.tsx   — Canvas 2D grid renderer
    ControlPanel.tsx       — Parameter controls and sim controls
    StatsPanel.tsx         — Statistics display with SVG chart
    GenomeViewer.tsx       — Individual genome/neural net inspector

specs/
  BIOSIM4-SPEC.md    — This document
```

---

## Simulation Loop

```
For each generation (0..maxGenerations):
  For each step (0..stepsPerGeneration):
    For each living individual:
      1. Compute sensor values (21 inputs)
      2. Feed-forward through neural net
      3. Execute actions based on outputs
      4. Queue moves and kills
    End-of-step:
      - Drain death queue
      - Drain move queue
      - Fade pheromone signals
  End-of-generation:
    - Evaluate survival criteria
    - Compute statistics (survivors, diversity, etc.)
    - Spawn new generation from survivors
    - Apply mutations (point, insertion, deletion)
    - Reset grid and signals
    - Place new population
```

---

## UI Features

- **Canvas visualization**: Real-time rendering of the 2D grid with color-coded creatures
- **Control panel**: Start/Pause/Resume/Reset, single-step, step-generation
- **Speed control**: Adjustable steps-per-frame
- **Parameter sliders**: Population, grid size, genome length, mutation rates, neurons
- **Survival criteria selector**: Dropdown with all 11 criteria
- **Barrier selector**: Dropdown with all 7 barrier types
- **Display toggles**: Show/hide signals, barriers; zoom control
- **Statistics panel**: Generation #, survivors, survival rate, diversity, avg genome length
- **Survival chart**: SVG line chart of survival rate and diversity over generations
- **Genome inspector**: Click any creature to see its neural net diagram (sensors → neurons → actions)
- **Reproducible runs**: Seedable RNG — same seed produces identical results
