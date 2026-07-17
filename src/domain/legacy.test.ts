import { describe, expect, it } from 'vitest';
import {
  TRAITS,
  accumulateLegacy,
  computeLifeScore,
  inheritTraits,
  legacyRank,
} from './legacy';
import { Rng } from './rng';
import type { GameState } from './state';

function life(overrides: Partial<GameState> = {}): GameState {
  return {
    name: 'P', age: 70, money: 0, savings: 0, smarts: 50, looks: 55,
    peakMoney: 0, generation: 1, relationships: [], businesses: [], degrees: [],
    investments: { stocks: 0, bonds: 0, crypto: 0 }, alive: false,
    ...overrides,
  } as GameState;
}

describe('computeLifeScore', () => {
  it('rewards a wealthy, long, accomplished life over a modest one', () => {
    const modest = life({ age: 40, peakMoney: 1000, smarts: 30 });
    const grand = life({
      age: 95, peakMoney: 5_000_000, smarts: 95, generation: 3,
      businesses: [{}, {}], degrees: ['hs', 'deg_cs'],
      relationships: [{ id: 1, type: 'Spouse' }, { id: 2, type: 'Child' }, { id: 3, type: 'Child' }],
    });
    expect(computeLifeScore(grand).total).toBeGreaterThan(computeLifeScore(modest).total);
  });

  it('is deterministic', () => {
    const s = life({ age: 80, peakMoney: 250000, smarts: 70, generation: 2 });
    expect(computeLifeScore(s)).toEqual(computeLifeScore(s));
  });

  it('breaks the score into non-negative components', () => {
    const s = life({ age: 60, peakMoney: 100000, smarts: 60 });
    const { breakdown, total } = computeLifeScore(s);
    for (const v of Object.values(breakdown)) expect(v).toBeGreaterThanOrEqual(0);
    const sum = Object.values(breakdown).reduce((a, b) => a + b, 0);
    expect(sum).toBe(total);
  });

  it('credits later generations via the dynasty term', () => {
    const g1 = computeLifeScore(life({ generation: 1 }));
    const g3 = computeLifeScore(life({ generation: 3 }));
    expect(g3.breakdown.dynasty).toBeGreaterThan(g1.breakdown.dynasty);
  });
});

describe('inheritTraits', () => {
  it('keeps traits within 0-100', () => {
    const rng = new Rng(1);
    for (let i = 0; i < 500; i++) {
      const t = inheritTraits(life({ smarts: 100, looks: 100 }), rng);
      expect(t.smarts).toBeGreaterThanOrEqual(0);
      expect(t.smarts).toBeLessThanOrEqual(100);
      expect(t.looks).toBeLessThanOrEqual(100);
    }
  });

  it('makes bright parents tend to have brighter children than dull parents', () => {
    const avgChildSmarts = (parentSmarts: number) => {
      const rng = new Rng(7);
      let sum = 0;
      const runs = 300;
      for (let i = 0; i < runs; i++) sum += inheritTraits(life({ smarts: parentSmarts }), rng).smarts;
      return sum / runs;
    };
    expect(avgChildSmarts(95)).toBeGreaterThan(avgChildSmarts(15));
  });

  it('regresses toward the mean (a genius parent rarely clones themselves)', () => {
    const rng = new Rng(3);
    let sum = 0;
    const runs = 400;
    for (let i = 0; i < runs; i++) sum += inheritTraits(life({ smarts: 100 }), rng).smarts;
    const avg = sum / runs;
    // Heritability < 1, so the average child of a 100-smarts parent sits below 100.
    expect(avg).toBeLessThan(100);
    expect(avg).toBeGreaterThan(TRAITS.smartsMean);
  });

  it('is deterministic for a given seed', () => {
    const run = () => inheritTraits(life({ smarts: 72, looks: 61 }), new Rng(42));
    expect(run()).toEqual(run());
  });
});

describe('accumulateLegacy', () => {
  it('adds each life onto the running dynasty total', () => {
    const first = life({ age: 80, smarts: 60 });
    const total1 = accumulateLegacy(0, first);
    expect(total1).toBe(computeLifeScore(first).total);
    const second = life({ age: 90, smarts: 80, generation: 2 });
    const total2 = accumulateLegacy(total1, second);
    expect(total2).toBe(total1 + computeLifeScore(second).total);
    expect(total2).toBeGreaterThan(total1);
  });
});

describe('legacyRank', () => {
  it('escalates with the total', () => {
    expect(legacyRank(100)).toBe('Humble');
    expect(legacyRank(5000)).toBe('Legendary');
    const ranks = [0, 800, 1600, 2600, 4200].map(legacyRank);
    expect(new Set(ranks).size).toBe(5);
  });
});
