/**
 * Education programs. Ids match the monolith's DEGREES so career gating and
 * degreeById lookups keep working; this layer adds the depth the charter
 * calls for — study duration, the skills a field builds, and scholarship
 * thresholds. Tuition is the sticker price before any scholarship.
 */
/** Skill identifiers match SKILLS in src/domain/skills.ts. */
type SkillId = string;

export type Tier = 'High School' | 'Trade School' | 'University';

export interface Program {
  readonly id: string;
  readonly name: string;
  readonly tier: Tier;
  readonly field: string | null;
  /** Sticker tuition before scholarships, total across the program. */
  readonly tuition: number;
  /** Smarts awarded on graduation. */
  readonly smarts: number;
  /** Program that must already be completed to enroll. */
  readonly prereq: string | null;
  /** Years of study. Grades accrue each year; the degree lands at the end. */
  readonly years: number;
  /** Skills this field builds while enrolled, a little each year. */
  readonly skills: readonly SkillId[];
  /** Minimum smarts to be admitted. */
  readonly minSmarts: number;
}

export const PROGRAMS: readonly Program[] = [
  { id: 'hs', name: 'High School Diploma', tier: 'High School', field: null, tuition: 0, smarts: 0, prereq: null, years: 1, skills: [], minSmarts: 0 },

  { id: 'trade_elec', name: 'Electrical Trade Cert', tier: 'Trade School', field: 'Trade', tuition: 4000, smarts: 8, prereq: 'hs', years: 2, skills: ['leadership'], minSmarts: 15 },
  { id: 'trade_plumb', name: 'Plumbing Trade Cert', tier: 'Trade School', field: 'Trade', tuition: 4000, smarts: 8, prereq: 'hs', years: 2, skills: ['leadership'], minSmarts: 15 },
  { id: 'trade_hvac', name: 'HVAC Trade Cert', tier: 'Trade School', field: 'Trade', tuition: 4000, smarts: 8, prereq: 'hs', years: 2, skills: ['leadership'], minSmarts: 15 },
  { id: 'trade_culinary', name: 'Culinary Trade Cert', tier: 'Trade School', field: 'Trade', tuition: 3500, smarts: 6, prereq: 'hs', years: 2, skills: ['cooking', 'creativity'], minSmarts: 10 },

  { id: 'deg_business', name: 'Business Degree', tier: 'University', field: 'Business', tuition: 18000, smarts: 14, prereq: 'hs', years: 4, skills: ['leadership', 'negotiation', 'finance'], minSmarts: 30 },
  { id: 'deg_finance', name: 'Finance Degree', tier: 'University', field: 'Business', tuition: 21000, smarts: 15, prereq: 'hs', years: 4, skills: ['finance', 'negotiation'], minSmarts: 35 },
  { id: 'deg_cs', name: 'Computer Science Degree', tier: 'University', field: 'Tech', tuition: 22000, smarts: 16, prereq: 'hs', years: 4, skills: ['programming', 'creativity'], minSmarts: 40 },
  { id: 'deg_engineering', name: 'Engineering Degree', tier: 'University', field: 'Engineering', tuition: 24000, smarts: 17, prereq: 'hs', years: 4, skills: ['programming', 'leadership'], minSmarts: 42 },
  { id: 'deg_nursing', name: 'Nursing Degree', tier: 'University', field: 'Healthcare', tuition: 20000, smarts: 15, prereq: 'hs', years: 4, skills: ['fitness', 'charisma'], minSmarts: 38 },
  { id: 'deg_medicine', name: 'Medical Degree', tier: 'University', field: 'Healthcare', tuition: 40000, smarts: 20, prereq: 'hs', years: 6, skills: ['fitness', 'leadership'], minSmarts: 55 },
  { id: 'deg_law', name: 'Law Degree', tier: 'University', field: 'Law', tuition: 30000, smarts: 18, prereq: 'hs', years: 5, skills: ['negotiation', 'charisma', 'leadership'], minSmarts: 48 },
  { id: 'deg_science', name: 'Science Degree', tier: 'University', field: 'Science', tuition: 20000, smarts: 15, prereq: 'hs', years: 4, skills: ['programming', 'creativity'], minSmarts: 40 },
  { id: 'deg_arts', name: 'Fine Arts Degree', tier: 'University', field: 'Arts & Media', tuition: 16000, smarts: 10, prereq: 'hs', years: 4, skills: ['creativity', 'charisma'], minSmarts: 20 },
  { id: 'deg_communications', name: 'Communications Degree', tier: 'University', field: 'Arts & Media', tuition: 16000, smarts: 11, prereq: 'hs', years: 4, skills: ['charisma', 'negotiation'], minSmarts: 25 },
  { id: 'deg_education', name: 'Education Degree', tier: 'University', field: 'Education', tuition: 17000, smarts: 12, prereq: 'hs', years: 4, skills: ['leadership', 'charisma'], minSmarts: 28 },
];

export const SCHOLARSHIP = {
  /** Smarts at/above which a partial merit scholarship kicks in. */
  meritSmarts: 60,
  /** Smarts at/above which a large merit scholarship kicks in. */
  highMeritSmarts: 80,
  partialAward: 0.4,
  highAward: 0.75,
  /** GPA at/above which a scholarship renews each year. */
  renewGpa: 3.5,
} as const;

/** Skill points gained per year of study, per listed field skill. */
export const STUDY_SKILL_GAIN_PER_YEAR = 6;
