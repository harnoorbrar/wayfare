/**
 * The Bucket List — five dreams, drawn once when a life reaches adulthood.
 *
 * Dreams are checked against the life as it is lived; nothing is ticked off
 * by hand. Each one fulfilled lifts happiness, and finishing the whole list
 * is its own reward. Dreams already true when the list is drawn are never
 * offered (a gift is not a dream). One dream per life can be swapped for a
 * different one, because people change their minds.
 *
 * Mutates `state` in place and returns plain results; randomness flows
 * through the shared Rng.
 */
import type { GameState } from './state';
import type { Rng } from './rng';
import { placesVisited, visitCount, visitedRegions, ensureTravel } from './travel';

export const BUCKET_LIST_AGE = 18;
export const BUCKET_LIST_SIZE = 5;
/** Keeps the list a life, not a travel itinerary. */
export const MAX_TRAVEL_DREAMS = 2;
export const DREAM_REWARD = 6;
export const COMPLETE_LIST_BONUS = 10;

export type DreamKind = 'travel' | 'life' | 'mastery';

export interface DreamDefinition {
  id: string;
  icon: string;
  label: string;
  kind: DreamKind;
  /** Where the player goes to chase it. */
  tab: string;
  achieved(state: GameState): boolean;
}

export interface DreamEntry {
  id: string;
  /** Player age when fulfilled, or null while still a dream. */
  doneAge: number | null;
}

export interface BucketListState {
  dreams: DreamEntry[];
  swapUsed: boolean;
}

export interface DreamView {
  definition: DreamDefinition;
  doneAge: number | null;
}

export interface BucketListSnapshot {
  dreams: DreamView[];
  done: number;
  total: number;
  canSwap: boolean;
}

export interface DreamFulfilled {
  definition: DreamDefinition;
  happiness: number;
}

export interface ClaimResult {
  fulfilled: DreamFulfilled[];
  /** True on the year the final dream is fulfilled. */
  listComplete: boolean;
  bonus: number;
}

function skill(state: GameState, id: string): number {
  const value = (state.skills || {})[id];
  return typeof value === 'number' ? value : 0;
}

function liquidWealth(state: GameState): number {
  const investments = Object.values(state.investments || {}).reduce(
    (sum, value) => sum + (typeof value === 'number' ? value : 0),
    0,
  );
  return (state.money || 0) + (state.savings || 0) + investments;
}

function visited(id: string) {
  return (state: GameState) => visitCount(state, id) > 0;
}

export const DREAMS: readonly DreamDefinition[] = [
  // ---- Travel ----
  { id: 'aurora', icon: '🌌', label: 'See the northern lights in Iceland', kind: 'travel', tab: 'travel', achieved: visited('reykjavik') },
  { id: 'pyramids', icon: '🔺', label: 'Stand before the Great Pyramid', kind: 'travel', tab: 'travel', achieved: visited('cairo') },
  { id: 'machu_picchu', icon: '⛰', label: 'Watch the sun rise over Machu Picchu', kind: 'travel', tab: 'travel', achieved: visited('cusco') },
  { id: 'kyoto', icon: '⛩', label: 'Walk the torii gates of Kyoto', kind: 'travel', tab: 'travel', achieved: visited('kyoto') },
  { id: 'three_regions', icon: '🧭', label: 'Travel to three corners of the world', kind: 'travel', tab: 'travel', achieved: (s) => visitedRegions(s).length >= 3 },
  { id: 'together', icon: '✈', label: 'Travel abroad with the one you love', kind: 'travel', tab: 'travel', achieved: (s) => ensureTravel(s).stamps.some((stamp) => stamp.companion) },
  { id: 'wanderlust', icon: '🗺', label: 'Collect six passport stamps', kind: 'travel', tab: 'travel', achieved: (s) => placesVisited(s) >= 6 },
  // ---- Life ----
  { id: 'own_home', icon: '🏡', label: 'Own a home outright', kind: 'life', tab: 'home', achieved: (s) => s.ownership === 'owned' },
  { id: 'married', icon: '💍', label: 'Marry someone wonderful', kind: 'life', tab: 'people', achieved: (s) => (s.relationships || []).some((rel) => rel.type === 'Spouse') },
  { id: 'parent', icon: '🍼', label: 'Raise a child', kind: 'life', tab: 'people', achieved: (s) => (s.children || []).length > 0 },
  { id: 'forever_home', icon: '🐾', label: 'Give an animal a forever home', kind: 'life', tab: 'people', achieved: (s) => (s.pets || []).length + (s.petMemorial || []).length > 0 },
  { id: 'founder', icon: '🚀', label: 'Start a business of your own', kind: 'life', tab: 'business', achieved: (s) => (s.businesses || []).length > 0 },
  { id: 'nest_egg', icon: '🪺', label: 'Build a $100,000 nest egg', kind: 'life', tab: 'bank', achieved: (s) => liquidWealth(s) >= 100_000 },
  { id: 'graduate', icon: '🎓', label: 'Earn a university degree', kind: 'life', tab: 'education', achieved: (s) => (s.degrees || []).some((degree) => degree !== 'hs') },
  // ---- Mastery ----
  { id: 'marathon', icon: '🏃', label: 'Get fit enough to run a marathon', kind: 'mastery', tab: 'activities', achieved: (s) => skill(s, 'fitness') >= 60 },
  { id: 'chef', icon: '🍳', label: 'Cook like a professional', kind: 'mastery', tab: 'activities', achieved: (s) => skill(s, 'cooking') >= 60 },
  { id: 'artist', icon: '🎨', label: 'Make art you are truly proud of', kind: 'mastery', tab: 'activities', achieved: (s) => skill(s, 'creativity') >= 60 },
  { id: 'sharp_mind', icon: '🧠', label: 'Become the sharpest mind in the room', kind: 'mastery', tab: 'education', achieved: (s) => (s.smarts || 0) >= 85 },
  { id: 'see_eighty', icon: '🕰', label: 'Live to see 80', kind: 'mastery', tab: 'story', achieved: (s) => s.age >= 80 },
] as const;

