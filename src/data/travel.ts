/**
 * Travel destination catalog. Costs are base prices for one traveller in
 * today's money; the domain layer scales them by the world's cumulative
 * inflation and by the size of the party.
 *
 * `moments` are the memory a trip leaves behind, written in the past tense so
 * they read naturally for one traveller or two: `{who}` becomes "Noor" or
 * "Noor and Sam". Mishaps use `{name}` (always just the player).
 */
export type TravelRegionId = 'americas' | 'europe' | 'africa' | 'asia' | 'oceania';

export interface TravelRegion {
  id: TravelRegionId;
  name: string;
  icon: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  flag: string;
  region: TravelRegionId;
  /** One traveller, before inflation. */
  cost: number;
  /** Happiness on a first visit; repeat visits give a share of this. */
  happiness: number;
  health?: number;
  smarts?: number;
  skills: Readonly<Record<string, number>>;
  blurb: string;
  moments: readonly string[];
}

export const TRAVEL_REGIONS: readonly TravelRegion[] = [
  { id: 'americas', name: 'The Americas', icon: '🌎' },
  { id: 'europe', name: 'Europe', icon: '🏰' },
  { id: 'africa', name: 'Africa & the Middle East', icon: '🐪' },
  { id: 'asia', name: 'Asia', icon: '🏯' },
  { id: 'oceania', name: 'Oceania', icon: '🌊' },
] as const;

