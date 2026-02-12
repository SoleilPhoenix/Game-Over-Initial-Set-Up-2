/**
 * Activity Matching Algorithm
 * Scores 53 activities against 12 questionnaire answers (H1-H6, G1-G6)
 * Based on ACTIVITY_MATCHING_MATRIX.md scoring matrix
 */

import type {
  HonoreeEnergyLevel,
  SpotlightComfort,
  CompetitionStyle,
  EnjoymentType,
  IndoorOutdoor,
  EveningStyle,
  AgeRange,
  GroupCohesion,
  FitnessLevel,
  DrinkingCulture,
  GroupDynamic,
} from '@/stores/wizardStore';

// --- Types ---

export interface QuestionnaireAnswers {
  h1: HonoreeEnergyLevel;
  h2: SpotlightComfort;
  h3: CompetitionStyle;
  h4: EnjoymentType;
  h5: IndoorOutdoor;
  h6: EveningStyle;
  g1: AgeRange;
  g2: GroupCohesion;
  g3: FitnessLevel;
  g4: DrinkingCulture;
  g5: GroupDynamic;
  g6: string[]; // max 2 vibes from: action, culture, nightlife, food, wellness
}

export interface ScoredActivity {
  name: string;
  category: string;
  totalScore: number;
  seasonal: boolean;
  iceBreaker: boolean;
}

type Category = 'team' | 'nightlife' | 'tasting' | 'outdoor' | 'entertainment' | 'wellness' | 'dining';

// Option order for each question — array indices map to scores
const H1_OPTIONS: HonoreeEnergyLevel[] = ['relaxed', 'active', 'action', 'party'];
const H2_OPTIONS: SpotlightComfort[] = ['background', 'group', 'center_stage'];
const H3_OPTIONS: CompetitionStyle[] = ['cooperative', 'competitive', 'spectator'];
const H4_OPTIONS: EnjoymentType[] = ['food', 'drinks', 'experience'];
const H5_OPTIONS: IndoorOutdoor[] = ['indoor', 'outdoor', 'mix'];
const H6_OPTIONS: EveningStyle[] = ['dinner_only', 'dinner_bar', 'full_night'];
const G1_OPTIONS: AgeRange[] = ['21-25', '26-30', '31-35', '35+'];
const G2_OPTIONS: GroupCohesion[] = ['close_friends', 'mixed', 'strangers'];
const G3_OPTIONS: FitnessLevel[] = ['low', 'medium', 'high'];
const G4_OPTIONS: DrinkingCulture[] = ['low', 'social', 'central'];
const G5_OPTIONS: GroupDynamic[] = ['team_players', 'competitive', 'relaxed'];
const G6_VIBES = ['action', 'culture', 'nightlife', 'food', 'wellness'];

// Compact activity definition: scores stored as tuples matching option order above
interface ActivityDef {
  name: string;
  cat: Category;
  seasonal: boolean;
  iceBreaker: boolean;
  h1: number[]; h2: number[]; h3: number[]; h4: number[]; h5: number[]; h6: number[];
  g1: number[]; g2: number[]; g3: number[]; g4: number[]; g5: number[];
  g6: number[]; // [action, culture, nightlife, food, wellness]
}

// --- 53 Activity Scoring Matrix ---

