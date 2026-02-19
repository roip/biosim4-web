// Genome operations for biosim4
// Port of genome.cpp / genome-compare.cpp from C++ original

import {
  Gene, Genome, Sensor, Action,
  makeRandomGene, geneToUint32, uint32ToGene,
} from './types';
import { PRNG } from './random';

/** Create a random genome of the given length */
export function makeRandomGenome(rng: PRNG, length: number): Genome {
  const genome: Genome = [];
  for (let i = 0; i < length; i++) {
    genome.push(makeRandomGene(rng.bound()));
  }
  return genome;
}

/** Apply point mutations to a genome. Returns the (possibly modified) genome. */
export function applyPointMutations(genome: Genome, rng: PRNG, rate: number): Genome {
  for (let i = 0; i < genome.length; i++) {
    if (rng.chance(rate)) {
      // Flip a random bit in the 32-bit gene representation
      const val = geneToUint32(genome[i]);
      const bit = rng.nextInt(32);
      const mutated = val ^ (1 << bit);
      genome[i] = uint32ToGene(mutated >>> 0);
    }
  }
  return genome;
}

/** Apply gene insertion/deletion mutations */
export function applyInsertionDeletion(
  genome: Genome,
  rng: PRNG,
  rate: number,
  deletionRatio: number,
  maxLength: number,
): Genome {
  if (genome.length === 0) return genome;

  if (rng.chance(rate)) {
    if (rng.chance(deletionRatio)) {
      // Delete a random gene
      if (genome.length > 1) {
        const idx = rng.nextInt(genome.length);
        genome.splice(idx, 1);
      }
    } else {
      // Insert a random gene
      if (genome.length < maxLength) {
        const idx = rng.nextInt(genome.length + 1);
        genome.splice(idx, 0, makeRandomGene(rng.bound()));
      }
    }
  }

  return genome;
}

/**
 * Sexual reproduction: create a child genome from two parents using crossover.
 * Uses single-point crossover.
 */
export function crossover(parent1: Genome, parent2: Genome, rng: PRNG): Genome {
  if (parent1.length === 0) return [...parent2];
  if (parent2.length === 0) return [...parent1];

  const child: Genome = [];

  // Single-point crossover based on genome length
  const cross1 = rng.nextInt(parent1.length);
  const cross2 = rng.nextInt(parent2.length);

  // Take first part from parent1, second part from parent2
  for (let i = 0; i <= cross1; i++) {
    child.push({ ...parent1[i] });
  }
  for (let i = cross2 + 1; i < parent2.length; i++) {
    child.push({ ...parent2[i] });
  }

  return child.length > 0 ? child : [makeRandomGene(rng.bound())];
}

/**
 * Genomic similarity comparison.
 * Returns a value 0.0..1.0 where 1.0 = identical.
 * Based on Jaccard similarity of gene sets.
 */
export function genomeSimilarity(g1: Genome, g2: Genome): number {
  if (g1.length === 0 && g2.length === 0) return 1.0;
  if (g1.length === 0 || g2.length === 0) return 0.0;

  const set1 = new Set(g1.map(geneToUint32));
  const set2 = new Set(g2.map(geneToUint32));

  let intersection = 0;
  for (const v of set1) {
    if (set2.has(v)) intersection++;
  }

  const union = set1.size + set2.size - intersection;
  return union === 0 ? 1.0 : intersection / union;
}

/**
 * Calculate genetic diversity of a population.
 * Returns a value 0.0..1.0 based on sampled pairwise comparisons.
 */
export function geneticDiversity(genomes: Genome[], rng: PRNG, sampleSize: number = 100): number {
  if (genomes.length < 2) return 0;

  let totalDissimilarity = 0;
  const samples = Math.min(sampleSize, genomes.length * (genomes.length - 1) / 2);

  for (let s = 0; s < samples; s++) {
    const i = rng.nextInt(genomes.length);
    let j = rng.nextInt(genomes.length - 1);
    if (j >= i) j++;
    totalDissimilarity += 1.0 - genomeSimilarity(genomes[i], genomes[j]);
  }

  return totalDissimilarity / samples;
}

/** Renumber gene source/sink IDs so they map into actual neuron/sensor/action ranges */
export function renumberGeneConnections(
  gene: Gene,
  numSensors: number,
  numActions: number,
  numInternalNeurons: number,
): { sourceType: number; sourceId: number; sinkType: number; sinkId: number; weight: number } {
  const sourceId = gene.sourceType === 1
    ? gene.sourceId % numSensors
    : gene.sourceId % numInternalNeurons;
  const sinkId = gene.sinkType === 1
    ? gene.sinkId % numActions
    : gene.sinkId % numInternalNeurons;

  return {
    sourceType: gene.sourceType,
    sourceId,
    sinkType: gene.sinkType,
    sinkId,
    weight: gene.weightAsInt / 8192.0,
  };
}
