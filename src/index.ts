/**
 * WayfareCore — the typed domain layer, exposed as a single global (IIFE
 * bundle at js/core.js) that the legacy index.html script consumes while the
 * strangler migration is in progress. New systems live here; the monolith
 * shrinks release by release.
 */
import { Rng } from './domain/rng';
import {
  persistSave as persistEnvelope,
  restoreSave as restoreEnvelope,
  clearSave,
  CURRENT_SAVE_VERSION,
} from './domain/save';
import {
  careerYearTick as careerTickImpl,
  eligibilityGap,
  legacyJobList,
  levelById,
  nextLevel,
  trackOf,
} from './domain/careers';
import { SKILLS, skillName } from './domain/skills';
import {
  applyInteraction,
  blurbFor,
  compatibilityWithPlayer,
  ensureAllNpcs,
  relationshipYearTick as relTickImpl,
} from './domain/relationships';
import type { GameState, Relationship } from './domain/state';

/** The one shared RNG every simulation decision must flow through. */
export const rng = new Rng();

/** Persist the game plus the RNG state so replays stay deterministic. */
export function persistSave(state: GameState): void {
  persistEnvelope(state, rng.getState());
}

/** Restore the game; also restores the RNG position if the save has one. */
export function restoreSave(): GameState | null {
  const restored = restoreEnvelope();
  if (!restored) return null;
  if (restored.rng !== undefined) rng.setState(restored.rng);
  return restored.state;
}

/** Fresh RNG seed for a brand-new life. */
export function reseed(): void {
  rng.setState(Rng.randomSeed());
}

/** One year of career life for the current job, using the shared RNG. */
export function careerYearTick(state: GameState) {
  return careerTickImpl(state, rng);
}

export const careers = {
  legacyJobList,
  levelById,
  nextLevel,
  trackOf,
  eligibilityGap,
};

export const skills = { SKILLS, skillName };

/** One year of every bond in the player's life, using the shared RNG. */
export function relationshipYearTick(state: GameState) {
  return relTickImpl(state, rng);
}

export const relationships = {
  applyInteraction: (state: GameState, rel: Relationship, kind: 'call' | 'spend' | 'gift') =>
    applyInteraction(state, rel, kind, rng),
  ensureAll: (state: GameState) => ensureAllNpcs(state, rng),
  blurbFor,
  compatibilityWithPlayer,
};

export { Rng, clearSave, CURRENT_SAVE_VERSION };
export type { GameState };
