/**
 * World simulation — the living economy every other system reads from.
 *
 * The world runs its own business cycle (boom -> expansion -> recession ->
 * depression) with a central bank reacting to inflation, a housing market
 * that can bubble and burst, an equity market that can crash, plus shocks
 * and elections. Nothing here knows about the player: other systems pull
 * conditions from it through the selectors at the bottom of this file.
 *
 * Deterministic given the shared Rng, so a seed replays an identical world.
 */
import { ASSETS, HOUSING, MARKET, PHASES, POLITICS, RATES, SHOCKS, SPREADS } from '../data/world';
import { Rng } from './rng';

export type Phase = 'boom' | 'growth' | 'recession' | 'depression';

export type AssetId = keyof typeof ASSETS;

export interface WorldState {
  phase: Phase;
  yearsInPhase: number;
  /** Real GDP growth this year, percent. */
  growth: number;
  /** Inflation this year, percent. */
  inflation: number;
  /** Central-bank rate, percent. */
  interestRate: number;
  /** Unemployment, percent. */
  unemployment: number;
  /** House prices, indexed to 100 at the start of the life. */
  housingIndex: number;
  /** Equities, indexed to 100 at the start of the life. */
  marketIndex: number;
  /**
   * What the market "should" be worth, growing with the economy. The gap
   * between marketIndex and this drives crash risk.
   */
  marketFundamental: number;
  /** Cumulative price level (1 = start of life). Wages and prices scale by it. */
  priceLevel: number;
  /** Consecutive years of bubble-grade housing gains. */
  bubbleYears: number;
  /** Income tax rate, percent. Moves with elections. */
  taxRate: number;
  yearsToElection: number;
  /** Headline of the most recent shock, for UI. */
  lastShock: string | null;
}

export interface WorldMessage {
  text: string;
}

export interface WorldTickResult {
  messages: WorldMessage[];
}

const INDEX_BASE = 100;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** A fresh world at the start of a life: mid-expansion, on-target inflation. */
export function createWorld(rng: Rng): WorldState {
  const profile = PHASES.growth;
  return {
    phase: 'growth',
    yearsInPhase: rng.int(0, profile.minYears),
    growth: round2(rng.float(profile.growth[0], profile.growth[1])),
    inflation: round2(rng.float(profile.inflation[0], profile.inflation[1])),
    interestRate: RATES.neutral,
    unemployment: round2(rng.float(profile.unemployment[0], profile.unemployment[1])),
    housingIndex: INDEX_BASE,
    marketIndex: INDEX_BASE,
    marketFundamental: INDEX_BASE,
    priceLevel: 1,
    bubbleYears: 0,
    taxRate: 28,
    yearsToElection: rng.int(1, POLITICS.cycleYears),
    lastShock: null,
  };
}

/** Advance the business cycle, possibly transitioning to a new phase. */
function stepPhase(world: WorldState, rng: Rng): WorldMessage[] {
  const messages: WorldMessage[] = [];
  const profile = PHASES[world.phase];
  world.yearsInPhase++;

  if (world.yearsInPhase >= profile.minYears && rng.chance(profile.exitChance)) {
    const next = rng.weighted(profile.next);
    world.phase = next;
    world.yearsInPhase = 0;
    messages.push({ text: phaseHeadline(next) });
  }
  return messages;
}

function phaseHeadline(phase: Phase): string {
  switch (phase) {
    case 'boom':
      return 'The economy is booming. Everyone suddenly has an opinion about the market.';
    case 'growth':
      return 'The economy has steadied. Cautious optimism returns.';
    case 'recession':
      return 'A recession has set in. Hiring freezes are spreading.';
    case 'depression':
      return 'The downturn has deepened into a depression. Nobody is untouched.';
  }
}

/** Central bank leans against inflation misses, moving gradually. */
function stepRates(world: WorldState): void {
  const target = RATES.neutral + RATES.inflationResponse * (world.inflation - RATES.inflationTarget);
  const next = world.interestRate + (target - world.interestRate) * RATES.smoothing;
  world.interestRate = round2(clamp(next, RATES.min, RATES.max));
}

/** Housing tracks growth and inflation, fights rates, and can bubble. */
function stepHousing(world: WorldState, rng: Rng): WorldMessage[] {
  const messages: WorldMessage[] = [];
  const change =
    HOUSING.growthPull * world.growth +
    HOUSING.inflationPull * world.inflation +
    HOUSING.ratePush * (world.interestRate - RATES.neutral) +
    rng.normal(0, HOUSING.noise);

  world.housingIndex = Math.max(10, round2(world.housingIndex * (1 + change / 100)));

  if (change >= HOUSING.bubbleThreshold) {
    world.bubbleYears++;
    if (world.bubbleYears === HOUSING.bubbleYearsToBurst) {
      messages.push({ text: 'Housing prices look detached from reality. Everyone insists it is different this time.' });
    }
  } else if (change < 0) {
    world.bubbleYears = 0;
  }

  if (world.bubbleYears >= HOUSING.bubbleYearsToBurst && rng.chance(HOUSING.burstChance)) {
    const burst = rng.float(HOUSING.burstRange[0], HOUSING.burstRange[1]);
    world.housingIndex = Math.max(10, round2(world.housingIndex * (1 + burst / 100)));
    world.bubbleYears = 0;
    world.lastShock = 'housingBurst';
    messages.push({ text: `The housing bubble burst. Prices fell ${Math.abs(Math.round(burst))}% and took a lot of certainty with them.` });
  }
  return messages;
}

