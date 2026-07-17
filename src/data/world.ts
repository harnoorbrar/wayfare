/**
 * World-simulation tuning data. Every number the economy runs on lives here
 * rather than inline in the engine, so cycles can be retuned without
 * touching simulation logic.
 */
import type { Phase } from '../domain/world';

export interface PhaseProfile {
  readonly label: string;
  /** Annual real GDP growth range, percent. */
  readonly growth: readonly [number, number];
  /** Annual inflation range, percent. */
  readonly inflation: readonly [number, number];
  /** Unemployment range, percent. */
  readonly unemployment: readonly [number, number];
  /** Years the phase must run before it can end. */
  readonly minYears: number;
  /** Per-year chance of ending, once past minYears. */
  readonly exitChance: number;
  /** Weighted destinations when the phase ends. */
  readonly next: readonly (readonly [Phase, number])[];
}

export const PHASES: Record<Phase, PhaseProfile> = {
  boom: {
    label: 'Boom',
    growth: [3.5, 6.5],
    inflation: [3, 6.5],
    unemployment: [3, 5],
    minYears: 2,
    exitChance: 0.45,
    next: [
      ['growth', 0.55],
      ['recession', 0.45],
    ],
  },
  growth: {
    label: 'Expansion',
    growth: [1.5, 3.5],
    inflation: [1.5, 3],
    unemployment: [4, 6.5],
    minYears: 3,
    exitChance: 0.25,
    next: [
      ['boom', 0.4],
      ['recession', 0.6],
    ],
  },
  recession: {
    label: 'Recession',
    growth: [-3, 0.5],
    inflation: [0, 2.5],
    unemployment: [6.5, 10],
    minYears: 1,
    exitChance: 0.5,
    next: [
      ['growth', 0.78],
      ['depression', 0.22],
    ],
  },
  depression: {
    label: 'Depression',
    growth: [-8, -2],
    inflation: [-2, 1],
    unemployment: [10, 18],
    minYears: 1,
    exitChance: 0.4,
    next: [
      ['recession', 0.85],
      ['growth', 0.15],
    ],
  },
};

/** Central-bank behaviour (a deliberately simplified Taylor rule). */
export const RATES = {
  /** Rate the bank drifts toward when inflation is on target. */
  neutral: 2.5,
  /** Inflation the bank targets. */
  inflationTarget: 2,
  /** How hard the bank leans against inflation misses. */
  inflationResponse: 1.5,
  /** Fraction of the gap closed per year (rates move gradually). */
  smoothing: 0.5,
  min: 0.25,
  max: 18,
} as const;

/** Spreads applied on top of the central-bank rate. */
export const SPREADS = {
  mortgage: 2.0,
  personalLoan: 7.5,
  creditCard: 16,
  savings: -1.5,
} as const;

/** Housing market response coefficients. */
export const HOUSING = {
  growthPull: 1.2,
  inflationPull: 1.0,
  ratePush: -0.8,
  noise: 3,
  /** Yearly gain that counts as bubble territory. */
  bubbleThreshold: 12,
  /** Consecutive bubble years before a burst becomes likely. */
  bubbleYearsToBurst: 3,
  burstChance: 0.45,
  burstRange: [-35, -18],
} as const;

/** Equity market response coefficients. */
export const MARKET = {
  growthPull: 2.5,
  ratePush: -1.2,
  noise: 12,
  /** Index level (vs fundamentals) above which crashes get likely. */
  overvaluedRatio: 1.35,
  crashChance: 0.35,
  crashRange: [-45, -25],
} as const;

/** Asset-class behaviour, expressed relative to the market index move. */
export const ASSETS = {
  stocks: { beta: 1.0, drift: 0, noise: 6 },
  bonds: { beta: 0.15, drift: 1.5, noise: 3 },
  crypto: { beta: 2.4, drift: 4, noise: 55 },
} as const;

export interface ShockDef {
  readonly id: string;
  /** Base per-year chance; some shocks scale this by world conditions. */
  readonly chance: number;
  readonly headline: string;
}

export const SHOCKS: readonly ShockDef[] = [
  { id: 'breakthrough', chance: 0.07, headline: 'A technological breakthrough is reshaping entire industries.' },
  { id: 'disaster', chance: 0.05, headline: 'A natural disaster has battered the region. Rebuilding will take years.' },
  { id: 'newIndustry', chance: 0.06, headline: 'An entirely new industry is minting fortunes overnight.' },
  { id: 'pandemic', chance: 0.015, headline: 'A public-health crisis has shuttered much of the economy.' },
];

/** Elections swing policy, which moves taxes. */
export const POLITICS = {
  /** Years between elections. */
  cycleYears: 4,
  /** Income-tax band the winner can push toward. */
  taxRange: [18, 42],
  /** How far tax moves toward the new administration's target per election. */
  taxShift: 0.6,
} as const;
