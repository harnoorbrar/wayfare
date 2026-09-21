import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import { backfillDefaults } from './state';
import type { GameState } from './state';
import {
  MIN_TRAVEL_AGE,
  MIN_TRAVEL_HEALTH,
  PARTNER_CLOSENESS_GAIN,
  PARTNER_COST_MULTIPLIER,
  STAMP_LIMIT,
  ensureTravel,
  passportSummary,
  placesVisited,
  takeTrip,
  tripAvailability,
  tripCost,
  visitCount,
  visitedRegions,
} from './travel';
import { DESTINATIONS, TRAVEL_REGIONS, destinationById } from '../data/travel';
import { ambitionSnapshot, chooseAmbition } from './ambitions';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return backfillDefaults({ name: 'Noor', age: 30, money: 100_000, happiness: 50, health: 80, smarts: 40, ...overrides }) as GameState;
}

function withPartner(state: GameState, closeness = 60): GameState {
  state.partner = 'Sam';
  state.relationships.push({ id: 99, type: 'Spouse', name: 'Sam', closeness });
  return state;
}

/** Trips are once a year; age the player between them. */
function tripEachYear(state: GameState, ids: string[], rng = new Rng(1)): void {
  for (const id of ids) {
    const result = takeTrip(state, id, {}, rng);
    if (!result.ok) throw new Error(`${id}: ${result.reason}`);
    state.age += 1;
  }
}

describe('travel catalog', () => {
  it('has unique ids, a known region for every destination, and every region covered', () => {
    const ids = DESTINATIONS.map((destination) => destination.id);
    expect(new Set(ids).size).toBe(ids.length);
    const regionIds = TRAVEL_REGIONS.map((region) => region.id);
    DESTINATIONS.forEach((destination) => {
      expect(regionIds).toContain(destination.region);
      expect(destination.moments.length).toBeGreaterThan(0);
      destination.moments.forEach((moment) => expect(moment).toContain('{who}'));
    });
    regionIds.forEach((region) => expect(DESTINATIONS.some((d) => d.region === region)).toBe(true));
  });
});

describe('trip pricing and availability', () => {
  it('scales cost by inflation and party size, rounded to $10', () => {
    const lisbon = destinationById('lisbon')!;
    expect(tripCost(lisbon)).toBe(lisbon.cost);
    expect(tripCost(lisbon, { priceMultiplier: 1.5 })).toBe(Math.round(lisbon.cost * 1.5 / 10) * 10);
    expect(tripCost(lisbon, { withPartner: true })).toBe(Math.round(lisbon.cost * PARTNER_COST_MULTIPLIER / 10) * 10);
    expect(tripCost(lisbon, { priceMultiplier: -2 })).toBe(lisbon.cost);
  });

  it('gates on age, health, money, partner, and once per year', () => {
    expect(tripAvailability(makeState({ age: MIN_TRAVEL_AGE - 1 }), 'lisbon').ok).toBe(false);
    expect(tripAvailability(makeState({ health: MIN_TRAVEL_HEALTH - 1 }), 'lisbon').reason).toBe('Too unwell');
    expect(tripAvailability(makeState({ money: 10 }), 'lisbon').reason).toBe('Not enough cash');
    expect(tripAvailability(makeState(), 'lisbon', { withPartner: true }).reason).toBe('No partner');
    expect(tripAvailability(makeState(), 'atlantis').ok).toBe(false);

    const state = makeState();
    expect(takeTrip(state, 'lisbon', {}, new Rng(1)).ok).toBe(true);
    expect(tripAvailability(state, 'rome').reason).toBe('Next year');
    state.age += 1;
    expect(tripAvailability(state, 'rome').ok).toBe(true);
  });
});