/** Equities track growth, fight rates, and crash when far above fundamentals. */
function stepMarket(world: WorldState, rng: Rng): WorldMessage[] {
  const messages: WorldMessage[] = [];

  world.marketFundamental = round2(world.marketFundamental * (1 + (world.growth + world.inflation) / 100));

  const change =
    MARKET.growthPull * world.growth +
    MARKET.ratePush * (world.interestRate - RATES.neutral) +
    rng.normal(0, MARKET.noise);
  world.marketIndex = Math.max(5, round2(world.marketIndex * (1 + change / 100)));

  const ratio = world.marketIndex / Math.max(1, world.marketFundamental);
  if (ratio > MARKET.overvaluedRatio && rng.chance(MARKET.crashChance)) {
    const crash = rng.float(MARKET.crashRange[0], MARKET.crashRange[1]);
    world.marketIndex = Math.max(5, round2(world.marketIndex * (1 + crash / 100)));
    world.lastShock = 'marketCrash';
    messages.push({ text: `The market crashed ${Math.abs(Math.round(crash))}%. Fortunes evaporated in an afternoon.` });
  }
  return messages;
}

/** Rare events that knock the world off its trend. */
function stepShocks(world: WorldState, rng: Rng): WorldMessage[] {
  const messages: WorldMessage[] = [];
  for (const shock of SHOCKS) {
    if (!rng.chance(shock.chance)) continue;
    switch (shock.id) {
      case 'breakthrough':
      case 'newIndustry':
        world.growth = round2(world.growth + rng.float(1, 3));
        world.marketIndex = round2(world.marketIndex * (1 + rng.float(4, 12) / 100));
        break;
      case 'disaster':
        world.growth = round2(world.growth - rng.float(1, 3));
        world.housingIndex = round2(world.housingIndex * (1 - rng.float(2, 8) / 100));
        break;
      case 'pandemic':
        world.growth = round2(world.growth - rng.float(3, 7));
        world.unemployment = round2(world.unemployment + rng.float(2, 6));
        break;
    }
    world.lastShock = shock.id;
    messages.push({ text: shock.headline });
  }
  return messages;
}

/** Elections nudge the tax rate toward the winning platform. */
function stepPolitics(world: WorldState, rng: Rng): WorldMessage[] {
  const messages: WorldMessage[] = [];
  world.yearsToElection--;
  if (world.yearsToElection > 0) return messages;

  world.yearsToElection = POLITICS.cycleYears;
  const target = rng.float(POLITICS.taxRange[0], POLITICS.taxRange[1]);
  const before = world.taxRate;
  world.taxRate = round2(world.taxRate + (target - world.taxRate) * POLITICS.taxShift);
  const delta = world.taxRate - before;
  const direction = delta > 1 ? 'raising' : delta < -1 ? 'cutting' : 'barely touching';
  messages.push({
    text: `An election swept in a new administration, ${direction} income tax to ${Math.round(world.taxRate)}%.`,
  });
  return messages;
}

/** One simulated year of the world. Call before player-facing systems tick. */
export function worldYearTick(world: WorldState, rng: Rng): WorldTickResult {
  world.lastShock = null;
  const messages: WorldMessage[] = [];

  messages.push(...stepPhase(world, rng));

  // Conditions are resampled from the (possibly new) phase each year.
  const profile = PHASES[world.phase];
  world.growth = round2(rng.float(profile.growth[0], profile.growth[1]));
  world.inflation = round2(rng.float(profile.inflation[0], profile.inflation[1]));
  world.unemployment = round2(rng.float(profile.unemployment[0], profile.unemployment[1]));

  messages.push(...stepShocks(world, rng));
  stepRates(world);
  world.priceLevel = round2(Math.max(0.05, world.priceLevel * (1 + world.inflation / 100)));
  messages.push(...stepHousing(world, rng));
  messages.push(...stepMarket(world, rng));
  messages.push(...stepPolitics(world, rng));

  return { messages };
}

// ---------------------------------------------------------------------------
// Selectors — how other systems read the world. Never inline these constants
// elsewhere; the whole point is that rates and prices move with the cycle.
// ---------------------------------------------------------------------------

export function mortgageRate(world: WorldState): number {
  return round2(Math.max(0.5, world.interestRate + SPREADS.mortgage));
}

export function personalLoanRate(world: WorldState): number {
  return round2(Math.max(1, world.interestRate + SPREADS.personalLoan));
}

export function creditCardRate(world: WorldState): number {
  return round2(Math.max(5, world.interestRate + SPREADS.creditCard));
}

export function savingsRate(world: WorldState): number {
  return round2(Math.max(0, world.interestRate + SPREADS.savings));
}

/**
 * How easy it is to get hired, 0-1ish. 1.0 at healthy unemployment (5%),
 * falling as the labour market tightens up.
 */
export function jobMarketFactor(world: WorldState): number {
  const healthy = 5;
  return round2(clamp(1 - (world.unemployment - healthy) * 0.08, 0.35, 1.25));
}

/** Nominal wage scaling since the start of the life. */
export function wageMultiplier(world: WorldState): number {
  return round2(world.priceLevel);
}

/** House price scaling since the start of the life. */
export function housingMultiplier(world: WorldState): number {
  return round2(world.housingIndex / INDEX_BASE);
}

/** This year's percentage return for an asset class, given the market move. */
export function assetReturn(world: WorldState, asset: AssetId, marketChangePct: number, rng: Rng): number {
  const profile = ASSETS[asset];
  return round2(profile.drift + profile.beta * marketChangePct + rng.normal(0, profile.noise));
}

/** Human-readable label for the current cycle phase. */
export function phaseLabel(world: WorldState): string {
  return PHASES[world.phase].label;
}
