/**
 * Companions — the pet system.
 *
 * A companion is a named, trait-driven animal with a bond that grows through
 * deliberate care and fades through neglect. The bond scales the yearly
 * happiness the companion gives, softens or sharpens the grief when they
 * pass, and is remembered on the memorial afterwards.
 *
 * Everything here mutates `state` in place (the monolith owns rendering and
 * the feed) and returns plain results the UI turns into log lines. Random
 * decisions flow through the shared Rng so a life replays deterministically.
 */
import type { GameState } from './state';
import type { Rng } from './rng';
import { PET_SPECIES, SHARED_PET_NAMES, isDogSpecies, speciesById, type PetSpecies } from '../data/pets';

export type PetCareActionId = 'play' | 'walk' | 'train' | 'treat' | 'vet';
export type PetTraitId = 'cuddly' | 'mischievous' | 'lazy' | 'brave' | 'clever' | 'dramatic';
export type PetLifeStage = 'young' | 'adult' | 'senior';

export interface PetTrait {
  id: PetTraitId;
  label: string;
  icon: string;
  blurb: string;
  /** The care action this personality responds to most (bond bonus). */
  loves: PetCareActionId;
}

export interface PetCareAction {
  id: PetCareActionId;
  label: string;
  icon: string;
  description: string;
  bond: number;
  /** Player stat deltas applied when the action is performed. */
  statDeltas: Partial<Record<'health' | 'happiness' | 'smarts', number>>;
  /** Cost as a fraction of the species' yearly upkeep, plus a flat floor. */
  costRate: number;
  costFloor: number;
}

export interface Pet {
  id: number;
  name: string;
  typeId: string;
  age: number;
  maxAge: number;
  trait: PetTraitId;
  /** 0-100. Starts modest and is earned. */
  bond: number;
  /** Player age at adoption; used for "years together". */
  adoptedAge: number;
  /** Player-typed name (not a suggestion) — celebrated by an achievement. */
  customNamed: boolean;
  /** Care performed during the current player year. */
  care: { age: number; done: PetCareActionId[] };
  tricks: number;
  lastVetAge: number;
  /** Extra years granted by senior vet care; capped so pets still pass on. */
  bonusYears: number;
}

export interface PetMemorial {
  name: string;
  typeId: string;
  trait: PetTraitId;
  years: number;
  bond: number;
  /** Player age when the companion passed. */
  passedAge: number;
  cause: 'old_age' | 'too_soon';
}

export interface PetTickMessage {
  text: string;
  deltas: [string, number][];
}

export interface PetTickResult {
  messages: PetTickMessage[];
  passed: PetMemorial[];
  /** True when a companion passed after a full, well-bonded life. */
  fullLife: boolean;
}

export interface CareAvailability {
  ok: boolean;
  reason?: string;
  cost: number;
}

export interface CareResult {
  ok: boolean;
  reason?: string;
  pet?: Pet;
  action?: PetCareAction;
  bondDelta?: number;
  loved?: boolean;
  cost?: number;
  statDeltas?: PetCareAction['statDeltas'];
  text?: string;
}

export const MAX_PET_NAME_LENGTH = 20;
export const MEMORIAL_LIMIT = 24;
export const STARTING_BOND = 30;
export const WELL_TRAINED_TRICKS = 3;
const BOND_NEGLECT_DECAY = 6;
const BOND_LAZY_NEGLECT_DECAY = 3;
const BOND_STEADY_GROWTH = 2;
const LOVED_ACTION_MULTIPLIER = 1.5;
const MAX_BONUS_YEARS = 2;
const SENIOR_STAGE_RATIO = 0.75;
const YOUNG_STAGE_RATIO = 0.2;

export const PET_TRAITS: readonly PetTrait[] = [
  { id: 'cuddly', label: 'Cuddly', icon: '🫶', blurb: 'Would live in your lap if allowed.', loves: 'play' },
  { id: 'mischievous', label: 'Mischievous', icon: '😼', blurb: 'If it can be knocked over, it will be.', loves: 'walk' },
  { id: 'lazy', label: 'Lazy', icon: '😴', blurb: 'Naps professionally. Snacks competitively.', loves: 'treat' },
  { id: 'brave', label: 'Brave', icon: '🛡', blurb: 'Fears nothing except the vacuum.', loves: 'walk' },
  { id: 'clever', label: 'Clever', icon: '💡', blurb: 'Learns fast and remembers where the treats live.', loves: 'train' },
  { id: 'dramatic', label: 'Dramatic', icon: '🎭', blurb: 'Every minor inconvenience is a full production.', loves: 'vet' },
];

