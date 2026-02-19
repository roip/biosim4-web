// Seedable PRNG for biosim4 — xoshiro128** algorithm
// Provides deterministic, reproducible random number generation

export class PRNG {
  private s: Uint32Array;

  constructor(seed: number = Date.now()) {
    this.s = new Uint32Array(4);
    // SplitMix32 to initialize state from a single seed
    let z = seed >>> 0;
    for (let i = 0; i < 4; i++) {
      z = (z + 0x9E3779B9) >>> 0;
      let t = z ^ (z >>> 16);
      t = Math.imul(t, 0x21f0aaad);
      t = t ^ (t >>> 15);
      t = Math.imul(t, 0x735a2d97);
      t = t ^ (t >>> 15);
      this.s[i] = t >>> 0;
    }
  }

  /** Returns a 32-bit unsigned integer */
  nextUint32(): number {
    const s = this.s;
    const result = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0;
    const t = (s[1] << 9) >>> 0;

    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];

    s[2] ^= t;
    s[3] = rotl(s[3], 11) >>> 0;

    return result;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    return this.nextUint32() / 0x100000000;
  }

  /** Returns integer in [0, max) */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  /** Returns integer in [min, max] inclusive */
  nextRange(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Returns float in [min, max) */
  nextFloat(min: number = 0, max: number = 1): number {
    return min + this.next() * (max - min);
  }

  /** Returns true with probability p */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Returns a bound function for use as () => number */
  bound(): () => number {
    return () => this.next();
  }
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}
