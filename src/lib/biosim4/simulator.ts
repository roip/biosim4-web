// Main simulation engine for biosim4
// Port of simulator.cpp from C++ original
// Orchestrates the generation > step > individual loop

import { Sensor } from './types';
import { SimParams } from './config';
import { Grid } from './grid';
import { Peeps } from './peeps';
import { Signals } from './signals';
import { Indiv, simStepIndiv, getGenomeColor } from './indiv';
import { getSensor, SensorContext } from './sensors';
import { executeActions, ActionContext } from './actions';
import { createBarrier } from './barriers';
import { getSurvivors } from './survival';
import { spawnNewGeneration } from './spawn';
import { GenerationStats, computeGenerationStats } from './analysis';
import { PRNG } from './random';

/** Simulation state that can be sent to the UI */
export interface SimulationState {
  generation: number;
  simStep: number;
  running: boolean;
  paused: boolean;
  gridData: Uint16Array;
  signalData: Uint8Array;
  /** Packed color data for each grid cell: [r, g, b, r, g, b, ...] per individual index */
  colorData: Uint8Array;
  stats: GenerationStats | null;
  generationHistory: GenerationStats[];
}

/** The main simulator class */
export class Simulator {
  params: SimParams;
  grid: Grid;
  peeps: Peeps;
  signals: Signals;
  rng: PRNG;

  generation: number = 0;
  simStep: number = 0;
  running: boolean = false;
  paused: boolean = false;
  killDeaths: number = 0;

  stats: GenerationStats | null = null;
  generationHistory: GenerationStats[] = [];

  private colorCache: Map<number, [number, number, number]> = new Map();

  constructor(params: SimParams) {
    this.params = { ...params };
    this.rng = new PRNG(params.rngSeed);
    this.grid = new Grid(params.sizeX, params.sizeY);
    this.peeps = new Peeps();
    this.signals = new Signals(params.sizeX, params.sizeY, params.signalLayers);
  }

  /** Initialize or reset the simulation */
  init(): void {
    this.generation = 0;
    this.simStep = 0;
    this.killDeaths = 0;
    this.stats = null;
    this.generationHistory = [];
    this.colorCache.clear();

    this.grid.clear();
    this.signals.zeroFill();

    // Create barriers
    createBarrier(this.grid, this.params.barrierType, this.rng);

    // Initialize population
    this.peeps.init(this.params, this.grid, this.rng);

    // Build color cache
    this.buildColorCache();
  }

  /** Build color cache for current population */
  private buildColorCache(): void {
    this.colorCache.clear();
    for (let i = 1; i <= this.peeps.getPopulationSize(); i++) {
      const indiv = this.peeps.get(i);
      if (indiv && indiv.alive) {
        this.colorCache.set(i, getGenomeColor(indiv.genome));
      }
    }
  }

  /** Run a single simulation step for all individuals */
  stepOnce(): void {
    const sensorCtx: SensorContext = {
      grid: this.grid,
      signals: this.signals,
      peeps: this.peeps,
      params: this.params,
      rng: this.rng,
      simStep: this.simStep,
      stepsPerGeneration: this.params.stepsPerGeneration,
    };

    const actionCtx: ActionContext = {
      grid: this.grid,
      signals: this.signals,
      peeps: this.peeps,
      params: this.params,
      rng: this.rng,
    };

    // Process each living individual
    for (let i = 1; i <= this.peeps.getPopulationSize(); i++) {
      const indiv = this.peeps.get(i);
      if (!indiv || !indiv.alive) continue;

      // Compute sensor values and run through neural net
      const getSensorFn = (ind: Indiv, sensor: Sensor, step: number) =>
        getSensor(ind, sensor, sensorCtx);

      const actionLevels = simStepIndiv(indiv, this.simStep, getSensorFn);

      // Execute actions based on neural net output
      executeActions(indiv, actionLevels, actionCtx);

      // Age the individual
      indiv.age++;
    }

    // End of sim step: process queued moves and deaths
    this.killDeaths += this.peeps.drainDeathQueue(this.grid);
    this.peeps.drainMoveQueue(this.grid);

    // Fade pheromone signals
    for (let layer = 0; layer < this.params.signalLayers; layer++) {
      this.signals.fade(layer);
    }

    this.simStep++;
  }

  /** Run one complete generation (all steps) */
  runGeneration(): GenerationStats {
    this.simStep = 0;
    this.killDeaths = 0;

    for (let step = 0; step < this.params.stepsPerGeneration; step++) {
      this.stepOnce();
    }

    return this.endGeneration();
  }

  /** Process end-of-generation: evaluate survival, spawn next generation */
  endGeneration(): GenerationStats {
    // Evaluate survival
    const survivors = getSurvivors(
      this.params.survivalCriteria,
      this.params,
      this.grid,
      this.peeps,
    );

    // Compute statistics
    const allIndivs = [];
    for (let i = 1; i <= this.peeps.getPopulationSize(); i++) {
      allIndivs.push(this.peeps.get(i));
    }

    this.stats = computeGenerationStats(
      this.generation,
      allIndivs,
      survivors,
      this.killDeaths,
      this.rng,
    );
    this.generationHistory.push(this.stats);

    // Spawn next generation
    const newGenomes = spawnNewGeneration(survivors, this.params, this.rng);

    // Reset grid and signals
    this.grid.clear();
    this.signals.zeroFill();

    // Recreate barriers
    createBarrier(this.grid, this.params.barrierType, this.rng);

    // Place new population
    this.peeps.initFromGenomes(newGenomes, this.params, this.grid, this.rng);

    // Rebuild color cache
    this.buildColorCache();

    this.generation++;
    this.simStep = 0;

    return this.stats;
  }

  /** Get a snapshot of the current state for rendering */
  getState(): SimulationState {
    // Build color data: for each grid cell, store the RGB of the individual there
    const size = this.params.sizeX * this.params.sizeY;
    const colorData = new Uint8Array(size * 3);
    const gridData = this.grid.getDataSnapshot();

    for (let i = 0; i < size; i++) {
      const val = gridData[i];
      if (val > 0 && val !== 0xFFFF) {
        const color = this.colorCache.get(val);
        if (color) {
          colorData[i * 3] = color[0];
          colorData[i * 3 + 1] = color[1];
          colorData[i * 3 + 2] = color[2];
        }
      }
    }

    return {
      generation: this.generation,
      simStep: this.simStep,
      running: this.running,
      paused: this.paused,
      gridData,
      signalData: this.signals.getLayerSnapshot(0),
      colorData,
      stats: this.stats,
      generationHistory: [...this.generationHistory],
    };
  }

  /** Update params at runtime (hot-reload support) */
  updateParams(newParams: Partial<SimParams>): void {
    Object.assign(this.params, newParams);
  }

  /** Get individual at a grid location (for inspection) */
  getIndivAt(loc: { x: number; y: number }): Indiv | null {
    if (!this.grid.isInBounds(loc)) return null;
    const idx = this.grid.at(loc);
    if (idx === 0 || idx === 0xFFFF) return null;
    const indiv = this.peeps.get(idx);
    return indiv && indiv.alive ? indiv : null;
  }
}
