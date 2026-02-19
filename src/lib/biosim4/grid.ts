// Grid class — 2D arena for biosim4
// Port of grid.h / grid.cpp from the C++ original

import { Coord, EMPTY, BARRIER } from './types';

export class Grid {
  readonly sizeX: number;
  readonly sizeY: number;
  private data: Uint16Array;

  constructor(sizeX: number, sizeY: number) {
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.data = new Uint16Array(sizeX * sizeY);
  }

  private idx(x: number, y: number): number {
    return y * this.sizeX + x;
  }

  isInBounds(loc: Coord): boolean {
    return loc.x >= 0 && loc.x < this.sizeX && loc.y >= 0 && loc.y < this.sizeY;
  }

  at(loc: Coord): number {
    return this.data[this.idx(loc.x, loc.y)];
  }

  set(loc: Coord, val: number): void {
    this.data[this.idx(loc.x, loc.y)] = val;
  }

  isEmptyAt(loc: Coord): boolean {
    return this.at(loc) === EMPTY;
  }

  isBarrierAt(loc: Coord): boolean {
    return this.at(loc) === BARRIER;
  }

  isOccupiedAt(loc: Coord): boolean {
    const v = this.at(loc);
    return v !== EMPTY && v !== BARRIER;
  }

  clear(): void {
    this.data.fill(EMPTY);
  }

  /**
   * Visit all locations within a circular neighborhood of a center point.
   * Calls the visitor function for each valid in-bounds location within radius.
   * Radius 1.0 = center + 4 cardinal neighbors
   * Radius 1.5 = center + all 8 neighbors
   */
  visitNeighborhood(center: Coord, radius: number, visitor: (loc: Coord) => void): void {
    const iRadius = Math.floor(radius);
    for (let dx = -iRadius; dx <= iRadius; dx++) {
      for (let dy = -iRadius; dy <= iRadius; dy++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const loc: Coord = { x: center.x + dx, y: center.y + dy };
          if (this.isInBounds(loc)) {
            visitor(loc);
          }
        }
      }
    }
  }

  /**
   * Find the nearest empty location to a given center, searching outward.
   * Returns undefined if none found.
   */
  findEmptyLocation(center: Coord, maxRadius: number = 10): Coord | undefined {
    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const loc: Coord = { x: center.x + dx, y: center.y + dy };
            if (this.isInBounds(loc) && this.isEmptyAt(loc)) {
              return loc;
            }
          }
        }
      }
    }
    return undefined;
  }

  /** Get raw buffer for transfer to main thread rendering */
  getDataSnapshot(): Uint16Array {
    return new Uint16Array(this.data);
  }

  /** Get the number of barrier cells */
  getBarrierCount(): number {
    let count = 0;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] === BARRIER) count++;
    }
    return count;
  }
}
