/**
 * Business gameplay loop: staffing, marketing, reputation, competition,
 * and bankruptcy. Owner skills matter — leadership lifts staff output,
 * finance trims expenses, charisma amplifies marketing. Three straight
 * losing years fold a business.
 */
import { BUSINESS_TYPES } from '../data/businesses';
import { Rng } from './rng';
import type { GameState } from './state';

export interface BusinessType {
  id: string;
  name: string;
  icon: string;
  cost: number;
  weeklyRevenue: number;
  weeklyExpense: number;
  minSmarts: number;
  category: string;
  maxStaff: number;
  staffSalaryWeek: number;
  staffRevenueWeek: number;
}

/** A business as stored in the save. Pre-v1.4 records lack the new fields. */
export interface OwnedBusiness {
  typeId: string;
  level: number;
  totalInvested: number;
  reputation?: number;
  staff?: number;
  marketingYears?: number;
  lossYears?: number;
  [monolithField: string]: unknown;
}

export interface FeedMessage {
  text: string;
  deltas?: [string, number][];
}

export interface BusinessTickResult {
  messages: FeedMessage[];
  /** Combined yearly net across all businesses; caller applies to money. */
  netTotal: number;
}

const LEVEL_REVENUE_GROWTH = 1.18;
const LEVEL_EXPENSE_GROWTH = 1.08;
const MARKETING_COST_RATE = 0.08; // of the founding cost
const MARKETING_MULT = 1.15;
const BANKRUPTCY_LOSS_YEARS = 3;

export function catalog(): readonly BusinessType[] {
  return BUSINESS_TYPES;
}

export function typeById(id: string): BusinessType | null {
  return BUSINESS_TYPES.find((t) => t.id === id) ?? null;
}

/** Backfill v1.4 fields on a business from an older save. */
export function ensureBusiness(biz: OwnedBusiness): void {
  if (typeof biz.reputation !== 'number') biz.reputation = 50;
  if (typeof biz.staff !== 'number') biz.staff = 0;
  if (typeof biz.marketingYears !== 'number') biz.marketingYears = 0;
  if (typeof biz.lossYears !== 'number') biz.lossYears = 0;
}

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function skill(state: GameState, id: string): number {
  return (state.skills && (state.skills as Record<string, number>)[id]) || 0;
}

export function weeklyRevenue(state: GameState, biz: OwnedBusiness): number {
  const def = typeById(biz.typeId);
  if (!def) return 0;
  ensureBusiness(biz);
  const base = def.weeklyRevenue * Math.pow(LEVEL_REVENUE_GROWTH, biz.level - 1);
  // Leadership makes a team produce beyond its headcount.
  const staffOut = (biz.staff as number) * def.staffRevenueWeek * (1 + skill(state, 'leadership') / 200);
  const repMult = 0.7 + ((biz.reputation as number) / 100) * 0.6; // 0.7 .. 1.3
  const marketing = (biz.marketingYears as number) > 0 ? MARKETING_MULT : 1;
  return Math.round((base + staffOut) * repMult * marketing);
}

export function weeklyExpense(state: GameState, biz: OwnedBusiness): number {
  const def = typeById(biz.typeId);
  if (!def) return 0;
  ensureBusiness(biz);
  const base = def.weeklyExpense * Math.pow(LEVEL_EXPENSE_GROWTH, biz.level - 1);
  const payroll = (biz.staff as number) * def.staffSalaryWeek;
  // Finance skill trims overhead, up to 10%.
  const trim = 1 - Math.min(0.1, skill(state, 'finance') / 1000);
  return Math.round((base + payroll) * trim);
}

export function weeklyNet(state: GameState, biz: OwnedBusiness): number {
  return weeklyRevenue(state, biz) - weeklyExpense(state, biz);
}

export function marketingCost(biz: OwnedBusiness): number {
  const def = typeById(biz.typeId);
  return def ? Math.round(def.cost * MARKETING_COST_RATE) : 0;
}

export interface ActionResult {
  ok: boolean;
  reason?: string;
}

