/**
 * Travel — one trip a year, a passport that fills up across a life.
 *
 * A trip costs real money (scaled by inflation and by whether a partner
 * comes along), and pays back in happiness, a little health or smarts, a
 * skill nudge that fits the place, and a memory in the timeline. First
 * visits hit hardest; going back is lovely but familiar. Occasionally
 * something small goes wrong, because that is travel.
 *
 * Mutates `state` in place and returns plain results the monolith turns into
 * log lines. All randomness flows through the shared Rng.
 */
import type { GameState, Relationship } from './state';
import type { Rng } from './rng';
import { SKILL_MAX } from './skills';
import {
  DESTINATIONS,
  TRAVEL_MISHAPS,
  TRAVEL_REGIONS,
  destinationById,
  type Destination,
  type TravelMishap,
  type TravelRegionId,
} from '../data/travel';

export const MIN_TRAVEL_AGE = 18;
/** Below this health, the player is too unwell to fly. */
export const MIN_TRAVEL_HEALTH = 20;
/** A partner's ticket and share of the room. */
export const PARTNER_COST_MULTIPLIER = 1.8;
/** Share of first-visit happiness a repeat visit gives. */
export const REPEAT_VISIT_SHARE = 0.5;
export const MISHAP_CHANCE = 0.12;
export const PARTNER_CLOSENESS_GAIN = 10;
/** Older stamps roll off so a century of trips cannot bloat the save. */
export const STAMP_LIMIT = 80;
const COST_ROUNDING = 10;

export interface TravelStamp {
  destinationId: string;
  /** Player age when the trip happened. */
  age: number;
  /** Partner name if they came along. */
  companion: string | null;
}

export interface TravelState {
  stamps: TravelStamp[];
  /** Player age of the most recent trip; one trip per year. */
  lastTripAge: number;
}

export interface TripOptions {
  withPartner?: boolean;
  /** Cumulative inflation (1 = today's prices). */
  priceMultiplier?: number;
}

export interface TripAvailability {
  ok: boolean;
  reason?: string;
  cost: number;
}

export interface TripResult {
  ok: boolean;
  reason?: string;
  destination?: Destination;
  cost?: number;
  firstVisit?: boolean;
  newRegion?: boolean;
  companion?: string | null;
  /** The memory the trip left, ready for the timeline. */
  text?: string;
  /** Player stat deltas actually applied (post-clamp amounts are not tracked). */
  deltas?: [string, number][];
  skillGains?: Record<string, number>;
  mishap?: { text: string; deltas: [string, number][]; extraCost: number } | null;
}

export interface PassportSummary {
  trips: number;
  places: number;
  regions: TravelRegionId[];
  totalPlaces: number;
  totalRegions: number;
}

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isStamp(value: unknown): value is TravelStamp {
  if (!value || typeof value !== 'object') return false;
  const stamp = value as Partial<TravelStamp>;
  return typeof stamp.destinationId === 'string' && typeof stamp.age === 'number';
}

/** Normalize (or create) the travel state. Safe to call on every render. */
export function ensureTravel(state: GameState): TravelState {
  const raw = state.travel as Partial<TravelState> | null | undefined;
  if (!raw || typeof raw !== 'object') {
    const fresh: TravelState = { stamps: [], lastTripAge: -1 };
    state.travel = fresh;
    return fresh;
  }
  raw.stamps = Array.isArray(raw.stamps)
    ? raw.stamps
      .filter(isStamp)
      .filter((stamp) => destinationById(stamp.destinationId))
      .map((stamp) => ({ ...stamp, companion: typeof stamp.companion === 'string' ? stamp.companion : null }))
      .slice(-STAMP_LIMIT)
    : [];
  raw.lastTripAge = typeof raw.lastTripAge === 'number' ? raw.lastTripAge : -1;
  return raw as TravelState;
}

export function destinations(): readonly Destination[] {
  return DESTINATIONS;
}

/** The partner relationship, if the player has one. */
export function travelPartner(state: GameState): Relationship | null {
  if (!state.partner) return null;
  return (state.relationships || []).find(
    (rel) => rel.name === state.partner && (rel.type === 'Spouse' || rel.type === 'Partner'),
  ) ?? null;
}

export function tripCost(destination: Destination, options: TripOptions = {}): number {
  const inflation = options.priceMultiplier && options.priceMultiplier > 0 ? options.priceMultiplier : 1;
  const party = options.withPartner ? PARTNER_COST_MULTIPLIER : 1;
  return Math.round((destination.cost * inflation * party) / COST_ROUNDING) * COST_ROUNDING;
}

export function visitCount(state: GameState, destinationId: string): number {
  return ensureTravel(state).stamps.filter((stamp) => stamp.destinationId === destinationId).length;
}

export function visitedRegions(state: GameState): TravelRegionId[] {
  const seen = new Set<TravelRegionId>();
  for (const stamp of ensureTravel(state).stamps) {
    const destination = destinationById(stamp.destinationId);
    if (destination) seen.add(destination.region);
  }
  return TRAVEL_REGIONS.map((region) => region.id).filter((id) => seen.has(id));
}

export function placesVisited(state: GameState): number {
  return new Set(ensureTravel(state).stamps.map((stamp) => stamp.destinationId)).size;
}

