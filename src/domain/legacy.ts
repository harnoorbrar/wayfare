/**
 * Legacy, inheritance, and generations. Scores a completed life, carries
 * traits from parent to heir (nature, regressing toward the mean with
 * variance), and accumulates a dynasty score across generations. The
 * monolith already handles estate/will execution and physical asset
 * transfer in continueAsChild; this adds the heritable-traits and
 * cross-life-scoring the charter calls for.
 */
import { Rng } from './rng';
import type { GameState } from './state';

export interface LifeScore {
  total: number;
  breakdown: {
    wealth: number;
    longevity: number;
    mind: number;
    family: number;
    enterprise: number;
    dynasty: number;
  };
}

/** Peak liquid+asset wealth the life reached, for scoring. */
function peakWealth(state: GameState): number {
  const liquid = (state.money || 0) + (state.savings || 0);
  const invest = Object.values(state.investments || {}).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0);
  return Math.max(state.peakMoney || 0, liquid + invest);
}

/**
 * Score a completed life, 0..~1000+. Deterministic. Rewards wealth (log-
 * scaled so early millions matter more than late billions), longevity, a
 * developed mind, a full family, enterprise, and the generation reached.
 */
export function computeLifeScore(state: GameState): LifeScore {
  const wealth = Math.round(Math.max(0, Math.log10(Math.max(1, peakWealth(state))) - 2) * 60);
  const longevity = Math.round(Math.min(100, state.age) * 1.5);
  const mind = Math.round((state.smarts || 0) * 1.2);
  const family = Math.round(
    (state.relationships || []).filter((r) => ['Spouse', 'Child', 'Partner'].includes(r.type as string)).length * 25,
  );
  const enterprise = Math.round(((state.businesses || []).length) * 40 + ((state.degrees || []).length) * 15);
  const dynasty = Math.round(((state.generation || 1) - 1) * 120);

  const total = wealth + longevity + mind + family + enterprise + dynasty;
  return { total, breakdown: { wealth, longevity, mind, family, enterprise, dynasty } };
}

export const TRAITS = {
  /** Share of a parent trait passed to the heir (the rest regresses to mean). */
  heritability: 0.55,
  /** Population mean a trait regresses toward. */
  smartsMean: 30,
  looksMean: 55,
  /** Spread of the random component. */
  variance: 10,
} as const;

export interface InheritedTraits {
  smarts: number;
  looks: number;
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** Blend a parent trait with the population mean, plus noise. */
function inheritTrait(parentValue: number, mean: number, rng: Rng): number {
  const inherited = TRAITS.heritability * parentValue + (1 - TRAITS.heritability) * mean;
  return clamp(inherited + rng.normal(0, TRAITS.variance));
}

/**
 * Traits for an heir, blending the parent's smarts/looks with the population
 * mean (regression) plus variance. A bright, attractive parent tends to have
 * bright, attractive children — but not guaranteed.
 */
export function inheritTraits(parent: GameState, rng: Rng): InheritedTraits {
  return {
    smarts: inheritTrait(parent.smarts || TRAITS.smartsMean, TRAITS.smartsMean, rng),
    looks: inheritTrait(parent.looks || TRAITS.looksMean, TRAITS.looksMean, rng),
  };
}

/**
 * Fold a finished life's score into the running dynasty total. Returns the
 * new cumulative total to carry onto the heir's state.
 */
export function accumulateLegacy(previousTotal: number, state: GameState): number {
  return (previousTotal || 0) + computeLifeScore(state).total;
}

/** Rank label for a dynasty total, for flavor on the death screen. */
export function legacyRank(total: number): string {
  if (total >= 4000) return 'Legendary';
  if (total >= 2500) return 'Storied';
  if (total >= 1500) return 'Notable';
  if (total >= 700) return 'Respectable';
  return 'Humble';
}
