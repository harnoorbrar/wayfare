import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import { backfillDefaults } from './state';
import type { GameState } from './state';
import {
  MAX_PET_NAME_LENGTH,
  MEMORIAL_LIMIT,
  PET_CARE_ACTIONS,
  PET_TRAITS,
  STARTING_BOND,
  adopt,
  bondTier,
  care,
  careAvailability,
  careCost,
  cleanPetName,
  companionSummary,
  ensurePets,
  isSuggestedName,
  lifeStage,
  memorial,
  petsYearTick,
  rename,
  species,
  speciesById,
  suggestNames,
  traitsForSpecies,
  type Pet,
} from './pets';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const state = backfillDefaults({ name: 'Test', age: 20, money: 50_000, ...overrides }) as GameState;
  state.pets = state.pets || [];
  return state;
}

function adoptDog(state: GameState, rng: Rng, name = 'Scout'): Pet {
  const result = adopt(state, 'dog', name, rng);
  if (!result.ok || !result.pet) throw new Error(`adopt failed: ${result.reason}`);
  return result.pet;
}

describe('naming', () => {
  it('trims, collapses whitespace, strips junk and caps the length', () => {
    expect(cleanPetName('  Sir   Reginald  ', 'x')).toBe('Sir Reginald');
    expect(cleanPetName('Bi$cu!t<script>', 'x')).toBe('Bicutscript');
    expect(cleanPetName("O'Malley-Jr.", 'x')).toBe("O'Malley-Jr.");
    expect(cleanPetName('É', 'x')).toBe('É');
    expect(cleanPetName('a'.repeat(40), 'x')).toHaveLength(MAX_PET_NAME_LENGTH);
  });

  it('falls back when nothing usable remains', () => {
    expect(cleanPetName('   ', 'Biscuit')).toBe('Biscuit');
    expect(cleanPetName('!!!', 'Biscuit')).toBe('Biscuit');
    expect(cleanPetName(undefined, 'Biscuit')).toBe('Biscuit');
    expect(cleanPetName(42, 'Biscuit')).toBe('Biscuit');
  });

  it('suggests unique names drawn from the species pool and the shared pool', () => {
    const names = suggestNames('cat', new Rng(7), 6);
    expect(names).toHaveLength(6);
    expect(new Set(names).size).toBe(6);
    names.forEach((name) => expect(isSuggestedName('cat', name)).toBe(true));
  });

  it('is deterministic for a given seed', () => {
    expect(suggestNames('dog', new Rng(99))).toEqual(suggestNames('dog', new Rng(99)));
  });

  it('adopts with a typed custom name and flags it as custom', () => {
    const state = makeState();
    const pet = adoptDog(state, new Rng(1), '  Captain Wiggles ');
    expect(pet.name).toBe('Captain Wiggles');
    expect(pet.customNamed).toBe(true);
    expect(pet.bond).toBe(STARTING_BOND);
    expect(state.money).toBe(50_000 - speciesById('dog')!.cost);
  });

  it('adopts with a suggested name without flagging it as custom', () => {
    const state = makeState();
    const pet = adoptDog(state, new Rng(1), 'Biscuit');
    expect(pet.customNamed).toBe(false);
  });

  it('falls back to a species name when the typed name is empty', () => {
    const state = makeState();
    const pet = adoptDog(state, new Rng(3), '');
    expect(speciesById('dog')!.names).toContain(pet.name);
  });

  it('renames, keeps history honest, and rejects no-op or empty names', () => {
    const state = makeState();
    const pet = adoptDog(state, new Rng(1), 'Scout');
    expect(rename(state, pet.id, '').ok).toBe(false);
    expect(rename(state, pet.id, 'Scout').ok).toBe(false);
    const result = rename(state, pet.id, 'Captain Scout');
    expect(result.ok).toBe(true);
    expect(result.previous).toBe('Scout');
    expect(pet.name).toBe('Captain Scout');
    expect(pet.customNamed).toBe(true);
    expect(rename(state, 999, 'Ghost').ok).toBe(false);
  });
});