export function passportSummary(state: GameState): PassportSummary {
  return {
    trips: ensureTravel(state).stamps.length,
    places: placesVisited(state),
    regions: visitedRegions(state),
    totalPlaces: DESTINATIONS.length,
    totalRegions: TRAVEL_REGIONS.length,
  };
}

export function hasTraveledThisYear(state: GameState): boolean {
  return ensureTravel(state).lastTripAge === state.age;
}

export function tripAvailability(
  state: GameState,
  destinationId: string,
  options: TripOptions = {},
): TripAvailability {
  const destination = destinationById(destinationId);
  if (!destination) return { ok: false, reason: 'Unknown destination.', cost: 0 };
  const cost = tripCost(destination, options);
  if (!state.alive) return { ok: false, reason: 'This life has ended.', cost };
  if (state.age < MIN_TRAVEL_AGE) return { ok: false, reason: `Age ${MIN_TRAVEL_AGE}+`, cost };
  if (hasTraveledThisYear(state)) return { ok: false, reason: 'Next year', cost };
  if ((state.health || 0) < MIN_TRAVEL_HEALTH) return { ok: false, reason: 'Too unwell', cost };
  if (options.withPartner && !travelPartner(state)) return { ok: false, reason: 'No partner', cost };
  if ((state.money || 0) < cost) return { ok: false, reason: 'Not enough cash', cost };
  return { ok: true, cost };
}

function fill(template: string, who: string, name: string): string {
  return template.split('{who}').join(who).split('{name}').join(name);
}

function applyStat(state: GameState, stat: 'health' | 'happiness' | 'smarts', amount: number): void {
  if (!amount) return;
  state[stat] = clamp100((state[stat] || 0) + amount);
}

function rollMishap(rng: Rng, cost: number): { mishap: TravelMishap; extraCost: number } | null {
  if (!rng.chance(MISHAP_CHANCE)) return null;
  const mishap = rng.pick(TRAVEL_MISHAPS);
  const extraCost = mishap.moneyShare ? Math.round((cost * mishap.moneyShare) / COST_ROUNDING) * COST_ROUNDING : 0;
  return { mishap, extraCost };
}

/** Take a trip. Validates, charges, applies effects, and stamps the passport. */
export function takeTrip(
  state: GameState,
  destinationId: string,
  options: TripOptions,
  rng: Rng,
): TripResult {
  const availability = tripAvailability(state, destinationId, options);
  if (!availability.ok) return { ok: false, reason: availability.reason };
  const destination = destinationById(destinationId)!;
  const travel = ensureTravel(state);
  const cost = availability.cost;

  const firstVisit = visitCount(state, destination.id) === 0;
  const newRegion = !visitedRegions(state).includes(destination.region);
  const partner = options.withPartner ? travelPartner(state) : null;
  const companion = partner ? String(partner.name) : null;

  state.money -= cost;

  const deltas: [string, number][] = [];
  const noveltyShare = firstVisit ? 1 : REPEAT_VISIT_SHARE;
  // Seeing a new corner of the world is its own small joy.
  const happiness = Math.max(1, Math.round(destination.happiness * noveltyShare)) + (newRegion ? 2 : 0) + (partner ? 1 : 0);
  applyStat(state, 'happiness', happiness);
  deltas.push(['happiness', happiness]);
  if (destination.health) {
    applyStat(state, 'health', destination.health);
    deltas.push(['health', destination.health]);
  }
  if (destination.smarts && firstVisit) {
    applyStat(state, 'smarts', destination.smarts);
    deltas.push(['smarts', destination.smarts]);
  }

  const skillGains: Record<string, number> = {};
  state.skills = state.skills || {};
  for (const [skill, amount] of Object.entries(destination.skills)) {
    const gain = firstVisit ? amount : Math.ceil(amount / 2);
    state.skills[skill] = Math.min(SKILL_MAX, (state.skills[skill] || 0) + gain);
    skillGains[skill] = gain;
  }

  if (partner) {
    partner.closeness = clamp100(((partner.closeness as number) ?? 50) + PARTNER_CLOSENESS_GAIN);
    deltas.push(['closeness', PARTNER_CLOSENESS_GAIN]);
  }

  const who = companion ? `${state.name} and ${companion}` : state.name;
  const text = fill(rng.pick(destination.moments), who, state.name);

  let mishap: TripResult['mishap'] = null;
  const rolled = rollMishap(rng, cost);
  if (rolled) {
    const mishapDeltas: [string, number][] = [];
    if (rolled.mishap.health) {
      applyStat(state, 'health', rolled.mishap.health);
      mishapDeltas.push(['health', rolled.mishap.health]);
    }
    if (rolled.mishap.happiness) {
      applyStat(state, 'happiness', rolled.mishap.happiness);
      mishapDeltas.push(['happiness', rolled.mishap.happiness]);
    }
    if (rolled.extraCost) state.money -= rolled.extraCost;
    mishap = { text: fill(rolled.mishap.text, who, state.name), deltas: mishapDeltas, extraCost: rolled.extraCost };
  }

  travel.stamps.push({ destinationId: destination.id, age: state.age, companion });
  if (travel.stamps.length > STAMP_LIMIT) travel.stamps.splice(0, travel.stamps.length - STAMP_LIMIT);
  travel.lastTripAge = state.age;

  return { ok: true, destination, cost, firstVisit, newRegion, companion, text, deltas, skillGains, mishap };
}
