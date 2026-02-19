// Web Worker entry point for biosim4 simulation
// Runs the simulation loop off the main thread, posts state updates back

import { Simulator, SimulationState } from './simulator';
import { SimParams, DEFAULT_PARAMS } from './config';
import { getNetworkSummary } from './analysis';

// ── Message types ────────────────────────────────────────────────────

export type WorkerCommand =
  | { type: 'init'; params: SimParams }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset'; params?: SimParams }
  | { type: 'step' }           // Single step
  | { type: 'stepGeneration' } // Run one full generation
  | { type: 'updateParams'; params: Partial<SimParams> }
  | { type: 'inspect'; x: number; y: number }
  | { type: 'setSpeed'; stepsPerFrame: number };

export type WorkerMessage =
  | { type: 'state'; state: SerializableState }
  | { type: 'generationComplete'; stats: import('./analysis').GenerationStats }
  | { type: 'inspectResult'; data: ReturnType<typeof getNetworkSummary> | null; indivInfo: IndivInfo | null }
  | { type: 'error'; message: string };

export interface IndivInfo {
  index: number;
  loc: { x: number; y: number };
  age: number;
  responsiveness: number;
  oscPeriod: number;
  genomeLength: number;
  alive: boolean;
}

/** Serializable version of SimulationState (typed arrays become regular arrays for postMessage) */
export interface SerializableState {
  generation: number;
  simStep: number;
  running: boolean;
  paused: boolean;
  sizeX: number;
  sizeY: number;
  gridData: ArrayBuffer;
  signalData: ArrayBuffer;
  colorData: ArrayBuffer;
  stats: import('./analysis').GenerationStats | null;
  generationHistory: import('./analysis').GenerationStats[];
}

// ── Worker implementation ────────────────────────────────────────────

let simulator: Simulator | null = null;
let running = false;
let stepsPerFrame = 1;
let animFrameTimeout: ReturnType<typeof setTimeout> | null = null;

const ctx = self as unknown as Worker;

function postState(): void {
  if (!simulator) return;

  const state = simulator.getState();
  const gridBuf = state.gridData.buffer.slice(0) as ArrayBuffer;
  const sigBuf = state.signalData.buffer.slice(0) as ArrayBuffer;
  const colorBuf = state.colorData.buffer.slice(0) as ArrayBuffer;

  const msg: WorkerMessage = {
    type: 'state',
    state: {
      generation: state.generation,
      simStep: state.simStep,
      running,
      paused: simulator.paused,
      sizeX: simulator.params.sizeX,
      sizeY: simulator.params.sizeY,
      gridData: gridBuf,
      signalData: sigBuf,
      colorData: colorBuf,
      stats: state.stats,
      generationHistory: state.generationHistory,
    },
  };

  ctx.postMessage(msg, [gridBuf, sigBuf, colorBuf]);
}

function simulationLoop(): void {
  if (!simulator || !running) return;

  for (let i = 0; i < stepsPerFrame; i++) {
    if (simulator.simStep >= simulator.params.stepsPerGeneration) {
      // End of generation: evaluate, spawn, reset
      const stats = simulator.endGeneration();
      ctx.postMessage({ type: 'generationComplete', stats } as WorkerMessage);

      // Check if we've reached max generations
      if (simulator.generation >= simulator.params.maxGenerations) {
        running = false;
        postState();
        return;
      }
    } else {
      simulator.stepOnce();
    }
  }

  postState();

  // Schedule next frame
  animFrameTimeout = setTimeout(simulationLoop, 0);
}

function stopLoop(): void {
  if (animFrameTimeout !== null) {
    clearTimeout(animFrameTimeout);
    animFrameTimeout = null;
  }
}

ctx.onmessage = (e: MessageEvent<WorkerCommand>) => {
  const cmd = e.data;

  try {
    switch (cmd.type) {
      case 'init': {
        stopLoop();
        simulator = new Simulator(cmd.params);
        simulator.init();
        running = false;
        postState();
        break;
      }

      case 'start': {
        if (!simulator) {
          simulator = new Simulator(DEFAULT_PARAMS);
          simulator.init();
        }
        running = true;
        simulator.paused = false;
        simulationLoop();
        break;
      }

      case 'pause': {
        running = false;
        simulator && (simulator.paused = true);
        stopLoop();
        postState();
        break;
      }

      case 'resume': {
        if (simulator) {
          running = true;
          simulator.paused = false;
          simulationLoop();
        }
        break;
      }

      case 'reset': {
        stopLoop();
        running = false;
        if (cmd.params) {
          simulator = new Simulator(cmd.params);
        } else if (simulator) {
          simulator = new Simulator(simulator.params);
        } else {
          simulator = new Simulator(DEFAULT_PARAMS);
        }
        simulator.init();
        postState();
        break;
      }

      case 'step': {
        if (!simulator) {
          simulator = new Simulator(DEFAULT_PARAMS);
          simulator.init();
        }
        running = false;
        stopLoop();
        simulator.stepOnce();
        postState();
        break;
      }

      case 'stepGeneration': {
        if (!simulator) {
          simulator = new Simulator(DEFAULT_PARAMS);
          simulator.init();
        }
        running = false;
        stopLoop();
        const stats = simulator.runGeneration();
        ctx.postMessage({ type: 'generationComplete', stats } as WorkerMessage);
        postState();
        break;
      }

      case 'updateParams': {
        if (simulator) {
          simulator.updateParams(cmd.params);
        }
        break;
      }

      case 'inspect': {
        if (simulator) {
          const indiv = simulator.getIndivAt({ x: cmd.x, y: cmd.y });
          if (indiv) {
            const data = getNetworkSummary(indiv);
            const info: IndivInfo = {
              index: indiv.index,
              loc: { ...indiv.loc },
              age: indiv.age,
              responsiveness: indiv.responsiveness,
              oscPeriod: indiv.oscPeriod,
              genomeLength: indiv.genome.length,
              alive: indiv.alive,
            };
            ctx.postMessage({ type: 'inspectResult', data, indivInfo: info } as WorkerMessage);
          } else {
            ctx.postMessage({ type: 'inspectResult', data: null, indivInfo: null } as WorkerMessage);
          }
        }
        break;
      }

      case 'setSpeed': {
        stepsPerFrame = Math.max(1, cmd.stepsPerFrame);
        break;
      }
    }
  } catch (err) {
    ctx.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    } as WorkerMessage);
  }
};
