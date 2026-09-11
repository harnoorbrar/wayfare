export type DailyJourneyAction = 'age_up' | 'choice' | 'activity' | 'relationship' | 'pet';

export interface DailyJourneyDefinition {
  id: string;
  action: DailyJourneyAction;
  icon: string;
  title: string;
  description: string;
  target: number;
  unit: string;
  destination: 'story' | 'activities' | 'people';
}

export interface DailyJourneyCurrent extends DailyJourneyDefinition {
  day: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyJourneyHistory {
  streak: number;
  longestStreak: number;
  totalCompleted: number;
  lastClaimedDay: string | null;
  claimedDays: string[];
}

export interface DailyJourneyState {
  schema: 1;
  current: DailyJourneyCurrent;
  history: DailyJourneyHistory;
}

export interface DailyJourneyReward {
  happiness: number;
  money: number;
  smarts: number;
  health: number;
  label: string;
}

const DEFINITIONS: readonly DailyJourneyDefinition[] = [
  {
    id: 'next_chapter', action: 'age_up', icon: '✦', title: 'Write the next chapter',
    description: 'Live through five more years of your current story.', target: 5,
    unit: 'years lived', destination: 'story',
  },
  {
    id: 'bold_choices', action: 'choice', icon: '◇', title: 'Choose with courage',
    description: 'Resolve two life decisions. The outcome is yours to carry.', target: 2,
    unit: 'choices made', destination: 'story',
  },
  {
    id: 'deliberate_days', action: 'activity', icon: '⚡', title: 'Spend your time well',
    description: 'Complete three Focus activities across as many years as you need.', target: 3,
    unit: 'activities done', destination: 'activities',
  },
  {
    id: 'people_matter', action: 'relationship', icon: '♡', title: 'Show up for someone',
    description: 'Complete three positive relationship actions.', target: 3,
    unit: 'connections strengthened', destination: 'people',
  },
  {
    id: 'long_way_round', action: 'age_up', icon: '⌁', title: 'Take the long way round',
    description: 'Live through seven more years and see where the road leads.', target: 7,
    unit: 'years lived', destination: 'story',
  },
  {
    id: 'good_company', action: 'pet', icon: '🐾', title: 'Keep good company',
    description: 'Care for a companion three times. Adopt one if the house is too quiet.', target: 3,
    unit: 'moments shared', destination: 'people',
  },
] as const;

function hashDay(day: string): number {
  let hash = 2166136261;
  for (const character of day) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function localDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function definitionForDay(day: string): DailyJourneyDefinition {
  return { ...DEFINITIONS[hashDay(day) % DEFINITIONS.length] };
}

function defaultHistory(): DailyJourneyHistory {
  return { streak: 0, longestStreak: 0, totalCompleted: 0, lastClaimedDay: null, claimedDays: [] };
}

function normalizeHistory(input: unknown): DailyJourneyHistory {
  const value = input && typeof input === 'object' ? input as Partial<DailyJourneyHistory> : {};
  return {
    streak: Math.max(0, Number.isFinite(value.streak) ? Math.floor(value.streak as number) : 0),
    longestStreak: Math.max(0, Number.isFinite(value.longestStreak) ? Math.floor(value.longestStreak as number) : 0),
    totalCompleted: Math.max(0, Number.isFinite(value.totalCompleted) ? Math.floor(value.totalCompleted as number) : 0),
    lastClaimedDay: typeof value.lastClaimedDay === 'string' ? value.lastClaimedDay : null,
    claimedDays: Array.isArray(value.claimedDays)
      ? value.claimedDays.filter((day): day is string => typeof day === 'string').slice(-45)
      : [],
  };
}

function newCurrent(day: string, history: DailyJourneyHistory): DailyJourneyCurrent {
  const definition = definitionForDay(day);
  const claimed = history.claimedDays.includes(day);
  return { ...definition, day, progress: claimed ? definition.target : 0, completed: claimed, claimed };
}

export function ensureDailyJourney(input: unknown, date = new Date()): DailyJourneyState {
  const day = localDayKey(date);
  const value = input && typeof input === 'object' ? input as Partial<DailyJourneyState> : {};
  const history = normalizeHistory(value.history ?? defaultHistory());
  const current = value.current;
  if (!current || current.day !== day) return { schema: 1, current: newCurrent(day, history), history };

  const definition = definitionForDay(day);
  // A definition change under a live day (new journeys shipped mid-day) must
  // not carry progress earned toward a different action.
  const sameJourney = current.action === definition.action && current.target === definition.target;
  const progress = sameJourney
    ? Math.min(definition.target, Math.max(0, Number.isFinite(current.progress) ? Math.floor(current.progress) : 0))
    : 0;
  const claimed = Boolean(current.claimed) || history.claimedDays.includes(day);
  return {
    schema: 1,
    current: { ...definition, day, progress: claimed ? definition.target : progress, completed: claimed || progress >= definition.target, claimed },
    history,
  };
}

export function recordDailyAction(
  input: DailyJourneyState,
  action: DailyJourneyAction,
  amount = 1,
): { state: DailyJourneyState; justCompleted: boolean } {
  const state = ensureDailyJourney(input, dayKeyToLocalDate(input.current.day));
  if (state.current.claimed || state.current.action !== action || amount <= 0) return { state, justCompleted: false };
  const wasCompleted = state.current.completed;
  const progress = Math.min(state.current.target, state.current.progress + Math.floor(amount));
  const current = { ...state.current, progress, completed: progress >= state.current.target };
  return { state: { ...state, current }, justCompleted: !wasCompleted && current.completed };
}

function dayKeyToLocalDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, Math.max(0, month - 1), date || 1, 12);
}

