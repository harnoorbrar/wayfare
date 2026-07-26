import type { GameState } from './state';
import { eligibilityGap, levelById, nextLevel } from './careers';

export const FOCUS_PER_YEAR = 2;

export interface ActivityState {
  age: number;
  used: number;
  performed: string[];
}

export interface ActivityDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  minAge: number;
  cost: number;
  statDeltas: Partial<Record<'health' | 'happiness' | 'smarts', number>>;
  skillGains: Record<string, number>;
  /** A small boost shared across the player's closest bonds. */
  relationshipDelta?: number;
  /** Prevents a relationship action from being spent with nobody to share it with. */
  requiresRelationship?: boolean;
  result: string;
}

export interface ActivityAvailability {
  ok: boolean;
  reason?: string;
}

export interface ActivityResult {
  ok: boolean;
  reason?: string;
  activity?: ActivityDefinition;
  statDeltas?: ActivityDefinition['statDeltas'];
  skillGains?: Record<string, number>;
  relationshipsImproved?: number;
}

export interface ActivityRecommendation {
  activity: ActivityDefinition;
  reason: string;
}

export const ACTIVITIES: readonly ActivityDefinition[] = [
  {
    id: 'outdoors', name: 'Get Moving', icon: '☀', minAge: 4, cost: 0,
    description: 'Move your body, clear your head, and build lasting fitness.',
    statDeltas: { health: 2, happiness: 2 }, skillGains: { fitness: 4 },
    result: 'made time to move and came back feeling stronger.',
  },
  {
    id: 'study', name: 'Study Deeply', icon: '⌁', minAge: 8, cost: 0,
    description: 'Trade a little leisure for sharper thinking and useful knowledge.',
    statDeltas: { smarts: 2, happiness: -1 }, skillGains: { programming: 2 },
    result: 'put distractions away and studied with real focus.',
  },
  {
    id: 'create', name: 'Make Something', icon: '✎', minAge: 6, cost: 40,
    description: 'Write, paint, build, or experiment until an idea becomes real.',
    statDeltas: { happiness: 3 }, skillGains: { creativity: 4 },
    result: 'made something original and lost track of time doing it.',
  },
  {
    id: 'cook', name: 'Cook a Real Meal', icon: '◇', minAge: 12, cost: 25,
    description: 'Practice a practical craft that supports both health and joy.',
    statDeltas: { health: 1, happiness: 2 }, skillGains: { cooking: 4 },
    result: 'cooked from scratch. It was better than expected.',
  },
  {
    id: 'network', name: 'Work the Room', icon: '◎', minAge: 16, cost: 100,
    description: 'Meet people deliberately and practice making a strong impression.',
    statDeltas: { happiness: 1 }, skillGains: { charisma: 3, negotiation: 2 },
    result: 'worked the room and left with a few promising connections.',
  },
  {
    id: 'review_finances', name: 'Review the Numbers', icon: '▤', minAge: 16, cost: 0,
    description: 'Learn how money moves, spot waste, and build sound financial instincts.',
    statDeltas: { smarts: 1 }, skillGains: { finance: 4 },
    result: 'reviewed the numbers and found a smarter way forward.',
  },
  {
    id: 'connect', name: 'Make Time for Someone', icon: '☎', minAge: 8, cost: 0,
    description: 'Be fully present with the people who matter and let trust compound.',
    statDeltas: { happiness: 3 }, skillGains: { charisma: 2 }, relationshipDelta: 3,
    requiresRelationship: true,
    result: 'made time for someone important and left the bond a little stronger.',
  },
  {
    id: 'lead', name: 'Lead a Project', icon: '△', minAge: 18, cost: 150,
    description: 'Organize people around a goal and learn to carry responsibility.',
    statDeltas: { happiness: -1 }, skillGains: { leadership: 4, negotiation: 1 },
    result: 'took charge of a small project and learned what leadership costs.',
  },
] as const;

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function activityById(id: string): ActivityDefinition | undefined {
  return ACTIVITIES.find((activity) => activity.id === id);
}

export function ensureActivityState(state: GameState): ActivityState {
  const raw = state.activities;
  if (!raw || typeof raw !== 'object') {
    state.activities = { age: state.age, used: 0, performed: [] };
  }
  const activityState = state.activities as ActivityState;
  if (activityState.age !== state.age) {
    activityState.age = state.age;
    activityState.used = 0;
    activityState.performed = [];
  }
  if (!Number.isFinite(activityState.used) || activityState.used < 0) activityState.used = 0;
  if (!Array.isArray(activityState.performed)) activityState.performed = [];
  return activityState;
}

