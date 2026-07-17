/**
 * Versioned save system.
 *
 * Saves are stored as a versioned envelope; anything older (including the
 * pre-envelope raw-state format shipped in v1.0/v1.1) is upgraded through
 * the migration chain on load. Adding a future format change = write one
 * migration function and bump CURRENT_SAVE_VERSION. Existing player saves
 * must never be broken.
 */
import { GameState, backfillDefaults } from './state';
import { levelById } from './careers';

/** Same key the shipped game has always used — do not change. */
export const SAVE_KEY = 'wayfare-save-v1';

export const CURRENT_SAVE_VERSION = 3;

interface SaveEnvelope {
  __wayfare: true;
  version: number;
  savedAt: string;
  /** Serialized Rng state, so determinism survives save/load. */
  rng?: number;
  state: GameState;
}

export interface RestoredSave {
  state: GameState;
  rng?: number;
}

/** Minimal storage contract so tests can inject an in-memory fake. */
export interface KVStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let storageOverride: KVStorage | null = null;

function storage(): KVStorage {
  return storageOverride ?? (globalThis as { localStorage: KVStorage }).localStorage;
}

export function setStorageForTesting(fake: KVStorage | null): void {
  storageOverride = fake;
}

/**
 * migrations[n] upgrades a version-n state to version n+1.
 * Version 1 is the legacy raw-state format (no envelope).
 */
const migrations: Record<number, (s: Record<string, unknown>) => Record<string, unknown>> = {
  1: migrateLegacyEducation,
  2: migrateCareersAndSkills,
};

/** v1 -> v2: single-tier educationLevel became the degrees array. */
function migrateLegacyEducation(s: Record<string, unknown>): Record<string, unknown> {
  if (!s.degrees) {
    s.degrees = s.educationLevel && s.educationLevel !== 'None' ? ['hs'] : [];
    delete s.educationLevel;
  }
  return s;
}

/**
 * v2 -> v3: careers gained ladders and skills. Seed a working character
 * with ~5 years of their job's skill growth so long-running saves aren't
 * suddenly a decade away from a promotion they'd plausibly earned.
 */
function migrateCareersAndSkills(s: Record<string, unknown>): Record<string, unknown> {
  if (!s.skills || typeof s.skills !== 'object') {
    const skills: Record<string, number> = {};
    const level = typeof s.job === 'string' ? levelById(s.job) : null;
    if (level) {
      for (const [id, perYear] of Object.entries(level.skillGrowth)) {
        skills[id] = Math.min(100, perYear * 5);
      }
    }
    s.skills = skills;
  }
  if (typeof s.yearsAtJob !== 'number') {
    s.yearsAtJob = typeof s.job === 'string' && s.job !== 'unemployed' ? 2 : 0;
  }
  return s;
}

export function persistSave(state: GameState, rngState?: number): void {
  const envelope: SaveEnvelope = {
    __wayfare: true,
    version: CURRENT_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    rng: rngState,
    state,
  };
  storage().setItem(SAVE_KEY, JSON.stringify(envelope));
}

export function restoreSave(): RestoredSave | null {
  const raw = storage().getItem(SAVE_KEY);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const isEnvelope = (parsed as SaveEnvelope).__wayfare === true;
  let version = isEnvelope ? (parsed as SaveEnvelope).version : 1;
  let state = (
    isEnvelope ? (parsed as SaveEnvelope).state : parsed
  ) as Record<string, unknown>;

  while (version < CURRENT_SAVE_VERSION) {
    const migrate = migrations[version];
    if (!migrate) return null; // unknown version gap — refuse rather than corrupt
    state = migrate(state);
    version++;
  }

  // Defensive backfill on every load, matching shipped behavior.
  return {
    state: backfillDefaults(state),
    rng: isEnvelope ? (parsed as SaveEnvelope).rng : undefined,
  };
}

export function clearSave(): void {
  storage().removeItem(SAVE_KEY);
}
