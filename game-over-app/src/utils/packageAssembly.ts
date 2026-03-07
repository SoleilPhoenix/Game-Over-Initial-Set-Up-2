/**
 * Package Assembly
 * Builds 3 dynamic packages (S/M/L) from wizard questionnaire answers.
 * Uses the scoring matrix to pick the best-matched activities, dining, and bar slots.
 * Provider names are NOT included here — they are revealed after full payment.
 */

import { scoreActivities } from './packageMatching';
import type { ImageSourcePropType } from 'react-native';
import { getPackageImage } from '@/constants/packageImages';
import type {
  HonoreeEnergyLevel, SpotlightComfort, CompetitionStyle,
  EnjoymentType, IndoorOutdoor, EveningStyle,
  AgeRange, GroupCohesion, FitnessLevel, DrinkingCulture, GroupDynamic,
} from '@/stores/wizardStore';

// --- Types ---

export interface WizardAnswers {
  h1: HonoreeEnergyLevel | null;
  h2: SpotlightComfort | null;
  h3: CompetitionStyle | null;
  h4: EnjoymentType | null;
  h5: IndoorOutdoor | null;
  h6: EveningStyle | null;
  g1: AgeRange | null;
  g2: GroupCohesion | null;
  g3: FitnessLevel | null;
  g4: DrinkingCulture | null;
  g5: GroupDynamic | null;
  g6: string[];
}

export interface AssembledPackage {
  id: string;
  name: string;
  tier: 'essential' | 'classic' | 'grand';
  price_per_person_cents: number;
  hero_image_url: ImageSourcePropType;
  rating: number;
  review_count: number;
  features: string[];
  description: string;
  bestMatch?: boolean;
}

// --- Defaults (used when wizard answers are incomplete) ---

const DEFAULTS = {
  h1: 'active'       as HonoreeEnergyLevel,
  h2: 'group'        as SpotlightComfort,
  h3: 'cooperative'  as CompetitionStyle,
  h4: 'experience'   as EnjoymentType,
  h5: 'mix'          as IndoorOutdoor,
  h6: 'dinner_bar'   as EveningStyle,
  g1: '26-30'        as AgeRange,
  g2: 'mixed'        as GroupCohesion,
  g3: 'medium'       as FitnessLevel,
  g4: 'social'       as DrinkingCulture,
  g5: 'team_players' as GroupDynamic,
  g6: ['action', 'nightlife'],
};

function fillDefaults(a: WizardAnswers) {
  return {
    h1: a.h1 ?? DEFAULTS.h1,
    h2: a.h2 ?? DEFAULTS.h2,
    h3: a.h3 ?? DEFAULTS.h3,
    h4: a.h4 ?? DEFAULTS.h4,
    h5: a.h5 ?? DEFAULTS.h5,
    h6: a.h6 ?? DEFAULTS.h6,
    g1: a.g1 ?? DEFAULTS.g1,
    g2: a.g2 ?? DEFAULTS.g2,
    g3: a.g3 ?? DEFAULTS.g3,
    g4: a.g4 ?? DEFAULTS.g4,
    g5: a.g5 ?? DEFAULTS.g5,
    g6: a.g6.length > 0 ? a.g6 : DEFAULTS.g6,
  };
}

// --- Display name maps ---

const ACTIVITY_NAMES: Record<string, string> = {
  'Laser Tag Session':             'Laser Tag',
  'Bowling + Drinks':              'Bowling',
  'Bouldering / Indoor Climbing':  'Indoor Climbing',
  'Blacklight Mini Golf':          'Mini Golf',
  'Bubble Football':               'Bubble Football',
  'Paintball / Airsoft':           'Paintball',
  'Table Football Tournament':     'Table Football',
  'Billiards + Table Service':     'Billiards',
  'Harbor / River Cruise':         'Harbor Cruise',
  'Boat Rental / Pedal Boat':      'Boat Rental',
  'Outdoor Scavenger Hunt':        'Scavenger Hunt',
  'Photo Challenge Walk + Print':  'Photo Challenge',
  'Walking Tour':                  'City Walking Tour',
  'Street Art / Underground Tour': 'Street Art Tour',
  'Beach Day + Games':             'Beach Day',
  'Musical / Theater Show':        'Theater Show',
  'Comedy Show + Pre-Drinks':      'Comedy Show',
  'Private Poker Night':           'Poker Night',
  'Spa / Sauna Day Pass':          'Spa Day',
  'Massage Add-On':                'Massage Session',
  'Beer Tasting Flight':           'Beer Tasting',
  'Whisky / Rum Tasting':          'Whisky Tasting',
  'Gin Tasting + Botanicals':      'Gin Tasting',
  'Cocktail Making Course':        'Cocktail Workshop',
  'BBQ Grill & Chill':             'BBQ & Grill',
  // Additional activities from scoring matrix
  'Go-Karting':                    'Go-Karting',
  'VR Arcade':                     'VR Arcade',
  'Axe Throwing':                  'Axe Throwing',
  'Escape Room':                   'Escape Room',
  'Trampoline Park':               'Trampoline Park',
  'Cooking Class':                 'Cooking Class',
  'Guided Bike Tour':              'Guided Bike Tour',
  'Kayak / SUP':                   'Kayak & SUP',
  'Creative Workshop':             'Creative Workshop',
  'Dance Class':                   'Dance Class',
  'Darts Tournament':              'Darts Tournament',
  'Sports Viewing':                'Sports Viewing',
  'Food Tour':                     'Food Tour',
  'Wine Tasting':                  'Wine Tasting',
};