describe('adoption', () => {
  it('refuses unknown species and unaffordable fees', () => {
    const state = makeState({ money: 10 });
    expect(adopt(state, 'unicorn', 'Sparkle', new Rng(1)).ok).toBe(false);
    expect(adopt(state, 'dog', 'Scout', new Rng(1)).ok).toBe(false);
    expect(state.pets).toHaveLength(0);
  });

  it('assigns unique ids and a trait the species can act on', () => {
    const state = makeState();
    const rng = new Rng(5);
    const a = adoptDog(state, rng, 'A');
    const b = adoptDog(state, rng, 'B');
    expect(a.id).not.toBe(b.id);
    for (const speciesDef of species) {
      const traits = traitsForSpecies(speciesDef);
      expect(traits.length).toBeGreaterThan(0);
      for (let i = 0; i < 20; i += 1) {
        const rich = makeState({ money: 1_000_000 });
        const result = adopt(rich, speciesDef.id, 'X', new Rng(i));
        expect(result.ok).toBe(true);
        expect(traits.map((t) => t.id)).toContain(result.pet!.trait);
      }
    }
  });

  it('every trait maps to a real care action', () => {
    const ids = PET_CARE_ACTIONS.map((action) => action.id);
    PET_TRAITS.forEach((trait) => expect(ids).toContain(trait.loves));
  });
});

describe('legacy saves', () => {
  it('backfills bond, trait, ids and care on pre-1.8 pets without touching names', () => {
    const state = makeState({ age: 30, pets: [{ name: 'Old Biscuit', typeId: 'cat', age: 5, maxAge: 17 }] });
    const pets = ensurePets(state, new Rng(1));
    expect(pets).toHaveLength(1);
    expect(pets[0].name).toBe('Old Biscuit');
    expect(pets[0].id).toBe(1);
    expect(pets[0].bond).toBe(45);
    expect(pets[0].adoptedAge).toBe(25);
    expect(PET_TRAITS.map((t) => t.id)).toContain(pets[0].trait);
    expect(pets[0].care).toEqual({ age: 30, done: [] });
    expect(memorial(state)).toEqual([]);
  });

  it('is idempotent', () => {
    const state = makeState({ pets: [{ name: 'A', typeId: 'dog', age: 1, maxAge: 12 }] });
    ensurePets(state, new Rng(1));
    const snapshot = JSON.stringify(state.pets);
    ensurePets(state, new Rng(2));
    expect(JSON.stringify(state.pets)).toBe(snapshot);
  });
});

describe('care', () => {
  it('each action works once per year and costs what it says', () => {
    const state = makeState();
    const pet = adoptDog(state, new Rng(1));
    const before = state.money;
    const treatCost = careCost(speciesById('dog')!, PET_CARE_ACTIONS.find((a) => a.id === 'treat')!);
    const first = care(state, pet.id, 'treat');
    expect(first.ok).toBe(true);
    expect(first.cost).toBe(treatCost);
    expect(state.money).toBe(before - treatCost);
    expect(care(state, pet.id, 'treat').ok).toBe(false);
    expect(careAvailability(state, pet, 'treat').reason).toBe('Done this year');
    expect(care(state, pet.id, 'play').ok).toBe(true);
  });

  it('resets availability when the player ages a year', () => {
    const state = makeState();
    const pet = adoptDog(state, new Rng(1));
    care(state, pet.id, 'play');
    state.age += 1;
    expect(careAvailability(state, pet, 'play').ok).toBe(true);
  });

  it('respects species limits', () => {
    const state = makeState();
    const fish = adopt(state, 'goldfish', 'Bubbles', new Rng(1)).pet!;
    expect(careAvailability(state, fish, 'walk')).toMatchObject({ ok: false, reason: 'Not a walker' });
    expect(careAvailability(state, fish, 'train')).toMatchObject({ ok: false, reason: 'Not trainable' });
    expect(careAvailability(state, fish, 'play').ok).toBe(true);
  });

  it('refuses when broke', () => {
    const state = makeState({ money: 0 });
    state.pets = [];
    const pet = adopt(makeState(), 'dog', 'Scout', new Rng(1)).pet!;
    state.pets.push(pet);
    expect(careAvailability(state, pet, 'vet')).toMatchObject({ ok: false, reason: 'Not enough cash' });
    expect(careAvailability(state, pet, 'play').ok).toBe(true);
    state.money = -5000; // free actions stay available in debt
    expect(careAvailability(state, pet, 'play').ok).toBe(true);
    expect(careAvailability(state, pet, 'walk').ok).toBe(true);
  });

  it('gives a bonus when the action matches the trait', () => {
    const state = makeState();
    const pet = adoptDog(state, new Rng(1));
    pet.trait = 'cuddly';
    const result = care(state, pet.id, 'play');
    expect(result.loved).toBe(true);
    expect(result.bondDelta).toBe(12);
    expect(pet.bond).toBe(STARTING_BOND + 12);
    expect(result.statDeltas?.happiness).toBe(3);
  });

  it('counts tricks and records vet visits', () => {
    const state = makeState();
    const pet = adoptDog(state, new Rng(1));
    care(state, pet.id, 'train');
    care(state, pet.id, 'vet');
    expect(pet.tricks).toBe(1);
    expect(pet.lastVetAge).toBe(state.age);
  });

  it('never pushes the bond past 100', () => {
    const state = makeState();
    const pet = adoptDog(state, new Rng(1));
    pet.bond = 97;
    care(state, pet.id, 'treat');
    expect(pet.bond).toBe(100);
    expect(bondTier(pet.bond).id).toBe('soulmates');
  });
});

