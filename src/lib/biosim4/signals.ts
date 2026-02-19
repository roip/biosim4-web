// Pheromone signal layer for biosim4
// Port of signals.h / signals.cpp from C++ original

import { Coord } from './types';

export class Signals {
  readonly sizeX: number;
  readonly sizeY: number;
  readonly numLayers: number;
  private layers: Uint8Array[];

  constructor(sizeX: number, sizeY: number, numLayers: number = 1) {
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.numLayers = numLayers;
    this.layers = [];
    for (let i = 0; i < numLayers; i++) {
      this.layers.push(new Uint8Array(sizeX * sizeY));
    }
  }

  private idx(x: number, y: number): number {
    return y * this.sizeX + x;
  }

  isInBounds(loc: Coord): boolean {
    return loc.x >= 0 && loc.x < this.sizeX && loc.y >= 0 && loc.y < this.sizeY;
  }

  /** Get signal level at a location for a given layer */
  get(layerNum: number, loc: Coord): number {
    if (!this.isInBounds(loc) || layerNum >= this.numLayers) return 0;
    return this.layers[layerNum][this.idx(loc.x, loc.y)];
  }

  /** Set signal level at a location */
  set(layerNum: number, loc: Coord, val: number): void {
    if (!this.isInBounds(loc) || layerNum >= this.numLayers) return;
    this.layers[layerNum][this.idx(loc.x, loc.y)] = Math.min(255, Math.max(0, Math.round(val)));
  }

  /** Increment signal level at a location (clamped to 255) */
  increment(layerNum: number, loc: Coord, amount: number = 1): void {
    if (!this.isInBounds(loc) || layerNum >= this.numLayers) return;
    const i = this.idx(loc.x, loc.y);
    const newVal = this.layers[layerNum][i] + amount;
    this.layers[layerNum][i] = Math.min(255, Math.max(0, Math.round(newVal)));
  }

  /**
   * Emit pheromone in a neighborhood around a center point.
   * Increases signal levels up to 255 in a circular area.
   */
  emit(layerNum: number, center: Coord, radius: number = 1.5): void {
    const iRadius = Math.floor(radius);
    for (let dx = -iRadius; dx <= iRadius; dx++) {
      for (let dy = -iRadius; dy <= iRadius; dy++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const loc: Coord = { x: center.x + dx, y: center.y + dy };
          if (this.isInBounds(loc)) {
            // Signal strength falls off with distance
            const dist = Math.sqrt(dx * dx + dy * dy);
            const strength = Math.round(255 * (1 - dist / (radius + 1)));
            this.increment(layerNum, loc, Math.max(1, strength));
          }
        }
      }
    }
  }

  /** Decay all signals by a factor. Called each sim step. */
  fade(layerNum: number): void {
    if (layerNum >= this.numLayers) return;
    const layer = this.layers[layerNum];
    for (let i = 0; i < layer.length; i++) {
      if (layer[i] > 0) {
        // Decay by ~1-2 each step
        layer[i] = Math.max(0, layer[i] - 1);
      }
    }
  }

  /** Zero out all signals in all layers */
  zeroFill(): void {
    for (const layer of this.layers) {
      layer.fill(0);
    }
  }

  /** Get the average signal level in a neighborhood */
  getSignalDensity(layerNum: number, center: Coord, radius: number): number {
    if (layerNum >= this.numLayers) return 0;
    let sum = 0;
    let count = 0;
    const iRadius = Math.floor(radius);
    for (let dx = -iRadius; dx <= iRadius; dx++) {
      for (let dy = -iRadius; dy <= iRadius; dy++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const loc: Coord = { x: center.x + dx, y: center.y + dy };
          if (this.isInBounds(loc)) {
            sum += this.layers[layerNum][this.idx(loc.x, loc.y)];
            count++;
          }
        }
      }
    }
    return count > 0 ? sum / (count * 255.0) : 0;
  }

  /** Get raw layer data for rendering */
  getLayerSnapshot(layerNum: number): Uint8Array {
    if (layerNum >= this.numLayers) return new Uint8Array(0);
    return new Uint8Array(this.layers[layerNum]);
  }
}
