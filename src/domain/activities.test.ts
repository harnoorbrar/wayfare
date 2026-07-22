import { describe, expect, it } from 'vitest';
import {
  ACTIVITIES,
  availability,
  ensureActivityState,
  focusRemaining,
  performActivity,
} from './activities';
import type { GameState } from './state';

function life(overrides: Partial<GameState> = {}): GameState {
  return {
    name: 'Player', age: 18, money: 500, health: 80, happiness: 70, smarts: 40,
    looks: 50, job: 'unemployed', salary: 0, property: null, ownership: null,
    mortgageBalance: 0, mortgageWeekly: 0, placedFurniture: {}, ownedFurniture: [],
    activeRoomIndex: null, relationships: [], nextRelId: 1, partner: null,
    children: [], feed: [], alive: true, degrees: [], studentLoans: 0, vehicles: [],
    will: {}, peakMoney: 0, activeTab: 'story', pendingChoice: null, lastMetAge: -1,
    lastDateAttemptAge: -1, savings: 0, investments: { stocks: 0, bonds: 0, crypto: 0 },
    investmentReturns: { stocks: 0, bonds: 0, crypto: 0 }, businesses: [], generation: 1,
    pets: [], skills: {}, yearsAtJob: 0, ambition: null, activities: null,
    ...overrides,
  } as GameState;
}

describe('activities', () => {
  it('allows two different actions per in-game year', () => {
    const state = life();
    expect(performActivity(state, 'outdoors').ok).toBe(true);
    expect(performActivity(state, 'study').ok).toBe(true);
    expect(focusRemaining(state)).toBe(0);
    expect(performActivity(state, 'create')).toEqual({ ok: false, reason: 'No focus left this year.' });
  });

  it('prevents repeating the same action in a year', () => {
    const state = life();
    performActivity(state, 'outdoors');
    expect(performActivity(state, 'outdoors')).toEqual({ ok: false, reason: 'Already done this year.' });
  });

  it('resets focus when age advances', () => {
    const state = life();
    performActivity(state, 'outdoors');
    state.age += 1;
    expect(focusRemaining(state)).toBe(2);
    expect(ensureActivityState(state).performed).toEqual([]);
  });

  it('applies costs, stats, and career-relevant skills', () => {
    const state = life({ money: 100, health: 99, skills: { fitness: 98 } });
    const result = performActivity(state, 'outdoors');
    expect(result.ok).toBe(true);
    expect(state.health).toBe(100);
    expect(state.happiness).toBe(72);
    expect(state.skills.fitness).toBe(100);
    expect(state.money).toBe(100);
  });

  it('enforces age and affordability requirements', () => {
    const child = life({ age: 5 });
    const lead = ACTIVITIES.find((activity) => activity.id === 'lead')!;
    expect(availability(child, lead).reason).toBe('Unlocks at age 18.');
    const brokeAdult = life({ money: 0 });
    expect(performActivity(brokeAdult, 'network')).toEqual({ ok: false, reason: 'Needs $100.' });
  });
});
