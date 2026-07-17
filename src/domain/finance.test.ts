import { describe, expect, it } from 'vitest';
import {
  amortizedPayment,
  borrowingLimit,
  CREDIT,
  creditBand,
  creditScore,
  ensureFinancials,
  financeYearTick,
  quotePersonalLoan,
  takePersonalLoan,
  taxIncome,
  totalDebt,
} from './finance';
import { createWorld, worldYearTick, type WorldState } from './world';
import { Rng } from './rng';
import type { GameState } from './state';

function life(overrides: Partial<GameState> = {}): GameState {
  return {
    name: 'P', age: 30, money: 0, health: 100, happiness: 80, smarts: 50, looks: 50,
    job: 'unemployed', salary: 0, mortgageBalance: 0, studentLoans: 0,
    savings: 0, investments: { stocks: 0, bonds: 0, crypto: 0 },
    investmentReturns: { stocks: 0, bonds: 0, crypto: 0 }, relationships: [], alive: true,
    ...overrides,
  } as GameState;
}

function world(seed = 1): WorldState {
  return createWorld(new Rng(seed));
}

describe('taxIncome', () => {
  it('withholds the elected rate', () => {
    const w = world();
    w.taxRate = 25;
    const r = taxIncome(w, 1000);
    expect(r.tax).toBe(250);
    expect(r.net).toBe(750);
  });

  it('never taxes below zero', () => {
    const w = world();
    w.taxRate = 30;
    expect(taxIncome(w, 0).tax).toBe(0);
  });
});

describe('creditScore', () => {
  it('stays within FICO bounds in extreme cases', () => {
    const broke = life({ money: -50000, savings: 0 });
    ensureFinancials(broke).credit.missedPayments = 40;
    ensureFinancials(broke).credit.defaulted = true;
    const rich = life({ money: 5_000_000, savings: 1_000_000, age: 60 });
    ensureFinancials(rich).credit.onTimePayments = 40;
    expect(creditScore(broke)).toBeGreaterThanOrEqual(CREDIT.min);
    expect(creditScore(rich)).toBeLessThanOrEqual(CREDIT.max);
  });

  it('rewards wealth and punishes missed payments', () => {
    const wealthy = life({ money: 500000, savings: 200000, age: 45 });
    const poor = life({ money: 0, age: 45 });
    ensureFinancials(poor).credit.missedPayments = 10;
    expect(creditScore(wealthy)).toBeGreaterThan(creditScore(poor));
  });

  it('maps scores to sensible bands', () => {
    expect(creditBand(810)).toBe('Exceptional');
    expect(creditBand(700)).toBe('Good');
    expect(creditBand(400)).toBe('Poor');
  });
});

describe('amortizedPayment', () => {
  it('covers principal plus interest over the term', () => {
    const pay = amortizedPayment(10000, 10, 5);
    expect(pay * 5).toBeGreaterThan(10000);
    expect(pay).toBeGreaterThan(2000);
  });

  it('handles a zero rate as straight division', () => {
    expect(amortizedPayment(10000, 0, 5)).toBe(2000);
  });
});

describe('loans', () => {
  it('denies loans below the credit floor', () => {
    const s = life({ money: -80000 });
    ensureFinancials(s).credit.missedPayments = 30;
    const q = quotePersonalLoan(s, world(), 10000);
    expect(q.approved).toBe(false);
  });

  it('charges lower-credit borrowers a higher rate', () => {
    const good = life({ money: 400000, savings: 100000, salary: 2000, age: 45 });
    const fair = life({ money: 8000, salary: 800, age: 25 });
    const w = world();
    const goodRate = quotePersonalLoan(good, w, 5000).rate;
    const fairRate = quotePersonalLoan(fair, w, 5000).rate;
    expect(fairRate).toBeGreaterThan(goodRate);
  });

  it('disburses an approved loan and records the debt', () => {
    const s = life({ money: 300000, savings: 100000, salary: 3000, age: 45 });
    const before = s.money;
    const q = takePersonalLoan(s, world(), 20000, 5);
    expect(q.approved).toBe(true);
    expect(s.money).toBe(before + 20000);
    expect(totalDebt(s)).toBeGreaterThanOrEqual(20000);
    expect(borrowingLimit(s)).toBeGreaterThanOrEqual(0);
  });
});

describe('financeYearTick', () => {
  it('is deterministic for the same seed', () => {
    const run = () => {
      const s = life({ investments: { stocks: 10000, bonds: 5000, crypto: 2000 } });
      const rng = new Rng(77);
      const w = createWorld(rng);
      const out: number[] = [];
      for (let i = 0; i < 20; i++) {
        worldYearTick(w, rng);
        const r = financeYearTick(s, w, rng);
        out.push(r.cashDelta, ...Object.values(r.returns));
      }
      return out;
    };
    expect(run()).toEqual(run());
  });

  it('moves investments with the market and reports returns', () => {
    const s = life({ investments: { stocks: 10000, bonds: 0, crypto: 0 } });
    const rng = new Rng(3);
    const w = createWorld(rng);
    worldYearTick(w, rng);
    const r = financeYearTick(s, w, rng);
    expect(typeof r.returns.stocks).toBe('number');
    expect(s.investments.stocks).not.toBe(10000);
  });

  it('services a loan and reduces its balance when affordable', () => {
    const s = life({ money: 100000, savings: 50000, salary: 3000, age: 45 });
    const rng = new Rng(5);
    const w = createWorld(rng);
    takePersonalLoan(s, w, 20000, 5);
    const openingBalance = ensureFinancials(s).loans[0].balance;
    const r = financeYearTick(s, w, rng);
    expect(r.cashDelta).toBeLessThan(0);
    expect(ensureFinancials(s).loans[0]?.balance ?? 0).toBeLessThan(openingBalance);
    expect(ensureFinancials(s).credit.onTimePayments).toBe(1);
  });

  it('records a missed payment when the player cannot pay', () => {
    const s = life({ money: 100000, savings: 50000, salary: 3000, age: 45 });
    const rng = new Rng(5);
    const w = createWorld(rng);
    takePersonalLoan(s, w, 20000, 5);
    // Drain funds so the scheduled payment can't be met.
    s.money = 0;
    s.savings = 0;
    financeYearTick(s, w, rng);
    expect(ensureFinancials(s).credit.missedPayments).toBe(1);
  });
});
