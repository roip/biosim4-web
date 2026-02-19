# biosim4-web

A browser-based biological evolution simulator, ported to TypeScript/Next.js from David Miller's [biosim4](https://github.com/davidrmiller/biosim4) (C++).

Inspired by the video ["I programmed some creatures. They evolved."](https://www.youtube.com/watch?v=N3tRFayqVtk)

## What It Does

A population of creatures lives on a 2D grid. Each creature has a **genome** encoding a simple neural network that connects **21 sensory inputs** (location, population density, pheromones, barriers) to **17 action outputs** (movement, signaling, killing).

At the end of each generation, creatures satisfying the **survival criteria** reproduce, passing their genes (with mutations) to the next generation. Over time, the population evolves emergent behaviors adapted to the selection pressure.

## Features

- **Real-time visualization** — Canvas 2D rendering of the grid, creatures, barriers, and pheromone signals
- **Interactive controls** — Start / Pause / Resume / Reset, single-step, step-generation
- **Configurable parameters** — Population size, grid dimensions, genome length, mutation rates, neurons
- **9 survival criteria** — Circle, wall contact, center/corner weighted, pairs, and more
- **7 barrier types** — Vertical/horizontal bars, blocks, floating islands, spots
- **Genome inspector** — Click any creature to see its neural network (sensors → neurons → actions)
- **Statistics panel** — Survival rate, genetic diversity, generation history charts
- **Deterministic** — Seedable PRNG for reproducible runs
- **Web Worker** — Simulation runs off the main thread for smooth UI

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:4000](http://localhost:4000) in your browser (or whichever port Next.js assigns).

## How It Works

```
For each generation:
  For each step:
    For each creature:
      1. Read 21 sensor values (position, neighbors, pheromones, etc.)
      2. Feed-forward through neural network
      3. Execute actions based on outputs
      4. Queue moves and kills
    End of step: drain queues, fade pheromones
  End of generation:
    Evaluate survival → compute stats → spawn next generation with mutations
```

## Tech Stack

- **Next.js 15** with Turbopack
- **React 19**
- **Tailwind CSS 4**
- **TypeScript 5**
- **pnpm** for package management

## Project Structure

```
src/
├── lib/biosim4/          # Core simulation engine (pure TypeScript, no dependencies)
│   ├── types.ts          # Core types: Coord, Gene, Genome, NeuralNet, enums
│   ├── config.ts         # SimParams and defaults
│   ├── random.ts         # Seedable xoshiro128** PRNG
│   ├── grid.ts           # 2D grid (Uint16Array, row-major)
│   ├── genome.ts         # Genome ops: random, mutate, crossover, compare
│   ├── neural-net.ts     # Build neural net from genome, feed-forward
│   ├── indiv.ts          # Individual creature state and logic
│   ├── peeps.ts          # Population manager with move/death queues
│   ├── sensors.ts        # 21 sensor implementations
│   ├── actions.ts        # 17 action implementations
│   ├── signals.ts        # Pheromone signal layers
│   ├── barriers.ts       # Barrier creation
│   ├── survival.ts       # Survival criteria evaluation
│   ├── spawn.ts          # New generation spawning
│   ├── simulator.ts      # Main simulation orchestrator
│   ├── analysis.ts       # Statistics and genome analysis
│   └── worker.ts         # Web Worker entry point
└── app/                  # Next.js UI
    ├── layout.tsx
    ├── page.tsx           # Main page with state management
    └── components/
        ├── SimulationCanvas.tsx   # Canvas renderer
        ├── ControlPanel.tsx       # Parameter controls
        ├── StatsPanel.tsx         # Statistics and charts
        └── GenomeViewer.tsx       # Neural network inspector
```

## C++ → TypeScript Translation

| C++ | TypeScript |
|-----|-----------|
| `Grid` (2D `uint16_t` array) | `Uint16Array` (flat, row-major) |
| `Gene` (32-bit packed struct) | Interface with sourceType/Id, sinkType/Id, weight |
| OpenMP parallelism | Web Worker |
| `biosim4.ini` config | `SimParams` interface with UI controls |
| CImg/OpenCV video | Canvas 2D real-time rendering |
| C++ RNG | Seedable xoshiro128** |

## License

MIT — See [LICENSE](LICENSE)

## Credits

- Original C++ project: [David R. Miller — biosim4](https://github.com/davidrmiller/biosim4)
- Video: ["I programmed some creatures. They evolved."](https://www.youtube.com/watch?v=N3tRFayqVtk)