export function hireStaff(biz: OwnedBusiness): ActionResult {
  const def = typeById(biz.typeId);
  if (!def) return { ok: false, reason: 'Unknown business.' };
  ensureBusiness(biz);
  if ((biz.staff as number) >= def.maxStaff) return { ok: false, reason: 'Fully staffed.' };
  biz.staff = (biz.staff as number) + 1;
  return { ok: true };
}

export function letStaffGo(biz: OwnedBusiness): ActionResult {
  ensureBusiness(biz);
  if ((biz.staff as number) <= 0) return { ok: false, reason: 'No staff to let go.' };
  biz.staff = (biz.staff as number) - 1;
  biz.reputation = clamp100((biz.reputation as number) - 2);
  return { ok: true };
}

/** Charisma makes campaigns land harder. Costs money; caller checks funds. */
export function runMarketing(state: GameState, biz: OwnedBusiness, rng: Rng): ActionResult {
  const cost = marketingCost(biz);
  if (state.money < cost) return { ok: false, reason: `Needs $${cost.toLocaleString('en-US')}.` };
  ensureBusiness(biz);
  state.money -= cost;
  biz.marketingYears = 2;
  const lift = rng.int(3, 6) + Math.round(skill(state, 'charisma') / 25);
  biz.reputation = clamp100((biz.reputation as number) + lift);
  return { ok: true };
}

/**
 * One simulated year for every business the player owns. Applies reputation
 * drift, marketing decay, competition, revenue swings, and bankruptcy;
 * returns the combined net for the caller to apply to money.
 */
export function businessYearTick(state: GameState, rng: Rng): BusinessTickResult {
  const result: BusinessTickResult = { messages: [], netTotal: 0 };
  if (!Array.isArray(state.businesses) || state.businesses.length === 0) return result;

  const survivors: OwnedBusiness[] = [];
  for (const biz of state.businesses as OwnedBusiness[]) {
    const def = typeById(biz.typeId);
    if (!def) continue; // catalog changed under an old save — drop quietly
    ensureBusiness(biz);

    let net = weeklyNet(state, biz) * 52;

    // Some years just swing (kept from the legacy sim).
    if (rng.chance(0.2)) {
      const swingPct = rng.int(-40, 60);
      const swing = Math.round((net * swingPct) / 100);
      net += swing;
      if (Math.abs(swingPct) >= 25) {
        result.messages.push({
          text: `${def.name} had a ${swingPct >= 0 ? 'banner' : 'rough'} year — ${swingPct >= 0 ? '+' : ''}$${Math.abs(swing).toLocaleString('en-US')} ${swingPct >= 0 ? 'extra' : 'less'} than usual.`,
        });
      }
    }

    // A rival can move in on the block.
    if (rng.chance(0.08)) {
      const hit = rng.int(5, 12);
      biz.reputation = clamp100((biz.reputation as number) - hit);
      result.messages.push({ text: `A competitor opened near ${def.name}. The neighborhood noticed.` });
    }

    // Reputation drifts: investment in people and marketing pays; coasting costs.
    if ((biz.marketingYears as number) > 0 || (biz.staff as number) >= Math.ceil(def.maxStaff / 2)) {
      biz.reputation = clamp100((biz.reputation as number) + rng.int(1, 3));
    } else {
      biz.reputation = clamp100((biz.reputation as number) - rng.int(0, 2));
    }
    if ((biz.marketingYears as number) > 0) biz.marketingYears = (biz.marketingYears as number) - 1;

    // Three straight losing years and the doors close.
    biz.lossYears = net < 0 ? (biz.lossYears as number) + 1 : 0;
    if ((biz.lossYears as number) >= BANKRUPTCY_LOSS_YEARS) {
      const salvage = Math.round(biz.totalInvested * 0.25);
      result.netTotal += salvage;
      state.happiness = clamp100(state.happiness - rng.int(5, 10));
      result.messages.push({
        text: `${def.name} went under after ${BANKRUPTCY_LOSS_YEARS} losing years. Assets salvaged: $${salvage.toLocaleString('en-US')}.`,
      });
      continue; // not a survivor
    }

    result.netTotal += net;
    survivors.push(biz);
  }
  state.businesses = survivors;
  return result;
}