describe('yearly tick', () => {
  it('ages pets, charges upkeep, and scales happiness by bond', () => {
    const low = makeState({ happiness: 50 });
    const lowPet = adoptDog(low, new Rng(1));
    lowPet.bond = 0;
    low.age += 1;
    petsYearTick(low, new Rng(2));

    const high = makeState({ happiness: 50 });
    const highPet = adoptDog(high, new Rng(1));
    highPet.bond = 100;
    high.age += 1;
    petsYearTick(high, new Rng(2));

    expect(lowPet.age).toBe(1);
    expect(high.happiness).toBeGreaterThan(low.happiness);
    expect(low.money).toBe(50_000 - speciesById('dog')!.cost - speciesById('dog')!.upkeep);
  });

  it('decays the bond after a year of neglect and grows it after care', () => {
    const rng = new Rng(1);
    const neglected = makeState();
    const a = adoptDog(neglected, rng);
    neglected.age += 1;
    petsYearTick(neglected, rng);
    expect(a.bond).toBe(STARTING_BOND - 6);

    const cared = makeState();
    const b = adoptDog(cared, rng);
    care(cared, b.id, 'play');
    cared.age += 1;
    petsYearTick(cared, rng);
    expect(b.bond).toBeGreaterThan(STARTING_BOND + 8);
  });

  it('lazy companions forgive neglect more', () => {
    const state = makeState();
    const pet = adoptDog(state, new Rng(1));
    pet.trait = 'lazy';
    state.age += 1;
    petsYearTick(state, new Rng(1));
    expect(pet.bond).toBe(STARTING_BOND - 3);
  });

  it('remembers companions when they pass, with grief scaled by bond', () => {
    const state = makeState({ happiness: 80 });
    const pet = adoptDog(state, new Rng(1), 'Scout');
    pet.bond = 96;
    pet.age = pet.maxAge - 1;
    care(state, pet.id, 'play'); // cared for this year: bond drifts up, not down
    state.age += 1;
    const result = petsYearTick(state, new Rng(1));
    expect(state.pets).toHaveLength(0);
    expect(result.passed).toHaveLength(1);
    expect(result.passed[0]).toMatchObject({ name: 'Scout', typeId: 'dog', bond: 100, years: pet.maxAge });
    expect(memorial(state)[0].name).toBe('Scout');
    expect(result.messages[0].deltas[0]).toEqual(['happiness', -(3 + Math.round(100 / 12))]);
  });

  it('a senior vet visit can buy another year, but only twice', () => {
    let saved = 0;
    for (let seed = 0; seed < 40; seed += 1) {
      const state = makeState();
      const pet = adoptDog(state, new Rng(seed));
      pet.age = pet.maxAge - 1;
      pet.lastVetAge = state.age;
      state.age += 1;
      const result = petsYearTick(state, new Rng(seed));
      if (state.pets.length === 1) {
        saved += 1;
        expect(pet.bonusYears).toBe(1);
        expect(result.passed).toHaveLength(0);
      }
    }
    expect(saved).toBeGreaterThan(10);

    const capped = makeState();
    const pet = adoptDog(capped, new Rng(1));
    pet.age = pet.maxAge - 1;
    pet.lastVetAge = capped.age;
    pet.bonusYears = 2;
    capped.age += 1;
    petsYearTick(capped, new Rng(1));
    expect(capped.pets).toHaveLength(0);
  });

  it('caps the memorial', () => {
    const state = makeState({ money: 10_000_000 });
    for (let i = 0; i < MEMORIAL_LIMIT + 5; i += 1) {
      const pet = adopt(state, 'goldfish', `Fish ${i}`, new Rng(i)).pet!;
      pet.age = pet.maxAge - 1;
    }
    state.age += 1;
    petsYearTick(state, new Rng(1));
    expect(memorial(state)).toHaveLength(MEMORIAL_LIMIT);
  });

  it('drops pets of unknown species quietly', () => {
    const state = makeState({ pets: [{ name: 'Mystery', typeId: 'gryphon', age: 1, maxAge: 9 }] });
    state.age += 1;
    const result = petsYearTick(state, new Rng(1));
    expect(state.pets).toHaveLength(0);
    expect(result.messages).toHaveLength(0);
  });
});