function daysBetween(earlier: string, later: string): number {
  const a = Date.UTC(...earlier.split('-').map(Number).map((value, index) => index === 1 ? value - 1 : value) as [number, number, number]);
  const b = Date.UTC(...later.split('-').map(Number).map((value, index) => index === 1 ? value - 1 : value) as [number, number, number]);
  return Math.round((b - a) / 86_400_000);
}

export function rewardForStreak(streak: number): DailyJourneyReward {
  const reward: DailyJourneyReward = { happiness: 4, money: 0, smarts: 0, health: 0, label: '+4 Happiness' };
  if (streak > 0 && streak % 7 === 0) {
    reward.money = 2500;
    reward.smarts = 3;
    reward.health = 3;
    reward.label = '+4 Happiness · +3 Health · +3 Smarts · $2,500';
  } else if (streak > 0 && streak % 3 === 0) {
    reward.money = 1000;
    reward.label = '+4 Happiness · $1,000';
  }
  return reward;
}

export function claimDailyJourney(input: DailyJourneyState): {
  state: DailyJourneyState;
  reward: DailyJourneyReward | null;
} {
  const state = ensureDailyJourney(input, dayKeyToLocalDate(input.current.day));
  if (!state.current.completed || state.current.claimed || state.history.claimedDays.includes(state.current.day)) {
    return { state, reward: null };
  }
  const gap = state.history.lastClaimedDay ? daysBetween(state.history.lastClaimedDay, state.current.day) : null;
  const streak = gap === 1 ? state.history.streak + 1 : 1;
  const history: DailyJourneyHistory = {
    streak,
    longestStreak: Math.max(state.history.longestStreak, streak),
    totalCompleted: state.history.totalCompleted + 1,
    lastClaimedDay: state.current.day,
    claimedDays: [...state.history.claimedDays.filter(day => day !== state.current.day), state.current.day].slice(-45),
  };
  return {
    state: { ...state, current: { ...state.current, claimed: true }, history },
    reward: rewardForStreak(streak),
  };
}

export const dailyJourneyDefinitions = DEFINITIONS;
