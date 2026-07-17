/**
 * Financial system. Everything here is priced off the live world economy:
 * investment returns track the actual market move, loan and savings rates
 * come from the central-bank rate, income tax follows the elected rate, and
 * a credit score gates borrowing. No fixed returns or rates live in here.
 */
import { assetReturn, creditCardRate, personalLoanRate, type AssetId, type WorldState } from './world';
import { Rng } from './rng';
import type { GameState } from './state';

// ---------------------------------------------------------------------------
// Income tax
// ---------------------------------------------------------------------------

export interface TaxResult {
  gross: number;
  tax: number;
  net: number;
  rate: number;
}

/** Apply the elected income-tax rate to a gross amount. */
export function taxIncome(world: WorldState, gross: number): TaxResult {
  const rate = world.taxRate;
  const tax = Math.max(0, Math.round(gross * (rate / 100)));
  return { gross, tax, net: gross - tax, rate };
}

// ---------------------------------------------------------------------------
// Credit score
// ---------------------------------------------------------------------------

export interface Loan {
  /** Stable id so the UI can address a specific loan. */
  id: number;
  kind: 'personal' | 'car' | 'student' | 'business';
  principal: number;
  balance: number;
  /** Fixed annual rate locked in at origination, percent. */
  rate: number;
  /** Scheduled yearly payment. */
  yearlyPayment: number;
  termYears: number;
  openedAge: number;
}

export interface CreditProfile {
  /** Lifetime on-time yearly payments. */
  onTimePayments: number;
  /** Lifetime missed yearly payments. */
  missedPayments: number;
  /** Has ever defaulted / gone bankrupt. */
  defaulted: boolean;
}

export const CREDIT = {
  min: 300,
  max: 850,
  base: 580,
} as const;

/**
 * FICO-ish score in [300, 850] from net worth, debt load, and payment
 * history. Deterministic — no RNG, so the UI and lenders always agree.
 */
export function creditScore(state: GameState): number {
  const credit = ensureCredit(state);
  let score = CREDIT.base;

  // Net worth: liquid assets minus debt, mapped onto a gentle curve.
  const debt = totalDebt(state);
  const liquid = state.money + state.savings + investmentValue(state);
  const net = liquid - debt;
  score += Math.round(120 * Math.tanh(net / 200000));

  // Payment history dominates real scores; mirror that.
  const totalPayments = credit.onTimePayments + credit.missedPayments;
  if (totalPayments > 0) {
    const ratio = credit.onTimePayments / totalPayments;
    score += Math.round((ratio - 0.5) * 200);
  }
  score -= credit.missedPayments * 12;
  if (credit.defaulted) score -= 120;

  // A little credit history (age) helps.
  score += Math.min(40, Math.max(0, state.age - 18));

  return Math.max(CREDIT.min, Math.min(CREDIT.max, Math.round(score)));
}