export const PET_CARE_ACTIONS: readonly PetCareAction[] = [
  {
    id: 'play', label: 'Play', icon: '🎾', description: 'An afternoon of undivided attention.',
    bond: 8, statDeltas: { happiness: 2 }, costRate: 0, costFloor: 0,
  },
  {
    id: 'walk', label: 'Walk', icon: '🌳', description: 'Fresh air for both of you.',
    bond: 8, statDeltas: { happiness: 1, health: 1 }, costRate: 0, costFloor: 0,
  },
  {
    id: 'train', label: 'Train', icon: '🎓', description: 'Patience, repetition, and a new trick.',
    bond: 6, statDeltas: { happiness: 1 }, costRate: 0.04, costFloor: 10,
  },
  {
    id: 'treat', label: 'Treat', icon: '🍖', description: 'Something special from the good shelf.',
    bond: 10, statDeltas: { happiness: 1 }, costRate: 0.06, costFloor: 5,
  },
  {
    id: 'vet', label: 'Vet Visit', icon: '🩺', description: 'A checkup that catches trouble early and helps seniors stay longer.',
    bond: 3, statDeltas: {}, costRate: 0.25, costFloor: 40,
  },
];

export const species = PET_SPECIES;
export { speciesById, isDogSpecies };

export function traitById(id: string): PetTrait | undefined {
  return PET_TRAITS.find((trait) => trait.id === id);
}