export function dreamById(id: string): DreamDefinition | undefined {
  return DREAMS.find((dream) => dream.id === id);
}

function isEntry(value: unknown): value is DreamEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<DreamEntry>;
  return typeof entry.id === 'string' && Boolean(dreamById(entry.id));
}

/** Read the list without creating one. Null before adulthood or before it is drawn. */
export function readBucketList(state: GameState): BucketListState | null {
  const raw = state.bucketList as Partial<BucketListState> | null | undefined;
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.dreams)) return null;
  raw.dreams = raw.dreams
    .filter(isEntry)
    .map((entry) => ({ id: entry.id, doneAge: typeof entry.doneAge === 'number' ? entry.doneAge : null }));
  raw.swapUsed = Boolean(raw.swapUsed);
  return raw as BucketListState;
}

function candidates(state: GameState, exclude: ReadonlySet<string>, travelSlots: number): DreamDefinition[] {
  return DREAMS.filter((dream) =>
    !exclude.has(dream.id)
    && !dream.achieved(state)
    && (dream.kind !== 'travel' || travelSlots > 0));
}

function drawList(state: GameState, rng: Rng): DreamEntry[] {
  const chosen: DreamDefinition[] = [];
  const taken = new Set<string>();
  // Travel is 1.9's headline, so every list starts with one travel dream.
  const openingTravel = candidates(state, taken, MAX_TRAVEL_DREAMS).filter((dream) => dream.kind === 'travel');
  if (openingTravel.length) {
    const first = rng.pick(openingTravel);
    chosen.push(first);
    taken.add(first.id);
  }
  while (chosen.length < BUCKET_LIST_SIZE) {
    const travelSlots = MAX_TRAVEL_DREAMS - chosen.filter((dream) => dream.kind === 'travel').length;
    const pool = candidates(state, taken, travelSlots);
    if (!pool.length) break;
    const next = rng.pick(pool);
    chosen.push(next);
    taken.add(next.id);
  }
  return chosen.map((dream) => ({ id: dream.id, doneAge: null }));
}

/**
 * Draw the list once the player is an adult. Idempotent. Returns null for
 * children. Existing adult saves get a list on their next call.
 */
export function ensureBucketList(state: GameState, rng: Rng): BucketListState | null {
  if (state.age < BUCKET_LIST_AGE) return null;
  const existing = readBucketList(state);
  if (existing && existing.dreams.length) return existing;
  const fresh: BucketListState = { dreams: drawList(state, rng), swapUsed: false };
  state.bucketList = fresh;
  return fresh;
}

export function bucketListSnapshot(state: GameState): BucketListSnapshot | null {
  const list = readBucketList(state);
  if (!list || !list.dreams.length) return null;
  const dreams = list.dreams.map((entry) => ({ definition: dreamById(entry.id)!, doneAge: entry.doneAge }));
  const done = dreams.filter((dream) => dream.doneAge !== null).length;
  return {
    dreams,
    done,
    total: dreams.length,
    canSwap: !list.swapUsed && done < dreams.length,
  };
}

/** Fulfil every dream the life now satisfies. Call after anything that could complete one. */
export function claimDreams(state: GameState): ClaimResult {
  const list = readBucketList(state);
  const result: ClaimResult = { fulfilled: [], listComplete: false, bonus: 0 };
  if (!list || !list.dreams.length) return result;
  const wasComplete = list.dreams.every((entry) => entry.doneAge !== null);
  for (const entry of list.dreams) {
    if (entry.doneAge !== null) continue;
    const definition = dreamById(entry.id)!;
    if (!definition.achieved(state)) continue;
    entry.doneAge = state.age;
    state.happiness = Math.max(0, Math.min(100, (state.happiness || 0) + DREAM_REWARD));
    result.fulfilled.push({ definition, happiness: DREAM_REWARD });
  }
  if (!wasComplete && list.dreams.every((entry) => entry.doneAge !== null)) {
    result.listComplete = true;
    result.bonus = COMPLETE_LIST_BONUS;
    state.happiness = Math.max(0, Math.min(100, (state.happiness || 0) + COMPLETE_LIST_BONUS));
  }
  return result;
}

/** Trade one unfulfilled dream for a different one. Once per life. */
export function swapDream(
  state: GameState,
  dreamId: string,
  rng: Rng,
): { ok: boolean; reason?: string; replacement?: DreamDefinition } {
  const list = readBucketList(state);
  if (!list) return { ok: false, reason: 'No bucket list yet.' };
  if (list.swapUsed) return { ok: false, reason: 'You have already changed your mind once this life.' };
  const index = list.dreams.findIndex((entry) => entry.id === dreamId);
  if (index < 0) return { ok: false, reason: 'That dream is not on your list.' };
  if (list.dreams[index].doneAge !== null) return { ok: false, reason: 'That dream already came true.' };
  const taken = new Set(list.dreams.map((entry) => entry.id));
  const travelElsewhere = list.dreams.filter((entry, i) => i !== index && dreamById(entry.id)?.kind === 'travel').length;
  const pool = candidates(state, taken, MAX_TRAVEL_DREAMS - travelElsewhere);
  if (!pool.length) return { ok: false, reason: 'No other dreams left to chase.' };
  const replacement = rng.pick(pool);
  list.dreams[index] = { id: replacement.id, doneAge: null };
  list.swapUsed = true;
  return { ok: true, replacement };
}
