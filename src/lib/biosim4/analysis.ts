// Analysis utilities for biosim4
// Port of analysis.cpp from C++ original

import { Genome, Sensor, Action, NeuralConnection, SENSOR, ACTION } from './types';
import { Indiv } from './indiv';
import { PRNG } from './random';
import { geneticDiversity } from './genome';

/** Statistics for a single generation */
export interface GenerationStats {
  generation: number;
  population: number;
  survivors: number;
  survivalRate: number;
  geneticDiversity: number;
  avgGenomeLength: number;
  killDeaths: number;
  maxGenomeLength: number;
  minGenomeLength: number;
}

/** Compute generation statistics */
export function computeGenerationStats(
  generation: number,
  allIndividuals: Indiv[],
  survivors: Indiv[],
  killDeaths: number,
  rng: PRNG,
): GenerationStats {
  const living = allIndividuals.filter(ind => ind && ind.alive);
  const genomes = living.map(ind => ind.genome);

  let totalLength = 0;
  let maxLen = 0;
  let minLen = Infinity;
  for (const g of genomes) {
    totalLength += g.length;
    if (g.length > maxLen) maxLen = g.length;
    if (g.length < minLen) minLen = g.length;
  }

  return {
    generation,
    population: living.length,
    survivors: survivors.length,
    survivalRate: living.length > 0 ? survivors.length / living.length : 0,
    geneticDiversity: geneticDiversity(genomes, rng),
    avgGenomeLength: genomes.length > 0 ? totalLength / genomes.length : 0,
    killDeaths,
    maxGenomeLength: maxLen,
    minGenomeLength: minLen === Infinity ? 0 : minLen,
  };
}

/** Count connections from each sensor type across the population */
export function countSensorConnections(individuals: Indiv[]): Map<Sensor, number> {
  const counts = new Map<Sensor, number>();
  for (let s = 0; s < Sensor.NUM_SENSES; s++) {
    counts.set(s as Sensor, 0);
  }

  for (const indiv of individuals) {
    if (!indiv || !indiv.alive) continue;
    for (const conn of indiv.nnet.connections) {
      if (conn.sourceType === SENSOR) {
        const current = counts.get(conn.sourceId as Sensor) || 0;
        counts.set(conn.sourceId as Sensor, current + 1);
      }
    }
  }

  return counts;
}

/** Count connections to each action type across the population */
export function countActionConnections(individuals: Indiv[]): Map<Action, number> {
  const counts = new Map<Action, number>();
  for (let a = 0; a < Action.NUM_ACTIONS; a++) {
    counts.set(a as Action, 0);
  }

  for (const indiv of individuals) {
    if (!indiv || !indiv.alive) continue;
    for (const conn of indiv.nnet.connections) {
      if (conn.sinkType === ACTION) {
        const current = counts.get(conn.sinkId as Action) || 0;
        counts.set(conn.sinkId as Action, current + 1);
      }
    }
  }

  return counts;
}

/** Get a displayable summary of an individual's neural net */
export function getNetworkSummary(indiv: Indiv): {
  sensors: string[];
  actions: string[];
  connections: { from: string; to: string; weight: number }[];
} {
  const sensors = new Set<string>();
  const actions = new Set<string>();
  const connections: { from: string; to: string; weight: number }[] = [];

  for (const conn of indiv.nnet.connections) {
    const fromName = conn.sourceType === SENSOR
      ? Sensor[conn.sourceId] || `S${conn.sourceId}`
      : `N${conn.sourceId}`;
    const toName = conn.sinkType === ACTION
      ? Action[conn.sinkId] || `A${conn.sinkId}`
      : `N${conn.sinkId}`;

    if (conn.sourceType === SENSOR) sensors.add(fromName);
    if (conn.sinkType === ACTION) actions.add(toName);

    connections.push({ from: fromName, to: toName, weight: conn.weight });
  }

  return {
    sensors: Array.from(sensors),
    actions: Array.from(actions),
    connections,
  };
}
