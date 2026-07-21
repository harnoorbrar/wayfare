/**
 * Data-driven event chains. Each event is pure data: when it can fire, its
 * choices, the effects of each choice, and — crucially — the follow-up it
 * schedules years later. That scheduling is what turns isolated moments into
 * narratives (invest now, find out in three years; ignore symptoms now, pay
 * later). The engine in domain/events.ts interprets these; no event logic is
 * hardcoded there.
 *
 * Effects are [stat, amount] deltas the monolith's applyDelta understands
 * (money, happiness, health, smarts, looks). `schedule` queues a follow-up
 * event by id after `inYears`, optionally only with probability `chance`.
 */

export interface EventEffect {
  readonly stat: string;
  readonly amount: number;
}

export interface Schedule {
  readonly eventId: string;
  readonly inYears: number;
  /** Probability `eventId` fires when due (default 1). */
  readonly chance?: number;
  /** Fired instead of `eventId` when the `chance` roll fails. */
  readonly elseEventId?: string;
}

export interface EventChoice {
  readonly label: string;
  /** Immediate stat effects. */
  readonly effects?: readonly EventEffect[];
  /** Line shown after choosing. */
  readonly result: string;
  /** Follow-up event to queue. */
  readonly schedule?: Schedule;
  /** Minimum cash required to pick this choice. */
  readonly costGate?: number;
}

export interface EventRequirements {
  readonly minAge?: number;
  readonly maxAge?: number;
  /** Requires an active romantic partner. */
  readonly hasPartner?: boolean;
  /** Requires being employed. */
  readonly employed?: boolean;
  /** Minimum liquid cash. */
  readonly minMoney?: number;
}

export interface EventDef {
  readonly id: string;
  readonly text: string;
  /** Draw weight among eligible spontaneous events. */
  readonly weight: number;
  /** If true, only fires when scheduled — never drawn spontaneously. */
  readonly scheduledOnly?: boolean;
  /** Only draw/fire once per life. */
  readonly once?: boolean;
  /**
   * Years before this event can be drawn spontaneously again
   * (default DEFAULT_COOLDOWN_YEARS). Scheduled fires ignore cooldowns.
   */
  readonly cooldownYears?: number;
  readonly requires?: EventRequirements;
  readonly choices: readonly EventChoice[];
}

/** Repeatable events wait this many years between draws unless overridden. */
export const DEFAULT_COOLDOWN_YEARS = 4;

export const EVENTS: readonly EventDef[] = [
  // --- Startup investment chain -------------------------------------------
  {
    id: 'startup_pitch',
    text: 'An old friend pitches their startup and asks you to invest $10,000.',
    weight: 1.0,
    once: true,
    requires: { minAge: 22, minMoney: 10000 },
    choices: [
      {
        label: 'Invest $10,000',
        effects: [{ stat: 'money', amount: -10000 }],
        result: 'You wired the money. Now you wait.',
        // Three years later it either booms (45%) or busts.
        schedule: { eventId: 'startup_boom', elseEventId: 'startup_bust', inYears: 3, chance: 0.45 },
      },
      { label: 'Pass', result: 'You wished them luck and kept your money.' },
    ],
  },
  {
    id: 'startup_boom',
    text: 'The startup was acquired. Your stake is worth a fortune.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Cash out', effects: [{ stat: 'money', amount: 60000 }, { stat: 'happiness', amount: 12 }], result: 'A 6x return. Some bets pay off.' },
    ],
  },
  {
    id: 'startup_bust',
    text: 'The startup quietly folded. Your investment is gone.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Accept the loss', effects: [{ stat: 'happiness', amount: -8 }], result: 'Easy come, easy go. Lesson learned.' },
    ],
  },

  // --- Mentor chain -------------------------------------------------------
  {
    id: 'mentor_offer',
    text: 'A respected senior colleague offers to mentor you — if you put in the extra hours.',
    weight: 1.1,
    once: true,
    requires: { minAge: 20, employed: true },
    choices: [
      {
        label: 'Commit to it',
        effects: [{ stat: 'happiness', amount: -3 }],
        result: 'Long nights ahead, but it could pay off.',
        schedule: { eventId: 'mentor_payoff', inYears: 2 },
      },
      { label: 'Too busy right now', result: 'You kept your evenings to yourself.' },
    ],
  },
  {
    id: 'mentor_payoff',
    text: "Your mentor's guidance has made you sharper and better connected.",
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'It paid off', effects: [{ stat: 'smarts', amount: 8 }, { stat: 'happiness', amount: 6 }], result: 'You are ready for bigger things.' },
    ],
  },

  // --- Health foreshadowing chain -----------------------------------------
  {
    id: 'nagging_symptom',
    text: "You've had a nagging symptom for weeks. Get it checked?",
    weight: 1.0,
    once: true,
    requires: { minAge: 35 },
    choices: [
      {
        label: 'See a doctor ($800)',
        effects: [{ stat: 'money', amount: -800 }, { stat: 'happiness', amount: -2 }],
        result: 'Caught early and manageable. Peace of mind restored.',
      },
      {
        label: 'Ignore it',
        result: 'Probably nothing. You push through.',
        schedule: { eventId: 'symptom_worsens', inYears: 4, chance: 0.5 },
      },
    ],
  },
  {
    id: 'symptom_worsens',
    text: 'That symptom you ignored years ago has become a real problem.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Deal with it now', effects: [{ stat: 'health', amount: -12 }, { stat: 'money', amount: -6000 }], result: 'A harder, costlier fight than it needed to be.' },
    ],
  },

  // --- Windfall / generosity one-offs -------------------------------------
  {
    id: 'found_wallet',
    text: 'You find a wallet stuffed with cash on the sidewalk.',
    // Filler beat: kept rare so it never becomes the texture of a life.
    weight: 0.3,
    cooldownYears: 12,
    requires: { minAge: 12 },
    choices: [
      { label: 'Return it', effects: [{ stat: 'happiness', amount: 8 }], result: 'The owner was overjoyed. You feel good about yourself.' },
      { label: 'Keep the cash', effects: [{ stat: 'money', amount: 400 }, { stat: 'happiness', amount: -3 }], result: 'Four hundred richer, and a little uneasy.' },
    ],
  },
];
