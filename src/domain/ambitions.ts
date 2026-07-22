import type { GameState } from './state';

export type AmbitionId = 'fortune' | 'family' | 'mastery' | 'enterprise';

export interface AmbitionState {
  id: AmbitionId;
  claimed: string[];
}

export interface AmbitionMilestone {
  id: string;
  label: string;
  reward: number;
  current(state: GameState): number;
  target: number;
}

export interface AmbitionDefinition {
  id: AmbitionId;
  name: string;
  icon: string;
  description: string;
  tab: string;
  milestones: readonly AmbitionMilestone[];
}

export interface AmbitionSnapshot {
  definition: AmbitionDefinition;
  completed: number;
  total: number;
  percent: number;
  next: { label: string; current: number; target: number } | null;
}

export interface AmbitionReward {
  milestoneId: string;
  label: string;
  happiness: number;
}

function liquidWealth(state: GameState): number {
  const investments = Object.values(state.investments || {}).reduce(
    (sum, value) => sum + (typeof value === 'number' ? value : 0),
    0,
  );
  return Math.max(0, (state.money || 0) + (state.savings || 0) + investments);
}

function closeConnections(state: GameState): number {
  return (state.relationships || []).filter((relationship) => {
    const closeness = relationship.closeness;
    return typeof closeness === 'number' && closeness >= 80;
  }).length;
}

function totalStaff(state: GameState): number {
  return (state.businesses || []).reduce((sum: number, business) => {
    if (typeof business !== 'object' || business === null) return sum;
    const staff = (business as { staff?: unknown[] }).staff;
    return sum + (Array.isArray(staff) ? staff.length : 0);
  }, 0);
}

function advancedQualifications(state: GameState): number {
  return (state.degrees || []).filter((degree) => degree !== 'hs').length;
}

export const AMBITIONS: readonly AmbitionDefinition[] = [
  {
    id: 'fortune',
    name: 'Financial Freedom',
    icon: '◈',
    description: 'Turn careful choices into lasting independence.',
    tab: 'bank',
    milestones: [
      { id: 'foundation', label: 'Build a $25,000 foundation', reward: 4, current: liquidWealth, target: 25_000 },
      { id: 'security', label: 'Reach $250,000 in liquid wealth', reward: 6, current: liquidWealth, target: 250_000 },
      { id: 'freedom', label: 'Become a liquid millionaire', reward: 10, current: liquidWealth, target: 1_000_000 },
    ],
  },
  {
    id: 'family',
    name: 'A Full Heart',
    icon: '♡',
    description: 'Build a close family and relationships that endure.',
    tab: 'people',
    milestones: [
      { id: 'partner', label: 'Find a committed partner', reward: 4, current: (state) => state.partner ? 1 : 0, target: 1 },
      { id: 'children', label: 'Raise two children', reward: 6, current: (state) => (state.children || []).length, target: 2 },
      { id: 'circle', label: 'Keep five deeply close bonds', reward: 10, current: closeConnections, target: 5 },
    ],
  },
  {
    id: 'mastery',
    name: 'A Life of Mastery',
    icon: '✦',
    description: 'Keep learning until knowledge becomes your legacy.',
    tab: 'education',
    milestones: [
      { id: 'qualification', label: 'Earn an advanced qualification', reward: 4, current: advancedQualifications, target: 1 },
      { id: 'mind', label: 'Reach 75 smarts', reward: 6, current: (state) => state.smarts || 0, target: 75 },
      { id: 'scholar', label: 'Complete three advanced programs', reward: 10, current: advancedQualifications, target: 3 },
    ],
  },
  {
    id: 'enterprise',
    name: 'Build an Empire',
    icon: '⬡',
    description: 'Create companies, teams, and something that outlives you.',
    tab: 'business',
    milestones: [
      { id: 'venture', label: 'Launch your first business', reward: 4, current: (state) => (state.businesses || []).length, target: 1 },
      { id: 'team', label: 'Employ a team of five', reward: 6, current: totalStaff, target: 5 },
      { id: 'portfolio', label: 'Own two businesses', reward: 10, current: (state) => (state.businesses || []).length, target: 2 },
    ],
  },
] as const;

export function definitionById(id: string): AmbitionDefinition | undefined {
  return AMBITIONS.find((ambition) => ambition.id === id);
}

export function ensureAmbition(state: GameState): AmbitionState | null {
  const raw = state.ambition;
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as AmbitionState;
  if (!definitionById(candidate.id)) {
    state.ambition = null;
    return null;
  }
  if (!Array.isArray(candidate.claimed)) candidate.claimed = [];
  return candidate;
}

export function chooseAmbition(state: GameState, id: AmbitionId): boolean {
  if (state.age < 18 || ensureAmbition(state) || !definitionById(id)) return false;
  state.ambition = { id, claimed: [] } satisfies AmbitionState;
  return true;
}

export function ambitionSnapshot(state: GameState): AmbitionSnapshot | null {
  const selected = ensureAmbition(state);
  if (!selected) return null;
  const definition = definitionById(selected.id);
  if (!definition) return null;
  const completedMilestones = definition.milestones.filter(
    (milestone) => milestone.current(state) >= milestone.target,
  );
  const nextMilestone = definition.milestones.find(
    (milestone) => milestone.current(state) < milestone.target,
  );
  return {
    definition,
    completed: completedMilestones.length,
    total: definition.milestones.length,
    percent: Math.round((completedMilestones.length / definition.milestones.length) * 100),
    next: nextMilestone ? {
      label: nextMilestone.label,
      current: Math.max(0, nextMilestone.current(state)),
      target: nextMilestone.target,
    } : null,
  };
}

export function claimAmbitionRewards(state: GameState): AmbitionReward[] {
  const selected = ensureAmbition(state);
  if (!selected) return [];
  const definition = definitionById(selected.id);
  if (!definition) return [];
  const earned: AmbitionReward[] = [];
  for (const milestone of definition.milestones) {
    if (selected.claimed.includes(milestone.id) || milestone.current(state) < milestone.target) continue;
    selected.claimed.push(milestone.id);
    state.happiness = Math.max(0, Math.min(100, (state.happiness || 0) + milestone.reward));
    earned.push({ milestoneId: milestone.id, label: milestone.label, happiness: milestone.reward });
  }
  return earned;
}
