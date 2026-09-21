import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import { backfillDefaults } from './state';
import type { GameState } from './state';
import {
  BUCKET_LIST_AGE,
  BUCKET_LIST_SIZE,
  COMPLETE_LIST_BONUS,
  DREAMS,
  DREAM_REWARD,
  MAX_TRAVEL_DREAMS,
  bucketListSnapshot,
  claimDreams,
  dreamById,
  ensureBucketList,
  readBucketList,
  swapDream,
} from './bucketList';
import { takeTrip } from './travel';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return backfillDefaults({ name: 'Noor', age: 18, money: 5_000, happiness: 40, ...overrides }) as GameState;
}

function travelDreams(state: GameState): number {
  return readBucketList(state)!.dreams.filter((entry) => dreamById(entry.id)!.kind === 'travel').length;
}

describe('bucket list catalog', () => {
  it('has unique ids and every kind represented', () => {
    const ids = DREAMS.map((dream) => dream.id);
    expect(new Set(ids).size).toBe(ids.length);
    (['travel', 'life', 'mastery'] as const).forEach((kind) => {
      expect(DREAMS.some((dream) => dream.kind === kind)).toBe(true);
    });
  });
});

describe('drawing the list', () => {
  it('waits for adulthood, then draws five distinct dreams with 1-2 travel dreams', () => {
    expect(ensureBucketList(makeState({ age: BUCKET_LIST_AGE - 1 }), new Rng(1))).toBeNull();
    for (let seed = 1; seed <= 40; seed += 1) {
      const state = makeState();
      const list = ensureBucketList(state, new Rng(seed))!;
      expect(list.dreams).toHaveLength(BUCKET_LIST_SIZE);
      expect(new Set(list.dreams.map((d) => d.id)).size).toBe(BUCKET_LIST_SIZE);
      expect(travelDreams(state)).toBeGreaterThanOrEqual(1);
      expect(travelDreams(state)).toBeLessThanOrEqual(MAX_TRAVEL_DREAMS);
    }
  });

  it('is idempotent and never offers a dream that is already true', () => {
    const state = makeState({ age: 85, ownership: 'owned', smarts: 90 });
    const list = ensureBucketList(state, new Rng(2))!;
    const ids = list.dreams.map((d) => d.id);
    expect(ids).not.toContain('see_eighty');
    expect(ids).not.toContain('own_home');
    expect(ids).not.toContain('sharp_mind');
    expect(ensureBucketList(state, new Rng(99))!.dreams.map((d) => d.id)).toEqual(ids);
  });

  it('drops unknown dreams from old or tampered saves', () => {
    const state = makeState({ bucketList: { dreams: [{ id: 'fly_to_moon', doneAge: null }, { id: 'chef', doneAge: 30 }], swapUsed: 1 } });
    const list = readBucketList(state)!;
    expect(list.dreams).toEqual([{ id: 'chef', doneAge: 30 }]);
    expect(list.swapUsed).toBe(true);
  });
});

describe('fulfilling dreams', () => {
  it('fulfils a dream when the life satisfies it, once, with a happiness reward', () => {
    const state = makeState();
    state.bucketList = { dreams: [{ id: 'chef', doneAge: null }, { id: 'graduate', doneAge: null }], swapUsed: false };
    expect(claimDreams(state).fulfilled).toEqual([]);
    state.skills = { cooking: 60 };
    state.age = 29;
    const result = claimDreams(state);
    expect(result.fulfilled.map((f) => f.definition.id)).toEqual(['chef']);
    expect(state.happiness).toBe(40 + DREAM_REWARD);
    expect(readBucketList(state)!.dreams[0].doneAge).toBe(29);
    expect(claimDreams(state).fulfilled).toEqual([]);
  });

  it('pays a bonus exactly once when the whole list is done', () => {
    const state = makeState({ money: 50_000 });
    state.bucketList = { dreams: [{ id: 'kyoto', doneAge: null }, { id: 'chef', doneAge: 20 }], swapUsed: false };
    takeTrip(state, 'kyoto', {}, new Rng(3));
    const before = state.happiness;
    const result = claimDreams(state);
    expect(result.listComplete).toBe(true);
    expect(result.bonus).toBe(COMPLETE_LIST_BONUS);
    expect(state.happiness).toBe(Math.min(100, before + DREAM_REWARD + COMPLETE_LIST_BONUS));
    expect(claimDreams(state).listComplete).toBe(false);
    expect(bucketListSnapshot(state)!.canSwap).toBe(false);
  });

  it('recognises a trip taken with a partner', () => {
    const state = makeState({ money: 50_000, partner: 'Sam' });
    state.relationships.push({ id: 7, type: 'Partner', name: 'Sam', closeness: 50 });
    state.bucketList = { dreams: [{ id: 'together', doneAge: null }], swapUsed: false };
    takeTrip(state, 'lisbon', { withPartner: false }, new Rng(1));
    expect(claimDreams(state).fulfilled).toHaveLength(0);
    state.age += 1;
    takeTrip(state, 'rome', { withPartner: true }, new Rng(1));
    expect(claimDreams(state).fulfilled).toHaveLength(1);
  });
});

describe('changing your mind', () => {
  it('swaps one unfulfilled dream, once per life, without duplicates', () => {
    const state = makeState();
    const list = ensureBucketList(state, new Rng(5))!;
    const target = list.dreams[2].id;
    const result = swapDream(state, target, new Rng(6));
    expect(result.ok).toBe(true);
    const ids = readBucketList(state)!.dreams.map((d) => d.id);
    expect(ids).not.toContain(target);
    expect(new Set(ids).size).toBe(BUCKET_LIST_SIZE);
    expect(travelDreams(state)).toBeLessThanOrEqual(MAX_TRAVEL_DREAMS);
    expect(swapDream(state, ids[0], new Rng(7)).ok).toBe(false);
    expect(bucketListSnapshot(state)!.canSwap).toBe(false);
  });

  it('refuses to swap a fulfilled dream', () => {
    const state = makeState();
    state.bucketList = { dreams: [{ id: 'chef', doneAge: 25 }, { id: 'artist', doneAge: null }], swapUsed: false };
    expect(swapDream(state, 'chef', new Rng(1)).ok).toBe(false);
    expect(swapDream(state, 'artist', new Rng(1)).ok).toBe(true);
  });
});
