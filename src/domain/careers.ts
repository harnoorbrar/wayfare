/**
 * Career system: ladders, promotions, terminations, raises, and yearly
 * skill growth. Pure domain logic — mutates GameState numbers, returns
 * feed messages; all rendering/haptics stay in the presentation layer.
 */
import { CAREER_TRACKS } from '../data/careers';
import type { GameState } from './state';
import { Rng } from './rng';
import { SKILL_MAX } from './skills';

export interface LevelRequirements {
  minSmarts: number;
  degree: string | null;
  /** Years served at the PREVIOUS level before this one is reachable. */
  minYears: number;
  /** skillId -> minimum bar (0-100). */
  skills: Record<string, number>;
}

export interface CareerLevel {
  id: string;
  title: string;
  payWeek: number;
  /** Legacy category, still used by the job-board filter chips. */
  category: string;
  /** Directly applyable from the job board (vs. promotion-only). */
  entry: boolean;
  requirements: LevelRequirements;
  /** skillId -> points gained per year worked at this level. */
  skillGrowth: Record<string, number>;
  /** 0-100; high stress erodes health/happiness each year. */
  stress: number;
  /** 0-100; feeds a small yearly happiness bonus. */
  prestige: number;
  /** Base chance per eligible year of moving up a level. */
  promotionChance: number;
  /** Chance per year of losing this job. */
  terminationChance: number;
}

export interface CareerTrack {
  id: string;
  name: string;
  levels: CareerLevel[];
}

export interface FeedMessage {
  text: string;
  deltas?: [string, number][];
}

export interface CareerTickResult {
  messages: FeedMessage[];
  promoted: boolean;
  terminated: boolean;
}

const levelIndex = new Map<string, { track: CareerTrack; level: CareerLevel; i: number }>();
for (const track of CAREER_TRACKS) {
  track.levels.forEach((level, i) => levelIndex.set(level.id, { track, level, i }));
}

export function levelById(id: string): CareerLevel | null {
  return levelIndex.get(id)?.level ?? null;
}

export function trackOf(levelId: string): CareerTrack | null {
  return levelIndex.get(levelId)?.track ?? null;
}

export function nextLevel(levelId: string): CareerLevel | null {
  const entry = levelIndex.get(levelId);
  if (!entry) return null;
  return entry.track.levels[entry.i + 1] ?? null;
}

/** Flat list shaped like the legacy JOBS array, for the job board UI. */
export function legacyJobList(): {
  id: string; title: string; payWeek: number; minSmarts: number;
  requiredDegree: string | null; category: string | null; entry: boolean;
}[] {
  const jobs: ReturnType<typeof legacyJobList> = [
    { id: 'unemployed', title: 'Unemployed', payWeek: 0, minSmarts: 0, requiredDegree: null, category: null, entry: false },
  ];
  for (const track of CAREER_TRACKS) {
    for (const level of track.levels) {
      jobs.push({
        id: level.id,
        title: level.title,
        payWeek: level.payWeek,
        minSmarts: level.requirements.minSmarts,
        requiredDegree: level.requirements.degree,
        category: level.category,
        entry: level.entry,
      });
    }
  }
  return jobs;
}

function skillsOf(state: GameState): Record<string, number> {
  if (!state.skills || typeof state.skills !== 'object') state.skills = {};
  return state.skills as Record<string, number>;
}

function hasDegree(state: GameState, degree: string | null): boolean {
  return !degree || (Array.isArray(state.degrees) && state.degrees.includes(degree));
}

export interface EligibilityGap {
  ok: boolean;
  missingSmarts: number;
  missingDegree: string | null;
  missingYears: number;
  missingSkills: { id: string; have: number; need: number }[];
}

/** How far the player is from qualifying for a level (promotion checks). */
export function eligibilityGap(state: GameState, level: CareerLevel, yearsServed: number): EligibilityGap {
  const req = level.requirements;
  const skills = skillsOf(state);
  const missingSkills = Object.entries(req.skills)
    .filter(([id, need]) => (skills[id] ?? 0) < need)
    .map(([id, need]) => ({ id, have: skills[id] ?? 0, need }));
  const gap: EligibilityGap = {
    ok: false,
    missingSmarts: Math.max(0, req.minSmarts - state.smarts),
    missingDegree: hasDegree(state, req.degree) ? null : req.degree,
    missingYears: Math.max(0, req.minYears - yearsServed),
    missingSkills,
  };
  gap.ok =
    gap.missingSmarts === 0 && gap.missingDegree === null && gap.missingYears === 0 && missingSkills.length === 0;
  return gap;
}

function clampStat(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/**
 * One simulated year of career life. Call once per ageUp for an employed,
 * living character. Order: skill growth -> stress/prestige -> raise ->
 * promotion or termination roll.
 */
export function careerYearTick(state: GameState, rng: Rng): CareerTickResult {
  const result: CareerTickResult = { messages: [], promoted: false, terminated: false };
  const current = levelById(state.job);
  if (!current || state.job === 'unemployed' || !state.alive) return result;

  state.yearsAtJob = ((state.yearsAtJob as number) ?? 0) + 1;

  // Skills sharpen with every year on the job.
  const skills = skillsOf(state);
  for (const [id, amount] of Object.entries(current.skillGrowth)) {
    skills[id] = Math.min(SKILL_MAX, (skills[id] ?? 0) + amount + rng.int(0, 1));
  }

  // Stress wears you down; prestige buoys you.
  if (current.stress >= 55) {
    const wear = rng.int(0, 2);
    if (wear > 0) {
      state.health = clampStat(state.health - wear);
      state.happiness = clampStat(state.happiness - rng.int(0, 1));
    }
  }
  if (current.prestige >= 55 && rng.chance(0.5)) {
    state.happiness = clampStat(state.happiness + 1);
  }

  // Merit raises drift salary above the base for the level.
  if (rng.chance(0.25)) {
    const pct = rng.int(2, 5);
    const bump = Math.max(5, Math.round((state.salary * pct) / 100));
    state.salary += bump;
    result.messages.push({
      text: `Annual review went well — a ${pct}% raise. ${fmtWeekly(state.salary)} now.`,
      deltas: [['money', bump * 52]],
    });
  }

  // Promotion beats termination if both could fire this year.
  const next = nextLevel(state.job);
  if (next && eligibilityGap(state, next, state.yearsAtJob as number).ok && rng.chance(next.promotionChance)) {
    state.job = next.id;
    state.salary = Math.max(next.payWeek, state.salary); // never demote pay
    state.yearsAtJob = 0;
    state.happiness = clampStat(state.happiness + rng.int(3, 6));
    result.promoted = true;
    result.messages.push({ text: `Promoted to ${next.title}! The new office has a window.` });
  } else if (rng.chance(current.terminationChance)) {
    const title = current.title;
    state.job = 'unemployed';
    state.salary = 0;
    state.yearsAtJob = 0;
    const hit = rng.int(6, 12);
    state.happiness = clampStat(state.happiness - hit);
    result.terminated = true;
    result.messages.push({
      text: `Laid off from the ${title} position. Restructuring, they said.`,
      deltas: [['happiness', -hit]],
    });
  }

  return result;
}

function fmtWeekly(n: number): string {
  return `$${n.toLocaleString('en-US')}/wk`;
}
