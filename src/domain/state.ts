/**
 * The canonical Wayfare game-state model.
 *
 * Fields the strangler migration hasn't reached yet are typed loosely
 * (unknown / index signature) — tighten them as each system moves into the
 * domain layer. The index signature exists so legacy saves round-trip
 * without losing monolith-owned fields.
 */

export interface Investments {
  stocks: number;
  bonds: number;
  crypto: number;
}

export interface Relationship {
  id: number;
  type: string;
  [monolithField: string]: unknown;
}

export type Ownership = 'rent' | 'finance' | 'owned' | null;

export interface GameState {
  name: string;
  age: number;
  money: number;
  health: number;
  happiness: number;
  smarts: number;
  looks: number;
  job: string;
  salary: number;
  property: string | null;
  ownership: Ownership;
  mortgageBalance: number;
  mortgageWeekly: number;
  placedFurniture: Record<string, Record<string, string>>;
  ownedFurniture: string[];
  activeRoomIndex: number | null;
  relationships: Relationship[];
  nextRelId: number;
  partner: unknown | null;
  children: unknown[];
  feed: unknown[];
  alive: boolean;
  degrees: string[];
  studentLoans: number;
  vehicles: unknown[];
  will: Record<string, number>;
  peakMoney: number;
  activeTab: string;
  pendingChoice: unknown | null;
  lastMetAge: number;
  lastDateAttemptAge: number;
  savings: number;
  investments: Investments;
  investmentReturns: Investments;
  businesses: unknown[];
  generation: number;
  pets: unknown[];
  /** skillId -> 0-100. Grows through work and actions; gates promotions. */
  skills: Record<string, number>;
  /** Years at the current career level; resets on hire/promotion. */
  yearsAtJob: number;
  [monolithField: string]: unknown;
}

/**
 * Backfill values for fields a save might be missing.
 * Must stay in sync with what newGame() sets — same values the monolith's
 * SAVE_DEFAULTS used, so migrated saves behave identically.
 */
export function saveDefaults(): Partial<GameState> {
  return {
    money: 0,
    health: 100,
    happiness: 80,
    smarts: 30,
    looks: 50,
    job: 'unemployed',
    salary: 0,
    property: null,
    ownership: null,
    mortgageBalance: 0,
    mortgageWeekly: 0,
    placedFurniture: {},
    ownedFurniture: [],
    activeRoomIndex: null,
    relationships: [],
    nextRelId: 1,
    partner: null,
    children: [],
    feed: [],
    alive: true,
    degrees: [],
    studentLoans: 0,
    vehicles: [],
    will: {},
    peakMoney: 0,
    activeTab: 'story',
    pendingChoice: null,
    lastMetAge: -1,
    lastDateAttemptAge: -1,
    savings: 0,
    investments: { stocks: 0, bonds: 0, crypto: 0 },
    investmentReturns: { stocks: 0, bonds: 0, crypto: 0 },
    businesses: [],
    generation: 1,
    pets: [],
    skills: {},
    yearsAtJob: 0,
  };
}

/** Fill in any missing fields without touching ones that exist. */
export function backfillDefaults(state: Record<string, unknown>): GameState {
  const defaults = saveDefaults();
  for (const key of Object.keys(defaults) as (keyof GameState)[]) {
    if (state[key as string] === undefined) {
      const d = defaults[key];
      // Clone containers so saves never share references with the defaults.
      state[key as string] = Array.isArray(d)
        ? [...d]
        : typeof d === 'object' && d !== null
          ? { ...d }
          : d;
    }
  }
  return state as GameState;
}