export function careActionById(id: string): PetCareAction | undefined {
  return PET_CARE_ACTIONS.find((action) => action.id === id);
}

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampBond(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Care actions a species can physically do. */
export function actionSupported(speciesDef: PetSpecies, actionId: PetCareActionId): boolean {
  if (actionId === 'walk') return speciesDef.energy !== 'low';
  if (actionId === 'train') return speciesDef.trainable;
  return true;
}

/** Traits are drawn only from those whose loved action the species can do. */
export function traitsForSpecies(speciesDef: PetSpecies): PetTrait[] {
  return PET_TRAITS.filter((trait) => actionSupported(speciesDef, trait.loves));
}

/**
 * Normalize a typed name: trim, collapse whitespace, strip anything that is
 * not a letter, digit, space, apostrophe, hyphen or period, and cap length.
 * Falls back when nothing usable remains.
 */
export function cleanPetName(input: unknown, fallback: string): string {
  const raw = typeof input === 'string' ? input : '';
  const cleaned = raw
    .replace(/[^\p{L}\p{N} '\-.]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_PET_NAME_LENGTH)
    .trim();
  return cleaned.length ? cleaned : fallback;
}

/** A shuffled handful of names: species-flavoured first, shared pool after. */
export function suggestNames(speciesId: string, rng: Rng, count = 4): string[] {
  const speciesDef = speciesById(speciesId);
  const pool = [...(speciesDef?.names ?? []), ...SHARED_PET_NAMES];
  const picked: string[] = [];
  const remaining = [...pool];
  while (picked.length < count && remaining.length) {
    const index = rng.int(0, remaining.length - 1);
    const [name] = remaining.splice(index, 1);
    if (!picked.includes(name)) picked.push(name);
  }
  return picked;
}

export function isSuggestedName(speciesId: string, name: string): boolean {
  const speciesDef = speciesById(speciesId);
  const pool = [...(speciesDef?.names ?? []), ...SHARED_PET_NAMES];
  return pool.some((candidate) => candidate.toLowerCase() === name.toLowerCase());
}

function nextPetId(state: GameState): number {
  const pets = Array.isArray(state.pets) ? (state.pets as Partial<Pet>[]) : [];
  const highest = pets.reduce((max, pet) => Math.max(max, typeof pet.id === 'number' ? pet.id : 0), 0);
  return highest + 1;
}

/**
 * Backfill companion fields on saves from before the bond system. Existing
 * pets are treated as established household members: a mid-range bond, a
 * personality drawn now, and no care recorded yet this year.
 */
export function ensurePets(state: GameState, rng: Rng): Pet[] {
  if (!Array.isArray(state.pets)) state.pets = [];
  const pets = state.pets as Partial<Pet>[];
  let nextId = nextPetId(state);
  for (const pet of pets) {
    if (typeof pet.id !== 'number') pet.id = nextId++;
    if (typeof pet.name !== 'string' || !pet.name.trim()) pet.name = 'Companion';
    if (typeof pet.age !== 'number') pet.age = 0;
    const speciesDef = speciesById(String(pet.typeId));
    if (typeof pet.maxAge !== 'number') pet.maxAge = speciesDef ? speciesDef.lifespan : 5;
    if (!traitById(String(pet.trait))) {
      const options = speciesDef ? traitsForSpecies(speciesDef) : PET_TRAITS.slice();
      pet.trait = rng.pick(options.length ? options : PET_TRAITS).id;
    }
    if (typeof pet.bond !== 'number') pet.bond = 45;
    if (typeof pet.adoptedAge !== 'number') pet.adoptedAge = Math.max(0, state.age - pet.age);
    if (typeof pet.customNamed !== 'boolean') pet.customNamed = false;
    if (!pet.care || typeof pet.care !== 'object' || typeof pet.care.age !== 'number' || !Array.isArray(pet.care.done)) {
      pet.care = { age: state.age, done: [] };
    }
    if (typeof pet.tricks !== 'number') pet.tricks = 0;
    if (typeof pet.lastVetAge !== 'number') pet.lastVetAge = -1;
    if (typeof pet.bonusYears !== 'number') pet.bonusYears = 0;
  }
  if (!Array.isArray(state.petMemorial)) state.petMemorial = [];
  return state.pets as Pet[];
}

export function memorial(state: GameState): PetMemorial[] {
  if (!Array.isArray(state.petMemorial)) state.petMemorial = [];
  return state.petMemorial as PetMemorial[];
}

export function petById(state: GameState, id: number): Pet | undefined {
  return (Array.isArray(state.pets) ? (state.pets as Pet[]) : []).find((pet) => pet.id === id);
}

export interface AdoptResult {
  ok: boolean;
  reason?: string;
  pet?: Pet;
  happiness?: number;
}

/**
 * Bring a companion home. Plus gating is the UI's job (it owns the paywall);
 * everything simulation-relevant — money, name, personality — is decided here.
 */
export function adopt(state: GameState, speciesId: string, requestedName: unknown, rng: Rng): AdoptResult {
  const speciesDef = speciesById(speciesId);
  if (!speciesDef) return { ok: false, reason: 'That companion is not available.' };
  if (state.money < speciesDef.cost) return { ok: false, reason: 'Not enough cash for the adoption fee.' };
  ensurePets(state, rng);
  const fallback = rng.pick(speciesDef.names);
  const name = cleanPetName(requestedName, fallback);
  const pet: Pet = {
    id: nextPetId(state),
    name,
    typeId: speciesDef.id,
    age: 0,
    maxAge: Math.max(1, speciesDef.lifespan + rng.int(-2, 3)),
    trait: rng.pick(traitsForSpecies(speciesDef)).id,
    bond: STARTING_BOND,
    adoptedAge: state.age,
    customNamed: !isSuggestedName(speciesDef.id, name),
    care: { age: state.age, done: [] },
    tricks: 0,
    lastVetAge: -1,
    bonusYears: 0,
  };
  state.money -= speciesDef.cost;
  const happiness = rng.int(4, 8);
  state.happiness = clamp100(state.happiness + happiness);
  (state.pets as Pet[]).push(pet);
  return { ok: true, pet, happiness };
}

export interface RenameResult {
  ok: boolean;
  reason?: string;
  pet?: Pet;
  previous?: string;
}

export function rename(state: GameState, petId: number, requestedName: unknown): RenameResult {
  const pet = petById(state, petId);
  if (!pet) return { ok: false, reason: 'That companion is no longer here.' };
  const name = cleanPetName(requestedName, '');
  if (!name) return { ok: false, reason: 'A name needs at least one letter.' };
  if (name === pet.name) return { ok: false, reason: 'That is already their name.' };
  const previous = pet.name;
  pet.name = name;
  pet.customNamed = pet.customNamed || !isSuggestedName(pet.typeId, name);
  return { ok: true, pet, previous };
}

export function lifeStage(pet: Pet): PetLifeStage {
  const speciesDef = speciesById(pet.typeId);
  const lifespan = Math.max(1, speciesDef ? speciesDef.lifespan : pet.maxAge);
  if (pet.age >= lifespan * SENIOR_STAGE_RATIO) return 'senior';
  if (pet.age < Math.max(1, lifespan * YOUNG_STAGE_RATIO)) return 'young';
  return 'adult';
}

export function lifeStageLabel(stage: PetLifeStage): string {
  return stage === 'young' ? 'Young' : stage === 'senior' ? 'Senior' : 'Adult';
}

export interface BondTier {
  id: 'new' | 'warming' | 'close' | 'devoted' | 'soulmates';
  label: string;
  min: number;
}

export const BOND_TIERS: readonly BondTier[] = [
  { id: 'new', label: 'Getting acquainted', min: 0 },
  { id: 'warming', label: 'Warming up', min: 25 },
  { id: 'close', label: 'Close', min: 50 },
  { id: 'devoted', label: 'Devoted', min: 75 },
  { id: 'soulmates', label: 'Soulmates', min: 100 },
];

export function bondTier(bond: number): BondTier {
  let tier = BOND_TIERS[0];
  for (const candidate of BOND_TIERS) if (bond >= candidate.min) tier = candidate;
  return tier;
}

/** Yearly happiness the companion gives, scaled by the bond (0.6x → 1.4x). */
export function yearlyHappiness(pet: Pet, speciesDef: PetSpecies): number {
  const multiplier = 0.6 + (clampBond(pet.bond) / 100) * 0.8;
  return Math.max(speciesDef.happy > 0 ? 1 : 0, Math.round(speciesDef.happy * multiplier));
}

export function careCost(speciesDef: PetSpecies, action: PetCareAction): number {
  if (action.costRate <= 0) return 0;
  return Math.max(action.costFloor, Math.round((speciesDef.upkeep * action.costRate) / 5) * 5);
}

function currentCare(state: GameState, pet: Pet): Pet['care'] {
  if (!pet.care || pet.care.age !== state.age) pet.care = { age: state.age, done: [] };
  return pet.care;
}

export function careAvailability(state: GameState, pet: Pet, actionId: PetCareActionId): CareAvailability {
  const speciesDef = speciesById(pet.typeId);
  const action = careActionById(actionId);
  if (!speciesDef || !action) return { ok: false, reason: 'Unavailable', cost: 0 };
  const cost = careCost(speciesDef, action);
  if (!actionSupported(speciesDef, actionId)) {
    return { ok: false, reason: actionId === 'walk' ? 'Not a walker' : 'Not trainable', cost };
  }
  if (currentCare(state, pet).done.includes(actionId)) return { ok: false, reason: 'Done this year', cost };
  if (cost > 0 && state.money < cost) return { ok: false, reason: 'Not enough cash', cost };
  return { ok: true, cost };
}

const CARE_TEXT: Record<PetCareActionId, (name: string, loved: boolean) => string> = {
  play: (name, loved) => loved
    ? `${name} lit up the second the toys came out. That was the whole afternoon, gone.`
    : `${name} and you wore each other out. Time well wasted.`,
  walk: (name, loved) => loved
    ? `${name} found every new smell in the neighbourhood and came home glowing.`
    : `A long walk with ${name}. Fresh air for both of you.`,
  train: (name, loved) => loved
    ? `${name} picked up a new trick in minutes and looked insufferably pleased.`
    : `${name} learned a new trick. It took patience. Mostly yours.`,
  treat: (name, loved) => loved
    ? `${name} heard the treat bag from three rooms away. Devotion, purchased.`
    : `Something from the good shelf for ${name}. Approved instantly.`,
  vet: (name, loved) => loved
    ? `${name} milked the vet visit for every ounce of sympathy. Clean bill of health.`
    : `A checkup for ${name}. All clear, and the vet says you're doing well by them.`,
};

/** Perform one care action. Each action is available once per pet per year. */
export function care(state: GameState, petId: number, actionId: PetCareActionId): CareResult {
  const pet = petById(state, petId);
  if (!pet) return { ok: false, reason: 'That companion is no longer here.' };
  const availability = careAvailability(state, pet, actionId);
  if (!availability.ok) return { ok: false, reason: availability.reason };
  const action = careActionById(actionId)!;
  const trait = traitById(pet.trait);
  const loved = Boolean(trait && trait.loves === actionId);
  const bondDelta = Math.round(action.bond * (loved ? LOVED_ACTION_MULTIPLIER : 1));

  state.money -= availability.cost;
  pet.bond = clampBond(pet.bond + bondDelta);
  const statDeltas: PetCareAction['statDeltas'] = { ...action.statDeltas };
  if (loved) statDeltas.happiness = (statDeltas.happiness || 0) + 1;
  for (const [stat, amount] of Object.entries(statDeltas)) {
    const key = stat as 'health' | 'happiness' | 'smarts';
    state[key] = clamp100((state[key] || 0) + (amount || 0));
  }
  if (actionId === 'train') pet.tricks += 1;
  if (actionId === 'vet') pet.lastVetAge = state.age;
  currentCare(state, pet).done.push(actionId);

  return {
    ok: true, pet, action, bondDelta, loved, cost: availability.cost, statDeltas,
    text: CARE_TEXT[actionId](pet.name, loved),
  };
}

function caredLastYear(state: GameState, pet: Pet): boolean {
  return Boolean(pet.care && pet.care.age === state.age - 1 && pet.care.done.length > 0);
}

function rememberPet(state: GameState, pet: Pet, cause: PetMemorial['cause']): PetMemorial {
  const entry: PetMemorial = {
    name: pet.name,
    typeId: pet.typeId,
    trait: pet.trait,
    years: Math.max(0, pet.age),
    bond: pet.bond,
    passedAge: state.age,
    cause,
  };
  const list = memorial(state);
  list.unshift(entry);
  if (list.length > MEMORIAL_LIMIT) list.length = MEMORIAL_LIMIT;
  return entry;
}

/**
 * One year for every companion: ageing, upkeep, bond drift, the happiness
 * they give, and — eventually — goodbyes. Runs after `state.age` has already
 * advanced, so "last year" is `state.age - 1`.
 */
export function petsYearTick(state: GameState, rng: Rng): PetTickResult {
  const result: PetTickResult = { messages: [], passed: [], fullLife: false };
  const pets = ensurePets(state, rng);
  if (!pets.length) return result;
  const survivors: Pet[] = [];

  for (const pet of pets) {
    const speciesDef = speciesById(pet.typeId);
    if (!speciesDef) continue; // unknown species from a future save — drop quietly
    const trait = traitById(pet.trait);
    pet.age += 1;

    if (caredLastYear(state, pet)) {
      pet.bond = clampBond(pet.bond + BOND_STEADY_GROWTH);
    } else {
      pet.bond = clampBond(pet.bond - (trait?.id === 'lazy' ? BOND_LAZY_NEGLECT_DECAY : BOND_NEGLECT_DECAY));
    }

    const joy = yearlyHappiness(pet, speciesDef);
    state.happiness = clamp100(state.happiness + joy);
    state.money -= speciesDef.upkeep;
    if (speciesDef.health) state.health = clamp100(state.health + speciesDef.health);
    if (speciesDef.smarts) state.smarts = clamp100(state.smarts + speciesDef.smarts);

    if (pet.age >= pet.maxAge) {
      const seniorCare = pet.lastVetAge === state.age - 1 && pet.bonusYears < MAX_BONUS_YEARS;
      if (seniorCare && rng.chance(0.6)) {
        pet.maxAge += 1;
        pet.bonusYears += 1;
        survivors.push(pet);
        result.messages.push({
          text: `${pet.name} had a scare this year, but the vet caught it early. ${speciesDef.icon} One more year, at least.`,
          deltas: [['happiness', 2]],
        });
        state.happiness = clamp100(state.happiness + 2);
        continue;
      }
      const oldAge = pet.maxAge >= speciesDef.lifespan;
      const grief = 3 + Math.round(pet.bond / 12);
      state.happiness = clamp100(state.happiness - grief);
      const entry = rememberPet(state, pet, oldAge ? 'old_age' : 'too_soon');
      result.passed.push(entry);
      if (oldAge && pet.bond >= 50) result.fullLife = true;
      const years = pet.age === 1 ? 'a year' : `${pet.age} years`;
      result.messages.push({
        text: `${pet.name} the ${speciesDef.name.toLowerCase()} ${oldAge ? 'passed peacefully after a long, good life' : 'passed away too soon'}. ${speciesDef.icon} ${years} together. Goodbye, ${pet.name}.`,
        deltas: [['happiness', -grief]],
      });
      continue;
    }
    survivors.push(pet);
  }

  state.pets = survivors;
  return result;
}

/** Player-facing summary for the Life tab tile. */
export function companionSummary(state: GameState): { count: number; closest: Pet | null } {
  const pets = Array.isArray(state.pets) ? (state.pets as Pet[]) : [];
  const closest = pets.reduce<Pet | null>((best, pet) => (!best || (pet.bond || 0) > (best.bond || 0) ? pet : best), null);
  return { count: pets.length, closest };
}
