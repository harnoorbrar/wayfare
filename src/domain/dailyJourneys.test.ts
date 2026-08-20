import { describe, expect, it } from 'vitest';
import {
  claimDailyJourney,
  definitionForDay,
  ensureDailyJourney,
  localDayKey,
  recordDailyAction,
  rewardForStreak,
} from './dailyJourneys';

const date = (day: number) => new Date(2026, 7, day, 12);

describe('daily journeys', () => {
  it('uses a stable local calendar key and deterministic definition', () => {
    expect(localDayKey(date(20))).toBe('2026-08-20');
    expect(definitionForDay('2026-08-20')).toEqual(definitionForDay('2026-08-20'));
  });

  it('only records the action selected for that day', () => {
    const state = ensureDailyJourney(null, date(20));
    const wrongAction = state.current.action === 'age_up' ? 'choice' : 'age_up';
    expect(recordDailyAction(state, wrongAction).state.current.progress).toBe(0);
    expect(recordDailyAction(state, state.current.action).state.current.progress).toBe(1);
  });

  it('completes once, caps progress, and cannot claim twice', () => {
    let state = ensureDailyJourney(null, date(20));
    const result = recordDailyAction(state, state.current.action, state.current.target + 5);
    expect(result.justCompleted).toBe(true);
    expect(result.state.current.progress).toBe(result.state.current.target);
    const claimed = claimDailyJourney(result.state);
    expect(claimed.reward).not.toBeNull();
    expect(claimed.state.current.claimed).toBe(true);
    expect(claimDailyJourney(claimed.state).reward).toBeNull();
  });

  it('continues consecutive streaks and resets missed-day streaks', () => {
    let first = ensureDailyJourney(null, date(20));
    first = recordDailyAction(first, first.current.action, first.current.target).state;
    first = claimDailyJourney(first).state;

    let next = ensureDailyJourney(first, date(21));
    next = recordDailyAction(next, next.current.action, next.current.target).state;
    next = claimDailyJourney(next).state;
    expect(next.history.streak).toBe(2);

    let missed = ensureDailyJourney(next, date(23));
    missed = recordDailyAction(missed, missed.current.action, missed.current.target).state;
    missed = claimDailyJourney(missed).state;
    expect(missed.history.streak).toBe(1);
    expect(missed.history.longestStreak).toBe(2);
  });

  it('grants milestone bonuses without making the base reward punitive', () => {
    expect(rewardForStreak(1)).toMatchObject({ happiness: 4, money: 0 });
    expect(rewardForStreak(3)).toMatchObject({ happiness: 4, money: 1000 });
    expect(rewardForStreak(7)).toMatchObject({ happiness: 4, money: 2500, health: 3, smarts: 3 });
  });
});
