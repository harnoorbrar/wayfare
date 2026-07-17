/**
 * WayfareCore — the typed domain layer, exposed as a single global (IIFE
 * bundle at js/core.js) that the legacy index.html script consumes while the
 * strangler migration is in progress. New systems live here; the monolith
 * shrinks release by release.
 */
import { Rng } from './domain/rng';
import {
  persistSave as persistEnvelope,
  restoreSave as restoreEnvelope,
  clearSave,
  CURRENT_SAVE_VERSION,
} from './domain/save';
import {
  careerYearTick as careerTickImpl,
  eligibilityGap,
  legacyJobList,
  levelById,
  nextLevel,
  trackOf,
} from './domain/careers';
import { SKILLS, skillName } from './domain/skills';
import {
  applyInteraction,
  blurbFor,
  compatibilityWithPlayer,
  ensureAllNpcs,
  relationshipYearTick as relTickImpl,
} from './domain/relationships';
import {
  businessYearTick as bizTickImpl,
  catalog as businessCatalog,
  ensureBusiness,
  hireStaff,
  letStaffGo,
  marketingCost,
  runMarketing,
  typeById as businessTypeById,
  weeklyExpense as bizWeeklyExpense,
  weeklyNet as bizWeeklyNet,
  weeklyRevenue as bizWeeklyRevenue,
  type OwnedBusiness,
} from './domain/businesses';
import {
  createWorld,
  worldYearTick as worldTickImpl,
  phaseLabel,
  mortgageRate,
  personalLoanRate,
  creditCardRate,
  savingsRate,
  jobMarketFactor,
  wageMultiplier,
  housingMultiplier,
  type WorldState,
} from './domain/world';
import {
  financeYearTick as financeTickImpl,
  taxIncome,
  creditScore,
  creditBand,
  borrowingLimit,
  quotePersonalLoan,
  takePersonalLoan as takeLoanImpl,
  totalDebt,
  investmentValue,
  ensureFinancials,
  type Financials,
} from './domain/finance';
import {
  educationYearTick as eduTickImpl,
  enroll as enrollImpl,
  canEnroll,
  ensureEducation,
  programById,
  currentGpa,
  scholarshipFor,
  hasDegree,
} from './domain/education';
import { PROGRAMS } from './data/education';
import {
  healthYearTick as healthTickImpl,
  ensureHealth,
  setInsurance,
  insurancePlan,
  conditionById,
  mortalityRisk,
} from './domain/health';
import { CONDITIONS, INSURANCE_PLANS } from './data/health';
import {
  drawEvent as drawEventImpl,
  resolveChoiceSchedule,
  choiceAffordable,
  ensureEvents,
  pendingCount,
  type EventChoice,
} from './domain/events';
import type { GameState, Relationship } from './domain/state';

/** The one shared RNG every simulation decision must flow through. */
export const rng = new Rng();

/** Persist the game plus the RNG state so replays stay deterministic. */
export function persistSave(state: GameState): void {
  persistEnvelope(state, rng.getState());
}

/** Restore the game; also restores the RNG position if the save has one. */
export function restoreSave(): GameState | null {
  const restored = restoreEnvelope();
  if (!restored) return null;
  if (restored.rng !== undefined) rng.setState(restored.rng);
  return restored.state;
}

/** Fresh RNG seed for a brand-new life. */
export function reseed(): void {
  rng.setState(Rng.randomSeed());
}

/** One year of career life for the current job, using the shared RNG. */
export function careerYearTick(state: GameState) {
  return careerTickImpl(state, rng);
}

export const careers = {
  legacyJobList,
  levelById,
  nextLevel,
  trackOf,
  eligibilityGap,
};

export const skills = { SKILLS, skillName };

/** One year of every bond in the player's life, using the shared RNG. */
export function relationshipYearTick(state: GameState) {
  return relTickImpl(state, rng);
}

export const relationships = {
  applyInteraction: (state: GameState, rel: Relationship, kind: 'call' | 'spend' | 'gift') =>
    applyInteraction(state, rel, kind, rng),
  ensureAll: (state: GameState) => ensureAllNpcs(state, rng),
  blurbFor,
  compatibilityWithPlayer,
};

/** One year of every business the player owns, using the shared RNG. */
export function businessYearTick(state: GameState) {
  return bizTickImpl(state, rng);
}