export function creditBand(score: number): string {
  if (score >= 800) return 'Exceptional';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------

export interface Financials {
  loans: Loan[];
  nextLoanId: number;
  credit: CreditProfile;
}

/** Lazily attach the finance sub-state (older saves won't have it). */
export function ensureFinancials(state: GameState): Financials {
  const s = state as unknown as { financials?: Financials };
  if (!s.financials) {
    s.financials = { loans: [], nextLoanId: 1, credit: { onTimePayments: 0, missedPayments: 0, defaulted: false } };
  }
  const f = s.financials;
  if (!Array.isArray(f.loans)) f.loans = [];
  if (typeof f.nextLoanId !== 'number') f.nextLoanId = f.loans.length + 1;
  if (!f.credit) f.credit = { onTimePayments: 0, missedPayments: 0, defaulted: false };
  return f;
}

function ensureCredit(state: GameState): CreditProfile {
  return ensureFinancials(state).credit;
}

export function totalDebt(state: GameState): number {
  const f = ensureFinancials(state);
  const loanDebt = f.loans.reduce((sum, l) => sum + l.balance, 0);
  return loanDebt + (state.mortgageBalance || 0) + (state.studentLoans || 0);
}

export function investmentValue(state: GameState): number {
  const inv = state.investments || {};
  return Object.values(inv).reduce((sum: number, v) => sum + (typeof v === 'number' ? v : 0), 0);
}

/** Largest personal loan the player qualifies for, by score and income. */
export function borrowingLimit(state: GameState): number {
  const score = creditScore(state);
  if (score < 580) return 0;
  const incomeBasis = Math.max(state.salary * 52, 5000);
  const multiple = score >= 740 ? 4 : score >= 670 ? 3 : 1.5;
  const existing = totalDebt(state);
  return Math.max(0, Math.round(incomeBasis * multiple - existing));
}

export interface LoanQuote {
  approved: boolean;
  reason?: string;
  rate: number;
  yearlyPayment: number;
  termYears: number;
}

/** Quote a personal loan at the current economy's rate, gated by credit. */
export function quotePersonalLoan(state: GameState, world: WorldState, amount: number, termYears = 5): LoanQuote {
  const baseRate = personalLoanRate(world);
  const score = creditScore(state);
  // Riskier borrowers pay a premium on top of the market rate.
  const premium = score >= 740 ? 0 : score >= 670 ? 2 : score >= 580 ? 6 : 12;
  const rate = Math.round((baseRate + premium) * 100) / 100;
  const yearlyPayment = amortizedPayment(amount, rate, termYears);

  if (score < 580) return { approved: false, reason: 'Credit score too low.', rate, yearlyPayment, termYears };
  if (amount > borrowingLimit(state)) {
    return { approved: false, reason: 'Amount exceeds your borrowing limit.', rate, yearlyPayment, termYears };
  }
  return { approved: true, rate, yearlyPayment, termYears };
}

/** Fixed yearly payment that amortizes a loan over its term. */
export function amortizedPayment(principal: number, ratePct: number, termYears: number): number {
  const r = ratePct / 100;
  if (r <= 0) return Math.round(principal / termYears);
  const factor = (r * Math.pow(1 + r, termYears)) / (Math.pow(1 + r, termYears) - 1);
  return Math.round(principal * factor);
}

/** Take out a personal loan; cash goes to the player, a Loan is recorded. */
export function takePersonalLoan(state: GameState, world: WorldState, amount: number, termYears = 5): LoanQuote {
  const quote = quotePersonalLoan(state, world, amount, termYears);
  if (!quote.approved) return quote;
  const f = ensureFinancials(state);
  f.loans.push({
    id: f.nextLoanId++,
    kind: 'personal',
    principal: amount,
    balance: amount,
    rate: quote.rate,
    yearlyPayment: quote.yearlyPayment,
    termYears,
    openedAge: state.age,
  });
  state.money += amount;
  return quote;
}

// ---------------------------------------------------------------------------
// Yearly tick
// ---------------------------------------------------------------------------

export interface FinanceMessage {
  text: string;
  deltas?: [string, number][];
}

export interface FinanceTickResult {
  messages: FinanceMessage[];
  /** Net cash effect to apply to state.money (loan payments, etc.). */
  cashDelta: number;
  /** Per-asset return percentages this year, for UI. */
  returns: Record<string, number>;
}

/**
 * One financial year: mark investments to the market, service loans, update
 * payment history. Investment growth uses the world's actual market move so
 * a crash hits every portfolio at once. Salary tax is handled at income time
 * in the monolith; this covers the balance-sheet side.
 */
export function financeYearTick(state: GameState, world: WorldState, rng: Rng): FinanceTickResult {
  const messages: FinanceMessage[] = [];
  const returns: Record<string, number> = {};
  let cashDelta = 0;

  // Investments track the market. Bonds lean on rates, crypto amplifies.
  const inv = state.investments || {};
  for (const key of Object.keys(inv) as AssetId[]) {
    const bal = inv[key];
    if (typeof bal !== 'number' || bal <= 0) {
      returns[key] = 0;
      continue;
    }
    const pct = assetReturn(world, key, world.marketChangePct, rng);
    const change = Math.round((bal * pct) / 100);
    inv[key] = Math.max(0, bal + change);
    returns[key] = pct;
    if (Math.abs(pct) >= 15) {
      messages.push({
        text: `${state.name}'s ${key} ${change >= 0 ? 'jumped' : 'dropped'} ${Math.abs(pct)}% this year (${change >= 0 ? '+' : ''}${change}).`,
      });
    }
  }

  // Service outstanding loans.
  const f = ensureFinancials(state);
  const survivingLoans: Loan[] = [];
  for (const loan of f.loans) {
    const interest = Math.round((loan.balance * loan.rate) / 100);
    const due = Math.min(loan.balance + interest, loan.yearlyPayment);
    const canPay = state.money + state.savings >= due;

    if (canPay) {
      cashDelta -= due;
      loan.balance = Math.max(0, loan.balance + interest - due);
      f.credit.onTimePayments++;
      if (loan.balance <= 0) {
        messages.push({ text: `${state.name} paid off a ${loan.kind} loan.` });
      } else {
        survivingLoans.push(loan);
      }
    } else {
      // Missed payment: interest compounds, credit takes a hit.
      loan.balance += interest;
      f.credit.missedPayments++;
      messages.push({ text: `${state.name} missed a ${loan.kind} loan payment. Credit took a hit.` });
      survivingLoans.push(loan);
    }
  }
  f.loans = survivingLoans;

  return { messages, cashDelta, returns };
}
