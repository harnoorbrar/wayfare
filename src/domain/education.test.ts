import { describe, expect, it } from 'vitest';
import {
  canEnroll,
  currentGpa,
  educationYearTick,
  enroll,
  ensureEducation,
  programById,
  scholarshipFor,
} from './education';
import { PROGRAMS } from '../data/education';
import { Rng } from './rng';
import type { GameState } from './state';

function student(overrides: Partial<GameState> = {}): GameState {
  return {
    name: 'S', age: 18, money: 0, smarts: 45, studentLoans: 0,
    degrees: ['hs'], skills: {}, alive: true, relationships: [],
    ...overrides,
  } as GameState;
}

/** Enroll and advance a program to completion, returning all messages. */
function graduate(state: GameState, programId: string, seed = 1): string[] {
  enroll(state, programId);
  const rng = new Rng(seed);
  const msgs: string[] = [];
  const program = programById(programId)!;
  for (let i = 0; i < program.years; i++) {
    state.age++;
    msgs.push(...educationYearTick(state, rng).messages.map((m) => m.text));
  }
  return msgs;
}

describe('scholarshipFor', () => {
  it('scales with smarts', () => {
    expect(scholarshipFor(40)).toBe(0);
    expect(scholarshipFor(65)).toBeGreaterThan(0);
    expect(scholarshipFor(85)).toBeGreaterThan(scholarshipFor(65));
  });
});

describe('canEnroll', () => {
  it('requires the prerequisite degree', () => {
    const s = student({ degrees: [] });
    const r = canEnroll(s, programById('deg_cs')!);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('High School');
  });

  it('enforces the smarts floor', () => {
    const s = student({ smarts: 10 });
    expect(canEnroll(s, programById('deg_medicine')!).ok).toBe(false);
  });

  it('admits a qualified applicant and reports scholarship', () => {
    const s = student({ smarts: 85 });
    const r = canEnroll(s, programById('deg_cs')!);
    expect(r.ok).toBe(true);
    expect(r.scholarship).toBeGreaterThan(0);
  });

  it('blocks a second enrollment while already studying', () => {
    const s = student({ smarts: 60 });
    enroll(s, 'deg_business');
    expect(canEnroll(s, programById('deg_cs')!).ok).toBe(false);
  });
});

describe('educationYearTick', () => {
  it('does nothing when not enrolled', () => {
    const s = student();
    const r = educationYearTick(s, new Rng(1));
    expect(r.graduated).toBe(false);
    expect(r.messages).toEqual([]);
  });

  it('graduates after exactly the program length and awards the degree', () => {
    const s = student({ smarts: 50 });
    const program = programById('deg_cs')!;
    enroll(s, 'deg_cs');
    const rng = new Rng(2);
    for (let i = 0; i < program.years - 1; i++) {
      s.age++;
      expect(educationYearTick(s, rng).graduated).toBe(false);
    }
    s.age++;
    const last = educationYearTick(s, rng);
    expect(last.graduated).toBe(true);
    expect(s.degrees).toContain('deg_cs');
    expect(ensureEducation(s).current).toBeNull();
  });

  it('builds the field skills while studying', () => {
    const s = student({ smarts: 50 });
    graduate(s, 'deg_cs', 3);
    // CS builds programming + creativity.
    expect(s.skills.programming).toBeGreaterThan(0);
    expect(s.skills.creativity).toBeGreaterThan(0);
  });

  it('accrues student debt net of scholarship', () => {
    const poor = student({ smarts: 45 });
    const bright = student({ smarts: 85 });
    graduate(poor, 'deg_business', 4);
    graduate(bright, 'deg_business', 4);
    expect(poor.studentLoans).toBeGreaterThan(0);
    // The scholarship student owes less for the same program.
    expect(bright.studentLoans).toBeLessThan(poor.studentLoans);
  });

  it('gives smarter students higher GPAs on average', () => {
    const avgGpa = (smarts: number) => {
      let sum = 0;
      const runs = 10;
      for (let seed = 0; seed < runs; seed++) {
        const s = student({ smarts });
        graduate(s, 'deg_business', seed);
        sum += currentGpa(s)!;
      }
      return sum / runs;
    };
    expect(avgGpa(90)).toBeGreaterThan(avgGpa(35));
  });

  it('is deterministic for the same seed', () => {
    const run = () => {
      const s = student({ smarts: 55 });
      graduate(s, 'deg_law', 42);
      return { degrees: s.degrees, gpa: currentGpa(s), smarts: s.smarts, debt: s.studentLoans };
    };
    expect(run()).toEqual(run());
  });
});

describe('program data integrity', () => {
  it('every prerequisite points to a real program', () => {
    const ids = new Set(PROGRAMS.map((p) => p.id));
    for (const p of PROGRAMS) {
      if (p.prereq) expect(ids.has(p.prereq)).toBe(true);
    }
  });
});