const ACTIVITIES: ActivityDef[] = [
  // ═══════════ TEAM & COMPETITIVE ═══════════
  { name: 'Escape Room', cat: 'team', seasonal: false, iceBreaker: true,
    h1: [0, 2, 1, 0], h2: [2, 2, 0], h3: [2, 0, -1], h4: [0, 0, 2], h5: [2, -1, 1], h6: [1, 1, 0],
    g1: [1, 2, 2, 1], g2: [1, 2, 2], g3: [1, 2, 1], g4: [2, 1, 0], g5: [2, 0, 0],
    g6: [2, 1, 0, 0, 0] },
  { name: 'Laser Tag Session', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [-1, 1, 2, 1], h2: [1, 2, 1], h3: [1, 2, -1], h4: [0, 0, 2], h5: [2, 0, 1], h6: [1, 1, 0],
    g1: [2, 2, 1, 0], g2: [2, 1, 0], g3: [-1, 1, 2], g4: [2, 1, -1], g5: [1, 2, -1],
    g6: [2, 0, 0, 0, 0] },
  { name: 'Bowling + Drinks', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [1, 2, 0, 1], h2: [1, 2, 1], h3: [1, 2, 0], h4: [0, 1, 1], h5: [2, -1, 1], h6: [0, 2, 1],
    g1: [2, 2, 1, 1], g2: [2, 2, 1], g3: [1, 2, 1], g4: [1, 2, 1], g5: [1, 2, 1],
    g6: [1, 0, 1, 0, 0] },
  { name: 'VR Arcade', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [0, 2, 2, 0], h2: [1, 2, 0], h3: [2, 1, 0], h4: [0, 0, 2], h5: [2, -1, 1], h6: [1, 1, 0],
    g1: [2, 2, 1, 0], g2: [1, 2, 1], g3: [1, 2, 1], g4: [2, 1, -1], g5: [2, 1, 0],
    g6: [2, 1, 0, 0, 0] },
  { name: 'Go-Karting', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [-1, 1, 2, 1], h2: [1, 2, 1], h3: [0, 2, 0], h4: [0, 0, 2], h5: [1, 1, 2], h6: [1, 1, 0],
    g1: [2, 2, 1, 0], g2: [2, 1, 0], g3: [0, 1, 2], g4: [2, 1, -1], g5: [0, 2, -1],
    g6: [2, 0, 0, 0, 0] },
  { name: 'Axe Throwing', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [0, 2, 2, 1], h2: [1, 2, 1], h3: [0, 2, 0], h4: [0, 1, 2], h5: [2, 0, 1], h6: [1, 2, 0],
    g1: [2, 2, 1, 0], g2: [2, 1, 1], g3: [0, 2, 2], g4: [1, 2, 1], g5: [0, 2, 0],
    g6: [2, 0, 0, 0, 0] },
  { name: 'Darts Tournament', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [1, 2, 0, 1], h2: [1, 2, 1], h3: [0, 2, 0], h4: [0, 1, 1], h5: [2, -1, 1], h6: [0, 2, 1],
    g1: [1, 2, 2, 1], g2: [2, 1, 1], g3: [2, 2, 1], g4: [1, 2, 2], g5: [0, 2, 1],
    g6: [1, 0, 1, 0, 0] },
  { name: 'Billiards + Table Service', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [2, 1, 0, 0], h2: [2, 1, 0], h3: [0, 2, 0], h4: [0, 1, 1], h5: [2, -1, 1], h6: [0, 2, 1],
    g1: [1, 2, 2, 2], g2: [2, 1, 0], g3: [2, 2, 0], g4: [1, 2, 1], g5: [0, 2, 1],
    g6: [0, 0, 1, 0, 0] },
  { name: 'Table Football Tournament', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [1, 2, 0, 1], h2: [1, 2, 1], h3: [1, 2, 0], h4: [0, 1, 1], h5: [2, -1, 1], h6: [0, 2, 1],
    g1: [2, 2, 1, 1], g2: [2, 1, 1], g3: [1, 2, 1], g4: [1, 2, 2], g5: [1, 2, 0],
    g6: [1, 0, 1, 0, 0] },
  { name: 'Paintball / Airsoft', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [-1, 0, 2, 1], h2: [1, 2, 1], h3: [1, 2, -1], h4: [0, 0, 2], h5: [0, 2, 1], h6: [1, 1, 0],
    g1: [2, 2, 1, -1], g2: [2, 1, -1], g3: [-1, 1, 2], g4: [2, 1, -1], g5: [1, 2, -1],
    g6: [2, 0, 0, 0, 0] },
  { name: 'Trampoline Park', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [-1, 1, 2, 1], h2: [1, 2, 1], h3: [1, 1, 0], h4: [0, 0, 2], h5: [2, -1, 1], h6: [1, 1, 0],
    g1: [2, 2, 0, -1], g2: [2, 1, 1], g3: [-1, 1, 2], g4: [2, 0, -1], g5: [1, 1, 1],
    g6: [2, 0, 0, 0, 0] },
  { name: 'Bouldering / Indoor Climbing', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [-1, 1, 2, 0], h2: [1, 2, 0], h3: [1, 1, 0], h4: [0, 0, 2], h5: [2, 0, 1], h6: [1, 1, 0],
    g1: [2, 2, 1, 0], g2: [1, 2, 1], g3: [-1, 1, 2], g4: [2, 1, -1], g5: [1, 1, 0],
    g6: [2, 0, 0, 0, 0] },
  { name: 'Blacklight Mini Golf', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [1, 2, 0, 1], h2: [1, 2, 1], h3: [1, 2, 0], h4: [0, 0, 2], h5: [2, -1, 1], h6: [0, 2, 1],
    g1: [2, 2, 1, 1], g2: [2, 2, 1], g3: [2, 2, 0], g4: [1, 2, 0], g5: [1, 2, 1],
    g6: [1, 0, 1, 0, 0] },
  { name: 'Bubble Football', cat: 'team', seasonal: false, iceBreaker: false,
    h1: [-1, 1, 2, 2], h2: [1, 2, 1], h3: [1, 2, 0], h4: [0, 0, 2], h5: [1, 2, 2], h6: [1, 1, 0],
    g1: [2, 2, 1, -1], g2: [2, 2, 1], g3: [-1, 1, 2], g4: [2, 1, -1], g5: [2, 2, -1],
    g6: [2, 0, 0, 0, 0] },

  // ═══════════ NIGHTLIFE & BAR ═══════════
  { name: 'Pub Quiz Night', cat: 'nightlife', seasonal: false, iceBreaker: true,
    h1: [1, 2, 0, 1], h2: [1, 2, 1], h3: [2, 1, 0], h4: [0, 2, 1], h5: [2, -1, 1], h6: [0, 2, 1],
    g1: [1, 2, 2, 2], g2: [2, 2, 2], g3: [2, 2, 0], g4: [0, 2, 2], g5: [2, 1, 1],
    g6: [0, 2, 1, 0, 0] },
  { name: 'Bar Crawl', cat: 'nightlife', seasonal: false, iceBreaker: false,
    h1: [-1, 1, 1, 2], h2: [-1, 1, 2], h3: [1, 0, 0], h4: [0, 2, 1], h5: [1, 1, 2], h6: [-1, 1, 2],
    g1: [2, 2, 1, -1], g2: [2, 1, 1], g3: [0, 2, 1], g4: [-1, 1, 2], g5: [1, 0, 2],
    g6: [0, 1, 2, 0, 0] },
  { name: 'Club Entry + Reserved Area', cat: 'nightlife', seasonal: false, iceBreaker: false,
    h1: [-1, 0, 1, 2], h2: [-1, 1, 2], h3: [0, 0, 1], h4: [0, 2, 1], h5: [2, -1, 0], h6: [-1, 0, 2],
    g1: [2, 2, 0, -1], g2: [2, 1, 0], g3: [1, 1, 1], g4: [-1, 1, 2], g5: [0, 0, 2],
    g6: [0, 0, 2, 0, 0] },
  { name: 'Live Music Bar + Reserved Table', cat: 'nightlife', seasonal: false, iceBreaker: false,
    h1: [1, 1, 0, 2], h2: [2, 1, 0], h3: [0, 0, 2], h4: [0, 2, 1], h5: [2, 0, 1], h6: [0, 2, 2],
    g1: [1, 2, 2, 1], g2: [2, 1, 1], g3: [2, 2, 0], g4: [0, 2, 2], g5: [0, 0, 2],
    g6: [0, 1, 2, 0, 0] },
  { name: 'Karaoke Night', cat: 'nightlife', seasonal: false, iceBreaker: false,
    h1: [0, 1, 0, 2], h2: [-1, 1, 2], h3: [1, 1, 1], h4: [0, 2, 1], h5: [2, -1, 0], h6: [-1, 2, 2],
    g1: [2, 2, 1, 0], g2: [2, 1, 0], g3: [2, 2, 0], g4: [0, 2, 2], g5: [1, 1, 1],
    g6: [0, 0, 2, 0, 0] },

  // ═══════════ TASTING & CULINARY ═══════════
  { name: 'Beer Tasting Flight', cat: 'tasting', seasonal: false, iceBreaker: false,
    h1: [2, 1, 0, 1], h2: [2, 1, 0], h3: [1, 0, 2], h4: [1, 2, 0], h5: [2, 0, 1], h6: [0, 2, 1],
    g1: [1, 2, 2, 2], g2: [2, 2, 1], g3: [2, 2, 0], g4: [-1, 2, 2], g5: [0, 0, 2],
    g6: [0, 1, 0, 2, 0] },
  { name: 'Whisky / Rum Tasting', cat: 'tasting', seasonal: false, iceBreaker: false,
    h1: [2, 1, 0, 0], h2: [2, 1, 0], h3: [1, 0, 2], h4: [1, 2, 0], h5: [2, -1, 1], h6: [1, 2, 0],
    g1: [0, 1, 2, 2], g2: [2, 1, 1], g3: [2, 2, 0], g4: [-1, 1, 2], g5: [0, 0, 2],
    g6: [0, 2, 0, 2, 0] },
  { name: 'Gin Tasting + Botanicals', cat: 'tasting', seasonal: false, iceBreaker: false,
    h1: [2, 1, 0, 0], h2: [2, 1, 0], h3: [1, 0, 2], h4: [1, 2, 0], h5: [2, 0, 1], h6: [1, 2, 0],
    g1: [0, 1, 2, 2], g2: [2, 1, 1], g3: [2, 2, 0], g4: [-1, 2, 2], g5: [0, 0, 2],
    g6: [0, 2, 0, 2, 0] },
  { name: 'Wine Tasting', cat: 'tasting', seasonal: false, iceBreaker: false,
    h1: [2, 1, -1, 0], h2: [2, 1, 0], h3: [1, 0, 2], h4: [2, 2, 0], h5: [2, 0, 1], h6: [2, 1, 0],
    g1: [-1, 1, 2, 2], g2: [2, 1, 1], g3: [2, 2, -1], g4: [-1, 2, 1], g5: [0, 0, 2],
    g6: [0, 2, 0, 2, 1] },
  { name: 'Cooking Class', cat: 'tasting', seasonal: false, iceBreaker: true,
    h1: [2, 1, 0, 0], h2: [2, 1, 0], h3: [2, 0, 0], h4: [2, 1, 1], h5: [2, -1, 1], h6: [2, 1, 0],
    g1: [0, 1, 2, 2], g2: [1, 2, 2], g3: [2, 2, 0], g4: [2, 1, 0], g5: [2, 0, 1],
    g6: [0, 1, 0, 2, 0] },
  { name: 'Cocktail Making Course', cat: 'tasting', seasonal: false, iceBreaker: true,
    h1: [1, 2, 0, 1], h2: [2, 2, 0], h3: [2, 0, 0], h4: [0, 2, 1], h5: [2, -1, 1], h6: [0, 2, 1],
    g1: [1, 2, 2, 1], g2: [1, 2, 2], g3: [2, 2, 0], g4: [-1, 2, 2], g5: [2, 0, 1],
    g6: [0, 1, 1, 0, 0] },
  { name: 'Food Tour', cat: 'tasting', seasonal: false, iceBreaker: true,
    h1: [1, 2, 0, 0], h2: [2, 1, 0], h3: [1, 0, 2], h4: [2, 1, 1], h5: [0, 1, 2], h6: [2, 1, 0],
    g1: [0, 1, 2, 2], g2: [1, 2, 2], g3: [1, 2, 0], g4: [1, 2, 0], g5: [1, 0, 2],
    g6: [0, 2, 0, 2, 0] },
  { name: 'BBQ Grill & Chill', cat: 'tasting', seasonal: true, iceBreaker: false,
    h1: [2, 1, 0, 1], h2: [1, 2, 1], h3: [1, 0, 1], h4: [2, 1, 0], h5: [0, 2, 1], h6: [2, 1, 0],
    g1: [1, 2, 2, 2], g2: [2, 2, 1], g3: [2, 2, 0], g4: [1, 2, 1], g5: [0, 0, 2],
    g6: [0, 0, 0, 2, 1] },

  // ═══════════ OUTDOOR & ADVENTURE ═══════════
  { name: 'Harbor / River Cruise', cat: 'outdoor', seasonal: true, iceBreaker: false,
    h1: [2, 1, -1, 1], h2: [2, 1, 0], h3: [0, 0, 2], h4: [1, 1, 2], h5: [0, 2, 1], h6: [1, 2, 0],
    g1: [0, 1, 2, 2], g2: [2, 2, 1], g3: [2, 2, 0], g4: [1, 2, 1], g5: [0, 0, 2],
    g6: [0, 2, 0, 0, 1] },
  { name: 'Guided Bike Tour', cat: 'outdoor', seasonal: true, iceBreaker: true,
    h1: [0, 2, 1, 0], h2: [2, 2, 0], h3: [1, 0, 2], h4: [0, 0, 2], h5: [-1, 2, 1], h6: [1, 1, 0],
    g1: [1, 2, 2, 1], g2: [1, 2, 2], g3: [0, 2, 2], g4: [2, 1, -1], g5: [1, 0, 1],
    g6: [1, 2, 0, 0, 0] },
  { name: 'Boat Rental / Pedal Boat', cat: 'outdoor', seasonal: true, iceBreaker: false,
    h1: [2, 1, 0, 1], h2: [2, 1, 0], h3: [1, 0, 2], h4: [0, 1, 2], h5: [-1, 2, 1], h6: [1, 1, 0],
    g1: [1, 2, 2, 2], g2: [2, 2, 1], g3: [2, 2, 0], g4: [1, 2, 1], g5: [0, 0, 2],
    g6: [0, 1, 0, 0, 2] },
  { name: 'Kayak / SUP', cat: 'outdoor', seasonal: true, iceBreaker: false,
    h1: [0, 2, 1, 0], h2: [2, 1, 0], h3: [2, 1, -1], h4: [0, 0, 2], h5: [-1, 2, 1], h6: [1, 1, 0],
    g1: [2, 2, 1, 0], g2: [1, 2, 1], g3: [-1, 2, 2], g4: [2, 0, -1], g5: [2, 1, 0],
    g6: [2, 0, 0, 0, 1] },
  { name: 'Outdoor Scavenger Hunt', cat: 'outdoor', seasonal: false, iceBreaker: true,
    h1: [0, 2, 1, 1], h2: [0, 2, 2], h3: [2, 1, -1], h4: [0, 0, 2], h5: [-1, 2, 1], h6: [1, 1, 0],
    g1: [2, 2, 1, 0], g2: [1, 2, 2], g3: [0, 2, 1], g4: [2, 1, 0], g5: [2, 1, 0],
    g6: [1, 2, 0, 0, 0] },
  { name: 'Photo Challenge Walk + Print', cat: 'outdoor', seasonal: false, iceBreaker: true,
    h1: [1, 2, 0, 1], h2: [0, 2, 2], h3: [2, 1, 0], h4: [0, 0, 2], h5: [0, 2, 1], h6: [1, 1, 0],
    g1: [2, 2, 1, 0], g2: [1, 2, 2], g3: [1, 2, 0], g4: [2, 1, 0], g5: [2, 1, 0],
    g6: [0, 2, 0, 0, 0] },
  { name: 'Walking Tour', cat: 'outdoor', seasonal: false, iceBreaker: true,
    h1: [1, 2, 0, 0], h2: [2, 1, 0], h3: [1, 0, 2], h4: [0, 1, 2], h5: [-1, 2, 1], h6: [1, 2, 0],
    g1: [0, 1, 2, 2], g2: [1, 2, 2], g3: [1, 2, 0], g4: [0, 2, 1], g5: [0, 0, 2],
    g6: [0, 2, 0, 1, 0] },
  { name: 'Street Art / Underground Tour', cat: 'outdoor', seasonal: false, iceBreaker: true,
    h1: [1, 2, 0, 0], h2: [2, 1, 0], h3: [1, 0, 2], h4: [0, 0, 2], h5: [0, 1, 2], h6: [1, 1, 0],
    g1: [2, 2, 1, 0], g2: [1, 2, 2], g3: [1, 2, 0], g4: [2, 1, 0], g5: [1, 0, 1],
    g6: [0, 2, 0, 0, 0] },
  { name: 'Beach Day + Games', cat: 'outdoor', seasonal: true, iceBreaker: false,
    h1: [1, 2, 1, 2], h2: [1, 2, 1], h3: [1, 1, 1], h4: [0, 1, 2], h5: [-1, 2, 1], h6: [0, 2, 1],
    g1: [2, 2, 1, 0], g2: [2, 2, 1], g3: [0, 2, 2], g4: [1, 2, 1], g5: [1, 1, 1],
    g6: [2, 0, 0, 0, 1] },

  // ═══════════ ENTERTAINMENT & CULTURE ═══════════
  { name: 'Creative Workshop', cat: 'entertainment', seasonal: false, iceBreaker: true,
    h1: [2, 1, 0, 0], h2: [2, 2, 0], h3: [2, 0, 0], h4: [0, 0, 2], h5: [2, 0, 1], h6: [1, 1, 0],
    g1: [1, 2, 2, 1], g2: [1, 2, 2], g3: [2, 2, 0], g4: [2, 1, -1], g5: [2, 0, 1],
    g6: [0, 2, 0, 0, 1] },
  { name: 'Dance Class', cat: 'entertainment', seasonal: false, iceBreaker: false,
    h1: [0, 2, 0, 2], h2: [-1, 2, 2], h3: [2, 0, -1], h4: [0, 0, 2], h5: [2, 0, 1], h6: [1, 1, 0],
    g1: [2, 2, 1, 0], g2: [2, 2, 1], g3: [0, 2, 1], g4: [2, 1, 0], g5: [2, 0, 0],
    g6: [1, 2, 1, 0, 0] },
  { name: 'Musical / Theater Show', cat: 'entertainment', seasonal: false, iceBreaker: false,
    h1: [2, 1, -1, 0], h2: [2, 1, 0], h3: [0, 0, 2], h4: [0, 1, 2], h5: [2, -1, 1], h6: [0, 2, 1],
    g1: [0, 1, 2, 2], g2: [2, 1, 1], g3: [2, 2, 0], g4: [2, 1, 0], g5: [0, 0, 2],
    g6: [0, 2, 1, 0, 0] },
  { name: 'Comedy Show + Pre-Drinks', cat: 'entertainment', seasonal: false, iceBreaker: false,
    h1: [2, 1, 0, 1], h2: [2, 1, 0], h3: [0, 0, 2], h4: [0, 1, 2], h5: [2, -1, 1], h6: [0, 2, 1],
    g1: [1, 2, 2, 2], g2: [2, 2, 2], g3: [2, 2, 0], g4: [1, 2, 1], g5: [0, 0, 2],
    g6: [0, 2, 1, 0, 0] },
  { name: 'Private Poker Night', cat: 'entertainment', seasonal: false, iceBreaker: false,
    h1: [1, 2, 0, 1], h2: [1, 2, 1], h3: [0, 2, 0], h4: [0, 2, 1], h5: [2, -1, 0], h6: [0, 2, 2],
    g1: [1, 2, 2, 2], g2: [2, 1, 0], g3: [2, 2, 0], g4: [0, 2, 2], g5: [0, 2, 0],
    g6: [1, 0, 1, 0, 0] },
  { name: 'Sports Viewing', cat: 'entertainment', seasonal: false, iceBreaker: false,
    h1: [2, 1, 0, 1], h2: [2, 1, 0], h3: [1, 0, 2], h4: [1, 2, 0], h5: [2, 0, 1], h6: [0, 2, 1],
    g1: [1, 2, 2, 2], g2: [2, 1, 0], g3: [2, 2, 0], g4: [0, 2, 2], g5: [1, 0, 2],
    g6: [1, 0, 1, 1, 0] },

  // ═══════════ WELLNESS & RELAXATION ═══════════
  { name: 'Spa / Sauna Day Pass', cat: 'wellness', seasonal: false, iceBreaker: false,
    h1: [2, 0, -1, -1], h2: [2, 1, -1], h3: [0, -1, 2], h4: [0, 0, 2], h5: [2, 0, 1], h6: [2, 0, -1],
    g1: [0, 1, 2, 2], g2: [2, 1, -1], g3: [2, 1, -1], g4: [2, 1, -1], g5: [0, -1, 2],
    g6: [-1, 0, -1, 0, 2] },
  { name: 'Massage Add-On', cat: 'wellness', seasonal: false, iceBreaker: false,
    h1: [2, 0, -1, 0], h2: [2, 1, -1], h3: [0, -1, 1], h4: [0, 0, 2], h5: [2, 0, 1], h6: [1, 0, -1],
    g1: [0, 1, 2, 2], g2: [2, 1, 0], g3: [2, 1, -1], g4: [2, 0, -1], g5: [0, -1, 2],
    g6: [-1, 0, -1, 0, 2] },

  // ═══════════ DINING EXPERIENCES ═══════════
  { name: 'Brunch Buffet', cat: 'dining', seasonal: false, iceBreaker: false,
    h1: [2, 1, 0, 0], h2: [1, 2, 1], h3: [1, 0, 1], h4: [2, 1, 0], h5: [2, 0, 1], h6: [2, 0, 0],
    g1: [1, 2, 2, 2], g2: [2, 2, 1], g3: [2, 2, 0], g4: [2, 1, 0], g5: [0, 0, 2],
    g6: [0, 0, 0, 2, 0] },
  { name: 'Steakhouse Dinner', cat: 'dining', seasonal: false, iceBreaker: false,
    h1: [2, 0, -1, 0], h2: [1, 2, 1], h3: [0, 0, 1], h4: [2, 1, 0], h5: [2, 0, 1], h6: [2, 2, 1],
    g1: [0, 1, 2, 2], g2: [2, 1, 1], g3: [2, 2, 0], g4: [1, 2, 0], g5: [0, 0, 2],
    g6: [0, 0, 0, 2, 0] },
  { name: 'Burger + Beer Combo', cat: 'dining', seasonal: false, iceBreaker: false,
    h1: [1, 1, 0, 1], h2: [1, 2, 0], h3: [0, 0, 1], h4: [2, 1, 0], h5: [2, 0, 1], h6: [1, 2, 1],
    g1: [2, 2, 1, 0], g2: [2, 2, 1], g3: [2, 2, 1], g4: [1, 2, 1], g5: [0, 0, 2],
    g6: [0, 0, 0, 2, 0] },
  { name: 'Tapas / Shared Plates', cat: 'dining', seasonal: false, iceBreaker: true,
    h1: [2, 1, 0, 0], h2: [1, 2, 0], h3: [1, 0, 1], h4: [2, 1, 0], h5: [2, 0, 1], h6: [2, 1, 0],
    g1: [1, 2, 2, 2], g2: [2, 2, 2], g3: [2, 2, 0], g4: [1, 2, 0], g5: [1, 0, 2],
    g6: [0, 1, 0, 2, 0] },
  { name: 'Sushi Dinner', cat: 'dining', seasonal: false, iceBreaker: false,
    h1: [2, 0, -1, 0], h2: [1, 2, 0], h3: [0, 0, 1], h4: [2, 1, 0], h5: [2, -1, 1], h6: [2, 1, 0],
    g1: [1, 2, 2, 2], g2: [2, 1, 1], g3: [2, 2, 0], g4: [1, 2, 0], g5: [0, 0, 2],
    g6: [0, 1, 0, 2, 0] },
  { name: 'BBQ Ribs + Beer Tower', cat: 'dining', seasonal: false, iceBreaker: false,
    h1: [1, 1, 0, 2], h2: [1, 2, 1], h3: [0, 0, 1], h4: [2, 2, 0], h5: [1, 1, 2], h6: [1, 2, 1],
    g1: [2, 2, 1, 1], g2: [2, 2, 1], g3: [2, 2, 1], g4: [0, 2, 2], g5: [0, 0, 2],
    g6: [0, 0, 0, 2, 0] },
  { name: 'Pizza Party + Craft Beer', cat: 'dining', seasonal: false, iceBreaker: false,
    h1: [2, 1, 0, 1], h2: [1, 2, 0], h3: [1, 0, 1], h4: [2, 1, 0], h5: [2, 0, 1], h6: [1, 2, 0],
    g1: [2, 2, 1, 0], g2: [2, 2, 1], g3: [2, 2, 0], g4: [1, 2, 1], g5: [1, 0, 2],
    g6: [0, 0, 0, 2, 0] },
  { name: 'Private Dining Room + Chef\'s Menu', cat: 'dining', seasonal: false, iceBreaker: false,
    h1: [2, 0, -1, 0], h2: [2, 2, 1], h3: [0, 0, 2], h4: [2, 1, 1], h5: [2, -1, 1], h6: [2, 1, 0],
    g1: [-1, 1, 2, 2], g2: [2, 1, 0], g3: [2, 2, 0], g4: [1, 2, 0], g5: [0, 0, 2],
    g6: [0, 1, 0, 2, 0] },
  { name: 'Beer Hall / Platter Night', cat: 'dining', seasonal: false, iceBreaker: false,
    h1: [1, 1, 0, 2], h2: [1, 2, 1], h3: [1, 0, 1], h4: [1, 2, 0], h5: [2, 0, 1], h6: [0, 2, 2],
    g1: [2, 2, 1, 1], g2: [2, 2, 1], g3: [2, 2, 0], g4: [-1, 2, 2], g5: [0, 0, 2],
    g6: [0, 1, 1, 2, 0] },
];

