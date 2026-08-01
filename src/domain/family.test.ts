import { describe, expect, it } from 'vitest';
import { babyAttemptAvailability, completePregnancy, conceptionChance, tryForBaby } from './family';
import { Rng } from './rng';
import type { GameState } from './state';

function familyState(overrides: Partial<GameState> = {}): GameState {
  return {
    name: 'Quinn',
    age: 28,
    money: 1000,
    health: 80,
    happiness: 70,
    smarts: 50,
    looks: 50,
    job: 'unemployed',
    salary: 0,
    property: null,
    ownership: null,
    mortgageBalance: 0,
    mortgageWeekly: 0,
    placedFurniture: {},
    ownedFurniture: [],
    activeRoomIndex: null,
    relationships: [{ id: 1, name: 'Alex', type: 'Partner', closeness: 80, trust: 70 }],
    nextRelId: 2,
    partner: 'Alex',
    children: [],
    feed: [],
    alive: true,
    degrees: [],
    studentLoans: 0,
    vehicles: [],
    will: {},
    peakMoney: 0,
    activeTab: 'people',
    pendingChoice: null,
    lastMetAge: -1,
    lastDateAttemptAge: -1,
    lastBabyAttemptAge: -1,
    expectingBaby: null,
    savings: 0,
    investments: { stocks: 0, bonds: 0, crypto: 0 },
    investmentReturns: { stocks: 0, bonds: 0, crypto: 0 },
    businesses: [],
    generation: 1,
    pets: [],
    skills: {},
    yearsAtJob: 0,
    ambition: null,
    activities: null,
    ...overrides,
  };
}

describe('family planning', () => {
  it('requires an adult with a close partner and limits attempts to once per year', () => {
    expect(babyAttemptAvailability(familyState({ partner: null })).reason).toContain('partner');
    expect(babyAttemptAvailability(familyState({ age: 17 })).reason).toContain('age 18');
    expect(babyAttemptAvailability(familyState({
      relationships: [{ id: 1, name: 'Alex', type: 'Partner', closeness: 30 }],
    })).reason).toContain('closer');
    expect(babyAttemptAvailability(familyState({ lastBabyAttemptAge: 28 })).reason).toContain('already tried');
  });

  it('makes conception less likely later in life', () => {
    expect(conceptionChance(familyState({ age: 28 }))).toBeGreaterThan(
      conceptionChance(familyState({ age: 45 })),
    );
  });

  it('records a successful pregnancy for the next age-up', () => {
    const state = familyState({ health: 100 });
    const result = tryForBaby(state, new Rng(7));
    expect(result.conceived).toBe(true);
    expect(state.expectingBaby).toEqual({
      partnerName: 'Alex',
      conceivedAge: 28,
      dueAge: 29,
    });
    expect(state.lastBabyAttemptAge).toBe(28);
  });

  it('creates the child and relationship when the pregnancy is due', () => {
    const state = familyState({
      age: 29,
      expectingBaby: { partnerName: 'Alex', conceivedAge: 28, dueAge: 29 },
    });
    const birth = completePregnancy(state, 'River');
    expect(birth.born).toBe(true);
    expect(state.children).toEqual([{ name: 'River', age: 0, relId: 2 }]);
    expect(state.relationships[state.relationships.length - 1]).toMatchObject({ name: 'River', type: 'Child', age: 0 });
    expect(state.expectingBaby).toBeNull();
  });
});