export const businesses = {
  catalog: businessCatalog,
  typeById: businessTypeById,
  ensure: ensureBusiness,
  weeklyRevenue: bizWeeklyRevenue,
  weeklyExpense: bizWeeklyExpense,
  weeklyNet: bizWeeklyNet,
  marketingCost,
  hireStaff,
  letStaffGo,
  runMarketing: (state: GameState, biz: OwnedBusiness) => runMarketing(state, biz, rng),
};

/**
 * Ensure the game has a world (older saves and fresh lives created by the
 * monolith won't). Idempotent — safe to call on every tick and render.
 */
export function ensureWorld(state: GameState): WorldState {
  if (!state.world || typeof (state.world as unknown as WorldState).phase !== 'string') {
    state.world = createWorld(rng) as unknown as Record<string, unknown>;
  }
  return state.world as unknown as WorldState;
}

/** One simulated year of the economy. Tick this BEFORE player systems. */
export function worldYearTick(state: GameState) {
  const world = ensureWorld(state);
  return worldTickImpl(world, rng);
}

export const world = {
  ensure: ensureWorld,
  phaseLabel: (state: GameState) => phaseLabel(ensureWorld(state)),
  mortgageRate: (state: GameState) => mortgageRate(ensureWorld(state)),
  personalLoanRate: (state: GameState) => personalLoanRate(ensureWorld(state)),
  creditCardRate: (state: GameState) => creditCardRate(ensureWorld(state)),
  savingsRate: (state: GameState) => savingsRate(ensureWorld(state)),
  jobMarketFactor: (state: GameState) => jobMarketFactor(ensureWorld(state)),
  wageMultiplier: (state: GameState) => wageMultiplier(ensureWorld(state)),
  housingMultiplier: (state: GameState) => housingMultiplier(ensureWorld(state)),
  snapshot: (state: GameState) => {
    const w = ensureWorld(state);
    return {
      phase: phaseLabel(w),
      growth: w.growth,
      inflation: w.inflation,
      interestRate: w.interestRate,
      unemployment: w.unemployment,
      housingIndex: w.housingIndex,
      marketIndex: w.marketIndex,
      taxRate: w.taxRate,
    };
  },
};

/** One financial year: investments marked to market, loans serviced. */
export function financeYearTick(state: GameState) {
  return financeTickImpl(state, ensureWorld(state), rng);
}

export const finance = {
  taxIncome: (state: GameState, gross: number) => taxIncome(ensureWorld(state), gross),
  creditScore,
  creditBand,
  scoreBand: (state: GameState) => creditBand(creditScore(state)),
  borrowingLimit,
  totalDebt,
  investmentValue,
  ensure: ensureFinancials,
  quoteLoan: (state: GameState, amount: number, termYears?: number) =>
    quotePersonalLoan(state, ensureWorld(state), amount, termYears),
  takeLoan: (state: GameState, amount: number, termYears?: number) =>
    takeLoanImpl(state, ensureWorld(state), amount, termYears),
  loans: (state: GameState) => ensureFinancials(state).loans,
};

/** One year of study for an enrolled student (no-op otherwise). */
export function educationYearTick(state: GameState) {
  return eduTickImpl(state, rng);
}

export const education = {
  programs: PROGRAMS,
  programById,
  enroll: enrollImpl,
  canEnroll: (state: GameState, programId: string) => {
    const p = programById(programId);
    return p ? canEnroll(state, p) : { ok: false, reason: 'Unknown program.' };
  },
  scholarshipFor,
  currentGpa,
  hasDegree,
  state: ensureEducation,
  current: (state: GameState) => ensureEducation(state).current,
};

/** One health year: decline, conditions, treatment, and mortality roll. */
export function healthYearTick(state: GameState) {
  return healthTickImpl(state, rng);
}

export const health = {
  conditions: CONDITIONS,
  plans: INSURANCE_PLANS,
  state: ensureHealth,
  setInsurance,
  plan: (state: GameState) => insurancePlan(ensureHealth(state).insurance),
  activeConditions: (state: GameState) =>
    ensureHealth(state).conditions.map((id) => conditionById(id)).filter(Boolean),
  mortalityRisk: (state: GameState) => mortalityRisk(state),
};

/** The next chain/scheduled event to present this year, or null. */
export function drawEvent(state: GameState) {
  return drawEventImpl(state, rng);
}

export const events = {
  draw: drawEvent,
  resolveSchedule: resolveChoiceSchedule,
  affordable: choiceAffordable,
  ensure: ensureEvents,
  pendingCount,
};

export { Rng, clearSave, CURRENT_SAVE_VERSION };
export type { GameState, Financials, EventChoice };
