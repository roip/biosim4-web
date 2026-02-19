// Core types for biosim4 - TypeScript port of David Miller's biological evolution simulator
// Mirrors the C++ types from basicTypes.h, genome.h, and neural-net structures

// ── Compass & Direction ──────────────────────────────────────────────

export enum Compass {
  N = 0, NE, E, SE, S, SW, W, NW, CENTER,
}

/** Abstract 8-way direction plus center. Wraps a Compass value. */
export class Dir {
  constructor(public dir9: Compass = Compass.CENTER) {}

  static random(rng: () => number): Dir {
    return new Dir(Math.floor(rng() * 8) as Compass);
  }

  rotate(n: number): Dir {
    if (this.dir9 === Compass.CENTER) return new Dir(Compass.CENTER);
    return new Dir(((this.dir9 + n) % 8 + 8) % 8 as Compass);
  }

  rotate90CW(): Dir { return this.rotate(2); }
  rotate90CCW(): Dir { return this.rotate(-2); }
  rotate180(): Dir { return this.rotate(4); }

  asNormalizedCoord(): Coord {
    return DIR_AS_COORD[this.dir9];
  }
}

// ── Coord ────────────────────────────────────────────────────────────

export interface Coord {
  x: number;
  y: number;
}

export function coordAdd(a: Coord, b: Coord): Coord {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function coordSub(a: Coord, b: Coord): Coord {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function coordEqual(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

export function coordLength(c: Coord): number {
  return Math.sqrt(c.x * c.x + c.y * c.y);
}

export function coordIsZero(c: Coord): boolean {
  return c.x === 0 && c.y === 0;
}

export function coordAsDir(c: Coord): Dir {
  const mapping: Record<string, Compass> = {
    '0,-1': Compass.N, '1,-1': Compass.NE, '1,0': Compass.E, '1,1': Compass.SE,
    '0,1': Compass.S, '-1,1': Compass.SW, '-1,0': Compass.W, '-1,-1': Compass.NW,
    '0,0': Compass.CENTER,
  };
  const nx = c.x === 0 ? 0 : (c.x > 0 ? 1 : -1);
  const ny = c.y === 0 ? 0 : (c.y > 0 ? 1 : -1);
  return new Dir(mapping[`${nx},${ny}`] ?? Compass.CENTER);
}

/** Lookup table: Compass direction → unit Coord offset */
const DIR_AS_COORD: Coord[] = [
  { x: 0, y: -1 },  // N
  { x: 1, y: -1 },  // NE
  { x: 1, y: 0 },   // E
  { x: 1, y: 1 },   // SE
  { x: 0, y: 1 },   // S
  { x: -1, y: 1 },  // SW
  { x: -1, y: 0 },  // W
  { x: -1, y: -1 }, // NW
  { x: 0, y: 0 },   // CENTER
];

// ── Polar ────────────────────────────────────────────────────────────

export interface Polar {
  mag: number;
  dir: Dir;
}

// ── Gene ─────────────────────────────────────────────────────────────

/** Source/sink type in a gene connection */
export const NEURON = 0;
export const SENSOR = 1;
export const ACTION = 1;

/**
 * A single gene encodes one neural connection.
 * Packed as a 32-bit value matching the C++ layout:
 *   bit 31:    sourceType (0=neuron, 1=sensor)
 *   bits 30-24: sourceId (7 bits)
 *   bit 23:    sinkType (0=neuron, 1=action)
 *   bits 22-16: sinkId (7 bits)
 *   bits 15-0:  weight (signed 16-bit, divided by 8192 for float)
 */
export interface Gene {
  sourceType: number;
  sourceId: number;
  sinkType: number;
  sinkId: number;
  weightAsInt: number; // raw signed 16-bit
}

export const GENE_WEIGHT_DIVISOR = 8192.0;

export function geneWeight(g: Gene): number {
  return g.weightAsInt / GENE_WEIGHT_DIVISOR;
}

export function geneToUint32(g: Gene): number {
  return (
    ((g.sourceType & 1) << 31) |
    ((g.sourceId & 0x7F) << 24) |
    ((g.sinkType & 1) << 23) |
    ((g.sinkId & 0x7F) << 16) |
    (g.weightAsInt & 0xFFFF)
  ) >>> 0;
}

export function uint32ToGene(val: number): Gene {
  return {
    sourceType: (val >>> 31) & 1,
    sourceId: (val >>> 24) & 0x7F,
    sinkType: (val >>> 23) & 1,
    sinkId: (val >>> 16) & 0x7F,
    weightAsInt: (val & 0xFFFF) > 0x7FFF ? (val & 0xFFFF) - 0x10000 : (val & 0xFFFF),
  };
}

/** Make a random gene */
export function makeRandomGene(rng: () => number): Gene {
  return uint32ToGene((rng() * 0x100000000) >>> 0);
}

// ── Genome ───────────────────────────────────────────────────────────

export type Genome = Gene[];

// ── Neural Net ───────────────────────────────────────────────────────

/** A resolved neural connection after mapping gene IDs to actual neuron indices */
export interface NeuralConnection {
  sourceType: number;
  sourceId: number;
  sinkType: number;
  sinkId: number;
  weight: number;
}

export interface Neuron {
  output: number;
  driven: boolean;
}

export interface NeuralNet {
  connections: NeuralConnection[];
  neurons: Neuron[];
}

// ── Sensor & Action enums ────────────────────────────────────────────

export enum Sensor {
  LOC_X = 0,
  LOC_Y,
  BOUNDARY_DIST_X,
  BOUNDARY_DIST_Y,
  BOUNDARY_DIST,
  GENETIC_SIM_FWD,
  LAST_MOVE_DIR_X,
  LAST_MOVE_DIR_Y,
  LONGPROBE_POP_FWD,
  LONGPROBE_BARRIER_FWD,
  POPULATION,
  POPULATION_FWD,
  POPULATION_LR,
  OSC1,
  AGE,
  BARRIER_FWD,
  BARRIER_LR,
  RANDOM,
  SIGNAL0,
  SIGNAL0_FWD,
  SIGNAL0_LR,
  NUM_SENSES,
}

export enum Action {
  MOVE_X = 0,
  MOVE_Y,
  MOVE_FORWARD,
  MOVE_RL,
  MOVE_RANDOM,
  SET_OSCILLATOR_PERIOD,
  SET_LONGPROBE_DIST,
  SET_RESPONSIVENESS,
  EMIT_SIGNAL0,
  KILL_FORWARD,
  MOVE_EAST,
  MOVE_WEST,
  MOVE_NORTH,
  MOVE_SOUTH,
  MOVE_LEFT,
  MOVE_RIGHT,
  MOVE_REVERSE,
  NUM_ACTIONS,
}

// ── Survival Criteria enum ───────────────────────────────────────────

export enum SurvivalCriteria {
  CIRCLE = 0,
  RIGHT_EIGHTH,
  LEFT_EIGHTH,
  CENTER_WEIGHTED,
  CORNER_WEIGHTED,
  PAIRS,
  CONTACT,
  AGAINST_ANY_WALL,
  TOUCH_ANY_WALL,
}

// ── Barrier type enum ────────────────────────────────────────────────

export enum BarrierType {
  NONE = 0,
  VERTICAL_BAR_CONSTANT,
  VERTICAL_BAR_RANDOM,
  FIVE_BLOCKS,
  HORIZONTAL_BAR_CONSTANT,
  FLOATING_ISLANDS,
  SPOTS,
}

// ── Constants ────────────────────────────────────────────────────────

export const EMPTY = 0;
export const BARRIER = 0xFFFF;
