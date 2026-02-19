// Peeps — population manager for biosim4
// Port of peeps.h / peeps.cpp from C++ original

import { Coord, Genome } from './types';
import { Indiv, createIndiv } from './indiv';
import { Grid } from './grid';
import { SimParams } from './config';
import { PRNG } from './random';
import { makeRandomGenome } from './genome';

export interface MoveRecord {
  indivIndex: number;
  newLoc: Coord;
}

export interface DeathRecord {
  indivIndex: number;
}

export class Peeps {
  individuals: Indiv[];
  private deathQueue: DeathRecord[];
  private moveQueue: MoveRecord[];

  constructor() {
    this.individuals = [];
    this.deathQueue = [];
    this.moveQueue = [];
  }

  /** Initialize population with random genomes placed randomly on the grid */
  init(params: SimParams, grid: Grid, rng: PRNG): void {
    this.individuals = [];
    this.deathQueue = [];
    this.moveQueue = [];

    // Index 0 is reserved (unused), individuals are 1-based
    this.individuals.push(null as unknown as Indiv);

    for (let i = 1; i <= params.population; i++) {
      const genomeLength = rng.nextRange(
        params.genomeInitialLengthMin,
        params.genomeInitialLengthMax,
      );
      const genome = makeRandomGenome(rng, genomeLength);

      // Find a random empty location
      let loc: Coord;
      let attempts = 0;
      do {
        loc = { x: rng.nextInt(grid.sizeX), y: rng.nextInt(grid.sizeY) };
        attempts++;
      } while (!grid.isEmptyAt(loc) && attempts < 10000);

      if (attempts >= 10000) break;

      const indiv = createIndiv(i, genome, loc, params);
      this.individuals.push(indiv);
      grid.set(loc, i);
    }
  }

  /** Initialize population from an existing set of genomes (for new generations) */
  initFromGenomes(genomes: Genome[], params: SimParams, grid: Grid, rng: PRNG): void {
    this.individuals = [];
    this.deathQueue = [];
    this.moveQueue = [];

    // Index 0 is reserved
    this.individuals.push(null as unknown as Indiv);

    for (let i = 0; i < genomes.length && i < params.population; i++) {
      // Find a random empty location
      let loc: Coord;
      let attempts = 0;
      do {
        loc = { x: rng.nextInt(grid.sizeX), y: rng.nextInt(grid.sizeY) };
        attempts++;
      } while (!grid.isEmptyAt(loc) && attempts < 10000);

      if (attempts >= 10000) break;

      const indiv = createIndiv(i + 1, genomes[i], loc, params);
      this.individuals.push(indiv);
      grid.set(loc, i + 1);
    }
  }

  get(index: number): Indiv {
    return this.individuals[index];
  }

  getPopulationSize(): number {
    return this.individuals.length - 1; // Subtract the null at index 0
  }

  /** Queue a move for an individual (processed at end of sim step) */
  queueMove(indivIndex: number, newLoc: Coord): void {
    this.moveQueue.push({ indivIndex, newLoc });
  }

  /** Queue a death for an individual (processed at end of sim step) */
  queueDeath(indivIndex: number): void {
    this.deathQueue.push({ indivIndex });
  }

  /** Process all queued deaths. Returns number of deaths. */
  drainDeathQueue(grid: Grid): number {
    let deaths = 0;
    for (const record of this.deathQueue) {
      const indiv = this.individuals[record.indivIndex];
      if (indiv && indiv.alive) {
        grid.set(indiv.loc, 0);
        indiv.alive = false;
        deaths++;
      }
    }
    this.deathQueue = [];
    return deaths;
  }

  /**
   * Process all queued moves. Moves are processed in order.
   * If a destination is occupied, the move is skipped.
   */
  drainMoveQueue(grid: Grid): void {
    for (const record of this.moveQueue) {
      const indiv = this.individuals[record.indivIndex];
      if (indiv && indiv.alive) {
        if (grid.isInBounds(record.newLoc) && grid.isEmptyAt(record.newLoc)) {
          grid.set(indiv.loc, 0);
          grid.set(record.newLoc, record.indivIndex);
          indiv.loc = { ...record.newLoc };
        }
      }
    }
    this.moveQueue = [];
  }

  /** Get all living individuals */
  getLiving(): Indiv[] {
    return this.individuals.filter((ind, idx) => idx > 0 && ind && ind.alive);
  }

  /** Get genomes of all living individuals */
  getLivingGenomes(): Genome[] {
    return this.getLiving().map(ind => ind.genome);
  }
}
