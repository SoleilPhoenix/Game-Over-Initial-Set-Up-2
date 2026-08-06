/**
 * Package Assembly
 * Builds 3 dynamic packages (S/M/L) from wizard questionnaire answers.
 * Uses the scoring matrix to pick the best-matched activities, dining, and bar slots.
 * Provider names are NOT included here — they are revealed after full payment.
 */

import { scoreActivities } from './packageMatching';
import type { ImageSourcePropType } from 'react-native';
import { getPackageImage } from '@/constants/packageImages';
import { getTranslation, type TranslationKeys } from '@/i18n';
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

/** Keep DB-authored features when present; otherwise use the matching assembled tier. */
export function resolvePackageFeatures(
  features: unknown,
  tier: string,
  assembledPackages: Pick<AssembledPackage, 'tier' | 'features'>[],
): string[] {
  const providedFeatures = Array.isArray(features)
    ? features.filter((feature): feature is string => typeof feature === 'string')
    : [];

  if (providedFeatures.length > 0) return providedFeatures;
  return assembledPackages.find((pkg) => pkg.tier === tier)?.features ?? [];
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

type PackageContent = TranslationKeys['packageContent'];

const ACTIVITY_NAMES: Record<string, keyof PackageContent['activityNames']> = {
  'Laser Tag Session':             'laserTag',
  'Bowling + Drinks':              'bowling',
  'Bouldering / Indoor Climbing':  'indoorClimbing',
  'Blacklight Mini Golf':          'miniGolf',
  'Bubble Football':               'bubbleFootball',
  'Paintball / Airsoft':           'paintball',
  'Table Football Tournament':     'tableFootball',
  'Billiards + Table Service':     'billiards',
  'Harbor / River Cruise':         'harborCruise',
  'Boat Rental / Pedal Boat':      'boatRental',
  'Outdoor Scavenger Hunt':        'scavengerHunt',
  'Photo Challenge Walk + Print':  'photoChallenge',
  'Walking Tour':                  'cityWalkingTour',
  'Street Art / Underground Tour': 'streetArtTour',
  'Beach Day + Games':             'beachDay',
  'Musical / Theater Show':        'theaterShow',
  'Comedy Show + Pre-Drinks':      'comedyShow',
  'Private Poker Night':           'pokerNight',
  'Spa / Sauna Day Pass':          'spaDay',
  'Massage Add-On':                'massageSession',
  'Beer Tasting Flight':           'beerTasting',
  'Whisky / Rum Tasting':          'whiskyTasting',
  'Gin Tasting + Botanicals':      'ginTasting',
  'Cocktail Making Course':        'cocktailWorkshop',
  'BBQ Grill & Chill':             'bbqAndGrill',
  // Additional activities from scoring matrix
  'Go-Karting':                    'goKarting',
  'VR Arcade':                     'vrArcade',
  'Axe Throwing':                  'axeThrowing',
  'Escape Room':                   'escapeRoom',
  'Trampoline Park':               'trampolinePark',
  'Cooking Class':                 'cookingClass',
  'Guided Bike Tour':              'guidedBikeTour',
  'Kayak / SUP':                   'kayakAndSup',
  'Creative Workshop':             'creativeWorkshop',
  'Dance Class':                   'danceClass',
  'Darts Tournament':              'dartsTournament',
  'Sports Viewing':                'sportsViewing',
  'Food Tour':                     'foodTour',
  'Wine Tasting':                  'wineTasting',
};

const DINING_NAMES: Record<string, keyof PackageContent['diningNames']> = {
  'Burger + Beer Combo':               'casualDinnerAndDrinks',
  'Tapas / Shared Plates':             'tapasDinner',
  'BBQ Ribs + Beer Tower':             'bbqDinner',
  'Pizza Party + Craft Beer':          'pizzaAndCraftBeerDinner',
  "Private Dining Room + Chef's Menu": 'privateChefDinner',
  'Beer Hall / Platter Night':         'beerHallDinner',
  'Brunch Buffet':                     'brunchBuffet',
  'Steakhouse Dinner':                 'steakhouseDinner',
  'Sushi Dinner':                      'sushiDinner',
};

const BAR_NAMES: Record<string, keyof PackageContent['barNames']> = {
  'Bar Crawl':                       'barCrawl',
  'Club Entry + Reserved Area':      'clubNight',
  'Live Music Bar + Reserved Table': 'liveMusicBar',
  'Karaoke Night':                   'karaokeNight',
  'Pub Quiz Night':                  'pubQuizNight',
};

function activityName(name: string, content: PackageContent): string {
  const key = ACTIVITY_NAMES[name];
  return key ? content.activityNames[key] : name;
}
function diningName(name: string, content: PackageContent): string {
  const key = DINING_NAMES[name];
  return key ? content.diningNames[key] : name;
}
function barName(name: string, content: PackageContent): string {
  const key = BAR_NAMES[name];
  return key ? content.barNames[key] : content.defaults.barNightWithDrinks;
}

// --- Tier config ---

const TIER_PRICE: Record<string, number> = {
  essential: 129_00,
  classic:  179_00,
  grand:    229_00,
};

const TIER_META = {
  essential: {
    rating: 4.5, review_count: 89,
    descriptionKey: 'essential',
  },
  classic: {
    rating: 4.8, review_count: 127,
    descriptionKey: 'classic',
  },
  grand: {
    rating: 4.9, review_count: 42,
    descriptionKey: 'grand',
  },
} as const;

// --- Main export ---

export function assemblePackages(answers: WizardAnswers, citySlug: string): AssembledPackage[] {
  const content = getTranslation().packageContent;
  const full = fillDefaults(answers);
  const scored = scoreActivities(full);

  // Split by category
  const activities = scored
    .filter(a => !['dining', 'nightlife'].includes(a.category))
    .map(a => activityName(a.name, content));

  const diningSlot = scored.find(a => a.category === 'dining');
  const barSlot    = scored.find(a => a.category === 'nightlife');

  const topDining = diningSlot ? diningName(diningSlot.name, content) : content.defaults.restaurantDinner;
  const topBar    = barSlot    ? barName(barSlot.name, content)       : content.defaults.barNightWithDrinks;

  // Deduplicate activities; pad with generic fallbacks if pool has fewer than 3
  const GENERIC_ACTIVITIES = [
    content.genericActivities.cityExperience,
    content.genericActivities.groupActivity,
    content.genericActivities.teamChallenge,
  ];
  const uniqueActivities = [...new Set(activities)];
  const pool = uniqueActivities.length > 0 ? uniqueActivities : GENERIC_ACTIVITIES;
  const act = (i: number) => pool[i] ?? pool[pool.length - 1];

  const city = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);

  const tiers: { tier: 'essential' | 'classic' | 'grand'; features: string[]; bestMatch?: boolean }[] = [
    { tier: 'essential', features: [act(0), topDining, topBar] },
    { tier: 'classic',   features: [act(0), act(1), topDining, topBar], bestMatch: true },
    { tier: 'grand',     features: [act(0), act(1), act(2), topDining, topBar] },
  ];

  return tiers.map(({ tier, features, bestMatch }) => {
    const meta = TIER_META[tier];
    return {
      id:   `${citySlug}-${tier}`,
      name: `${city} ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
      tier,
      price_per_person_cents: TIER_PRICE[tier],
      hero_image_url: getPackageImage(citySlug, tier),
      rating: meta.rating,
      review_count: meta.review_count,
      description: content.tierDescriptions[meta.descriptionKey],
      features,
      ...(bestMatch ? { bestMatch: true } : {}),
    };
  });
}
