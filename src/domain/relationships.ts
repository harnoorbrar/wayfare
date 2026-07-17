/**
 * Relationship engine. Each bond tracks closeness (affection), trust, and
 * respect, plus a capped memory log. NPC traits drive how bonds evolve:
 * kind people forgive neglect, confident people reach out, ambitious people
 * respect a prestigious player. The yearly tick replaces the monolith's
 * flat closeness-decay block.
 */
import { generateTraits, NpcTraits, traitBlurb, compatibility } from './npcs';
import { levelById } from './careers';
import { Rng } from './rng';
import type { GameState, Relationship } from './state';

export interface Memory {
  age: number;
  text: string;
}

const MEMORY_CAP = 12;

export interface FeedMessage {
  text: string;
  deltas?: [string, number][];
}

export interface RelationshipTickResult {
  messages: FeedMessage[];
}

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Backfill NPC data on a relationship that predates v1.3 (or was created
 * by a monolith path). Deterministic for a given RNG stream position.
 */
export function ensureNpc(rel: Relationship, rng: Rng): void {
  if (!rel.traits || typeof rel.traits !== 'object') {
    rel.traits = generateTraits(rng);
  }
  if (typeof rel.trust !== 'number') {
    // Long bonds start with trust near their existing closeness.
    rel.trust = clamp100(((rel.closeness as number) ?? 40) + rng.int(-10, 10));
  }
  if (typeof rel.respect !== 'number') {
    rel.respect = clamp100(40 + rng.int(-10, 20));
  }
  if (!Array.isArray(rel.memories)) {
    rel.memories = [];
  }
}

export function ensureAllNpcs(state: GameState, rng: Rng): void {
  for (const rel of state.relationships) ensureNpc(rel, rng);
}

export function addMemory(rel: Relationship, age: number, text: string): void {
  const memories = rel.memories as Memory[];
  memories.push({ age, text });
  if (memories.length > MEMORY_CAP) memories.splice(0, memories.length - MEMORY_CAP);
}

export function blurbFor(rel: Relationship): string {
  return rel.traits ? traitBlurb(rel.traits as NpcTraits) : '';
}

/** Compatibility with the player — shown for partners/spouses. */
export function compatibilityWithPlayer(state: GameState, rel: Relationship): number {
  if (!rel.traits) return 50;
  // The player's "traits" are proxied from their stats until the player
  // model grows real personality: smarts -> intelligence, happiness -> humor.
  const playerProxy: NpcTraits = {
    kindness: 60,
    ambition: clamp100(30 + (levelById(state.job)?.prestige ?? 0) / 2),
    confidence: clamp100(state.looks / 2 + state.happiness / 4),
    intelligence: state.smarts,
    humor: clamp100(state.happiness),
  };
  return compatibility(playerProxy, rel.traits as NpcTraits);
}

export interface InteractionResult {
  text: string;
  closenessDelta: number;
  happinessDelta: number;
}

/**
 * Apply a player-initiated interaction. Trait-aware: warmth amplifies
 * bonding, humor makes time together happier, trust builds with contact.
 */
export function applyInteraction(
  state: GameState,
  rel: Relationship,
  kind: 'call' | 'spend' | 'gift',
  rng: Rng,
): InteractionResult {
  ensureNpc(rel, rng);
  const traits = rel.traits as NpcTraits;
  const warmthBonus = traits.kindness >= 65 ? 2 : traits.kindness <= 25 ? -1 : 0;
  const humorBonus = traits.humor >= 65 ? 1 : 0;

  let closenessDelta: number;
  let happinessDelta: number;
  let verb: string;
  if (kind === 'call') {
    closenessDelta = rng.int(2, 5) + warmthBonus;
    happinessDelta = 1 + humorBonus;
    verb = 'called';
  } else if (kind === 'spend') {
    closenessDelta = rng.int(5, 9) + warmthBonus;
    happinessDelta = 2 + humorBonus;
    verb = 'spent the day with';
  } else {
    closenessDelta = rng.int(6, 10) + warmthBonus;
    happinessDelta = 1;
    verb = 'gave a gift to';
  }

  rel.closeness = clamp100((rel.closeness as number) + closenessDelta);
  rel.trust = clamp100((rel.trust as number) + rng.int(1, 3));
  rel.lastInteractedAge = state.age;
  state.happiness = clamp100(state.happiness + happinessDelta);

  if (kind === 'spend' && rng.chance(0.3)) {
    addMemory(rel, state.age, pickMoment(rng));
  }

  return { text: `${state.name} ${verb} ${rel.name}.`, closenessDelta, happinessDelta };
}

