/**
 * Health engine. Replaces the monolith's flat decay + (health<=0 || age>95)
 * death check with an age-decline curve, chronic conditions that develop and
 * are treated (insurance offsetting cost), lifestyle effects (fitness skill),
 * and a real mortality model. Deterministic given the shared Rng.
 */
import { CONDITIONS, HEALTH, INSURANCE_PLANS, TREATMENT_MORTALITY_CUT, type ConditionDef, type InsurancePlan } from '../data/health';
import { Rng } from './rng';
import type { GameState } from './state';

export interface HealthState {
  /** Ids of active chronic conditions. */
  conditions: string[];
  /** Insurance plan id (see INSURANCE_PLANS). */
  insurance: string;
}

export function ensureHealth(state: GameState): HealthState {
  const s = state as unknown as { healthState?: HealthState };
  if (!s.healthState) s.healthState = { conditions: [], insurance: 'none' };
  if (!Array.isArray(s.healthState.conditions)) s.healthState.conditions = [];
  if (typeof s.healthState.insurance !== 'string') s.healthState.insurance = 'none';
  return s.healthState;
}

export function conditionById(id: string): ConditionDef | undefined {
  return CONDITIONS.find((c) => c.id === id);
}

export function insurancePlan(id: string): InsurancePlan {
  return INSURANCE_PLANS.find((p) => p.id === id) ?? INSURANCE_PLANS[0];
}

export function setInsurance(state: GameState, planId: string): boolean {
  if (!INSURANCE_PLANS.some((p) => p.id === planId)) return false;
  ensureHealth(state).insurance = planId;
  return true;
}

/** Fitness skill (0-100); a proxy for lifestyle. Missing => sedentary. */
function fitness(state: GameState): number {
  return (state.skills && state.skills.fitness) || 0;
}

/**
 * Yearly baseline health decline from age, softened by fitness. Returns a
 * positive number of health points lost.
 */
export function ageDecline(state: GameState): number {
  const ageTerm = Math.max(0, state.age - HEALTH.declineStartAge) * HEALTH.declinePerAgeYear;
  const gross = HEALTH.baselineDecline + ageTerm;
  // Good fitness offsets up to ~40% of decline.
  const fitFactor = 1 - 0.4 * Math.min(1, fitness(state) / HEALTH.fitReference);
  return Math.max(0, gross * fitFactor);
}

/** Onset chance for a condition this year, given age and lifestyle. */
export function onsetChance(state: GameState, def: ConditionDef): number {
  if (state.age < def.onsetAge) return 0;
  const ageOver = state.age - def.onsetAge;
  let chance = def.baseChance * (1 + ageOver * 0.05);
  if (def.lifestyleLinked) {
    // Fit players roughly halve lifestyle-linked onset; unfit raise it.
    const fitFactor = 1.3 - 0.8 * Math.min(1, fitness(state) / HEALTH.fitReference);
    chance *= fitFactor;
  }
  return Math.min(0.9, chance);
}

export interface HealthMessage {
  text: string;
  deltas?: [string, number][];
}

export interface HealthTickResult {
  messages: HealthMessage[];
  /** Net cash effect (premiums + treatment after coverage). Negative. */
  cashDelta: number;
  died: boolean;
  causeOfDeath: string | null;
}

/**
 * One health year: apply age decline, maybe develop a condition, pay
 * premiums and treatment, drain health for untreated conditions, then roll
 * mortality. Health-point changes are returned via deltas AND applied to
 * state.health so callers stay in sync.
 */
export function healthYearTick(state: GameState, rng: Rng): HealthTickResult {
  const hs = ensureHealth(state);
  const messages: HealthMessage[] = [];
  let cashDelta = 0;

  // 1. Age-curve decline.
  const decline = Math.round(ageDecline(state));
  if (decline > 0) state.health = clampHealth(state.health - decline);

  // 2. Possible new condition.
  for (const def of CONDITIONS) {
    if (hs.conditions.includes(def.id)) continue;
    if (rng.chance(onsetChance(state, def))) {
      hs.conditions.push(def.id);
      messages.push({ text: `${state.name} was diagnosed with ${def.name}.` });
    }
  }

  // 3. Insurance premium.
  const plan = insurancePlan(hs.insurance);
  if (plan.premium > 0) cashDelta -= plan.premium;

  // 4. Treat conditions the player can afford; untreated ones drain health.
  //    Treated conditions still carry residual mortality, just far less.
  let healthLostToConditions = 0;
  const treated = new Set<string>();
  for (const id of hs.conditions) {
    const def = conditionById(id);
    if (!def) continue;
    const outOfPocket = Math.round(def.treatmentCost * (1 - plan.coverage));
    const canAfford = state.money + state.savings >= -cashDelta + outOfPocket;
    if (canAfford) {
      cashDelta -= outOfPocket;
      treated.add(id);
    } else {
      state.health = clampHealth(state.health - def.yearlyDrain);
      healthLostToConditions += def.yearlyDrain;
    }
  }
  if (healthLostToConditions > 0) {
    messages.push({ text: `Untreated conditions took a toll this year.`, deltas: [['health', -healthLostToConditions]] });
  }

  // 5. Mortality, with treatment cutting each condition's contribution.
  const mort = mortalityRisk(state, hs, treated);
  if (rng.chance(mort) || state.age >= HEALTH.maxAge) {
    return { messages, cashDelta, died: true, causeOfDeath: causeOfDeath(state, hs, treated) };
  }
  return { messages, cashDelta, died: false, causeOfDeath: null };
}

/**
 * Total yearly probability of death, capped below certainty. Conditions in
 * `treated` contribute only their residual (post-treatment) mortality. When
 * `treated` is omitted (e.g. the UI's risk gauge), conditions the player can
 * plausibly afford this year are assumed treated so the gauge isn't alarmist.
 */
export function mortalityRisk(state: GameState, hs = ensureHealth(state), treated?: Set<string>): number {
  let risk = HEALTH.baselineRisk;
  if (state.age > HEALTH.mortalityAge) risk += (state.age - HEALTH.mortalityAge) * HEALTH.mortalityPerYear;
  if (state.health < HEALTH.frailHealth) risk += (HEALTH.frailHealth - state.health) * HEALTH.mortalityPerFrailPoint;

  const plan = insurancePlan(hs.insurance);
  for (const id of hs.conditions) {
    const def = conditionById(id);
    if (!def) continue;
    const isTreated = treated
      ? treated.has(id)
      : state.money + state.savings >= Math.round(def.treatmentCost * (1 - plan.coverage));
    risk += isTreated ? def.mortality * (1 - TREATMENT_MORTALITY_CUT) : def.mortality;
  }
  return Math.min(0.95, risk);
}

function causeOfDeath(state: GameState, hs: HealthState, treated: Set<string>): string {
  if (state.age >= HEALTH.maxAge) return 'old age';
  // Blame the most lethal condition actually contributing risk. An untreated
  // condition outweighs a treated one of the same severity.
  let worst: ConditionDef | undefined;
  let worstRisk = 0;
  for (const id of hs.conditions) {
    const def = conditionById(id);
    if (!def) continue;
    const contribution = treated.has(id) ? def.mortality * (1 - TREATMENT_MORTALITY_CUT) : def.mortality;
    if (contribution > worstRisk) {
      worstRisk = contribution;
      worst = def;
    }
  }
  if (worst && worstRisk > 0) return worst.name.toLowerCase();
  if (state.age > HEALTH.mortalityAge) return 'old age';
  return 'failing health';
}

function clampHealth(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}
