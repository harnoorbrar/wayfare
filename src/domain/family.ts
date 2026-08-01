import type { GameState, Relationship } from './state';
import { Rng } from './rng';

export interface Pregnancy {
  partnerName: string;
  conceivedAge: number;
  dueAge: number;
  plannedName?: string;
}

export interface FamilyAvailability {
  ok: boolean;
  reason?: string;
  chance: number;
}

export interface BabyAttemptResult extends FamilyAvailability {
  conceived: boolean;
  message: string;
}

export interface BirthResult {
  born: boolean;
  message?: string;
  childName?: string;
}

const MIN_PARENT_AGE = 18;
const MAX_PARENT_AGE = 50;
const MAX_CHILDREN = 6;

function partnerRelationship(state: GameState): Relationship | undefined {
  const partnerName = typeof state.partner === 'string' ? state.partner : '';
  return state.relationships.find((relationship) =>
    relationship.name === partnerName &&
    (relationship.type === 'Partner' || relationship.type === 'Spouse'));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function conceptionChance(state: GameState): number {
  let ageChance = 0.42;
  if (state.age >= 45) ageChance = 0.06;
  else if (state.age >= 40) ageChance = 0.13;
  else if (state.age >= 35) ageChance = 0.24;
  else if (state.age >= 30) ageChance = 0.34;

  const relationship = partnerRelationship(state);
  const closeness = Number(relationship?.closeness ?? 50);
  const healthAdjustment = (state.health - 50) * 0.002;
  const relationshipAdjustment = (closeness - 50) * 0.001;
  return clamp(ageChance + healthAdjustment + relationshipAdjustment, 0.03, 0.58);
}

export function babyAttemptAvailability(state: GameState): FamilyAvailability {
  const chance = conceptionChance(state);
  if (!state.partner) return { ok: false, reason: 'You need a committed partner first.', chance };
  if (state.age < MIN_PARENT_AGE) return { ok: false, reason: 'Available from age 18.', chance };
  if (state.age > MAX_PARENT_AGE) return { ok: false, reason: 'This chapter has passed naturally.', chance };
  if (state.expectingBaby) return { ok: false, reason: 'A baby is already on the way.', chance };
  if (state.lastBabyAttemptAge === state.age) return { ok: false, reason: 'You already tried this year.', chance };
  if (state.children.length >= MAX_CHILDREN) return { ok: false, reason: 'Your household is already full.', chance };

  const relationship = partnerRelationship(state);
  if (relationship && Number(relationship.closeness ?? 0) < 50) {
    return { ok: false, reason: 'Grow closer before taking this step.', chance };
  }
  return { ok: true, chance };
}

export function tryForBaby(state: GameState, rng: Rng): BabyAttemptResult {
  const available = babyAttemptAvailability(state);
  if (!available.ok) {
    return {
      ...available,
      conceived: false,
      message: available.reason || 'You cannot try for a baby right now.',
    };
  }

  state.lastBabyAttemptAge = state.age;
  const relationship = partnerRelationship(state);
  if (relationship) {
    relationship.closeness = clamp(Number(relationship.closeness ?? 50) + 2, 0, 100);
    relationship.trust = clamp(Number(relationship.trust ?? 50) + 1, 0, 100);
    relationship.lastInteractedAge = state.age;
  }

  const partnerName = String(state.partner);
  const conceived = rng.next() < available.chance;
  if (conceived) {
    state.expectingBaby = {
      partnerName,
      conceivedAge: state.age,
      dueAge: state.age + 1,
    };
    state.happiness = clamp(state.happiness + 6, 0, 100);
    return {
      ...available,
      conceived: true,
      message: `${state.name} and ${partnerName} are expecting a baby.`,
    };
  }

  state.happiness = clamp(state.happiness + 1, 0, 100);
  return {
    ...available,
    conceived: false,
    message: `${state.name} and ${partnerName} tried for a baby. It did not happen this year, but they still have hope.`,
  };
}

export function completePregnancy(state: GameState, childName: string): BirthResult {
  const pregnancy = state.expectingBaby;
  if (!pregnancy || state.age < pregnancy.dueAge) return { born: false };

  const relId = state.nextRelId++;
  state.children.push({ name: childName, age: 0, relId });
  state.relationships.push({
    id: relId,
    name: childName,
    type: 'Child',
    age: 0,
    closeness: 90,
    trust: 80,
    lastInteractedAge: state.age,
  });
  state.expectingBaby = null;
  state.happiness = clamp(state.happiness + 8, 0, 100);
  return {
    born: true,
    childName,
    message: `${state.name} and ${pregnancy.partnerName} welcomed ${childName} into the family.`,
  };
}