const MOMENTS = [
  'Laughed until it hurt over something neither could explain later.',
  'Got caught in the rain and didn’t mind.',
  'Talked until 3am about everything and nothing.',
  'Tried a new restaurant. Never going back. Worth it.',
  'Took the long way home on purpose.',
  'Argued about a movie for two hours. Still disagree.',
];

function pickMoment(rng: Rng): string {
  return rng.pick(MOMENTS);
}

/**
 * One simulated year of every relationship in the player's life.
 * Replaces the monolith's neglect-decay + friend-prune block.
 */
export function relationshipYearTick(state: GameState, rng: Rng): RelationshipTickResult {
  const messages: FeedMessage[] = [];
  const playerPrestige = levelById(state.job)?.prestige ?? 0;

  for (const rel of state.relationships) {
    ensureNpc(rel, rng);
    const traits = rel.traits as NpcTraits;
    const neglected = rel.lastInteractedAge === undefined || (rel.lastInteractedAge as number) < state.age - 1;

    if (neglected) {
      // Kind people hold on longer; partners feel neglect hardest.
      const base = rel.type === 'Spouse' || rel.type === 'Partner' ? rng.int(2, 5) : rng.int(1, 4);
      const mercy = traits.kindness >= 70 ? 1 : 0;
      rel.closeness = clamp100((rel.closeness as number) - Math.max(0, base - mercy));
      rel.trust = clamp100((rel.trust as number) - rng.int(0, 2));

      // Confident, warm people don't wait for you to call.
      if (traits.confidence >= 60 && traits.kindness >= 55 && rng.chance(0.25)) {
        rel.closeness = clamp100((rel.closeness as number) + rng.int(3, 6));
        rel.lastInteractedAge = state.age;
        messages.push({ text: `${rel.name} reached out first. Some people just don't let go.` });
      }
    } else {
      // Steady contact compounds trust.
      rel.trust = clamp100((rel.trust as number) + rng.int(0, 2));
    }

    // Ambitious people track how you're doing; respect follows prestige.
    const respectPull = traits.ambition >= 55 ? playerPrestige : (playerPrestige + 50) / 2;
    const respect = rel.respect as number;
    if (respect < respectPull) rel.respect = clamp100(respect + rng.int(0, 2));
    else if (respect > respectPull) rel.respect = clamp100(respect - rng.int(0, 1));

    // Cold + confident people pick fights.
    if (traits.kindness <= 25 && traits.confidence >= 60 && rng.chance(0.12)) {
      const sting = rng.int(3, 7);
      rel.closeness = clamp100((rel.closeness as number) - sting);
      rel.trust = clamp100((rel.trust as number) - rng.int(1, 3));
      messages.push({ text: `${rel.name} started an argument over nothing. Classic ${rel.name}.` });
    }
  }

  // Friends whose bond has gone cold drift away entirely.
  const keep: Relationship[] = [];
  for (const rel of state.relationships) {
    if (rel.type === 'Friend' && (rel.closeness as number) <= 5) {
      messages.push({ text: `${state.name} and ${rel.name} drifted apart. Haven't spoken in ages.` });
    } else {
      keep.push(rel);
    }
  }
  state.relationships = keep;

  return { messages };
}
