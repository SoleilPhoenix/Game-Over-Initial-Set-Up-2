# Dynamic Package Assembly Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace static dummy package features in Wizard Step 4 with dynamically assembled packages driven by the scoring matrix and wizard questionnaire answers (H1–H6, G1–G6).

**Architecture:** A new `packageAssembly.ts` utility calls the existing `scoreActivities()` function, separates results by category (activities / dining / nightlife), picks the top matches per tier slot, and returns 3 packages (S/M/L) in the same shape as the current `FALLBACK_PACKAGES` — so `packages.tsx` changes are minimal. Provider names are NOT shown at booking time; only clean type descriptions (e.g. "Escape Room", "Steakhouse Dinner"). The provider-reveal mechanic (14 days before event, full payment required) is a future task and is NOT part of this plan.

**Tech Stack:** TypeScript, existing `scoreActivities()` from `src/utils/packageMatching.ts`, existing wizard store types from `src/stores/wizardStore.ts`, Vitest for tests.

---

## Task 1: Create `src/utils/packageAssembly.ts` with tests (TDD)

**Files:**
- Create: `src/utils/packageAssembly.ts`
- Create: `src/utils/__tests__/packageAssembly.test.ts`

**Context:** The scoring matrix in `src/utils/packageMatching.ts` exports `scoreActivities(answers: QuestionnaireAnswers): ScoredActivity[]`. Each `ScoredActivity` has `{ name, category, totalScore, seasonal, iceBreaker }`. Categories are: `'team' | 'nightlife' | 'tasting' | 'outdoor' | 'entertainment' | 'wellness' | 'dining'`. The wizard store exports all answer types from `src/stores/wizardStore.ts`.

**Package assembly rules:**
- **Activity pool:** categories `team`, `tasting`, `outdoor`, `entertainment`, `wellness` (everything except `dining` and `nightlife`)
- **Dining slot:** top-scored `dining` category activity → mapped to clean display name
- **Bar slot:** top-scored `nightlife` category activity → mapped to clean display name
- **S (essential):** `[topActivity[0], diningSlot, barSlot]` — 3 features
- **M (classic):** `[topActivity[0], topActivity[1], diningSlot, barSlot]` — 4 features, `bestMatch: true`
- **L (grand):** `[topActivity[0], topActivity[1], topActivity[2], diningSlot, barSlot]` — 5 features
- If fewer unique top activities exist than needed, repeat the last one (edge case safety)

---

### Step 1: Write the failing tests

Create `src/utils/__tests__/packageAssembly.test.ts`:

```typescript
import { assemblePackages } from '../packageAssembly';

const FULL_ANSWERS = {
  h1: 'active' as const,
  h2: 'group' as const,
  h3: 'cooperative' as const,
  h4: 'experience' as const,
  h5: 'indoor' as const,
  h6: 'dinner_bar' as const,
  g1: '26-30' as const,
  g2: 'mixed' as const,
  g3: 'medium' as const,
  g4: 'social' as const,
  g5: 'team_players' as const,
  g6: ['action', 'nightlife'],
};

describe('assemblePackages', () => {
  it('returns exactly 3 packages', () => {
    expect(assemblePackages(FULL_ANSWERS, 'hannover')).toHaveLength(3);
  });

  it('returns tiers in order essential → classic → grand', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'hannover');
    expect(pkgs[0].tier).toBe('essential');
    expect(pkgs[1].tier).toBe('classic');
    expect(pkgs[2].tier).toBe('grand');
  });

  it('S has 3 features, M has 4, L has 5', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'hannover');
    expect(pkgs[0].features).toHaveLength(3);
    expect(pkgs[1].features).toHaveLength(4);
    expect(pkgs[2].features).toHaveLength(5);
  });

  it('classic tier has bestMatch true, others do not', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'hannover');
    expect(pkgs[1].bestMatch).toBe(true);
    expect(pkgs[0].bestMatch).toBeFalsy();
    expect(pkgs[2].bestMatch).toBeFalsy();
  });

  it('ids include city slug', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'hamburg');
    expect(pkgs[0].id).toBe('hamburg-essential');
    expect(pkgs[1].id).toBe('hamburg-classic');
    expect(pkgs[2].id).toBe('hamburg-grand');
  });

  it('uses defaults for null answers without throwing', () => {
    const nullAnswers = {
      h1: null, h2: null, h3: null, h4: null, h5: null, h6: null,
      g1: null, g2: null, g3: null, g4: null, g5: null, g6: [],
    };
    const pkgs = assemblePackages(nullAnswers, 'berlin');
    expect(pkgs).toHaveLength(3);
    expect(pkgs[0].features).toHaveLength(3);
    expect(pkgs[1].features).toHaveLength(4);
    expect(pkgs[2].features).toHaveLength(5);
  });

  it('different profiles produce different top activities', () => {
    const relaxed = { ...FULL_ANSWERS, h1: 'relaxed' as const, h4: 'food' as const, g5: 'relaxed' as const };
    const action  = { ...FULL_ANSWERS, h1: 'action' as const,  h4: 'experience' as const, g5: 'competitive' as const };
    const relaxedPkgs = assemblePackages(relaxed, 'hannover');
    const actionPkgs  = assemblePackages(action, 'hannover');
    expect(relaxedPkgs[0].features[0]).not.toBe(actionPkgs[0].features[0]);
  });

  it('prices match tier definitions', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'berlin');
    expect(pkgs[0].price_per_person_cents).toBe(99_00);
    expect(pkgs[1].price_per_person_cents).toBe(149_00);
    expect(pkgs[2].price_per_person_cents).toBe(199_00);
  });

  it('all feature strings are non-empty strings', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'hannover');
    for (const pkg of pkgs) {
      for (const feature of pkg.features) {
        expect(typeof feature).toBe('string');
        expect(feature.length).toBeGreaterThan(0);
      }
    }
  });

  it('L tier activities are all unique (no duplicates when pool has enough)', () => {
    const pkgs = assemblePackages(FULL_ANSWERS, 'hannover');
    const grand = pkgs[2];
    const activityFeatures = grand.features.slice(0, 3);
    const unique = new Set(activityFeatures);
    expect(unique.size).toBe(3);
  });
});
```

### Step 2: Run tests — verify they fail

```bash
npm test -- src/utils/__tests__/packageAssembly.test.ts
```

Expected: FAIL — `Cannot find module '../packageAssembly'`

### Step 3: Write the implementation

Create `src/utils/packageAssembly.ts`:

```typescript
/**
 * Package Assembly
 * Builds 3 dynamic packages (S/M/L) from wizard questionnaire answers.
 * Uses the scoring matrix to pick the best-matched activities, dining, and bar slots.
 * Provider names are NOT included here — they are revealed after full payment.
 */

import { scoreActivities } from './packageMatching';
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
  hero_image_url: any;
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
};

const DINING_NAMES: Record<string, string> = {
  'Burger + Beer Combo':              'Casual Dinner & Drinks',
  'Tapas / Shared Plates':            'Tapas Dinner',
  'BBQ Ribs + Beer Tower':            'BBQ Dinner',
  'Pizza Party + Craft Beer':         'Pizza & Craft Beer Dinner',
  "Private Dining Room + Chef's Menu": 'Private Dining Experience',
  'Beer Hall / Platter Night':        'Beer Hall Dinner',
};

const BAR_NAMES: Record<string, string> = {
  'Bar Crawl':                     'Bar Crawl',
  'Club Entry + Reserved Area':    'Club Night',
  'Live Music Bar + Reserved Table': 'Live Music Bar',
  'Karaoke Night':                 'Karaoke Night',
  'Pub Quiz Night':                'Pub Quiz Night',
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

  // Deduplicate activities, pad with last if fewer than 3
  const uniqueActivities = [...new Set(activities)];
  const act = (i: number) => uniqueActivities[i] ?? uniqueActivities[uniqueActivities.length - 1] ?? topDining;

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
```

### Step 4: Run tests — verify they pass

```bash
npm test -- src/utils/__tests__/packageAssembly.test.ts
```

Expected: All 9 tests PASS.

### Step 5: Run full test suite — verify no regressions

```bash
npm test
```

Expected: All tests pass (or pre-existing failures only).

### Step 6: Commit

```bash
git add src/utils/packageAssembly.ts src/utils/__tests__/packageAssembly.test.ts
git commit -m "feat: add dynamic package assembly from scoring matrix"
```