describe('stages and summaries', () => {
  it('reports life stages from the species lifespan', () => {
    const state = makeState();
    const pet = adoptDog(state, new Rng(1));
    expect(lifeStage(pet)).toBe('young');
    pet.age = 6;
    expect(lifeStage(pet)).toBe('adult');
    pet.age = 11;
    expect(lifeStage(pet)).toBe('senior');
  });

  it('summarises the closest companion', () => {
    const state = makeState();
    const a = adoptDog(state, new Rng(1), 'A');
    const b = adoptDog(state, new Rng(1), 'B');
    a.bond = 10;
    b.bond = 70;
    expect(companionSummary(state)).toEqual({ count: 2, closest: b });
    expect(companionSummary(makeState())).toEqual({ count: 0, closest: null });
  });
});

describe('A Kind Heart ambition', () => {
  it('tracks companions, bond, and full lives given', async () => {
    const { ambitionSnapshot, chooseAmbition } = await import('./ambitions');
    const state = makeState({ age: 20 });
    expect(chooseAmbition(state, 'companions')).toBe(true);
    let snapshot = ambitionSnapshot(state)!;
    expect(snapshot.completed).toBe(0);
    expect(snapshot.next?.label).toContain('two companions');

    const rng = new Rng(4);
    const a = adoptDog(state, rng, 'A');
    adoptDog(state, rng, 'B');
    snapshot = ambitionSnapshot(state)!;
    expect(snapshot.completed).toBe(1);

    a.bond = 95;
    expect(ambitionSnapshot(state)!.completed).toBe(2);

    state.petMemorial = [
      { name: 'X', typeId: 'dog', trait: 'brave', years: 12, bond: 80, passedAge: 40, cause: 'old_age' },
      { name: 'Y', typeId: 'cat', trait: 'lazy', years: 3, bond: 90, passedAge: 41, cause: 'too_soon' },
      { name: 'Z', typeId: 'cat', trait: 'lazy', years: 16, bond: 20, passedAge: 42, cause: 'old_age' },
    ];
    expect(ambitionSnapshot(state)!.completed).toBe(2);
    state.petMemorial.push({ name: 'W', typeId: 'parrot', trait: 'clever', years: 40, bond: 100, passedAge: 60, cause: 'old_age' });
    expect(ambitionSnapshot(state)!.completed).toBe(3);
  });
});