const DINING_NAMES: Record<string, string> = {
  'Burger + Beer Combo':               'Casual Dinner & Drinks',
  'Tapas / Shared Plates':             'Tapas Dinner',
  'BBQ Ribs + Beer Tower':             'BBQ Dinner',
  'Pizza Party + Craft Beer':          'Pizza & Craft Beer Dinner',
  "Private Dining Room + Chef's Menu": 'Private Chef Dinner',
  'Beer Hall / Platter Night':         'Beer Hall Dinner',
  'Brunch Buffet':                     'Brunch Buffet',
  'Steakhouse Dinner':                 'Steakhouse Dinner',
  'Sushi Dinner':                      'Sushi Dinner',
};

const BAR_NAMES: Record<string, string> = {
  'Bar Crawl':                       'Bar Crawl',
  'Club Entry + Reserved Area':      'Club Night',
  'Live Music Bar + Reserved Table': 'Live Music Bar',
  'Karaoke Night':                   'Karaoke Night',
  'Pub Quiz Night':                  'Pub Quiz Night',
};

function activityName(name: string): string {
  return ACTIVITY_NAMES[name] ?? name;
}
function diningName(name: string): string {
  return DINING_NAMES[name] ?? name;
}
function barName(name: string): string {
  return BAR_NAMES[name] ?? 'Bar Night with Drinks';
}

// --- Tier config ---

const TIER_PRICE: Record<string, number> = {
  essential: 99_00,
  classic:  149_00,
  grand:    199_00,
};

const TIER_META = {
  essential: {
    rating: 4.5, review_count: 89,
    description: 'The perfect starter package — one highlight activity, great dinner, and drinks included.',
  },
  classic: {
    rating: 4.8, review_count: 127,
    description: 'The ideal balance of activities, dining, and nightlife for an unforgettable celebration.',
  },
  grand: {
    rating: 4.9, review_count: 42,
    description: 'The ultimate premium experience with three activities, fine dining, and exclusive nightlife.',
  },
};

// --- Main export ---

export function assemblePackages(answers: WizardAnswers, citySlug: string): AssembledPackage[] {
  const full = fillDefaults(answers);
  const scored = scoreActivities(full);

  // Split by category
  const activities = scored
    .filter(a => !['dining', 'nightlife'].includes(a.category))
    .map(a => activityName(a.name));

  const diningSlot = scored.find(a => a.category === 'dining');
  const barSlot    = scored.find(a => a.category === 'nightlife');

  const topDining = diningSlot ? diningName(diningSlot.name) : 'Restaurant Dinner';
  const topBar    = barSlot    ? barName(barSlot.name)       : 'Bar Night with Drinks';

  // Deduplicate activities; pad with generic fallbacks if pool has fewer than 3
  const GENERIC_ACTIVITIES = ['City Experience', 'Group Activity', 'Team Challenge'];
  const uniqueActivities = [...new Set(activities)];
  const pool = uniqueActivities.length > 0 ? uniqueActivities : GENERIC_ACTIVITIES;
  const act = (i: number) => pool[i] ?? pool[pool.length - 1];

  const city = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);

  const tiers: Array<{ tier: 'essential' | 'classic' | 'grand'; features: string[]; bestMatch?: boolean }> = [
    { tier: 'essential', features: [act(0), topDining, topBar] },
    { tier: 'classic',   features: [act(0), act(1), topDining, topBar], bestMatch: true },
    { tier: 'grand',     features: [act(0), act(1), act(2), topDining, topBar] },
  ];

  return tiers.map(({ tier, features, bestMatch }) => ({
    id:   `${citySlug}-${tier}`,
    name: `${city} ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
    tier,
    price_per_person_cents: TIER_PRICE[tier],
    hero_image_url: getPackageImage(citySlug, tier),
    ...TIER_META[tier],
    features,
    ...(bestMatch ? { bestMatch: true } : {}),
  }));
}
