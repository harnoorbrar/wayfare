/**
 * Career track data.
 *
 * Every profession is a ladder inside a track — never a flat salary list.
 * Levels whose ids match the pre-v1.2 JOBS list keep those exact ids so
 * existing saves slot into the ladders unchanged. Levels with `entry: true`
 * can be applied to directly; the rest are reached only by promotion.
 *
 * Requirements are checked against the NEXT level when promoting: minYears
 * is time served at the previous level, skills are the player's skill bars.
 */
import type { CareerLevel, CareerTrack } from '../domain/careers';

function level(l: CareerLevel): CareerLevel {
  return l;
}

export const CAREER_TRACKS: readonly CareerTrack[] = [
  {
    id: 'retail',
    name: 'Retail',
    levels: [
      level({
        id: 'retail', title: 'Retail Associate', payWeek: 480, category: 'Entry-Level', entry: true,
        requirements: { minSmarts: 0, degree: null, minYears: 0, skills: {} },
        skillGrowth: { charisma: 3, negotiation: 2 }, stress: 30, prestige: 10,
        promotionChance: 0.35, terminationChance: 0.02,
      }),
      level({
        id: 'store_manager', title: 'Store Manager', payWeek: 950, category: 'Entry-Level', entry: false,
        requirements: { minSmarts: 25, degree: null, minYears: 3, skills: { charisma: 20, leadership: 10 } },
        skillGrowth: { leadership: 4, negotiation: 2 }, stress: 50, prestige: 30,
        promotionChance: 0, terminationChance: 0.02,
      }),
    ],
  },
  {
    id: 'hospitality',
    name: 'Hospitality',
    levels: [
      level({
        id: 'barista', title: 'Barista', payWeek: 420, category: 'Entry-Level', entry: true,
        requirements: { minSmarts: 0, degree: null, minYears: 0, skills: {} },
        skillGrowth: { charisma: 3, cooking: 2 }, stress: 30, prestige: 10,
        promotionChance: 0.35, terminationChance: 0.02,
      }),
      level({
        id: 'server', title: 'Restaurant Server', payWeek: 460, category: 'Entry-Level', entry: true,
        requirements: { minSmarts: 0, degree: null, minYears: 1, skills: {} },
        skillGrowth: { charisma: 4, negotiation: 2 }, stress: 35, prestige: 12,
        promotionChance: 0.3, terminationChance: 0.02,
      }),
      level({
        id: 'restaurant_manager', title: 'Restaurant Manager', payWeek: 1000, category: 'Entry-Level', entry: false,
        requirements: { minSmarts: 25, degree: null, minYears: 3, skills: { charisma: 25, leadership: 10 } },
        skillGrowth: { leadership: 4, negotiation: 3 }, stress: 55, prestige: 30,
        promotionChance: 0, terminationChance: 0.02,
      }),
    ],
  },
  {
    id: 'logistics',
    name: 'Logistics',
    levels: [
      level({
        id: 'warehouse', title: 'Warehouse Associate', payWeek: 500, category: 'Entry-Level', entry: true,
        requirements: { minSmarts: 0, degree: null, minYears: 0, skills: {} },
        skillGrowth: { fitness: 4 }, stress: 35, prestige: 10,
        promotionChance: 0.3, terminationChance: 0.02,
      }),
      level({
        id: 'warehouse_supervisor', title: 'Warehouse Supervisor', payWeek: 880, category: 'Entry-Level', entry: false,
        requirements: { minSmarts: 20, degree: null, minYears: 3, skills: { fitness: 20, leadership: 10 } },
        skillGrowth: { leadership: 4, fitness: 2 }, stress: 45, prestige: 25,
        promotionChance: 0, terminationChance: 0.02,
      }),
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical Trade',
    levels: [
      level({
        id: 'electrician', title: 'Electrician', payWeek: 980, category: 'Trade', entry: true,
        requirements: { minSmarts: 20, degree: 'trade_elec', minYears: 0, skills: {} },
        skillGrowth: { fitness: 2, negotiation: 2 }, stress: 40, prestige: 35,
        promotionChance: 0.3, terminationChance: 0.015,
      }),
      level({
        id: 'master_electrician', title: 'Master Electrician', payWeek: 1550, category: 'Trade', entry: false,
        requirements: { minSmarts: 30, degree: 'trade_elec', minYears: 4, skills: { negotiation: 20 } },
        skillGrowth: { negotiation: 3, leadership: 3 }, stress: 45, prestige: 50,
        promotionChance: 0, terminationChance: 0.01,
      }),
    ],
  },
  {
    id: 'plumbing',
    name: 'Plumbing Trade',
    levels: [
      level({
        id: 'plumber', title: 'Plumber', payWeek: 940, category: 'Trade', entry: true,
        requirements: { minSmarts: 18, degree: 'trade_plumb', minYears: 0, skills: {} },
        skillGrowth: { fitness: 2, negotiation: 2 }, stress: 40, prestige: 32,
        promotionChance: 0.3, terminationChance: 0.015,
      }),
      level({
        id: 'master_plumber', title: 'Master Plumber', payWeek: 1500, category: 'Trade', entry: false,
        requirements: { minSmarts: 28, degree: 'trade_plumb', minYears: 4, skills: { negotiation: 20 } },
        skillGrowth: { negotiation: 3, leadership: 3 }, stress: 45, prestige: 48,
        promotionChance: 0, terminationChance: 0.01,
      }),
    ],
  },
  {
    id: 'hvac',
    name: 'HVAC Trade',
    levels: [
      level({
        id: 'hvac', title: 'HVAC Technician', payWeek: 900, category: 'Trade', entry: true,
        requirements: { minSmarts: 18, degree: 'trade_hvac', minYears: 0, skills: {} },
        skillGrowth: { fitness: 2, negotiation: 2 }, stress: 40, prestige: 30,
        promotionChance: 0.3, terminationChance: 0.015,
      }),
      level({
        id: 'hvac_lead', title: 'HVAC Crew Lead', payWeek: 1400, category: 'Trade', entry: false,
        requirements: { minSmarts: 26, degree: 'trade_hvac', minYears: 4, skills: { negotiation: 18, leadership: 12 } },
        skillGrowth: { leadership: 3, negotiation: 2 }, stress: 45, prestige: 45,
        promotionChance: 0, terminationChance: 0.01,
      }),
    ],
  },
  {
    id: 'culinary',
    name: 'Culinary',
    levels: [
      level({
        id: 'chef', title: 'Chef', payWeek: 850, category: 'Trade', entry: true,
        requirements: { minSmarts: 20, degree: 'trade_culinary', minYears: 0, skills: {} },
        skillGrowth: { cooking: 5, creativity: 2 }, stress: 55, prestige: 38,
        promotionChance: 0.28, terminationChance: 0.02,
      }),
      level({
        id: 'head_chef', title: 'Head Chef', payWeek: 1450, category: 'Trade', entry: false,
        requirements: { minSmarts: 28, degree: 'trade_culinary', minYears: 4, skills: { cooking: 35, leadership: 12 } },
        skillGrowth: { cooking: 3, leadership: 4, creativity: 2 }, stress: 65, prestige: 55,
        promotionChance: 0, terminationChance: 0.015,
      }),
    ],
  },
  {
    id: 'business',
    name: 'Business',
    levels: [
      level({
        id: 'office', title: 'Office Assistant', payWeek: 650, category: 'Business', entry: true,
        requirements: { minSmarts: 25, degree: 'hs', minYears: 0, skills: {} },
        skillGrowth: { negotiation: 2, charisma: 2, finance: 1 }, stress: 30, prestige: 18,
        promotionChance: 0.3, terminationChance: 0.02,
      }),
      level({
        id: 'marketing', title: 'Marketing Manager', payWeek: 1550, category: 'Business', entry: true,
        requirements: { minSmarts: 45, degree: 'deg_business', minYears: 2, skills: { charisma: 15 } },
        skillGrowth: { creativity: 3, leadership: 3, negotiation: 2 }, stress: 45, prestige: 42,
        promotionChance: 0.22, terminationChance: 0.02,
      }),
      level({
        id: 'exec', title: 'Company Executive', payWeek: 4800, category: 'Business', entry: true,
        requirements: { minSmarts: 65, degree: 'deg_business', minYears: 4, skills: { leadership: 35, negotiation: 25 } },
        skillGrowth: { leadership: 4, negotiation: 3, finance: 2 }, stress: 65, prestige: 70,
        promotionChance: 0.12, terminationChance: 0.025,
      }),
      level({
        id: 'ceo', title: 'Chief Executive Officer', payWeek: 8200, category: 'Business', entry: false,
        requirements: { minSmarts: 75, degree: 'deg_business', minYears: 5, skills: { leadership: 60, negotiation: 45 } },
        skillGrowth: { leadership: 3, finance: 3 }, stress: 80, prestige: 95,
        promotionChance: 0, terminationChance: 0.03,
      }),
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    levels: [
      level({
        id: 'accountant', title: 'Accountant', payWeek: 1450, category: 'Business', entry: true,
        requirements: { minSmarts: 45, degree: 'deg_finance', minYears: 0, skills: {} },
        skillGrowth: { finance: 5, negotiation: 1 }, stress: 40, prestige: 40,
        promotionChance: 0.25, terminationChance: 0.015,
      }),
      level({
        id: 'finance_director', title: 'Finance Director', payWeek: 3100, category: 'Business', entry: false,
        requirements: { minSmarts: 60, degree: 'deg_finance', minYears: 5, skills: { finance: 45, leadership: 25 } },
        skillGrowth: { finance: 3, leadership: 3 }, stress: 60, prestige: 65,
        promotionChance: 0, terminationChance: 0.02,
      }),
    ],
  },
  {
    id: 'tech',
    name: 'Technology',
    levels: [
      level({
        id: 'itsupport', title: 'IT Support Specialist', payWeek: 900, category: 'Tech', entry: true,
        requirements: { minSmarts: 30, degree: 'hs', minYears: 0, skills: {} },
        skillGrowth: { programming: 4, charisma: 1 }, stress: 35, prestige: 25,
        promotionChance: 0.3, terminationChance: 0.02,
      }),
      level({
        id: 'engineer', title: 'Software Engineer', payWeek: 1900, category: 'Tech', entry: true,
        requirements: { minSmarts: 60, degree: 'deg_cs', minYears: 2, skills: { programming: 20 } },
        skillGrowth: { programming: 5, creativity: 1 }, stress: 45, prestige: 50,
        promotionChance: 0.25, terminationChance: 0.02,
      }),
      level({
        id: 'senior_engineer', title: 'Senior Software Engineer', payWeek: 2700, category: 'Tech', entry: false,
        requirements: { minSmarts: 65, degree: 'deg_cs', minYears: 3, skills: { programming: 45 } },
        skillGrowth: { programming: 4, leadership: 3 }, stress: 50, prestige: 60,
        promotionChance: 0.18, terminationChance: 0.02,
      }),
      level({
        id: 'engineering_director', title: 'Director of Engineering', payWeek: 4100, category: 'Tech', entry: false,
        requirements: { minSmarts: 70, degree: 'deg_cs', minYears: 4, skills: { programming: 55, leadership: 40 } },
        skillGrowth: { leadership: 4, programming: 1 }, stress: 70, prestige: 78,
        promotionChance: 0, terminationChance: 0.025,
      }),
    ],
  },
  {
    id: 'data',
    name: 'Data Science',
    levels: [
      level({
        id: 'datasci', title: 'Data Scientist', payWeek: 2400, category: 'Tech', entry: true,
        requirements: { minSmarts: 70, degree: 'deg_cs', minYears: 0, skills: {} },
        skillGrowth: { programming: 4, finance: 2 }, stress: 45, prestige: 55,
        promotionChance: 0.2, terminationChance: 0.02,
      }),
      level({
        id: 'principal_datasci', title: 'Principal Data Scientist', payWeek: 3600, category: 'Tech', entry: false,
        requirements: { minSmarts: 75, degree: 'deg_cs', minYears: 4, skills: { programming: 50, finance: 25 } },
        skillGrowth: { programming: 3, leadership: 3 }, stress: 55, prestige: 70,
        promotionChance: 0, terminationChance: 0.02,
      }),
    ],
  },
  {
    id: 'civil',
    name: 'Civil Engineering',
    levels: [
      level({
        id: 'civileng', title: 'Civil Engineer', payWeek: 1850, category: 'Engineering', entry: true,
        requirements: { minSmarts: 55, degree: 'deg_engineering', minYears: 0, skills: {} },
        skillGrowth: { programming: 2, negotiation: 2 }, stress: 45, prestige: 50,
        promotionChance: 0.25, terminationChance: 0.015,
      }),
      level({
        id: 'senior_civileng', title: 'Senior Civil Engineer', payWeek: 2600, category: 'Engineering', entry: false,
        requirements: { minSmarts: 62, degree: 'deg_engineering', minYears: 4, skills: { negotiation: 25, leadership: 20 } },
        skillGrowth: { leadership: 3, negotiation: 2 }, stress: 55, prestige: 62,
        promotionChance: 0, terminationChance: 0.015,
      }),
    ],
  },
  {
    id: 'nursing',
    name: 'Nursing',
    levels: [
      level({
        id: 'nurse', title: 'Nurse', payWeek: 1350, category: 'Healthcare', entry: true,
        requirements: { minSmarts: 55, degree: 'deg_nursing', minYears: 0, skills: {} },
        skillGrowth: { charisma: 3, fitness: 2 }, stress: 60, prestige: 48,
        promotionChance: 0.25, terminationChance: 0.015,
      }),
      level({
        id: 'charge_nurse', title: 'Charge Nurse', payWeek: 1950, category: 'Healthcare', entry: false,
        requirements: { minSmarts: 60, degree: 'deg_nursing', minYears: 4, skills: { charisma: 30, leadership: 20 } },
        skillGrowth: { leadership: 4, charisma: 2 }, stress: 65, prestige: 58,
        promotionChance: 0, terminationChance: 0.015,
      }),
    ],
  },
  {
    id: 'medicine',
    name: 'Medicine',
    levels: [
      level({
        id: 'doctor', title: 'Physician', payWeek: 3200, category: 'Healthcare', entry: true,
        requirements: { minSmarts: 80, degree: 'deg_medicine', minYears: 0, skills: {} },
        skillGrowth: { charisma: 2, leadership: 2 }, stress: 70, prestige: 80,
        promotionChance: 0.15, terminationChance: 0.01,
      }),
      level({
        id: 'chief_of_medicine', title: 'Chief of Medicine', payWeek: 4900, category: 'Healthcare', entry: false,
        requirements: { minSmarts: 85, degree: 'deg_medicine', minYears: 6, skills: { leadership: 40, charisma: 30 } },
        skillGrowth: { leadership: 3 }, stress: 78, prestige: 92,
        promotionChance: 0, terminationChance: 0.015,
      }),
    ],
  },
  {
    id: 'law',
    name: 'Law',
    levels: [
      level({
        id: 'paralegal', title: 'Paralegal', payWeek: 1000, category: 'Law', entry: true,
        requirements: { minSmarts: 40, degree: 'hs', minYears: 0, skills: {} },
        skillGrowth: { negotiation: 4, finance: 1 }, stress: 45, prestige: 30,
        promotionChance: 0.2, terminationChance: 0.02,
      }),
      level({
        id: 'lawyer', title: 'Lawyer', payWeek: 2800, category: 'Law', entry: true,
        requirements: { minSmarts: 70, degree: 'deg_law', minYears: 2, skills: { negotiation: 20 } },
        skillGrowth: { negotiation: 5, charisma: 2 }, stress: 60, prestige: 65,
        promotionChance: 0.18, terminationChance: 0.02,
      }),
      level({
        id: 'law_partner', title: 'Law Firm Partner', payWeek: 4600, category: 'Law', entry: false,
        requirements: { minSmarts: 75, degree: 'deg_law', minYears: 5, skills: { negotiation: 55, charisma: 35 } },
        skillGrowth: { negotiation: 3, leadership: 3 }, stress: 70, prestige: 88,
        promotionChance: 0, terminationChance: 0.02,
      }),
    ],
  },
  {
    id: 'science',
    name: 'Science',
    levels: [
      level({
        id: 'researcher', title: 'Research Scientist', payWeek: 2200, category: 'Science', entry: true,
        requirements: { minSmarts: 70, degree: 'deg_science', minYears: 0, skills: {} },
        skillGrowth: { programming: 3, creativity: 2 }, stress: 40, prestige: 60,
        promotionChance: 0.2, terminationChance: 0.015,
      }),
      level({
        id: 'senior_researcher', title: 'Senior Research Scientist', payWeek: 3000, category: 'Science', entry: false,
        requirements: { minSmarts: 78, degree: 'deg_science', minYears: 5, skills: { programming: 30, creativity: 30 } },
        skillGrowth: { creativity: 3, leadership: 3 }, stress: 45, prestige: 72,
        promotionChance: 0, terminationChance: 0.015,
      }),
    ],
  },
  {
    id: 'design',
    name: 'Design',
    levels: [
      level({
        id: 'designer', title: 'Graphic Designer', payWeek: 1100, category: 'Arts & Media', entry: true,
        requirements: { minSmarts: 35, degree: 'deg_arts', minYears: 0, skills: {} },
        skillGrowth: { creativity: 5, charisma: 1 }, stress: 35, prestige: 32,
        promotionChance: 0.22, terminationChance: 0.025,
      }),
      level({
        id: 'creative_director', title: 'Creative Director', payWeek: 2400, category: 'Arts & Media', entry: false,
        requirements: { minSmarts: 50, degree: 'deg_arts', minYears: 4, skills: { creativity: 45, leadership: 20 } },
        skillGrowth: { creativity: 3, leadership: 4 }, stress: 55, prestige: 60,
        promotionChance: 0, terminationChance: 0.02,
      }),
    ],
  },
  {
    id: 'journalism',
    name: 'Journalism',
    levels: [
      level({
        id: 'journalist', title: 'Journalist', payWeek: 1150, category: 'Arts & Media', entry: true,
        requirements: { minSmarts: 40, degree: 'deg_communications', minYears: 0, skills: {} },
        skillGrowth: { creativity: 3, charisma: 3 }, stress: 45, prestige: 38,
        promotionChance: 0.22, terminationChance: 0.025,
      }),
      level({
        id: 'editor', title: 'Editor-in-Chief', payWeek: 2100, category: 'Arts & Media', entry: false,
        requirements: { minSmarts: 55, degree: 'deg_communications', minYears: 4, skills: { creativity: 30, charisma: 30 } },
        skillGrowth: { leadership: 4, creativity: 2 }, stress: 60, prestige: 62,
        promotionChance: 0, terminationChance: 0.02,
      }),
    ],
  },
  {
    id: 'education',
    name: 'Education',
    levels: [
      level({
        id: 'teacher', title: 'Teacher', payWeek: 1050, category: 'Education', entry: true,
        requirements: { minSmarts: 40, degree: 'deg_education', minYears: 0, skills: {} },
        skillGrowth: { charisma: 3, leadership: 2 }, stress: 50, prestige: 42,
        promotionChance: 0.2, terminationChance: 0.01,
      }),
      level({
        id: 'principal', title: 'School Principal', payWeek: 1900, category: 'Education', entry: false,
        requirements: { minSmarts: 55, degree: 'deg_education', minYears: 5, skills: { leadership: 35, charisma: 25 } },
        skillGrowth: { leadership: 4 }, stress: 60, prestige: 58,
        promotionChance: 0, terminationChance: 0.01,
      }),
    ],
  },
  {
    id: 'police',
    name: 'Law Enforcement',
    levels: [
      level({
        id: 'police', title: 'Police Officer', payWeek: 1100, category: 'Public Service', entry: true,
        requirements: { minSmarts: 30, degree: 'hs', minYears: 0, skills: {} },
        skillGrowth: { fitness: 4, negotiation: 2 }, stress: 60, prestige: 45,
        promotionChance: 0.22, terminationChance: 0.015,
      }),
      level({
        id: 'detective', title: 'Detective', payWeek: 1750, category: 'Public Service', entry: false,
        requirements: { minSmarts: 50, degree: 'hs', minYears: 4, skills: { fitness: 25, negotiation: 25 } },
        skillGrowth: { negotiation: 4, fitness: 2 }, stress: 65, prestige: 60,
        promotionChance: 0, terminationChance: 0.015,
      }),
    ],
  },
  {
    id: 'fire',
    name: 'Fire Service',
    levels: [
      level({
        id: 'firefighter', title: 'Firefighter', payWeek: 1080, category: 'Public Service', entry: true,
        requirements: { minSmarts: 28, degree: 'hs', minYears: 0, skills: {} },
        skillGrowth: { fitness: 5 }, stress: 60, prestige: 50,
        promotionChance: 0.22, terminationChance: 0.015,
      }),
      level({
        id: 'fire_captain', title: 'Fire Captain', payWeek: 1700, category: 'Public Service', entry: false,
        requirements: { minSmarts: 45, degree: 'hs', minYears: 4, skills: { fitness: 35, leadership: 20 } },
        skillGrowth: { leadership: 4, fitness: 2 }, stress: 65, prestige: 64,
        promotionChance: 0, terminationChance: 0.015,
      }),
    ],
  },
] as const;