// --- Scoring Functions ---

function lookupScore(scores: number[], options: readonly string[], answer: string): number {
  const idx = options.indexOf(answer);
  return idx >= 0 && idx < scores.length ? scores[idx] : 0;
}

function calculateG6Score(g6Scores: number[], selectedVibes: string[]): number {
  if (selectedVibes.length === 0) return 0;
  // G6 multi-select: take MAX score of selected vibes
  let maxScore = -Infinity;
  for (const vibe of selectedVibes) {
    const idx = G6_VIBES.indexOf(vibe);
    if (idx >= 0 && idx < g6Scores.length) {
      maxScore = Math.max(maxScore, g6Scores[idx]);
    }
  }
  return maxScore === -Infinity ? 0 : maxScore;
}

function applyIceBreakerBonus(activity: ActivityDef, g2Answer: GroupCohesion): number {
  if (!activity.iceBreaker) return 0;
  if (g2Answer === 'strangers' || g2Answer === 'mixed') return 3;
  return 0;
}

function applyH3G5Conflict(
  activity: ActivityDef,
  h3Answer: CompetitionStyle,
  g5Answer: GroupDynamic
): number {
  // H3=competitive + G5=relaxed → reduce competitive activity scores by -2
  if (h3Answer === 'competitive' && g5Answer === 'relaxed') {
    const competitiveScore = activity.h3[1]; // competitive index
    if (competitiveScore >= 2) return -2;
  }
  // H3=cooperative + G5=competitive → boost team-competition activities by +2
  if (h3Answer === 'cooperative' && g5Answer === 'competitive') {
    const coopScore = activity.h3[0]; // cooperative index
    const compDynamic = activity.g5[1]; // competitive dynamic index
    if (coopScore >= 1 && compDynamic >= 1) return 2;
  }
  // H3=spectator + G5=team_players → boost social spectator activities by +1
  if (h3Answer === 'spectator' && g5Answer === 'team_players') {
    const spectatorScore = activity.h3[2]; // spectator index
    if (spectatorScore >= 2) return 1;
  }
  return 0;
}

