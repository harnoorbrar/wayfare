import { describe, expect, it } from 'vitest';
import { EVENTS } from '../data/events';
import {
  drawEvent,
  ensureEvents,
  pendingCount,
  resolveChoiceSchedule,
} from './events';
import { Rng } from './rng';
import type { GameState } from './state';

function life(overrides: Partial<GameState> = {}): GameState {
  return {
    name: 'P', age: 30, money: 50000, health: 100, happiness: 80, smarts: 50,
    job: 'dev', salary: 1000, partner: null, alive: true, relationships: [],
    ...overrides,
  } as GameState;
}

describe('event data integrity', () => {
  it('every scheduled target id exists', () => {
    const ids = new Set(EVENTS.map((e) => e.id));
    for (const e of EVENTS) {
      for (const c of e.choices) {
        if (c.schedule) {
          expect(ids.has(c.schedule.eventId)).toBe(true);
          if (c.schedule.elseEventId) expect(ids.has(c.schedule.elseEventId)).toBe(true);
        }
      }
    }
  });

  it('scheduled-only events are never spontaneously drawable', () => {
    for (const e of EVENTS) {
      if (e.scheduledOnly) expect(e.weight).toBe(0);
    }
  });
});

describe('drawEvent', () => {
  it('respects requirements (no startup pitch when broke)', () => {
    const broke = life({ money: 0 });
    const rng = new Rng(1);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      broke.age = 30;
      const ev = drawEvent(broke, rng);
      if (ev) seen.add(ev.id);
    }
    expect(seen.has('startup_pitch')).toBe(false);
  });

  it('never draws a scheduled-only event spontaneously', () => {
    const s = life();
    const rng = new Rng(2);
    for (let i = 0; i < 300; i++) {
      const ev = drawEvent(s, rng);
      if (ev) expect(ev.id).not.toBe('startup_boom');
    }
  });

  it('fires a once event at most once', () => {
    const s = life();
    const rng = new Rng(3);
    let count = 0;
    for (let i = 0; i < 400; i++) {
      const ev = drawEvent(s, rng);
      if (ev?.id === 'mentor_offer') count++;
    }
    expect(count).toBeLessThanOrEqual(1);
  });

  it('is deterministic for the same seed', () => {
    const run = () => {
      const s = life();
      const rng = new Rng(99);
      const ids: (string | null)[] = [];
      for (let i = 0; i < 30; i++) {
        s.age++;
        ids.push(drawEvent(s, rng)?.id ?? null);
      }
      return ids;
    };
    expect(run()).toEqual(run());
  });
});

describe('chaining', () => {
  it('a scheduled follow-up fires when due, not before', () => {
    const s = life({ age: 30 });
    // Manually schedule the mentor payoff 2 years out.
    resolveChoiceSchedule(s, { label: '', result: '', schedule: { eventId: 'mentor_payoff', inYears: 2 } });
    expect(pendingCount(s)).toBe(1);

    const rng = new Rng(7);
    s.age = 31;
    // Not yet due — a spontaneous event may fire, but not the payoff.
    for (let i = 0; i < 5; i++) {
      const ev = drawEvent(s, rng);
      if (ev) expect(ev.id).not.toBe('mentor_payoff');
    }
    // Due now.
    s.age = 32;
    let fired = false;
    for (let i = 0; i < 10 && !fired; i++) {
      const ev = drawEvent(s, rng);
      if (ev?.id === 'mentor_payoff') fired = true;
    }
    expect(fired).toBe(true);
    expect(pendingCount(s)).toBe(0);
  });

  it('resolves a chance branch to one of its two outcomes', () => {
    const outcomes = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const s = life({ age: 30 });
      resolveChoiceSchedule(s, {
        label: '', result: '',
        schedule: { eventId: 'startup_boom', elseEventId: 'startup_bust', inYears: 1, chance: 0.45 },
      });
      const rng = new Rng(seed);
      s.age = 31;
      let ev = null;
      for (let i = 0; i < 20 && !ev; i++) {
        const drawn = drawEvent(s, rng);
        if (drawn && (drawn.id === 'startup_boom' || drawn.id === 'startup_bust')) ev = drawn;
      }
      if (ev) outcomes.add(ev.id);
    }
    // Across many seeds we should see both the boom and the bust.
    expect(outcomes.has('startup_boom')).toBe(true);
    expect(outcomes.has('startup_bust')).toBe(true);
  });

  it('full startup chain: investing schedules a 3-year payoff', () => {
    const s = life({ age: 25, money: 20000 });
    const rng = new Rng(4);
    // Force the pitch by scheduling it directly, then take the invest choice.
    const pitch = EVENTS.find((e) => e.id === 'startup_pitch')!;
    const invest = pitch.choices.find((c) => c.label === 'Invest $10,000')!;
    resolveChoiceSchedule(s, invest);
    const sched = ensureEvents(s).scheduled[0];
    expect(sched.eventId).toBe('startup_boom');
    expect(sched.elseEventId).toBe('startup_bust');
    expect(sched.dueAge).toBe(28);
  });
});
