import { describe, expect, it } from 'vitest';
import {
  ageDecline,
  conditionById,
  ensureHealth,
  healthYearTick,
  mortalityRisk,
  onsetChance,
  setInsurance,
} from './health';
import { CONDITIONS } from '../data/health';
import { Rng } from './rng';
import type { GameState } from './state';

function person(overrides: Partial<GameState> = {}): GameState {
  return {
    name: 'P', age: 30, health: 100, happiness: 80, money: 100000, savings: 50000,
    smarts: 50, skills: {}, alive: true, relationships: [], investments: {},
    ...overrides,
  } as GameState;
}

describe('ageDecline', () => {
  it('accelerates with age', () => {
    const young = ageDecline(person({ age: 25 }));
    const old = ageDecline(person({ age: 80 }));
    expect(old).toBeGreaterThan(young);
  });

  it('is softened by fitness', () => {
    const unfit = ageDecline(person({ age: 70, skills: { fitness: 0 } }));
    const fit = ageDecline(person({ age: 70, skills: { fitness: 100 } }));
    expect(fit).toBeLessThan(unfit);
  });
});

describe('onsetChance', () => {
  it('is zero before the onset age', () => {
    const heart = conditionById('heart_disease')!;
    expect(onsetChance(person({ age: 30 }), heart)).toBe(0);
  });

  it('rises with age past onset', () => {
    const diabetes = conditionById('diabetes')!;
    const at50 = onsetChance(person({ age: 50, skills: {} }), diabetes);
    const at70 = onsetChance(person({ age: 70, skills: {} }), diabetes);
    expect(at70).toBeGreaterThan(at50);
  });

  it('is lower for fit players on lifestyle-linked conditions', () => {
    const diabetes = conditionById('diabetes')!;
    const unfit = onsetChance(person({ age: 60, skills: { fitness: 0 } }), diabetes);
    const fit = onsetChance(person({ age: 60, skills: { fitness: 100 } }), diabetes);
    expect(fit).toBeLessThan(unfit);
  });
});

describe('mortalityRisk', () => {
  it('climbs with age, frailty, and conditions', () => {
    const healthy = mortalityRisk(person({ age: 30, health: 100 }));
    const old = mortalityRisk(person({ age: 85, health: 100 }));
    const frail = mortalityRisk(person({ age: 30, health: 5 }));
    expect(old).toBeGreaterThan(healthy);
    expect(frail).toBeGreaterThan(healthy);
  });

  it('never reaches certainty', () => {
    const s = person({ age: 99, health: 1 });
    ensureHealth(s).conditions = CONDITIONS.map((c) => c.id);
    expect(mortalityRisk(s)).toBeLessThan(1);
  });
});

describe('healthYearTick', () => {
  it('is deterministic for the same seed', () => {
    const run = () => {
      const s = person({ age: 40 });
      const rng = new Rng(123);
      const trace: unknown[] = [];
      for (let i = 0; i < 40 && s.alive; i++) {
        s.age++;
        const r = healthYearTick(s, rng);
        trace.push(r.died, r.cashDelta, s.health, [...ensureHealth(s).conditions]);
        if (r.died) s.alive = false;
      }
      return trace;
    };
    expect(run()).toEqual(run());
  });

  it('charges an insurance premium each year', () => {
    const s = person({ age: 35 });
    setInsurance(s, 'premium');
    const r = healthYearTick(s, new Rng(2));
    expect(r.cashDelta).toBeLessThanOrEqual(-6000);
  });

  it('everyone dies by the hard age ceiling', () => {
    const s = person({ age: 99, health: 100 });
    ensureHealth(s).insurance = 'premium';
    let died = false;
    const rng = new Rng(1);
    for (let i = 0; i < 5 && !died; i++) {
      s.age++;
      died = healthYearTick(s, rng).died;
    }
    expect(died).toBe(true);
  });

  it('reports a cause of death', () => {
    const s = person({ age: 100, health: 100 });
    const r = healthYearTick(s, new Rng(1));
    expect(r.died).toBe(true);
    expect(r.causeOfDeath).toBeTruthy();
  });

  it('treats conditions when affordable, sparing health', () => {
    const rich = person({ age: 60, money: 1_000_000, savings: 0 });
    ensureHealth(rich).conditions = ['heart_disease'];
    setInsurance(rich, 'premium');
    const before = rich.health;
    const r = healthYearTick(rich, new Rng(5));
    // Treated: cash spent, but no condition-driven health drain message.
    expect(r.cashDelta).toBeLessThan(0);
    expect(rich.health).toBeGreaterThanOrEqual(before - Math.ceil(ageDecline(rich)));
  });

  it('drains health when a condition cannot be afforded', () => {
    const broke = person({ age: 60, money: 0, savings: 0 });
    ensureHealth(broke).conditions = ['heart_disease'];
    setInsurance(broke, 'none');
    const before = broke.health;
    healthYearTick(broke, new Rng(5));
    expect(broke.health).toBeLessThan(before);
  });

  it('fit lives outlast sedentary ones on average', () => {
    const lifespan = (fitness: number, seed: number) => {
      const s = person({ age: 30, health: 100, skills: { fitness } });
      const rng = new Rng(seed);
      let years = 0;
      while (s.alive && years < 100) {
        s.age++;
        years++;
        if (healthYearTick(s, rng).died) s.alive = false;
      }
      return s.age;
    };
    let fitTotal = 0;
    let unfitTotal = 0;
    const runs = 20;
    for (let seed = 0; seed < runs; seed++) {
      fitTotal += lifespan(100, seed);
      unfitTotal += lifespan(0, seed);
    }
    expect(fitTotal / runs).toBeGreaterThan(unfitTotal / runs);
  });
});
