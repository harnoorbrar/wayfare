import { describe, expect, it } from 'vitest';
import { CAREER_TRACKS } from '../data/careers';
import {
  careerYearTick,
  eligibilityGap,
  legacyJobList,
  levelById,
  nextLevel,
} from './careers';
import { SKILLS } from './skills';
import { Rng } from './rng';
import type { GameState } from './state';

/** Every job id the pre-v1.2 flat JOBS list shipped with. */
const LEGACY_JOB_IDS = [
  'retail', 'barista', 'warehouse', 'server',
  'electrician', 'plumber', 'hvac', 'chef',
  'office', 'accountant', 'marketing', 'exec',
  'itsupport', 'engineer', 'datasci',
  'civileng', 'nurse', 'doctor',
  'paralegal', 'lawyer', 'researcher',
  'designer', 'journalist', 'teacher', 'police', 'firefighter',
];

function worker(overrides: Partial<GameState> = {}): GameState {
  return {
    name: 'T', age: 30, smarts: 80, health: 100, happiness: 80, money: 0,
    job: 'engineer', salary: 1900, degrees: ['hs', 'deg_cs'],
    skills: {}, yearsAtJob: 0, alive: true,
  } as GameState;
}

describe('career data integrity', () => {
  it('keeps every legacy job id so old saves still resolve', () => {
    for (const id of LEGACY_JOB_IDS) {
      expect(levelById(id), `legacy job ${id}`).not.toBeNull();
    }
  });

  it('has globally unique level ids', () => {
    const ids = CAREER_TRACKS.flatMap((t) => t.levels.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ladders pay more at every step up', () => {
    for (const track of CAREER_TRACKS) {
      for (let i = 1; i < track.levels.length; i++) {
        expect(
          track.levels[i].payWeek,
          `${track.id}: ${track.levels[i].id} vs ${track.levels[i - 1].id}`,
        ).toBeGreaterThan(track.levels[i - 1].payWeek);
      }
    }
  });

  it('every track starts with an applyable entry level', () => {
    for (const track of CAREER_TRACKS) {
      expect(track.levels[0].entry, track.id).toBe(true);
    }
  });

  it('references only defined skills', () => {
    const known = new Set(SKILLS.map((s) => s.id));
    for (const track of CAREER_TRACKS) {
      for (const level of track.levels) {
        for (const id of [...Object.keys(level.skillGrowth), ...Object.keys(level.requirements.skills)]) {
          expect(known.has(id), `${level.id} uses unknown skill ${id}`).toBe(true);
        }
      }
    }
  });

  it('legacyJobList keeps the shape the UI expects, including unemployed', () => {
    const jobs = legacyJobList();
    expect(jobs[0].id).toBe('unemployed');
    const engineer = jobs.find((j) => j.id === 'engineer')!;
    expect(engineer.payWeek).toBe(1900);
    expect(engineer.requiredDegree).toBe('deg_cs');
    expect(engineer.category).toBe('Tech');
  });
});

describe('careerYearTick', () => {
  it('is deterministic for the same seed', () => {
    const run = () => {
      const s = worker();
      const rng = new Rng(777);
      const out: string[] = [];
      for (let i = 0; i < 30; i++) out.push(...careerYearTick(s, rng).messages.map((m) => m.text));
      return { out, job: s.job, salary: s.salary, skills: s.skills };
    };
    expect(run()).toEqual(run());
  });

  it('grows the job level skills each year', () => {
    const s = worker();
    careerYearTick(s, new Rng(1));
    expect(s.skills.programming).toBeGreaterThan(0);
    expect(s.yearsAtJob).toBe(1);
  });

  it('eventually promotes an eligible worker up the ladder', () => {
    const s = worker({});
    s.smarts = 90;
    const rng = new Rng(42);
    for (let i = 0; i < 40 && s.job === 'engineer'; i++) careerYearTick(s, rng);
    expect(s.job).toBe('senior_engineer');
    expect(s.salary).toBeGreaterThanOrEqual(2700);
  });

  it('never promotes past requirements that are not met', () => {
    const s = worker();
    s.smarts = 10; // far below senior_engineer's 65
    const rng = new Rng(3);
    for (let i = 0; i < 60; i++) {
      careerYearTick(s, rng);
      if (s.job === 'unemployed') break; // termination is fine; promotion is not
      expect(s.job).toBe('engineer');
    }
  });

  it('does nothing for the unemployed', () => {
    const s = worker({});
    s.job = 'unemployed';
    s.salary = 0;
    const out = careerYearTick(s, new Rng(9));
    expect(out.messages).toEqual([]);
    expect(s.yearsAtJob).toBe(0);
  });

  it('termination resets job, salary, and tenure', () => {
    const s = worker();
    const rng = new Rng(5);
    let terminated = false;
    for (let i = 0; i < 500 && !terminated; i++) {
      s.job = 'engineer'; s.salary = 1900; s.smarts = 10; // block promotion path
      terminated = careerYearTick(s, rng).terminated;
    }
    expect(terminated).toBe(true);
    expect(s.job).toBe('unemployed');
    expect(s.salary).toBe(0);
    expect(s.yearsAtJob).toBe(0);
  });
});

describe('eligibilityGap', () => {
  it('reports exactly what is missing', () => {
    const s = worker();
    s.smarts = 50;
    s.skills = { programming: 10 };
    const senior = nextLevel('engineer')!;
    const gap = eligibilityGap(s, senior, 1);
    expect(gap.ok).toBe(false);
    expect(gap.missingSmarts).toBe(15);
    expect(gap.missingYears).toBe(2);
    expect(gap.missingSkills).toEqual([{ id: 'programming', have: 10, need: 45 }]);
  });

  it('passes when everything is met', () => {
    const s = worker();
    s.smarts = 70;
    s.skills = { programming: 50 };
    expect(eligibilityGap(s, nextLevel('engineer')!, 3).ok).toBe(true);
  });
});
