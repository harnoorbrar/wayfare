/**
 * Education engine. Enrolling starts a multi-year program: each year the
 * student earns a grade (driven by smarts, effort, and a little luck),
 * builds the field's skills, and pays tuition net of any scholarship. On
 * graduation the degree is recorded on state.degrees — the same field the
 * career ladders gate on — plus a smarts bump scaled by final GPA.
 */
import { PROGRAMS, SCHOLARSHIP, STUDY_SKILL_GAIN_PER_YEAR, type Program } from '../data/education';
import { Rng } from './rng';
import type { GameState } from './state';

export interface Enrollment {
  programId: string;
  /** Completed years of study so far. */
  yearsDone: number;
  /** Total program length, copied so retuning data can't strand a student. */
  totalYears: number;
  /** Sum of yearly grade points (0-4 each), for GPA. */
  gradePoints: number;
  /** Fraction of tuition covered by scholarship, 0-1, set at enrollment. */
  scholarship: number;
  /** Per-year tuition the student actually owes after scholarship. */
  yearlyTuition: number;
}

export interface EducationState {
  current: Enrollment | null;
  /** Completed program ids with their final GPA, for transcripts. */
  transcript: { programId: string; gpa: number }[];
}

export function programById(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

export function ensureEducation(state: GameState): EducationState {
  const s = state as unknown as { education?: EducationState };
  if (!s.education) s.education = { current: null, transcript: [] };
  if (!Array.isArray(s.education.transcript)) s.education.transcript = [];
  if (s.education.current === undefined) s.education.current = null;
  return s.education;
}

export function hasDegree(state: GameState, id: string): boolean {
  return Array.isArray(state.degrees) && state.degrees.includes(id);
}

export interface EnrollResult {
  ok: boolean;
  reason?: string;
  scholarship?: number;
}

/** Merit scholarship fraction from smarts. Renews yearly if GPA holds. */
export function scholarshipFor(smarts: number): number {
  if (smarts >= SCHOLARSHIP.highMeritSmarts) return SCHOLARSHIP.highAward;
  if (smarts >= SCHOLARSHIP.meritSmarts) return SCHOLARSHIP.partialAward;
  return 0;
}

export function canEnroll(state: GameState, program: Program): EnrollResult {
  if (ensureEducation(state).current) return { ok: false, reason: 'Already enrolled in a program.' };
  if (hasDegree(state, program.id)) return { ok: false, reason: 'Already completed.' };
  if (program.prereq && !hasDegree(state, program.prereq)) {
    const pre = programById(program.prereq);
    return { ok: false, reason: `Needs ${pre ? pre.name : program.prereq} first.` };
  }
  if (state.age < 18 && program.tier !== 'High School') return { ok: false, reason: 'Must be 18+ to enroll.' };
  if (state.smarts < program.minSmarts) return { ok: false, reason: `Needs ${program.minSmarts} smarts to be admitted.` };
  return { ok: true, scholarship: scholarshipFor(state.smarts) };
}

/** Begin a program. Records the enrollment and locks in the scholarship. */
export function enroll(state: GameState, programId: string): EnrollResult {
  const program = programById(programId);
  if (!program) return { ok: false, reason: 'Unknown program.' };
  const check = canEnroll(state, program);
  if (!check.ok) return check;

  const scholarship = check.scholarship ?? 0;
  const netTuition = program.tuition * (1 - scholarship);
  ensureEducation(state).current = {
    programId,
    yearsDone: 0,
    totalYears: program.years,
    gradePoints: 0,
    scholarship,
    yearlyTuition: Math.round(netTuition / program.years),
  };
  return { ok: true, scholarship };
}

export interface EducationMessage {
  text: string;
  deltas?: [string, number][];
}

export interface EducationTickResult {
  messages: EducationMessage[];
  graduated: boolean;
}

/** Grade point (0-4) earned this year, from smarts plus a little variance. */
function yearGrade(smarts: number, rng: Rng): number {
  const base = (smarts / 100) * 4;
  const grade = base + rng.float(-0.6, 0.6);
  return Math.max(0, Math.min(4, grade));
}

function gpa(enr: Enrollment): number {
  if (enr.yearsDone === 0) return 0;
  return Math.round((enr.gradePoints / enr.yearsDone) * 100) / 100;
}

/**
 * One year of study. Charges net tuition (as student debt), accrues a grade,
 * builds field skills, and graduates when the program is complete. Returns
 * without effect if the player isn't enrolled.
 */
export function educationYearTick(state: GameState, rng: Rng): EducationTickResult {
  const edu = ensureEducation(state);
  const enr = edu.current;
  if (!enr) return { messages: [], graduated: false };

  const program = programById(enr.programId);
  if (!program) {
    edu.current = null;
    return { messages: [], graduated: false };
  }

  const messages: EducationMessage[] = [];

  // Tuition for the year becomes student debt (scholarship already applied).
  if (enr.yearlyTuition > 0) state.studentLoans = (state.studentLoans || 0) + enr.yearlyTuition;

  // Grade for the year.
  enr.gradePoints += yearGrade(state.smarts, rng);
  enr.yearsDone++;

  // Field skills grow with study.
  if (!state.skills) state.skills = {};
  for (const skill of program.skills) {
    state.skills[skill] = Math.min(100, (state.skills[skill] || 0) + STUDY_SKILL_GAIN_PER_YEAR);
  }

  if (enr.yearsDone < enr.totalYears) {
    messages.push({ text: `${state.name} finished year ${enr.yearsDone} of ${program.name} (GPA ${gpa(enr).toFixed(2)}).` });
    return { messages, graduated: false };
  }

  // Graduation: award the degree and a GPA-scaled smarts bump.
  const finalGpa = gpa(enr);
  state.degrees = state.degrees || [];
  if (!state.degrees.includes(program.id)) state.degrees.push(program.id);
  const smartsGain = Math.round(program.smarts * (0.6 + 0.4 * (finalGpa / 4)));
  state.smarts = Math.min(100, (state.smarts || 0) + smartsGain);
  edu.transcript.push({ programId: program.id, gpa: finalGpa });
  edu.current = null;

  const honors = finalGpa >= 3.7 ? ' with honors' : '';
  messages.push({
    text: `${state.name} graduated from ${program.name}${honors} (GPA ${finalGpa.toFixed(2)}). +${smartsGain} smarts.`,
    deltas: [['smarts', smartsGain]],
  });
  return { messages, graduated: true };
}

/** Current GPA of an in-progress program, or the last completed one. */
export function currentGpa(state: GameState): number | null {
  const edu = ensureEducation(state);
  if (edu.current && edu.current.yearsDone > 0) return gpa(edu.current);
  const last = edu.transcript[edu.transcript.length - 1];
  return last ? last.gpa : null;
}