function applySeasonalPenalty(activity: ActivityDef): number {
  if (!activity.seasonal) return 0;
  const month = new Date().getMonth(); // 0-indexed: 0=Jan, 10=Nov, 11=Dec
  // Winter months: Nov (10), Dec (11), Jan (0), Feb (1), Mar (2)
  if (month >= 10 || month <= 2) return -2;
  return 0;
}

function isHardFiltered(activity: ActivityDef, answers: QuestionnaireAnswers): boolean {
  // G2=strangers AND G2_strangers score is -1 → EXCLUDE
  if (answers.g2 === 'strangers' && activity.g2[2] === -1) return true;
  // G3=low AND G3_low score is -1 → EXCLUDE
  if (answers.g3 === 'low' && activity.g3[0] === -1) return true;
  // G4=low AND G4_low score is -1 → EXCLUDE
  if (answers.g4 === 'low' && activity.g4[0] === -1) return true;
  // G5=relaxed AND G5_relaxed score is -1 → EXCLUDE
  if (answers.g5 === 'relaxed' && activity.g5[2] === -1) return true;
  return false;
}

// --- Main Scoring Function ---

/**
 * Score all activities against questionnaire answers.
 * Returns activities sorted by total score (descending), with hard-filtered activities excluded.
 */
export function scoreActivities(answers: QuestionnaireAnswers): ScoredActivity[] {
  const results: ScoredActivity[] = [];

  for (const activity of ACTIVITIES) {
    // Hard filter check
    if (isHardFiltered(activity, answers)) continue;

    // Base score: sum across all 12 questions
    let score = 0;
    score += lookupScore(activity.h1, H1_OPTIONS, answers.h1);
    score += lookupScore(activity.h2, H2_OPTIONS, answers.h2);
    score += lookupScore(activity.h3, H3_OPTIONS, answers.h3);
    score += lookupScore(activity.h4, H4_OPTIONS, answers.h4);
    score += lookupScore(activity.h5, H5_OPTIONS, answers.h5);
    score += lookupScore(activity.h6, H6_OPTIONS, answers.h6);
    score += lookupScore(activity.g1, G1_OPTIONS, answers.g1);
    score += lookupScore(activity.g2, G2_OPTIONS, answers.g2);
    score += lookupScore(activity.g3, G3_OPTIONS, answers.g3);
    score += lookupScore(activity.g4, G4_OPTIONS, answers.g4);
    score += lookupScore(activity.g5, G5_OPTIONS, answers.g5);
    score += calculateG6Score(activity.g6, answers.g6);

    // Adjustments
    score += applyIceBreakerBonus(activity, answers.g2);
    score += applyH3G5Conflict(activity, answers.h3, answers.g5);
    score += applySeasonalPenalty(activity);

    results.push({
      name: activity.name,
      category: activity.cat,
      totalScore: score,
      seasonal: activity.seasonal,
      iceBreaker: activity.iceBreaker,
    });
  }

  // Sort descending by score
  results.sort((a, b) => b.totalScore - a.totalScore);

  return results;
}

// --- Score Reference ---
// Max possible: ~24 (all 12 questions score 2) + 3 (ice-breaker) + 2 (H3×G5) = ~29
// Strong match: 15+
// Good match: 10-14
// Weak match: 5-9
// Poor match: below 5

export const SCORE_THRESHOLDS = {
  STRONG: 15,
  GOOD: 10,
  WEAK: 5,
} as const;
