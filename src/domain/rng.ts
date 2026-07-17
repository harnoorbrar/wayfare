/**
 * Seedable deterministic RNG (mulberry32).
 *
 * Every random decision in the simulation must flow through one shared Rng
 * instance so a life can be replayed exactly from (seed, action sequence).
 * The internal state is a single uint32, persisted inside the save envelope
 * so determinism survives save/load.
 */
export class Rng {
  private s: number;

  constructor(seed: number = Rng.randomSeed()) {
    this.s = seed >>> 0;
  }

  /** Non-deterministic seed for brand-new lives. */
  static randomSeed(): number {
    return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  }

  /** Uniform float in [0, 1). Drop-in replacement for Math.random(). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Uniform float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Uniform pick from a non-empty array. */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Rng.pick: empty array');
    return arr[this.int(0, arr.length - 1)];
  }

  /**
   * Weighted pick from [value, weight] entries. Weights need not sum to 1;
   * non-positive weights are skipped.
   */
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
    if (total <= 0) throw new Error('Rng.weighted: no positive weights');
    let roll = this.next() * total;
    for (const [value, weight] of entries) {
      if (weight <= 0) continue;
      roll -= weight;
      if (roll < 0) return value;
    }
    return entries[entries.length - 1][0];
  }

  /**
   * Approximately normal sample (mean, standard deviation) via the central
   * limit theorem. Cheap, and bounded to roughly +/- 3 sd, which suits
   * economic noise better than a uniform draw.
   */
  normal(mean: number, sd: number): number {
    const sum = this.next() + this.next() + this.next() + this.next() + this.next() + this.next();
    return mean + (sum - 3) * sd;
  }

  /** True with probability p (0..1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  getState(): number {
    return this.s;
  }

  setState(state: number): void {
    this.s = state >>> 0;
  }
}
