// Configuration parameters for biosim4
// Mirrors biosim4.ini and struct Params from the C++ original

import { SurvivalCriteria, BarrierType } from './types';

export interface SimParams {
  // Population
  population: number;
  stepsPerGeneration: number;
  maxGenerations: number;

  // World
  sizeX: number;
  sizeY: number;

  // Genome
  genomeInitialLengthMin: number;
  genomeInitialLengthMax: number;
  genomeMaxLength: number;
  maxNumberNeurons: number;

  // Mutation
  pointMutationRate: number;    // per gene per generation
  geneInsertionDeletionRate: number;
  deletionRatio: number;        // fraction of insertion/deletion that are deletions

  // Reproduction
  sexualReproduction: boolean;
  chooseParentsByFitness: boolean;

  // Selection (multiple criteria can be active — survive if ANY is satisfied)
  survivalCriteria: SurvivalCriteria[];

  // Barriers
  barrierType: BarrierType;

  // Responsiveness
  responsivenessCurveKFactor: number;

  // Signals / Pheromones
  signalLayers: number;
  signalSensorRadius: number;

  // Long probe
  longProbeDistance: number;
  shortProbeBarrierDistance: number;

  // Display / output
  displayScale: number;
  updateGraphLog: boolean;
  updateGraphLogStride: number;
  displaySampleGenomes: number;

  // Kill
  killEnable: boolean;

  // RNG
  rngSeed: number;

  // Population sensor radius
  populationSensorRadius: number;
}

export const DEFAULT_PARAMS: SimParams = {
  population: 1000,
  stepsPerGeneration: 300,
  maxGenerations: 500,

  sizeX: 128,
  sizeY: 128,

  genomeInitialLengthMin: 24,
  genomeInitialLengthMax: 24,
  genomeMaxLength: 300,
  maxNumberNeurons: 5,

  pointMutationRate: 0.001,
  geneInsertionDeletionRate: 0.0005,
  deletionRatio: 0.5,

  sexualReproduction: true,
  chooseParentsByFitness: true,

  survivalCriteria: [SurvivalCriteria.LEFT_EIGHTH, SurvivalCriteria.RIGHT_EIGHTH],
  barrierType: BarrierType.FIVE_BLOCKS,

  responsivenessCurveKFactor: 2,

  signalLayers: 1,
  signalSensorRadius: 2.0,

  longProbeDistance: 16,
  shortProbeBarrierDistance: 4,

  displayScale: 1,
  updateGraphLog: false,
  updateGraphLogStride: 25,
  displaySampleGenomes: 0,

  killEnable: false,

  rngSeed: 12345678,

  populationSensorRadius: 2.0,
};
