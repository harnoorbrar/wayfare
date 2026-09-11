/**
 * Companion species catalog. Numbers are per in-game year unless noted.
 *
 * `energy` gates the Walk care action (low-energy companions do not go on
 * walks), `trainable` gates Train. `plus` marks Wayfare Plus exclusives —
 * cosmetics and flavour only; nothing in core progression needs them.
 */
export type PetEnergy = 'low' | 'medium' | 'high';

export interface PetSpecies {
  id: string;
  icon: string;
  name: string;
  cost: number;
  lifespan: number;
  happy: number;
  upkeep: number;
  health?: number;
  smarts?: number;
  energy: PetEnergy;
  trainable: boolean;
  plus?: boolean;
  blurb: string;
  /** Species-flavoured name suggestions shown alongside the shared pool. */
  names: readonly string[];
}

export const PET_SPECIES: readonly PetSpecies[] = [
  {
    id: 'goldfish', icon: '🐠', name: 'Goldfish', cost: 15, lifespan: 4, happy: 1, upkeep: 20,
    energy: 'low', trainable: false, blurb: 'Low maintenance. Low expectations. Swims.',
    names: ['Bubbles', 'Finn', 'Goldie', 'Nemo-ish', 'Sushi', 'Ripple'],
  },
  {
    id: 'hamster', icon: '🐹', name: 'Hamster', cost: 25, lifespan: 3, happy: 2, upkeep: 60,
    energy: 'low', trainable: false, blurb: 'Runs all night on a squeaky wheel. Adorable insomnia machine.',
    names: ['Peanut', 'Nibbles', 'Cheeks', 'Hazel', 'Pip', 'Butterscotch'],
  },
  {
    id: 'cat', icon: '🐈', name: 'Cat', cost: 150, lifespan: 16, happy: 4, upkeep: 600,
    energy: 'low', trainable: false, blurb: 'Owns you, legally speaking. Occasionally affectionate.',
    names: ['Miso', 'Luna', 'Salem', 'Olive', 'Mochi', 'Duchess'],
  },
  {
    id: 'dog', icon: '🐕', name: 'Rescue Mutt', cost: 100, lifespan: 14, happy: 6, upkeep: 700, health: 1,
    energy: 'high', trainable: true, blurb: 'One of everything. Loyal to the bone.',
    names: ['Scout', 'Biscuit', 'Maple', 'Rocket', 'Waffles', 'Juniper'],
  },
  {
    id: 'dog_golden', icon: '🦮', name: 'Golden Retriever', cost: 900, lifespan: 11, happy: 8, upkeep: 1100, health: 1,
    energy: 'high', trainable: true, blurb: 'Aggressively friendly. Sheds a second dog per week.',
    names: ['Sunny', 'Bailey', 'Honey', 'Cooper', 'Goldie', 'Murphy'],
  },
  {
    id: 'dog_chihuahua', icon: '🐶', name: 'Chihuahua', cost: 500, lifespan: 16, happy: 4, upkeep: 500,
    energy: 'medium', trainable: true, blurb: 'Four pounds of pure rage and devotion.',
    names: ['Taco', 'Peanut', 'Bruiser', 'Chalupa', 'Diva', 'Tiny'],
  },
  {
    id: 'dog_husky', icon: '🐺', name: 'Husky', cost: 800, lifespan: 12, happy: 6, upkeep: 1200, health: 2,
    energy: 'high', trainable: true, blurb: 'Screams instead of barking. Requires a daily marathon.',
    names: ['Nova', 'Storm', 'Koda', 'Aurora', 'Blizzard', 'Yuki'],
  },
  {
    id: 'dog_poodle', icon: '🐩', name: 'Poodle', cost: 1100, lifespan: 14, happy: 6, upkeep: 1000, smarts: 1,
    energy: 'medium', trainable: true, blurb: 'Smarter than most of your coworkers. Knows it.',
    names: ['Pierre', 'Coco', 'Beaumont', 'Fifi', 'Truffle', 'Margaux'],
  },
  {
    id: 'dog_corgi', icon: '🐕‍🦺', name: 'Corgi', cost: 1000, lifespan: 13, happy: 7, upkeep: 800,
    energy: 'medium', trainable: true, blurb: 'A loaf of bread with ambition and no legs.',
    names: ['Loaf', 'Winston', 'Pancake', 'Bento', 'Sir Reginald', 'Tater'],
  },
  {
    id: 'dog_greatdane', icon: '🐎', name: 'Great Dane', cost: 1200, lifespan: 8, happy: 7, upkeep: 1600,
    energy: 'medium', trainable: true, blurb: "A small horse convinced it's a lap dog.",
    names: ['Moose', 'Atlas', 'Bear', 'Duke', 'Tiny', 'Goliath'],
  },
  {
    id: 'dog_doberman', icon: '🖤', name: 'Doberman', cost: 1500, lifespan: 11, happy: 6, upkeep: 1300, health: 2,
    energy: 'high', trainable: true, blurb: 'Looks like a security system. Is actually a velcro baby.',
    names: ['Zeus', 'Raven', 'Onyx', 'Sable', 'Bruno', 'Vesper'],
  },
  {
    id: 'snake', icon: '🐍', name: 'Snake', cost: 200, lifespan: 20, happy: 2, upkeep: 300,
    energy: 'low', trainable: false, blurb: 'Judges you silently from a heated rock.',
    names: ['Noodle', 'Monty', 'Slinky', 'Basil', 'Hissy', 'Ramen'],
  },
  {
    id: 'parrot', icon: '🦜', name: 'Parrot', cost: 900, lifespan: 45, happy: 4, upkeep: 500,
    energy: 'medium', trainable: true, blurb: 'May outlive you. Will definitely embarrass you.',
    names: ['Mango', 'Kiwi', 'Captain', 'Pepper', 'Rio', 'Echo'],
  },
  {
    id: 'owl', icon: '🦉', name: 'Owl', cost: 2500, lifespan: 25, happy: 6, upkeep: 900, smarts: 2, plus: true,
    energy: 'medium', trainable: true, blurb: 'Silent. Wise. Definitely reading your mail.',
    names: ['Athena', 'Archimedes', 'Sage', 'Hoot', 'Merlin', 'Nocturne'],
  },
  {
    id: 'fennec', icon: '🦊', name: 'Fennec Fox', cost: 3000, lifespan: 13, happy: 9, upkeep: 1400, plus: true,
    energy: 'high', trainable: true, blurb: 'Ninety percent ears, ten percent chaos.',
    names: ['Sahara', 'Dune', 'Ember', 'Zephyr', 'Cinnamon', 'Fenn'],
  },
  {
    id: 'dragon', icon: '🐉', name: 'Tiny Dragon', cost: 10000, lifespan: 60, happy: 12, upkeep: 2500, health: 2, plus: true,
    energy: 'medium', trainable: true, blurb: 'Technically a very committed iguana. Do not fact-check this.',
    names: ['Ember', 'Smaug Jr.', 'Cinder', 'Pyra', 'Toothless-ish', 'Ignatius'],
  },
];

/** Shared, species-neutral names the suggestion shuffle mixes in. */
export const SHARED_PET_NAMES: readonly string[] = [
  'Biscuit', 'Noodle', 'Waffles', 'Beans', 'Pickle', 'Mochi', 'Taco', 'Ziggy', 'Pepper', 'Gizmo',
  'Churro', 'Bagel', 'Sprout', 'Turnip', 'Meatball', 'Crouton', 'Pumpkin', 'Dumpling', 'Nacho',
  'Sir Reginald', 'Clementine', 'Otis', 'Juniper', 'Pudding', 'Fig', 'Wren', 'Marble', 'Toast',
];

export function speciesById(id: string): PetSpecies | undefined {
  return PET_SPECIES.find((species) => species.id === id);
}

export function isDogSpecies(id: string): boolean {
  return id === 'dog' || id.startsWith('dog_');
}
