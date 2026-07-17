/**
 * Skill definitions. Skills grow through work (and later: actions, events)
 * and gate promotions, so long careers feel earned rather than rolled.
 */

export interface SkillDef {
  id: string;
  name: string;
  icon: string;
}

export const SKILLS: readonly SkillDef[] = [
  { id: 'programming', name: 'Programming', icon: '💻' },
  { id: 'leadership', name: 'Leadership', icon: '🧭' },
  { id: 'negotiation', name: 'Negotiation', icon: '🤝' },
  { id: 'finance', name: 'Finance', icon: '📊' },
  { id: 'fitness', name: 'Fitness', icon: '💪' },
  { id: 'cooking', name: 'Cooking', icon: '🍳' },
  { id: 'creativity', name: 'Creativity', icon: '🎨' },
  { id: 'charisma', name: 'Charisma', icon: '✨' },
] as const;

export function skillName(id: string): string {
  const def = SKILLS.find((s) => s.id === id);
  return def ? def.name : id;
}

export const SKILL_MAX = 100;
