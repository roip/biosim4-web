// Individual creature for biosim4
// Port of indiv.h / indiv.cpp from C++ original

import {
  Coord, Dir, Compass, Genome, NeuralNet,
  Sensor, Action, coordAdd,
} from './types';
import { buildNeuralNet, feedForward } from './neural-net';
import { SimParams } from './config';

export interface Indiv {
  index: number;           // index in the Peeps array (1-based)
  alive: boolean;
  loc: Coord;
  birthLoc: Coord;
  lastMoveDir: Dir;
  genome: Genome;
  nnet: NeuralNet;
  age: number;
  responsiveness: number;  // 0.0..1.0
  oscPeriod: number;       // oscillator period
  longProbeDist: number;   // how far to long-probe
  challengeBits: number;   // for kill-forward tracking
  lastDirection: Dir;
}

/** Create a new individual with a genome, placing it at a location */
export function createIndiv(
  index: number,
  genome: Genome,
  loc: Coord,
  params: SimParams,
): Indiv {
  const nnet = buildNeuralNet(genome, params.maxNumberNeurons);

  return {
    index,
    alive: true,
    loc: { ...loc },
    birthLoc: { ...loc },
    lastMoveDir: new Dir(Compass.CENTER),
    genome: [...genome],
    nnet,
    age: 0,
    responsiveness: 0.5,
    oscPeriod: 34,
    longProbeDist: params.longProbeDistance,
    challengeBits: 0,
    lastDirection: new Dir(Compass.CENTER),
  };
}

/** Responsiveness curve: maps raw responsiveness to a 0..1 value */
export function responsivenessCurve(rawResponsiveness: number, kFactor: number): number {
  const k = kFactor;
  return 1.0 / (1.0 + Math.exp(-k * (rawResponsiveness - 0.5) * 8));
}

/**
 * Get sensor values for an individual.
 * This delegates to the sensor module for the actual computation.
 * Returns a Float32Array indexed by Sensor enum.
 */
export function getSensorValues(
  indiv: Indiv,
  simStep: number,
  getSensorFn: (indiv: Indiv, sensor: Sensor, simStep: number) => number,
): Float32Array {
  const numSensors = Sensor.NUM_SENSES as number;
  const values = new Float32Array(numSensors);

  for (let s = 0; s < numSensors; s++) {
    values[s] = getSensorFn(indiv, s as Sensor, simStep);
  }

  return values;
}

/** Run one simulation step for an individual: sensors -> neural net -> action levels */
export function simStepIndiv(
  indiv: Indiv,
  simStep: number,
  getSensorFn: (indiv: Indiv, sensor: Sensor, simStep: number) => number,
): Float32Array {
  const sensorValues = getSensorValues(indiv, simStep, getSensorFn);
  const actionLevels = feedForward(indiv.nnet, sensorValues);
  return actionLevels;
}

/** Get a color for this individual based on its genome (for visualization) */
export function getGenomeColor(genome: Genome): [number, number, number] {
  if (genome.length === 0) return [128, 128, 128];

  // Hash the genome into an RGB color
  let hash = 0;
  for (const gene of genome) {
    const v = ((gene.sourceType << 31) | (gene.sourceId << 24) |
               (gene.sinkType << 23) | (gene.sinkId << 16) |
               (gene.weightAsInt & 0xFFFF)) >>> 0;
    hash = ((hash << 5) - hash + v) | 0;
  }

  // Convert hash to HSL then to RGB for vivid colors
  const hue = ((hash & 0xFFFF) / 0xFFFF) * 360;
  const sat = 0.7 + ((hash >>> 16) & 0xFF) / 255 * 0.3;
  const light = 0.4 + ((hash >>> 24) & 0xFF) / 255 * 0.2;

  return hslToRgb(hue, sat, light);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}
