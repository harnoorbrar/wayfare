/**
 * Health tuning data: the age-decline curve, chronic conditions with their
 * onset curves and costs, and insurance plans. The engine in
 * domain/health.ts reads all of it; nothing here knows about the player.
 */

export interface ConditionDef {
  readonly id: string;
  readonly name: string;
  /** Age at which onset risk begins climbing. */
  readonly onsetAge: number;
  /** Base yearly onset chance at onsetAge, before risk factors. */
  readonly baseChance: number;
  /** Health lost each year the condition is active and untreated. */
  readonly yearlyDrain: number;
  /** Annual treatment cost (before insurance). */
  readonly treatmentCost: number;
  /** Added yearly mortality probability while active and untreated. */
  readonly mortality: number;
  /** True for lifestyle-linked conditions (fitness/diet reduce onset). */
  readonly lifestyleLinked: boolean;
}

// Mortality figures are the UNTREATED yearly death probability. Treatment
// cuts them sharply (see TREATMENT_MORTALITY_CUT), so affordable healthcare
// turns most of these into manageable chronic conditions rather than death
// sentences. Tuned so an average insured life reaches its 70s-80s.
export const CONDITIONS: readonly ConditionDef[] = [
  { id: 'hypertension', name: 'Hypertension', onsetAge: 45, baseChance: 0.02, yearlyDrain: 2, treatmentCost: 1500, mortality: 0.004, lifestyleLinked: true },
  { id: 'diabetes', name: 'Type 2 Diabetes', onsetAge: 48, baseChance: 0.018, yearlyDrain: 3, treatmentCost: 4000, mortality: 0.008, lifestyleLinked: true },
  { id: 'heart_disease', name: 'Heart Disease', onsetAge: 58, baseChance: 0.022, yearlyDrain: 5, treatmentCost: 9000, mortality: 0.03, lifestyleLinked: true },
  { id: 'cancer', name: 'Cancer', onsetAge: 55, baseChance: 0.014, yearlyDrain: 8, treatmentCost: 25000, mortality: 0.07, lifestyleLinked: false },
  { id: 'arthritis', name: 'Arthritis', onsetAge: 58, baseChance: 0.035, yearlyDrain: 1, treatmentCost: 1200, mortality: 0, lifestyleLinked: false },
] as const;

/** Fraction by which treating a condition reduces its mortality that year. */
export const TREATMENT_MORTALITY_CUT = 0.8;

export interface InsurancePlan {
  readonly id: string;
  readonly name: string;
  /** Yearly premium. */
  readonly premium: number;
  /** Fraction of treatment cost the plan covers, 0-1. */
  readonly coverage: number;
}

export const INSURANCE_PLANS: readonly InsurancePlan[] = [
  { id: 'none', name: 'Uninsured', premium: 0, coverage: 0 },
  { id: 'basic', name: 'Basic Plan', premium: 2400, coverage: 0.6 },
  { id: 'premium', name: 'Premium Plan', premium: 6000, coverage: 0.9 },
] as const;

export const HEALTH = {
  /** Age at which the baseline decline curve begins to bite. */
  declineStartAge: 35,
  /** Extra health lost per year, per year of age beyond declineStartAge. */
  declinePerAgeYear: 0.035,
  /** Baseline yearly decline before the age term. */
  baselineDecline: 0.6,
  /** Fitness skill at/above which lifestyle onset risk is meaningfully cut. */
  fitReference: 60,
  /** Old-age mortality begins climbing here. */
  mortalityAge: 65,
  /** Mortality probability added per year of age beyond mortalityAge. */
  mortalityPerYear: 0.006,
  /** Below this health, low-health mortality risk kicks in. */
  frailHealth: 20,
  /** Mortality added per health point below frailHealth. */
  mortalityPerFrailPoint: 0.006,
  /** Very low background risk in the healthy middle of life. */
  baselineRisk: 0.001,
  /** Hard ceiling — nobody outlives this. */
  maxAge: 100,
} as const;
