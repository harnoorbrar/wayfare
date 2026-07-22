import type { GameState } from './state';

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
  if ((state.money || 0) < activity.cost) return { ok: false, reason: `Needs $${activity.cost.toLocaleString()}.` };
  return { ok: true };
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

  const activityState = ensureActivityState(state);
  activityState.used += 1;
  activityState.performed.push(activity.id);
  return {
    ok: true,
    activity,
    statDeltas: { ...activity.statDeltas },
    skillGains: { ...activity.skillGains },
  };
}

export function focusRemaining(state: GameState): number {
  return Math.max(0, FOCUS_PER_YEAR - ensureActivityState(state).used);
}
