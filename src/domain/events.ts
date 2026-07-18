/**
 * Event engine. Interprets the data in data/events.ts: draws eligible
 * spontaneous events, fires scheduled follow-ups when they come due, and lets
 * a resolved choice queue the next beat of a chain. This is what makes events
 * chain into multi-year narratives instead of firing in isolation.
 *
 * Presentation stays in the monolith: the engine hands back a plain
 * "instance" ({ id, text, choices }) that the monolith shows as a pending
 * choice, then calls resolveChoiceSchedule when the player picks.
 */
import { DEFAULT_COOLDOWN_YEARS, EVENTS, type EventChoice, type EventDef } from '../data/events';
import { Rng } from './rng';
import type { GameState } from './state';

export type { EventChoice };

export interface ScheduledEvent {
  eventId: string;
  dueAge: number;
  chance?: number;
  elseEventId?: string;
}

export interface EventsState {
  /** Pending future beats, keyed by the age they fire. */
  scheduled: ScheduledEvent[];
  /** Ids of once-only events already seen. */
  fired: string[];
  /** Age each event last fired at, for repeat cooldowns. */
  lastFiredAge: Record<string, number>;
}

export interface EventInstance {
  id: string;
  text: string;
  choices: EventChoice[];
}

export function ensureEvents(state: GameState): EventsState {
  const s = state as unknown as { events?: EventsState };
  if (!s.events) s.events = { scheduled: [], fired: [], lastFiredAge: {} };
  if (!Array.isArray(s.events.scheduled)) s.events.scheduled = [];
  if (!Array.isArray(s.events.fired)) s.events.fired = [];
  if (typeof s.events.lastFiredAge !== 'object' || s.events.lastFiredAge === null) s.events.lastFiredAge = {};
  return s.events;
}

function eventById(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}

function meetsRequirements(state: GameState, def: EventDef): boolean {
  const r = def.requires;
  if (!r) return true;
  if (r.minAge !== undefined && state.age < r.minAge) return false;
  if (r.maxAge !== undefined && state.age > r.maxAge) return false;
  if (r.hasPartner && !state.partner) return false;
  if (r.employed && (!state.job || state.job === 'unemployed')) return false;
  if (r.minMoney !== undefined && state.money < r.minMoney) return false;
  return true;
}

function toInstance(def: EventDef): EventInstance {
  return { id: def.id, text: def.text, choices: def.choices.map((c) => ({ ...c })) };
}

/**
 * The next event to present this year, or null. Scheduled follow-ups that are
 * due take priority over spontaneous draws so chains resolve on time. Call
 * once per year, after other systems have ticked.
 */
export function drawEvent(state: GameState, rng: Rng): EventInstance | null {
  const es = ensureEvents(state);

  // 1. Fire the earliest due scheduled event, resolving any chance branch.
  const dueIdx = es.scheduled.findIndex((s) => s.dueAge <= state.age);
  if (dueIdx !== -1) {
    const [due] = es.scheduled.splice(dueIdx, 1);
    let targetId = due.eventId;
    if (due.chance !== undefined && !rng.chance(due.chance)) {
      if (!due.elseEventId) return drawEvent(state, rng); // branch fizzled; try a spontaneous event
      targetId = due.elseEventId;
    }
    const def = eventById(targetId);
    if (!def) return null;
    markFired(es, def, state.age);
    return toInstance(def);
  }

  // 2. Otherwise draw a spontaneous, eligible event. Repeatable events sit
  // out their cooldown so the same beat can't dominate consecutive years.
  const pool = EVENTS.filter(
    (e) =>
      !e.scheduledOnly &&
      e.weight > 0 &&
      (!e.once || !es.fired.includes(e.id)) &&
      offCooldown(es, e, state.age) &&
      meetsRequirements(state, e),
  );
  if (pool.length === 0) return null;
  const def = rng.weighted(pool.map((e) => [e, e.weight] as const));
  markFired(es, def, state.age);
  return toInstance(def);
}

function offCooldown(es: EventsState, def: EventDef, age: number): boolean {
  const last = es.lastFiredAge[def.id];
  if (last === undefined) return true;
  return age - last >= (def.cooldownYears ?? DEFAULT_COOLDOWN_YEARS);
}

function markFired(es: EventsState, def: EventDef, age: number): void {
  if (def.once && !es.fired.includes(def.id)) es.fired.push(def.id);
  es.lastFiredAge[def.id] = age;
}

/**
 * Apply the scheduling consequence of a chosen option. The monolith already
 * applies the choice's immediate effects and result line; this only queues
 * the follow-up beat, if any.
 */
export function resolveChoiceSchedule(state: GameState, choice: EventChoice): void {
  if (!choice.schedule) return;
  const es = ensureEvents(state);
  es.scheduled.push({
    eventId: choice.schedule.eventId,
    dueAge: state.age + choice.schedule.inYears,
    chance: choice.schedule.chance,
    elseEventId: choice.schedule.elseEventId,
  });
}

/** Whether the player can afford a choice's cost gate. */
export function choiceAffordable(state: GameState, choice: EventChoice): boolean {
  if (choice.costGate === undefined) return true;
  return state.money >= choice.costGate;
}

/** How many follow-up beats are currently queued (for tests/telemetry). */
export function pendingCount(state: GameState): number {
  return ensureEvents(state).scheduled.length;
}
