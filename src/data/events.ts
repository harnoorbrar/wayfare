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
  /** Requires at least one child. */
  readonly hasChildren?: boolean;
  /** Requires a rented or owned home. */
  readonly hasProperty?: boolean;
  /** Requires at least one vehicle. */
  readonly hasVehicle?: boolean;
  /** Requires at least one pet. */
  readonly hasPet?: boolean;
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

  // --- Childhood and school -----------------------------------------------
  {
    id: 'rainy_day_fort',
    text: 'A rainy afternoon turns the living room into the perfect place for a blanket fort.',
    weight: 1.2,
    cooldownYears: 6,
    requires: { minAge: 3, maxAge: 7 },
    choices: [
      { label: 'Build a whole kingdom', effects: [{ stat: 'happiness', amount: 6 }, { stat: 'smarts', amount: 1 }], result: 'Every cushion became a castle wall. It was magnificent.' },
      { label: 'Watch cartoons instead', effects: [{ stat: 'happiness', amount: 3 }], result: 'A quiet afternoon can be its own kind of adventure.' },
    ],
  },
  {
    id: 'school_play',
    text: 'The school play needs one more person onstage. The role has three lines and one very dramatic hat.',
    weight: 1.1,
    cooldownYears: 8,
    requires: { minAge: 6, maxAge: 12 },
    choices: [
      { label: 'Audition for it', effects: [{ stat: 'happiness', amount: 5 }, { stat: 'looks', amount: 2 }], result: 'The lines came out perfectly. The hat nearly stole the show.' },
      { label: 'Help backstage', effects: [{ stat: 'smarts', amount: 3 }, { stat: 'happiness', amount: 2 }], result: 'The scenery stayed upright, which felt like a major victory.' },
    ],
  },
  {
    id: 'friendship_rift',
    text: 'A close school friend heard about something unkind you said in a frustrated moment.',
    weight: 1.0,
    once: true,
    requires: { minAge: 10, maxAge: 17 },
    choices: [
      {
        label: 'Apologize honestly',
        effects: [{ stat: 'happiness', amount: -2 }],
        result: 'The apology was awkward but sincere.',
        schedule: { eventId: 'friendship_repaired', inYears: 1 },
      },
      {
        label: 'Wait for it to blow over',
        result: 'Neither of you reached out.',
        schedule: { eventId: 'friendship_drifted', inYears: 2 },
      },
    ],
  },
  {
    id: 'friendship_repaired',
    text: 'The friend you apologized to saved you a seat on the first day back.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Sit together', effects: [{ stat: 'happiness', amount: 7 }], result: 'Some friendships become stronger after the difficult parts.' },
    ],
  },
  {
    id: 'friendship_drifted',
    text: 'An old school friendship has quietly faded into hallway nods and old memories.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Let it go', effects: [{ stat: 'happiness', amount: -4 }], result: 'Not every friendship follows you into the next chapter.' },
    ],
  },
  {
    id: 'scholarship_competition',
    text: 'A local scholarship competition is accepting entries. Winning would mean a lot of late-night preparation.',
    weight: 1.15,
    once: true,
    requires: { minAge: 15, maxAge: 18 },
    choices: [
      {
        label: 'Give it everything',
        effects: [{ stat: 'happiness', amount: -2 }, { stat: 'smarts', amount: 3 }],
        result: 'The application is submitted. Now comes the wait.',
        schedule: { eventId: 'scholarship_win', elseEventId: 'scholarship_shortlist', inYears: 1, chance: 0.38 },
      },
      { label: 'Skip the pressure', effects: [{ stat: 'happiness', amount: 2 }], result: 'You chose a calmer final school year.' },
    ],
  },
  {
    id: 'scholarship_win',
    text: 'The scholarship committee chose your application.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Celebrate the win', effects: [{ stat: 'money', amount: 5000 }, { stat: 'happiness', amount: 8 }], result: 'Five thousand dollars opens up possibilities.' },
    ],
  },
  {
    id: 'scholarship_shortlist',
    text: 'You made the scholarship shortlist, but another student took the top award.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Be proud anyway', effects: [{ stat: 'smarts', amount: 3 }, { stat: 'happiness', amount: 1 }], result: 'The work still sharpened you, even without the prize.' },
    ],
  },

  // --- Adult direction and work -------------------------------------------
  {
    id: 'night_course',
    text: 'A night course could open new doors at work, but it will take months of evenings and weekends.',
    weight: 1.05,
    once: true,
    requires: { minAge: 20, maxAge: 55, employed: true },
    choices: [
      {
        label: 'Enroll for $1,200',
        costGate: 1200,
        effects: [{ stat: 'money', amount: -1200 }, { stat: 'happiness', amount: -3 }],
        result: 'The calendar is packed, but the first class feels promising.',
        schedule: { eventId: 'night_course_payoff', inYears: 2 },
      },
      { label: 'Protect your free time', effects: [{ stat: 'happiness', amount: 3 }], result: 'Ambition can wait. Rest matters too.' },
    ],
  },
  {
    id: 'night_course_payoff',
    text: 'The night course is complete, and the new skills are already changing how people see your work.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Put the skills to use', effects: [{ stat: 'smarts', amount: 9 }, { stat: 'happiness', amount: 4 }], result: 'Those long evenings turned into real momentum.' },
    ],
  },
  {
    id: 'career_burnout',
    text: 'Work has followed you home for weeks. Even a free evening feels like another deadline.',
    weight: 1.0,
    cooldownYears: 10,
    requires: { minAge: 25, maxAge: 60, employed: true },
    choices: [
      {
        label: 'Take a proper break ($1,500)',
        costGate: 1500,
        effects: [{ stat: 'money', amount: -1500 }, { stat: 'health', amount: 6 }, { stat: 'happiness', amount: 8 }],
        result: 'A week away brought your thoughts back into focus.',
      },
      { label: 'Push through it', effects: [{ stat: 'health', amount: -6 }, { stat: 'happiness', amount: -5 }], result: 'The work got done. You are not sure the cost was worth it.' },
    ],
  },
  {
    id: 'side_project',
    text: 'A small personal project is attracting attention online. It could become something real with a little investment.',
    weight: 0.95,
    once: true,
    requires: { minAge: 18, maxAge: 55 },
    choices: [
      {
        label: 'Invest $2,000 and launch',
        costGate: 2000,
        effects: [{ stat: 'money', amount: -2000 }, { stat: 'happiness', amount: 3 }],
        result: 'You polished it, launched it, and watched the first strangers arrive.',
        schedule: { eventId: 'side_project_hit', elseEventId: 'side_project_stall', inYears: 2, chance: 0.42 },
      },
      { label: 'Keep it as a hobby', effects: [{ stat: 'happiness', amount: 5 }], result: 'It stayed small, joyful, and entirely yours.' },
    ],
  },
  {
    id: 'side_project_hit',
    text: 'The side project found its audience. A larger company wants to license it.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Sign the deal', effects: [{ stat: 'money', amount: 18000 }, { stat: 'happiness', amount: 8 }], result: 'A small idea became a very real payday.' },
    ],
  },
  {
    id: 'side_project_stall',
    text: 'The side project never quite found an audience, but building it taught you more than expected.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Keep the lesson', effects: [{ stat: 'smarts', amount: 5 }, { stat: 'happiness', amount: -2 }], result: 'Not every worthwhile project has to become a success story.' },
    ],
  },

  // --- Home, family, and community ----------------------------------------
  {
    id: 'road_trip',
    text: 'A long weekend opens up and the map on the passenger seat is full of possibilities.',
    weight: 1.0,
    cooldownYears: 9,
    requires: { minAge: 18, maxAge: 70, hasVehicle: true },
    choices: [
      { label: 'Take the scenic route ($600)', costGate: 600, effects: [{ stat: 'money', amount: -600 }, { stat: 'happiness', amount: 8 }, { stat: 'health', amount: 2 }], result: 'The road was longer, quieter, and exactly what you needed.' },
      { label: 'Stay close to home', effects: [{ stat: 'happiness', amount: 2 }], result: 'A restful weekend still felt like a reset.' },
    ],
  },
  {
    id: 'home_repair',
    text: 'A leak behind the wall is getting worse. The house has chosen violence.',
    weight: 1.05,
    cooldownYears: 8,
    requires: { minAge: 18, hasProperty: true },
    choices: [
      { label: 'Hire a professional ($1,800)', costGate: 1800, effects: [{ stat: 'money', amount: -1800 }, { stat: 'happiness', amount: 2 }], result: 'The wall is dry, the floor survived, and the invoice hurts.' },
      { label: 'Try fixing it yourself', effects: [{ stat: 'money', amount: -250 }, { stat: 'smarts', amount: 3 }, { stat: 'happiness', amount: -3 }], result: 'Three tutorial videos and two hardware-store trips later, it mostly stopped leaking.' },
    ],
  },
  {
    id: 'child_big_day',
    text: 'One of your children has a big day coming up and keeps checking whether you will be there.',
    weight: 1.1,
    cooldownYears: 6,
    requires: { minAge: 25, maxAge: 75, hasChildren: true },
    choices: [
      { label: 'Clear the whole day', effects: [{ stat: 'happiness', amount: 8 }], result: 'You were in the front row. They found you in the crowd immediately.' },
      { label: 'Promise to make the next one', effects: [{ stat: 'happiness', amount: -6 }], result: 'They said they understood. The disappointment still showed.' },
    ],
  },
  {
    id: 'pet_emergency',
    text: 'Your pet swallowed something that was definitely not food. The emergency vet can see you now.',
    weight: 0.8,
    cooldownYears: 10,
    requires: { minAge: 12, hasPet: true },
    choices: [
      { label: 'Approve treatment ($900)', costGate: 900, effects: [{ stat: 'money', amount: -900 }, { stat: 'happiness', amount: 5 }], result: 'A stressful night ended with a sleepy, healthy pet coming home.' },
      { label: 'Monitor them at home', effects: [{ stat: 'happiness', amount: -5 }], result: 'It was a long night, but they recovered by morning.' },
    ],
  },
  {
    id: 'neighborhood_festival',
    text: 'The neighborhood festival needs volunteers, and someone has already written your name on the signup sheet.',
    weight: 0.9,
    cooldownYears: 7,
    requires: { minAge: 16 },
    choices: [
      { label: 'Run a booth', effects: [{ stat: 'happiness', amount: 6 }, { stat: 'smarts', amount: 2 }], result: 'You met half the neighborhood and somehow won a homemade pie.' },
      { label: 'Just stop by', effects: [{ stat: 'happiness', amount: 3 }], result: 'Music, food, familiar faces. A good afternoon.' },
    ],
  },
  {
    id: 'partner_care',
    text: 'Your partner has been carrying too much lately and finally admits they need support.',
    weight: 0.95,
    cooldownYears: 9,
    requires: { minAge: 30, maxAge: 75, hasPartner: true },
    choices: [
      { label: 'Take something off their plate', effects: [{ stat: 'happiness', amount: 6 }, { stat: 'health', amount: -1 }], result: 'The week was busier for you, but lighter for both of you.' },
      { label: 'Suggest some time apart', effects: [{ stat: 'happiness', amount: -5 }], result: 'The space helped a little, though the conversation is not finished.' },
    ],
  },

  // --- Personal growth and later life -------------------------------------
  {
    id: 'creative_calling',
    text: 'An unfinished creative project has been sitting in a drawer for years. Tonight, it feels possible again.',
    weight: 0.85,
    once: true,
    requires: { minAge: 16, maxAge: 70 },
    choices: [
      {
        label: 'Finish and share it',
        effects: [{ stat: 'happiness', amount: 4 }],
        result: 'You sent it into the world before you could change your mind.',
        schedule: { eventId: 'creative_recognition', elseEventId: 'creative_quiet', inYears: 2, chance: 0.32 },
      },
      { label: 'Keep it private', effects: [{ stat: 'happiness', amount: 3 }], result: 'Finishing it for yourself was enough.' },
    ],
  },
  {
    id: 'creative_recognition',
    text: 'The project you shared has found a small but devoted audience.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Enjoy the moment', effects: [{ stat: 'money', amount: 3500 }, { stat: 'happiness', amount: 9 }, { stat: 'looks', amount: 2 }], result: 'People connected with something only you could have made.' },
    ],
  },
  {
    id: 'creative_quiet',
    text: 'The project never attracted much attention, but one stranger sent a message saying it mattered to them.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Save the message', effects: [{ stat: 'happiness', amount: 5 }], result: 'One person can be an audience worth reaching.' },
    ],
  },
  {
    id: 'last_minute_trip',
    text: 'A last-minute travel deal appears for a place you have always wanted to see.',
    weight: 0.9,
    cooldownYears: 8,
    requires: { minAge: 21, maxAge: 75 },
    choices: [
      { label: 'Book it for $1,000', costGate: 1000, effects: [{ stat: 'money', amount: -1000 }, { stat: 'happiness', amount: 9 }, { stat: 'smarts', amount: 2 }], result: 'You came home tired, inspired, and full of stories.' },
      { label: 'Save the money', effects: [{ stat: 'happiness', amount: -1 }, { stat: 'money', amount: 100 }], result: 'The sensible choice leaves a little extra in the travel fund.' },
    ],
  },
  {
    id: 'memoir_project',
    text: 'Someone suggests writing down the stories of your life before the details begin to blur.',
    weight: 1.1,
    once: true,
    requires: { minAge: 65 },
    choices: [
      {
        label: 'Start writing',
        effects: [{ stat: 'happiness', amount: 4 }, { stat: 'smarts', amount: 2 }],
        result: 'The first page becomes ten, then fifty.',
        schedule: { eventId: 'memoir_finished', inYears: 3 },
      },
      { label: 'Tell the stories in person', effects: [{ stat: 'happiness', amount: 5 }], result: 'The best stories change a little every time they are told.' },
    ],
  },
  {
    id: 'memoir_finished',
    text: 'The memoir is finished. Holding a whole life in your hands feels impossible and wonderful.',
    weight: 0,
    scheduledOnly: true,
    choices: [
      { label: 'Share it with the family', effects: [{ stat: 'happiness', amount: 10 }], result: 'The stories will outlive the moments that inspired them.' },
    ],
  },
];
