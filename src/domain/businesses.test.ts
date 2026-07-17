import { describe, expect, it } from 'vitest';
import { BUSINESS_TYPES } from '../data/businesses';
import {
  businessYearTick,
  ensureBusiness,
  hireStaff,
  letStaffGo,
  marketingCost,
  runMarketing,
  typeById,
  weeklyExpense,
  weeklyNet,
  weeklyRevenue,
  type OwnedBusiness,
} from './businesses';
import { Rng } from './rng';
import type { GameState } from './state';

/** Every business id the pre-v1.4 flat BUSINESS_TYPES list shipped with. */
const LEGACY_IDS = ['lemonade', 'foodtruck', 'onlinestore', 'coffeeshop', 'consulting', 'realestate', 'techstartup'];

function owner(businesses: OwnedBusiness[], overrides: Partial<GameState> = {}): GameState {
  return {
    name: 'B', age: 30, money: 100000, happiness: 80, smarts: 60,
    job: 'unemployed', skills: {}, businesses, alive: true, relationships: [],
    ...overrides,
  } as GameState;
}

function shop(overrides: Partial<OwnedBusiness> = {}): OwnedBusiness {
  return { typeId: 'coffeeshop', level: 1, totalInvested: 25000, ...overrides };
}

describe('business data integrity', () => {
  it('keeps every legacy business id so old saves still resolve', () => {
    for (const id of LEGACY_IDS) expect(typeById(id), id).not.toBeNull();
  });

  it('staff are profitable at baseline: revenue boost exceeds salary', () => {
    for (const t of BUSINESS_TYPES) {
      expect(t.staffRevenueWeek, t.id).toBeGreaterThan(t.staffSalaryWeek);
    }
  });
});

describe('economics', () => {
  it('matches the legacy formula for a bare pre-v1.4 business at rep 50', () => {
    const biz = shop({ level: 3 });
    const s = owner([biz]);
    // legacy: 1800 * 1.18^2 rounded; rep 50 => 1.0 multiplier, no staff/marketing
    expect(weeklyRevenue(s, biz)).toBe(Math.round(1800 * Math.pow(1.18, 2)));
    expect(weeklyExpense(s, biz)).toBe(Math.round(1200 * Math.pow(1.08, 2)));
  });

  it('reputation swings revenue both ways', () => {
    const loved = shop({ reputation: 100 });
    const hated = shop({ reputation: 0 });
    const s = owner([loved, hated]);
    expect(weeklyRevenue(s, loved)).toBeGreaterThan(weeklyRevenue(s, hated));
  });

  it('owner skills pay: leadership lifts staff output, finance trims costs', () => {
    const biz = shop({ staff: 4 });
    const novice = owner([biz]);
    const seasoned = owner([biz], { skills: { leadership: 100, finance: 100 } });
    expect(weeklyRevenue(seasoned, biz)).toBeGreaterThan(weeklyRevenue(novice, biz));
    expect(weeklyExpense(seasoned, biz)).toBeLessThan(weeklyExpense(novice, biz));
  });
});

describe('actions', () => {
  it('hires up to the cap and not past it', () => {
    const biz = shop();
    const def = typeById('coffeeshop')!;
    for (let i = 0; i < def.maxStaff; i++) expect(hireStaff(biz).ok).toBe(true);
    expect(hireStaff(biz).ok).toBe(false);
    expect(biz.staff).toBe(def.maxStaff);
  });

  it('letting someone go dents reputation', () => {
    const biz = shop({ staff: 2, reputation: 50 });
    expect(letStaffGo(biz).ok).toBe(true);
    expect(biz.reputation).toBe(48);
    expect(biz.staff).toBe(1);
  });

  it('marketing costs money, lifts reputation, refuses when broke', () => {
    const biz = shop();
    const s = owner([biz]);
    const cost = marketingCost(biz);
    const out = runMarketing(s, biz, new Rng(1));
    expect(out.ok).toBe(true);
    expect(s.money).toBe(100000 - cost);
    expect(biz.marketingYears).toBe(2);
    expect(biz.reputation as number).toBeGreaterThan(50);

    const broke = owner([biz], { money: 0 });
    expect(runMarketing(broke, biz, new Rng(1)).ok).toBe(false);
  });
});

describe('businessYearTick', () => {
  it('is deterministic for the same seed', () => {
    const run = () => {
      const s = owner([shop(), { typeId: 'lemonade', level: 1, totalInvested: 500 }]);
      const rng = new Rng(31);
      const nets: number[] = [];
      for (let i = 0; i < 20; i++) nets.push(businessYearTick(s, rng).netTotal);
      return { nets, businesses: s.businesses };
    };
    expect(run()).toEqual(run());
  });

  it('profitable businesses produce positive yearly net', () => {
    const s = owner([shop({ reputation: 80 })]);
    const out = businessYearTick(s, new Rng(2));
    expect(out.netTotal).toBeGreaterThan(0);
    expect(s.businesses).toHaveLength(1);
  });

  it('a money pit folds after three straight losing years', () => {
    // techstartup at rep 0: revenue * 0.7 < expenses -> guaranteed yearly loss
    const biz: OwnedBusiness = { typeId: 'techstartup', level: 1, totalInvested: 60000, reputation: 0 };
    const s = owner([biz]);
    const rng = new Rng(4);
    const texts: string[] = [];
    for (let i = 0; i < 10 && s.businesses.length; i++) {
      biz.reputation = 0; // pin reputation so the loss repeats
      texts.push(...businessYearTick(s, rng).messages.map((m) => m.text));
    }
    expect(s.businesses).toHaveLength(0);
    expect(texts.some((t) => t.includes('went under'))).toBe(true);
  });

  it('backfills pre-v1.4 businesses without touching their core fields', () => {
    const biz = shop({ level: 4 });
    ensureBusiness(biz);
    expect(biz.reputation).toBe(50);
    expect(biz.staff).toBe(0);
    expect(biz.level).toBe(4);
    expect(biz.totalInvested).toBe(25000);
  });

  it('keeps weeklyNet sensible for a fresh unstaffed business', () => {
    const biz = shop();
    const s = owner([biz]);
    expect(weeklyNet(s, biz)).toBe(1800 - 1200);
  });
});
