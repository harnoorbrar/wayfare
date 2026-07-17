import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearSave,
  CURRENT_SAVE_VERSION,
  KVStorage,
  persistSave,
  restoreSave,
  SAVE_KEY,
  setStorageForTesting,
} from './save';
import type { GameState } from './state';

function fakeStorage(): KVStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('save system', () => {
  let store: ReturnType<typeof fakeStorage>;

  beforeEach(() => {
    store = fakeStorage();
    setStorageForTesting(store);
  });

  afterEach(() => {
    setStorageForTesting(null);
  });

  it('round-trips a save with its rng state', () => {
    const state = { name: 'Test Life', age: 30, money: 500 } as GameState;
    persistSave(state, 0xdeadbeef);

    const restored = restoreSave();
    expect(restored).not.toBeNull();
    expect(restored!.state.name).toBe('Test Life');
    expect(restored!.state.age).toBe(30);
    expect(restored!.rng).toBe(0xdeadbeef);
  });

  it('writes the current envelope version', () => {
    persistSave({ name: 'V', age: 1 } as GameState);
    const raw = JSON.parse(store.data.get(SAVE_KEY)!);
    expect(raw.__wayfare).toBe(true);
    expect(raw.version).toBe(CURRENT_SAVE_VERSION);
  });

  it('migrates a legacy raw-state save (v1.0/v1.1 format)', () => {
    // Exactly what the shipped game wrote: bare state JSON, old education field.
    store.data.set(
      SAVE_KEY,
      JSON.stringify({ name: 'Old Save', age: 44, educationLevel: 'College' }),
    );

    const restored = restoreSave();
    expect(restored).not.toBeNull();
    expect(restored!.state.degrees).toEqual(['hs']);
    expect(restored!.state.educationLevel).toBeUndefined();
    expect(restored!.rng).toBeUndefined();
  });

  it('backfills missing fields with defaults on every load', () => {
    store.data.set(SAVE_KEY, JSON.stringify({ name: 'Sparse', age: 10 }));

    const restored = restoreSave()!;
    expect(restored.state.pets).toEqual([]);
    expect(restored.state.investments).toEqual({ stocks: 0, bonds: 0, crypto: 0 });
    expect(restored.state.generation).toBe(1);
    expect(restored.state.alive).toBe(true);
  });

  it('does not overwrite fields that exist in the save', () => {
    store.data.set(SAVE_KEY, JSON.stringify({ name: 'Rich', age: 50, money: 9999, degrees: ['hs', 'college'] }));

    const restored = restoreSave()!;
    expect(restored.state.money).toBe(9999);
    expect(restored.state.degrees).toEqual(['hs', 'college']);
  });

  it('returns null for missing or corrupt saves', () => {
    expect(restoreSave()).toBeNull();
    store.data.set(SAVE_KEY, 'not json{{{');
    expect(restoreSave()).toBeNull();
  });

  it('clearSave removes the save', () => {
    persistSave({ name: 'X', age: 1 } as GameState);
    clearSave();
    expect(restoreSave()).toBeNull();
  });
});
