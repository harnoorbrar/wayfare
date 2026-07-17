import { describe, expect, it } from 'vitest';
import { PHASES, RATES } from '../data/world';
import { Rng } from './rng';
import {
  createWorld,
  creditCardRate,
  jobMarketFactor,
  mortgageRate,
  personalLoanRate,
  savingsRate,
  worldYearTick,
  type WorldState,
} from './world';

/** Run a world for n years and hand back the state plus every headline. */
function runYears(seed: number, years: number): { world: WorldState; headlines: string[] } {
  const rng = new Rng(seed);
  const world = createWorld(rng);
  const headlines: string[] = [];
  for (let i = 0; i < years; i++) {
    headlines.push(...worldYearTick(world, rng).messages.map((m) => m.text));
  }
  return { world, headlines };
}

describe('createWorld', () => {
  it('starts mid-expansion at baseline indices', () => {
    const world = createWorld(new Rng(1));
    expect(world.phase).toBe('growth');
    expect(world.housingIndex).toBe(100);
    expect(world.marketIndex).toBe(100);
    expect(world.priceLevel).toBe(1);
    expect(world.interestRate).toBe(RATES.neutral);
  });
});

describe('worldYearTick', () => {
  it('is deterministic for the same seed', () => {
    expect(runYears(4242, 80)).toEqual(runYears(4242, 80));
  });

  it('produces different worlds for different seeds', () => {
    const a = runYears(1, 60).world;
    const b = runYears(2, 60).world;
    expect(a.marketIndex).not.toBe(b.marketIndex);
  });

  it('keeps every economic quantity finite and sane across a long life', () => {
    const { world } = runYears(7, 100);
    for (const v of [
      world.growth, world.inflation, world.interestRate, world.unemployment,
      world.housingIndex, world.marketIndex, world.priceLevel, world.taxRate,
    ]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(world.housingIndex).toBeGreaterThan(0);
    expect(world.marketIndex).toBeGreaterThan(0);
    expect(world.priceLevel).toBeGreaterThan(0);
    expect(world.unemployment).toBeGreaterThan(0);
  });

  it('holds the central-bank rate inside its bounds', () => {
    for (let seed = 0; seed < 25; seed++) {
      const { world } = runYears(seed, 60);
      expect(world.interestRate).toBeGreaterThanOrEqual(RATES.min);
      expect(world.interestRate).toBeLessThanOrEqual(RATES.max);
    }
  });

  it('keeps tax inside the politically plausible band', () => {
    for (let seed = 0; seed < 15; seed++) {
      const { world } = runYears(seed, 80);
      expect(world.taxRate).toBeGreaterThan(10);
      expect(world.taxRate).toBeLessThan(50);
    }
  });

  it('visits recessions and recoveries over a long enough run', () => {
    const phases = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const rng = new Rng(seed);
      const world = createWorld(rng);
      for (let i = 0; i < 60; i++) {
        worldYearTick(world, rng);
        phases.add(world.phase);
      }
    }
    expect(phases.has('recession')).toBe(true);
    expect(phases.has('boom')).toBe(true);
  });

  it('never leaves a phase before its minimum dwell time', () => {
    const rng = new Rng(31);
    const world = createWorld(rng);
    let previous = world.phase;
    let held = world.yearsInPhase;
    for (let i = 0; i < 200; i++) {
      worldYearTick(world, rng);
      if (world.phase !== previous) {
        // The phase we just left must have run at least its minimum.
        expect(held + 1).toBeGreaterThanOrEqual(PHASES[previous].minYears);
        previous = world.phase;
      }
      held = world.yearsInPhase;
    }
  });

  it('compounds the price level with inflation', () => {
    const rng = new Rng(12);
    const world = createWorld(rng);
    world.priceLevel = 1;
    worldYearTick(world, rng);
    const expected = 1 + world.inflation / 100;
    expect(world.priceLevel).toBeCloseTo(expected, 2);
  });

  it('raises rates when inflation runs hot', () => {
    const rng = new Rng(3);
    const world = createWorld(rng);
    world.interestRate = RATES.neutral;
    // Pin the cycle in boom each year so inflation stays above target; the
    // central bank should lean against it and lift rates over time.
    for (let i = 0; i < 10; i++) {
      world.phase = 'boom';
      world.yearsInPhase = 0;
      worldYearTick(world, rng);
    }
    expect(world.interestRate).toBeGreaterThan(RATES.neutral);
    expect(world.inflation).toBeGreaterThan(RATES.inflationTarget);
  });

  it('eventually bursts a housing bubble somewhere across many worlds', () => {
    let burst = false;
    for (let seed = 0; seed < 40 && !burst; seed++) {
      burst = runYears(seed, 80).headlines.some((h) => h.includes('bubble burst'));
    }
    expect(burst).toBe(true);
  });

  it('eventually crashes the market somewhere across many worlds', () => {
    let crashed = false;
    for (let seed = 0; seed < 40 && !crashed; seed++) {
      crashed = runYears(seed, 80).headlines.some((h) => h.includes('market crashed'));
    }
    expect(crashed).toBe(true);
  });

  it('announces elections on the political cycle', () => {
    const { headlines } = runYears(5, 40);
    expect(headlines.filter((h) => h.includes('election')).length).toBeGreaterThanOrEqual(8);
  });
});

describe('selectors', () => {
  it('orders borrowing costs above savings returns', () => {
    const world = createWorld(new Rng(9));
    expect(creditCardRate(world)).toBeGreaterThan(personalLoanRate(world));
    expect(personalLoanRate(world)).toBeGreaterThan(mortgageRate(world));
    expect(mortgageRate(world)).toBeGreaterThan(savingsRate(world));
  });

  it('never returns a negative savings rate', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { world } = runYears(seed, 50);
      expect(savingsRate(world)).toBeGreaterThanOrEqual(0);
    }
  });

  it('makes hiring harder as unemployment climbs', () => {
    const world = createWorld(new Rng(9));
    world.unemployment = 4;
    const easy = jobMarketFactor(world);
    world.unemployment = 14;
    const hard = jobMarketFactor(world);
    expect(easy).toBeGreaterThan(hard);
    expect(hard).toBeGreaterThan(0);
  });
});
