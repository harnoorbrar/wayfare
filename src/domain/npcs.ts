/**
 * Procedural NPCs. Every person in a life carries persistent personality
 * traits that drive how their relationship with the player evolves —
 * believable people, not closeness bars with names.
 */
import { Rng } from './rng';

export interface NpcTraits {
  /** Warmth: kind people forgive neglect and reach out on their own. */
  kindness: number;
  /** Drive: ambitious people respect success and drift when you stall. */
  ambition: number;
  /** Assertiveness: confident people initiate and speak their mind. */
  confidence: number;
  intelligence: number;
  /** Levity: funny people are easier to bond with. */
  humor: number;
}

export const TRAIT_IDS = ['kindness', 'ambition', 'confidence', 'intelligence', 'humor'] as const;

/** Bell-ish distribution: sum of two rolls reads more human than uniform. */
function rollTrait(rng: Rng): number {
  return rng.int(5, 55) + rng.int(0, 45);
}

export function generateTraits(rng: Rng): NpcTraits {
  return {
    kindness: rollTrait(rng),
    ambition: rollTrait(rng),
    confidence: rollTrait(rng),
    intelligence: rollTrait(rng),
    humor: rollTrait(rng),
  };
}

const TRAIT_WORDS: Record<keyof NpcTraits, { high: string; low: string }> = {
  kindness: { high: 'warm', low: 'cold' },
  ambition: { high: 'driven', low: 'laid-back' },
  confidence: { high: 'confident', low: 'shy' },
  intelligence: { high: 'sharp', low: 'simple' },
  humor: { high: 'funny', low: 'serious' },
};

/** Short human-readable read on a personality, e.g. "warm, funny, shy". */
export function traitBlurb(traits: NpcTraits): string {
  const words: { word: string; strength: number }[] = [];
  for (const id of TRAIT_IDS) {
    const v = traits[id];
    if (v >= 70) words.push({ word: TRAIT_WORDS[id].high, strength: v - 50 });
    else if (v <= 30) words.push({ word: TRAIT_WORDS[id].low, strength: 50 - v });
  }
  words.sort((a, b) => b.strength - a.strength);
  if (words.length === 0) return 'even-keeled';
  return words.slice(0, 3).map((w) => w.word).join(', ');
}

/**
 * How naturally two people get along, 0-100. Warmth and humor carry it;
 * a big confidence mismatch drags it down.
 */
export function compatibility(a: NpcTraits, b: NpcTraits): number {
  const warmth = (a.kindness + b.kindness) / 2;
  const levity = (a.humor + b.humor) / 2;
  const friction = Math.abs(a.confidence - b.confidence) / 2;
  const drive = Math.abs(a.ambition - b.ambition) / 4;
  return Math.max(0, Math.min(100, Math.round(0.45 * warmth + 0.35 * levity + 20 - friction * 0.4 - drive * 0.3 + 20)));
}
