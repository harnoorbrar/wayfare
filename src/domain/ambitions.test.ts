import { describe, expect, it } from 'vitest';
import {
  ambitionSnapshot,
  chooseAmbition,
  claimAmbitionRewards,
  ensureAmbition,
} from './ambitions';
import type { GameState } from './state';

function life(overrides: Partial<GameState> = {}): GameState {
  return {
    name: 'Player', age: 18, money: 0, savings: 0, health: 100, happiness: 70,
    smarts: 30, looks: 50, job: 'unemployed', salary: 0, property: null,
    ownership: null, mortgageBalance: 0, mortgageWeekly: 0, placedFurniture: {},
    ownedFurniture: [], activeRoomIndex: null, relationships: [], nextRelId: 1,
    partner: null, children: [], feed: [], alive: true, degrees: ['hs'],
    studentLoans: 0, vehicles: [], will: {}, peakMoney: 0, activeTab: 'story',
    pendingChoice: null, lastMetAge: -1, lastDateAttemptAge: -1, investments: {
      stocks: 0, bonds: 0, crypto: 0,
    }, investmentReturns: { stocks: 0, bonds: 0, crypto: 0 }, businesses: [],
    generation: 1, pets: [], skills: {}, yearsAtJob: 0, ambition: null,
    ...overrides,
  } as GameState;
}

describe('life ambitions', () => {
  it('cannot be chosen before adulthood or replaced mid-life', () => {
    const child = life({ age: 17 });
    expect(chooseAmbition(child, 'fortune')).toBe(false);
    const adult = life();
    expect(chooseAmbition(adult, 'fortune')).toBe(true);
    expect(chooseAmbition(adult, 'family')).toBe(false);
  });

  it('reports progress toward the next fortune milestone', () => {
    const state = life({ money: 10_000 });
    chooseAmbition(state, 'fortune');
    expect(ambitionSnapshot(state)?.next).toEqual({
      label: 'Build a $25,000 foundation', current: 10_000, target: 25_000,
    });
  });

  it('claims each completed reward once', () => {
    const state = life({ money: 300_000, happiness: 50 });
    chooseAmbition(state, 'fortune');
    const first = claimAmbitionRewards(state);
    expect(first.map((reward) => reward.milestoneId)).toEqual(['foundation', 'security']);
    expect(state.happiness).toBe(60);
    expect(claimAmbitionRewards(state)).toEqual([]);
  });

  it('clamps happiness rewards at 100', () => {
    const state = life({ money: 1_000_000, happiness: 98 });
    chooseAmbition(state, 'fortune');
    claimAmbitionRewards(state);
    expect(state.happiness).toBe(100);
  });

  it('counts advanced programs whether or not an old save contains hs', () => {
    const state = life({ degrees: ['deg_cs'] });
    chooseAmbition(state, 'mastery');
    expect(claimAmbitionRewards(state).map((reward) => reward.milestoneId)).toContain('qualification');
  });

  it('repairs an unknown ambition from a future or corrupt save', () => {
    const state = life({ ambition: { id: 'unknown', claimed: [] } });
    expect(ensureAmbition(state)).toBeNull();
    expect(state.ambition).toBeNull();
  });
});