export const DESTINATIONS: readonly Destination[] = [
  // ---- The Americas ----
  {
    id: 'banff', name: 'Banff', country: 'Canada', flag: '🇨🇦', region: 'americas',
    cost: 1_400, happiness: 6, health: 3, skills: { fitness: 4 },
    blurb: 'Glacier lakes the colour of a mouthwash ad, and elk who own the road.',
    moments: [
      '{who} hiked to a lake so blue it looked edited.',
      '{who} waited twenty minutes for an elk to finish crossing the highway. Nobody honked.',
      '{who} soaked in the hot springs as snow fell, and forgot every email.',
    ],
  },
  {
    id: 'nyc', name: 'New York', country: 'United States', flag: '🇺🇸', region: 'americas',
    cost: 2_600, happiness: 6, smarts: 1, skills: { charisma: 4 },
    blurb: 'Eight million strangers, one of them selling exactly what you need.',
    moments: [
      '{who} walked forty blocks in a day and still missed half of it.',
      '{who} got into a heated debate with a hot dog vendor and somehow left with a free pretzel.',
      '{who} caught a show on Broadway and hummed it for a month.',
    ],
  },
  {
    id: 'mexico_city', name: 'Mexico City', country: 'Mexico', flag: '🇲🇽', region: 'americas',
    cost: 1_600, happiness: 7, skills: { cooking: 5 },
    blurb: 'Street tacos at 2 a.m., murals at noon, and a museum for everything.',
    moments: [
      '{who} learned that the best tacos come from the stand with no sign.',
      '{who} stood in front of a Rivera mural for longer than planned.',
      '{who} took a cooking class from an abuela who had no patience for bad salsa.',
    ],
  },
  {
    id: 'cusco', name: 'Cusco & Machu Picchu', country: 'Peru', flag: '🇵🇪', region: 'americas',
    cost: 3_200, happiness: 8, health: 1, smarts: 2, skills: { fitness: 5 },
    blurb: 'Thin air, ancient stone, and a sunrise worth the four-day walk.',
    moments: [
      '{who} reached the Sun Gate at dawn as the clouds lifted off the ruins.',
      '{who} learned about altitude the hard way on day one, then drank the coca tea.',
      'A llama with impeccable timing photobombed every photo {who} took.',
    ],
  },
  // ---- Europe ----
  {
    id: 'lisbon', name: 'Lisbon', country: 'Portugal', flag: '🇵🇹', region: 'europe',
    cost: 2_200, happiness: 7, skills: { cooking: 3, creativity: 2 },
    blurb: 'Yellow trams, custard tarts, and hills that double as leg day.',
    moments: [
      '{who} ate four pastéis de nata before noon. No regrets were filed.',
      '{who} heard fado in a tiny bar and felt every word without knowing any.',
      '{who} rode Tram 28 to the end of the line just to see where it went.',
    ],
  },
  {
    id: 'rome', name: 'Rome', country: 'Italy', flag: '🇮🇹', region: 'europe',
    cost: 2_800, happiness: 7, smarts: 2, skills: { cooking: 4 },
    blurb: 'Three thousand years of history and the correct way to make carbonara.',
    moments: [
      '{who} tossed a coin into the Trevi Fountain, which by tradition means coming back.',
      'A waiter gently scolded {who} for asking for cream in the carbonara.',
      '{who} stood inside the Pantheon as rain fell through the oculus.',
    ],
  },
  {
    id: 'reykjavik', name: 'Reykjavík', country: 'Iceland', flag: '🇮🇸', region: 'europe',
    cost: 3_400, happiness: 9, health: 1, skills: { creativity: 3 },
    blurb: 'Waterfalls, black-sand beaches, and — if the sky allows — the northern lights.',
    moments: [
      '{who} stood in a dark field at 1 a.m. as green light rippled across the whole sky.',
      '{who} walked behind a waterfall and came back soaked and grinning.',
      '{who} bought wool sweaters at an alarming price and wore them every winter after.',
    ],
  },
  {
    id: 'paris', name: 'Paris', country: 'France', flag: '🇫🇷', region: 'europe',
    cost: 3_000, happiness: 7, smarts: 1, skills: { creativity: 4 },
    blurb: 'Galleries, cafés, and the art of looking unimpressed while deeply impressed.',
    moments: [
      '{who} spent a whole afternoon in the Musée d’Orsay and saw one room properly.',
      '{who} watched the Eiffel Tower sparkle on the hour from a riverside bench.',
      '{who} ordered in French and got answered, kindly, in English.',
    ],
  },
  // ---- Africa & the Middle East ----
  {
    id: 'marrakech', name: 'Marrakech', country: 'Morocco', flag: '🇲🇦', region: 'africa',
    cost: 2_000, happiness: 7, skills: { negotiation: 5 },
    blurb: 'A maze of souks where every price is an opening offer.',
    moments: [
      '{who} haggled for a rug for forty-five minutes and paid exactly the first price.',
      '{who} got completely lost in the medina and found the best mint tea of their life.',
      '{who} watched the sun set over Jemaa el-Fna as the square came alive.',
    ],
  },
  {
    id: 'cape_town', name: 'Cape Town', country: 'South Africa', flag: '🇿🇦', region: 'africa',
    cost: 3_100, happiness: 8, health: 2, skills: { fitness: 4 },
    blurb: 'Table Mountain above, two oceans below, and penguins on the beach.',
    moments: [
      '{who} climbed Table Mountain and took the cable car down, on principle.',
      '{who} shared a beach with a colony of very unbothered penguins.',
      '{who} stood at the Cape of Good Hope where the wind tried to take everything.',
    ],
  },
  {
    id: 'cairo', name: 'Cairo & Giza', country: 'Egypt', flag: '🇪🇬', region: 'africa',
    cost: 2_400, happiness: 7, smarts: 4, skills: {},
    blurb: 'The last standing wonder of the ancient world, a short cab ride from downtown.',
    moments: [
      '{who} stood at the foot of the Great Pyramid and felt very, very new.',
      '{who} drifted down the Nile on a felucca at sunset.',
      '{who} spent a day in the Egyptian Museum and still had questions for the mummies.',
    ],
  },
  // ---- Asia ----
  {
    id: 'kyoto', name: 'Kyoto', country: 'Japan', flag: '🇯🇵', region: 'asia',
    cost: 3_300, happiness: 8, smarts: 1, skills: { creativity: 3 },
    blurb: 'A thousand shrines, a million lanterns, and the quietest gardens on Earth.',
    moments: [
      '{who} walked through ten thousand torii gates at Fushimi Inari before the crowds woke.',
      '{who} sat in a moss garden and, for once, thought about nothing at all.',
      '{who} ate a kaiseki dinner in eleven courses and could name every one.',
    ],
  },
  {
    id: 'seoul', name: 'Seoul', country: 'South Korea', flag: '🇰🇷', region: 'asia',
    cost: 2_700, happiness: 7, smarts: 1, skills: { programming: 2, cooking: 2 },
    blurb: 'Palaces beside skyscrapers, and barbecue that does not close.',
    moments: [
      '{who} wore a hanbok to Gyeongbokgung Palace and got in free for it.',
      '{who} did karaoke in a private booth until 3 a.m.. Voices were lost.',
      '{who} discovered that Korean fried chicken is a different food.',
    ],
  },
  {
    id: 'bangkok', name: 'Bangkok', country: 'Thailand', flag: '🇹🇭', region: 'asia',
    cost: 1_900, happiness: 7, skills: { cooking: 4 },
    blurb: 'Golden temples, floating markets, and the spiciest thing you have ever agreed to.',
    moments: [
      '{who} said "Thai spicy" to a street vendor and learned a lesson in humility.',
      '{who} watched the sun rise over Wat Arun from a river taxi.',
      '{who} bought a mango sticky rice every single day. Seven of them.',
    ],
  },
  // ---- Oceania ----
  {
    id: 'sydney', name: 'Sydney', country: 'Australia', flag: '🇦🇺', region: 'oceania',
    cost: 3_600, happiness: 8, health: 2, skills: { fitness: 3 },
    blurb: 'A harbour, an opera house, and the coastal walk that ruins every other walk.',
    moments: [
      '{who} walked from Bondi to Coogee and stopped counting the beaches.',
      '{who} watched a performance inside the Opera House.',
      'A cockatoo stared down {who} over a sandwich. The cockatoo won.',
    ],
  },
  {
    id: 'queenstown', name: 'Queenstown', country: 'New Zealand', flag: '🇳🇿', region: 'oceania',
    cost: 3_900, happiness: 9, health: 2, skills: { fitness: 5 },
    blurb: 'The adventure capital of the world, surrounded by scenery that looks computer-generated.',
    moments: [
      '{who} jumped off a bridge attached to a bungee cord. There were sounds.',
      '{who} cruised Milford Sound under waterfalls that fell from the clouds.',
      '{who} ate the famous burger after a two-hour wait and called it worth it.',
    ],
  },
] as const;

/**
 * Things that go a little wrong. Rare, never ruinous, and always survivable.
 * `money` is a share of the trip's cost.
 */
export interface TravelMishap {
  id: string;
  text: string;
  health?: number;
  happiness?: number;
  moneyShare?: number;
}

export const TRAVEL_MISHAPS: readonly TravelMishap[] = [
  { id: 'luggage', text: 'The airline sent the luggage somewhere else entirely. It arrived on the last day.', happiness: -2 },
  { id: 'stomach', text: 'Something at a street stall disagreed with {name}. Two days in the hotel room.', health: -3 },
  { id: 'rebooked', text: 'A cancelled flight meant an extra night and a pricey rebooking.', moneyShare: 0.2 },
  { id: 'sunburn', text: '{name} underestimated the sun and came home the colour of a lobster.', health: -1, happiness: -1 },
] as const;

export function destinationById(id: string): Destination | undefined {
  return DESTINATIONS.find((destination) => destination.id === id);
}

export function regionById(id: string): TravelRegion | undefined {
  return TRAVEL_REGIONS.find((region) => region.id === id);
}
