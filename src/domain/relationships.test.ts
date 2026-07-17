import { describe, expect, it } from 'vitest';
import { compatibility, generateTraits, traitBlurb } from './npcs';
import {
  applyInteraction,
  ensureNpc,
  relationshipYearTick,
} from './relationships';
import { Rng } from './rng';
import type { GameState, Relationship } from './state';

function person(overrides: Partial<Relationship> = {}): Relationship {
  return { id: 1, name: 'Sam', type: 'Friend', closeness: 50, lastInteractedAge: 0, ...overrides } as Relationship;
}

function life(rels: Relationship[]): GameState {
  return {
    name: 'P', age: 30, happiness: 80, smarts: 50, looks: 50,
    job: 'unemployed', relationships: rels, alive: true,
  } as GameState;
}

describe('npcs', () => {
  it('generates traits within 0-100', () => {
    const rng = new Rng(11);
    for (let i = 0; i < 200; i++) {
      const t = generateTraits(rng);
      for (const v of Object.values(t)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('describes extreme traits and stays quiet on average ones', () => {
    expect(traitBlurb({ kindness: 90, ambition: 50, confidence: 10, intelligence: 50, humor: 50 }))
      .toContain('warm');
    expect(traitBlurb({ kindness: 50, ambition: 50, confidence: 50, intelligence: 50, humor: 50 }))
      .toBe('even-keeled');
  });

  it('compatibility stays in 0-100 and rewards mutual warmth', () => {
    const warm = { kindness: 90, ambition: 50, confidence: 50, intelligence: 50, humor: 80 };
    const cold = { kindness: 5, ambition: 90, confidence: 95, intelligence: 50, humor: 10 };
    const match = compatibility(warm, { ...warm });
    const clash = compatibility(warm, cold);
    expect(match).toBeGreaterThan(clash);
    for (const v of [match, clash]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe('ensureNpc', () => {
  it('backfills traits, trust, respect, memories on legacy bonds', () => {
    const rel = person();
    ensureNpc(rel, new Rng(2));
    expect(rel.traits).toBeDefined();
    expect(typeof rel.trust).toBe('number');
    expect(typeof rel.respect).toBe('number');
    expect(rel.memories).toEqual([]);
  });

  it('never overwrites existing npc data', () => {
    const rel = person({ trust: 88, memories: [{ age: 5, text: 'x' }] });
    ensureNpc(rel, new Rng(2));
    expect(rel.trust).toBe(88);
    expect(rel.memories).toEqual([{ age: 5, text: 'x' }]);
  });
});

describe('relationshipYearTick', () => {
  it('is deterministic for the same seed', () => {
    const run = () => {
      const s = life([person(), person({ id: 2, name: 'Alex', type: 'Spouse' })]);
      const rng = new Rng(99);
      const texts: string[] = [];
      for (let i = 0; i < 20; i++) {
        s.age++;
        texts.push(...relationshipYearTick(s, rng).messages.map((m) => m.text));
      }
      return { texts, rels: s.relationships };
    };
    expect(run()).toEqual(run());
  });

  it('decays neglected bonds and preserves tended ones', () => {
    const neglectedRel = person({ id: 1, lastInteractedAge: 0 });
    const tendedRel = person({ id: 2, name: 'Kai', lastInteractedAge: 29 });
    const s = life([neglectedRel, tendedRel]);
    relationshipYearTick(s, new Rng(4));
    expect(neglectedRel.closeness).toBeLessThanOrEqual(50);
    expect(tendedRel.closeness).toBe(50);
  });

  it('drops friends whose bond has gone cold, keeps family', () => {
    const coldFriend = person({ id: 1, closeness: 2 });
    const coldParent = person({ id: 2, name: 'Mom', type: 'Parent', closeness: 2 });
    const s = life([coldFriend, coldParent]);
    const out = relationshipYearTick(s, new Rng(6));
    expect(s.relationships.map((r) => r.id)).toEqual([2]);
    expect(out.messages.some((m) => m.text.includes('drifted apart'))).toBe(true);
  });

  it('keeps every dimension within 0-100 over a long life', () => {
    const s = life([person(), person({ id: 2, name: 'Alex', type: 'Spouse', closeness: 90 })]);
    const rng = new Rng(7);
    for (let i = 0; i < 60; i++) {
      s.age++;
      relationshipYearTick(s, rng);
    }
    for (const r of s.relationships) {
      for (const v of [r.closeness, r.trust, r.respect] as number[]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('applyInteraction', () => {
  it('raises closeness and trust, marks the year, lifts mood', () => {
    const rel = person({ closeness: 40 });
    const s = life([rel]);
    s.happiness = 50;
    const out = applyInteraction(s, rel, 'spend', new Rng(8));
    expect(rel.closeness).toBeGreaterThan(40);
    expect(rel.trust as number).toBeGreaterThan(0);
    expect(rel.lastInteractedAge).toBe(30);
    expect(s.happiness).toBeGreaterThan(50);
    expect(out.text).toContain('Sam');
  });

  it('warm friends bond faster than cold ones', () => {
    const totalGain = (kindness: number, seed: number) => {
      const rel = person({ closeness: 40 });
      ensureNpc(rel, new Rng(1));
      (rel.traits as { kindness: number }).kindness = kindness;
      const s = life([rel]);
      const rng = new Rng(seed);
      for (let i = 0; i < 10; i++) applyInteraction(s, rel, 'call', rng);
      return rel.closeness as number;
    };
    expect(totalGain(90, 5)).toBeGreaterThan(totalGain(10, 5));
  });
});