describe('taking a trip', () => {
  it('charges, stamps the passport, and applies first-visit effects', () => {
    const state = makeState();
    const before = { money: state.money, happiness: state.happiness, smarts: state.smarts };
    const rome = destinationById('rome')!;
    const result = takeTrip(state, 'rome', {}, new Rng(2));
    expect(result.ok).toBe(true);
    expect(result.firstVisit).toBe(true);
    expect(result.newRegion).toBe(true);
    expect(state.money).toBeLessThanOrEqual(before.money - rome.cost);
    expect(state.skills.cooking).toBe(rome.skills.cooking);
    expect(visitCount(state, 'rome')).toBe(1);
    expect(result.text).toContain('Noor');
    expect(result.text).not.toContain('{');
    // New region bonus rides on top of the destination's happiness (a mishap
    // can take a point or two back, never more).
    expect(state.happiness).toBeGreaterThanOrEqual(before.happiness + rome.happiness);
  });

  it('gives a repeat visit less happiness and no further smarts', () => {
    const rng = new Rng(3);
    const state = makeState();
    const first = takeTrip(state, 'cairo', {}, rng);
    state.age += 1;
    const second = takeTrip(state, 'cairo', {}, rng);
    const happinessOf = (r: typeof first) => r.deltas!.find(([k]) => k === 'happiness')![1];
    expect(second.firstVisit).toBe(false);
    expect(happinessOf(second)).toBeLessThan(happinessOf(first));
    expect(first.deltas!.some(([k]) => k === 'smarts')).toBe(true);
    expect(second.deltas!.some(([k]) => k === 'smarts')).toBe(false);
  });

  it('brings a partner closer and names them in the memory and stamp', () => {
    const state = withPartner(makeState(), 60);
    const result = takeTrip(state, 'kyoto', { withPartner: true }, new Rng(4));
    expect(result.ok).toBe(true);
    expect(result.companion).toBe('Sam');
    expect(result.text).toContain('Noor and Sam');
    expect(state.relationships.find((r) => r.name === 'Sam')!.closeness).toBe(60 + PARTNER_CLOSENESS_GAIN);
    expect(ensureTravel(state).stamps[0].companion).toBe('Sam');
  });

  it('is deterministic for a given seed', () => {
    const a = makeState();
    const b = makeState();
    tripEachYear(a, ['bangkok', 'sydney', 'nyc'], new Rng(9));
    tripEachYear(b, ['bangkok', 'sydney', 'nyc'], new Rng(9));
    expect(a).toEqual(b);
  });

  it('eventually rolls a survivable mishap', () => {
    const state = makeState({ money: 10_000_000 });
    const rng = new Rng(11);
    let mishaps = 0;
    for (let i = 0; i < 80; i += 1) {
      const result = takeTrip(state, 'bangkok', {}, rng);
      if (result.mishap) {
        mishaps += 1;
        expect(result.mishap.text).not.toContain('{');
      }
      state.age += 1;
      state.health = 80;
    }
    expect(mishaps).toBeGreaterThan(0);
    expect(mishaps).toBeLessThan(40);
  });
});

describe('passport', () => {
  it('counts places, regions and trips separately', () => {
    const state = makeState();
    tripEachYear(state, ['lisbon', 'lisbon', 'kyoto', 'banff']);
    const summary = passportSummary(state);
    expect(summary.trips).toBe(4);
    expect(summary.places).toBe(3);
    expect(summary.regions).toEqual(['americas', 'europe', 'asia']);
    expect(summary.totalRegions).toBe(TRAVEL_REGIONS.length);
  });

  it('repairs malformed saves and drops unknown destinations', () => {
    const state = makeState({ travel: { stamps: [{ destinationId: 'atlantis', age: 20 }, { destinationId: 'rome', age: 21 }, 'junk'], lastTripAge: 'x' } });
    const travel = ensureTravel(state);
    expect(travel.stamps).toEqual([{ destinationId: 'rome', age: 21, companion: null }]);
    expect(travel.lastTripAge).toBe(-1);
    expect(ensureTravel(makeState({ travel: null })).stamps).toEqual([]);
  });

  it('caps the stamp history', () => {
    const state = makeState({ money: 100_000_000, age: 18 });
    const rng = new Rng(5);
    for (let i = 0; i < STAMP_LIMIT + 5; i += 1) {
      takeTrip(state, 'banff', {}, rng);
      state.age += 1;
      state.health = 80;
    }
    expect(ensureTravel(state).stamps.length).toBe(STAMP_LIMIT);
  });
});

describe('See the World ambition', () => {
  it('tracks places and regions', () => {
    const state = makeState();
    expect(chooseAmbition(state, 'wanderer')).toBe(true);
    tripEachYear(state, ['lisbon', 'kyoto', 'banff']);
    expect(ambitionSnapshot(state)!.completed).toBe(1);
    tripEachYear(state, ['cairo', 'sydney']);
    expect(visitedRegions(state).length).toBe(5);
    expect(ambitionSnapshot(state)!.completed).toBe(2);
    tripEachYear(state, DESTINATIONS.map((d) => d.id));
    expect(placesVisited(state)).toBe(DESTINATIONS.length);
    expect(ambitionSnapshot(state)!.completed).toBe(3);
  });
});
