// Spawn new generation for biosim4
// Port of spawnNewGeneration.cpp from C++ original

import { Genome } from './types';
import { Indiv } from './indiv';
import { SimParams } from './config';
import { PRNG } from './random';
import {
  makeRandomGenome,
  crossover,
  applyPointMutations,
  applyInsertionDeletion,
} from './genome';

/**
 * Generate a new set of genomes from the survivors of the previous generation.
 * Supports both sexual and asexual reproduction with mutations.
 */
export function spawnNewGeneration(
  survivors: Indiv[],
  params: SimParams,
  rng: PRNG,
): Genome[] {
  const newGenomes: Genome[] = [];

  if (survivors.length === 0) {
    // If no survivors, create entirely random population
    for (let i = 0; i < params.population; i++) {
      const len = rng.nextRange(
        params.genomeInitialLengthMin,
        params.genomeInitialLengthMax,
      );
      newGenomes.push(makeRandomGenome(rng, len));
    }
    return newGenomes;
  }

  // Generate offspring to fill the population
  for (let i = 0; i < params.population; i++) {
    let childGenome: Genome;

    if (params.sexualReproduction && survivors.length >= 2) {
      // Sexual reproduction: pick two parents, crossover
      const parent1 = selectParent(survivors, params, rng);
      let parent2 = selectParent(survivors, params, rng);

      // Ensure different parents
      let attempts = 0;
      while (parent2 === parent1 && attempts < 10) {
        parent2 = selectParent(survivors, params, rng);
        attempts++;
      }

      childGenome = crossover(parent1.genome, parent2.genome, rng);
    } else {
      // Asexual reproduction: clone a parent
      const parent = selectParent(survivors, params, rng);
      childGenome = parent.genome.map(g => ({ ...g }));
    }

    // Apply mutations
    childGenome = applyPointMutations(childGenome, rng, params.pointMutationRate);
    childGenome = applyInsertionDeletion(
      childGenome,
      rng,
      params.geneInsertionDeletionRate,
      params.deletionRatio,
      params.genomeMaxLength,
    );

    newGenomes.push(childGenome);
  }

  return newGenomes;
}

/**
 * Select a parent from survivors.
 * If chooseParentsByFitness is enabled, parents closer to the survival area
 * center are preferred. Otherwise, random selection.
 */
function selectParent(
  survivors: Indiv[],
  params: SimParams,
  rng: PRNG,
): Indiv {
  if (!params.chooseParentsByFitness || survivors.length <= 1) {
    return survivors[rng.nextInt(survivors.length)];
  }

  // Tournament selection: pick 2 random survivors, choose the one closer
  // to center (a rough fitness proxy)
  const a = survivors[rng.nextInt(survivors.length)];
  const b = survivors[rng.nextInt(survivors.length)];

  const centerX = params.sizeX / 2;
  const centerY = params.sizeY / 2;

  const distA = Math.abs(a.loc.x - centerX) + Math.abs(a.loc.y - centerY);
  const distB = Math.abs(b.loc.x - centerX) + Math.abs(b.loc.y - centerY);

  // For most criteria, being closer to the center of the survival zone is better
  // This is a simplification; the original uses more nuanced fitness
  return distA <= distB ? a : b;
}