---

## Task 2: Wire assemblePackages into packages.tsx

**Files:**
- Modify: `app/create-event/packages.tsx` (lines ~6–30 imports, ~38–147 FALLBACK_PACKAGES, ~469–500 WizardStep4 component body)

**Context:** `packages.tsx` uses `FALLBACK_PACKAGES` as a static lookup when the DB returns empty. We replace this lookup with `assemblePackages()` called from the wizard state. The DB path (`dbPackages`) remains untouched — it stays the primary source.

### Step 1: Add import

In `app/create-event/packages.tsx`, add one import after the existing imports:

```typescript
import { assemblePackages } from '@/utils/packageAssembly';
```

### Step 2: Expand destructured wizard state

Find this block (around line 470):
```typescript
const {
  cityId,
  energyLevel,
  groupVibe,
  participantCount,
  selectedPackageId,
  setSelectedPackageId,
  isStepValid,
} = wizardState;
```

Replace with:
```typescript
const {
  cityId,
  energyLevel, spotlightComfort, competitionStyle, enjoymentType, indoorOutdoor, eveningStyle,
  averageAge, groupCohesion, fitnessLevel, drinkingCulture, groupDynamic, groupVibe,
  participantCount,
  selectedPackageId,
  setSelectedPackageId,
  isStepValid,
} = wizardState;
```

### Step 3: Build wizardAnswers and replace FALLBACK_PACKAGES

Find this block (around line 492):
```typescript
const citySlug = cityId ? (CITY_UUID_TO_SLUG[cityId] || cityId) : null;
const rawPackages = (dbPackages && dbPackages.length > 0)
  ? dbPackages
  : (citySlug ? FALLBACK_PACKAGES[citySlug] || [] : []);
```

Replace with:
```typescript
const citySlug = cityId ? (CITY_UUID_TO_SLUG[cityId] || 'berlin') : 'berlin';
const wizardAnswers = {
  h1: energyLevel, h2: spotlightComfort, h3: competitionStyle,
  h4: enjoymentType, h5: indoorOutdoor, h6: eveningStyle,
  g1: averageAge, g2: groupCohesion, g3: fitnessLevel,
  g4: drinkingCulture, g5: groupDynamic, g6: groupVibe,
};
const rawPackages = (dbPackages && dbPackages.length > 0)
  ? dbPackages
  : assemblePackages(wizardAnswers, citySlug);
```

### Step 4: Remove FALLBACK_PACKAGES constant (optional cleanup)

The `FALLBACK_PACKAGES` constant (lines ~38–147) is now unused. Delete it. Also remove the now-unused `CITY_UUID_TO_SLUG` if preferred, but keep it since it is still used in the `citySlug` resolution above — leave it in place.

> **Note:** TypeScript will warn about unused variables. Delete `FALLBACK_PACKAGES` to keep the file clean.

### Step 5: Run TypeScript check

```bash
npm run typecheck
```

Expected: No new errors. If `FALLBACK_PACKAGES` deletion left a TS error, it means it's used elsewhere — investigate before deleting.

### Step 6: Manual smoke test

Start the dev server and navigate through the full wizard (Steps 1–4). Verify:
1. Step 4 shows 3 package cards (S/M/L)
2. The "M – Classic" card has the "Recommendation" badge
3. Feature lists match the wizard answers (e.g., action-oriented answers → Go-Karting, Laser Tag; relaxed answers → Escape Room, Cooking Class)
4. Pricing shows correctly (€99 / €149 / €199)

```bash
npm start
```

### Step 7: Commit

```bash
git add app/create-event/packages.tsx
git commit -m "feat: wire dynamic package assembly into wizard step 4"
```

---

## Summary

| Task | Files Changed | Tests |
|------|--------------|-------|
| 1 | `src/utils/packageAssembly.ts` (new), `src/utils/__tests__/packageAssembly.test.ts` (new) | 9 unit tests |
| 2 | `app/create-event/packages.tsx` (minor edit) | Manual smoke test |

**What this does NOT include (future tasks):**
- Provider name reveal (14 days before event, full payment required) → separate task
- `src/data/curatedProviders.ts` (provider shortlists) → added when you provide the shortlists
- i18n translation of feature strings → separate pass
