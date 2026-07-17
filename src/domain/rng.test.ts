import { describe, expect, it } from 'vitest';
import { Rng } from './rng';

describe('Rng', () => {
  it('produces the identical sequence for the same seed', () => {
    const a = new Rng(12345);
    const b = new Rng(12345);
    for (let i = 0; i < 1000; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('resumes exactly from a captured state', () => {
    const a = new Rng(999);
    for (let i = 0; i < 50; i++) a.next();
    const snapshot = a.getState();
    const expected = Array.from({ length: 20 }, () => a.next());

    const b = new Rng(0);
    b.setState(snapshot);
    const resumed = Array.from({ length: 20 }, () => b.next());
    expect(resumed).toEqual(expected);
  });

  it('int() stays within inclusive bounds and hits both ends', () => {
    const r = new Rng(42);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const v = r.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });

  it('next() stays in [0, 1)', () => {
    const r = new Rng(7);
    for (let i = 0; i < 5000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('pick() throws on an empty array', () => {
    expect(() => new Rng(1).pick([])).toThrow();
  });
});