export function availability(state: GameState, activity: ActivityDefinition): ActivityAvailability {
  const activityState = ensureActivityState(state);
  if (state.age < activity.minAge) return { ok: false, reason: `Unlocks at age ${activity.minAge}.` };
  if (activityState.used >= FOCUS_PER_YEAR) return { ok: false, reason: 'No focus left this year.' };
  if (activityState.performed.includes(activity.id)) return { ok: false, reason: 'Already done this year.' };
  if (activity.requiresRelationship && state.relationships.length === 0) return { ok: false, reason: 'Meet someone first.' };
  if ((state.money || 0) < activity.cost) return { ok: false, reason: `Needs $${activity.cost.toLocaleString()}.` };
  return { ok: true };
}

function relationshipCloseness(relationship: GameState['relationships'][number]): number {
  const closeness = relationship['closeness'];
  return typeof closeness === 'number' ? closeness : 0;
}

function strengthenClosestRelationships(state: GameState, amount: number): number {
  if (!amount) return 0;
  const closest = [...state.relationships]
    .sort((a, b) => relationshipCloseness(b) - relationshipCloseness(a))
    .slice(0, 2);
  for (const relationship of closest) {
    relationship['closeness'] = clamp100(relationshipCloseness(relationship) + amount);
    const trust = relationship['trust'];
    relationship['trust'] = clamp100((typeof trust === 'number' ? trust : 50) + amount);
  }
  return closest.length;
}

export function performActivity(state: GameState, id: string): ActivityResult {
  const activity = activityById(id);
  if (!activity) return { ok: false, reason: 'Unknown activity.' };
  const canPerform = availability(state, activity);
  if (!canPerform.ok) return canPerform;

  state.money -= activity.cost;
  for (const [stat, amount] of Object.entries(activity.statDeltas)) {
    const key = stat as 'health' | 'happiness' | 'smarts';
    state[key] = clamp100((state[key] || 0) + (amount || 0));
  }
  if (!state.skills || typeof state.skills !== 'object') state.skills = {};
  for (const [skill, amount] of Object.entries(activity.skillGains)) {
    state.skills[skill] = clamp100((state.skills[skill] || 0) + amount);
  }
  const relationshipsImproved = strengthenClosestRelationships(state, activity.relationshipDelta || 0);

  const activityState = ensureActivityState(state);
  activityState.used += 1;
  activityState.performed.push(activity.id);
  return {
    ok: true,
    activity,
    statDeltas: { ...activity.statDeltas },
    skillGains: { ...activity.skillGains },
    relationshipsImproved,
  };
}

export function focusRemaining(state: GameState): number {
  return Math.max(0, FOCUS_PER_YEAR - ensureActivityState(state).used);
}

/** A single, explainable suggestion that turns an ambition into action. */
export function recommendation(state: GameState): ActivityRecommendation | null {
  const available = ACTIVITIES.filter((activity) => availability(state, activity).ok);
  if (!available.length) return null;
  const byId = (id: string) => available.find((activity) => activity.id === id);
  const ambitionId = state.ambition?.id;
  const ambitionRecommendation: Record<string, { id: string; reason: string }> = {
    family: { id: 'connect', reason: 'Your family ambition grows through close, consistent bonds.' },
    mastery: { id: 'study', reason: 'A little focused study moves mastery forward.' },
    enterprise: { id: 'lead', reason: 'Leadership is the foundation of an empire.' },
    fortune: { id: 'review_finances', reason: 'Financial freedom starts with understanding the numbers.' },
  };
  const ambition = ambitionId ? ambitionRecommendation[ambitionId] : undefined;
  if (ambition) {
    const activity = byId(ambition.id);
    if (activity) return { activity, reason: ambition.reason };
  }
  const currentLevel = levelById(state.job);
  const nextCareerLevel = currentLevel ? nextLevel(currentLevel.id) : null;
  if (nextCareerLevel) {
    const gap = eligibilityGap(state, nextCareerLevel, state.yearsAtJob || 0);
    const missingSkill = gap.missingSkills
      .sort((a, b) => (b.need - b.have) - (a.need - a.have))[0];
    if (missingSkill) {
      const activity = available
        .filter((candidate) => candidate.skillGains[missingSkill.id])
        .sort((a, b) => b.skillGains[missingSkill.id] - a.skillGains[missingSkill.id])[0];
      if (activity) {
        return {
          activity,
          reason: `${nextCareerLevel.title} needs ${missingSkill.need} ${missingSkill.id}; this builds it now.`,
        };
      }
    }
    if (gap.missingSmarts > 0) {
      const study = byId('study');
      if (study) return { activity: study, reason: `${nextCareerLevel.title} needs sharper fundamentals.` };
    }
  }
  const outdoors = byId('outdoors');
  if (state.health < 45 && outdoors) {
    return { activity: outdoors, reason: 'Your health needs attention before it limits the rest of your life.' };
  }
  const study = byId('study');
  if (state.smarts < 50 && study) {
    return { activity: study, reason: 'Stronger fundamentals open more doors later.' };
  }
  return { activity: available[0], reason: 'A deliberate choice now compounds over the years ahead.' };
}
