# Questionnaire Redesign — AI-Matching Fragebogen

**Date**: 2026-02-11
**Status**: Approved Design
**Related**: `Activities_lists/ACTIVITY_MATCHING_MATRIX.md` (Scoring Matrix)

---

## Problem Statement

The current wizard questionnaire (Step 2 + Step 3) has 12 questions that don't cleanly map to the available activity catalog. Some questions are redundant (Travel Distance — city is already chosen), locked (Event Duration — only 1 day available), or too abstract (Social Approach — "Wallflower/Butterfly" doesn't drive activity selection).

## Goal

Design 12 questions (6 Honoree + 6 Group) that:
1. Map directly to 6 activity dimensions extracted from the Hannover activity catalog
2. Enable the AI matching algorithm to score ~35 activity types accurately
3. Preserve the USP "Relationship Preservation" through intelligent conflict detection
4. Work identically across all cities (Hannover, Hamburg, Berlin) — only provider data changes

## The 6 Activity Dimensions

Derived from analyzing 40+ activity categories in Hannover:

| # | Dimension | What it measures | Example spectrum |
|---|-----------|-----------------|-----------------|
| 1 | Energy/Intensity | Physical and emotional intensity | Spa ↔ Paintball |
| 2 | Social Dynamic | How people interact | Spectator ↔ Cooperative ↔ Competitive |
| 3 | Drinking Focus | Role of alcohol | None ↔ Central |
| 4 | Indoor/Outdoor | Physical setting | VR Arcade ↔ Kayak |
| 5 | Bonding Type | Ice-breaker necessity | Close friends fun ↔ Stranger bonding |
| 6 | Age Appropriateness | Maturity of experience | Club/Trampoline ↔ Wine Tasting/Spa |

---

## Honoree Questions (Step 2) — 6 Questions

### H1: Energy Level
**Dimension**: Energy/Intensity
**Question (DE)**: "Wie würde [Name] den perfekten Tag beschreiben?"
**Question (EN)**: "How would [Name] describe the perfect day?"

| Value | Label (DE) | Label (EN) | Activity Examples |
|-------|-----------|-----------|-------------------|
| `relaxed` | Entspannt & Gemütlich | Relaxed & Cozy | Spa, Cooking, Wine Tasting |
| `active` | Aktiv & Unterhaltsam | Active & Fun | Escape Room, Bowling, VR |
| `action` | Volle Action | Full Action | Laser Tag, Go-Kart, Paintball |
| `party` | Non-Stop Party | Non-Stop Party | Bar Crawl, Club, Pub Crawl |

### H2: Spotlight Comfort
**Dimension**: Unique to Honoree (affects public-facing activities)
**Question (DE)**: "Wie steht [Name] dazu, im Mittelpunkt zu stehen?"
**Question (EN)**: "How does [Name] feel about being the center of attention?"

| Value | Label (DE) | Label (EN) | Activity Examples |
|-------|-----------|-----------|-------------------|
| `background` | Lieber im Hintergrund | Prefers the background | Cooking, Private Dining, Tasting |
| `group` | Gerne dabei, kein Spotlight | Happy participant, no spotlight | Group activities, Escape Room |
| `center_stage` | Liebt die Bühne! | Loves the spotlight! | Bar Crawl with challenges, Photo Walk |

### H3: Competition vs Teamwork
**Dimension**: Social Dynamic (Honoree perspective)
**Question (DE)**: "Was macht [Name] mehr Spaß?"
**Question (EN)**: "What does [Name] enjoy more?"

| Value | Label (DE) | Label (EN) | Activity Examples |
|-------|-----------|-----------|-------------------|
| `cooperative` | Gemeinsam Herausforderungen lösen | Solving challenges together | Escape Room, Cooking, Scavenger Hunt |
| `competitive` | Gegeneinander antreten | Competing against each other | Go-Kart, Darts, Axe Throwing |
| `spectator` | Zurücklehnen & genießen | Sit back & enjoy | Comedy, Tasting, Live Music |

### H4: Enjoyment Type
**Dimension**: Drinking Focus + Culinary
**Question (DE)**: "Was begeistert [Name] mehr?"
**Question (EN)**: "What excites [Name] more?"

| Value | Label (DE) | Label (EN) | Activity Examples |
|-------|-----------|-----------|-------------------|
| `food` | Food & Kulinarik | Food & Culinary | Cooking Class, Food Tour, Private Dining |
| `drinks` | Drinks & Tastings | Drinks & Tastings | Beer/Whisky/Gin Tasting, Bar Crawl |
| `experience` | Erlebnisse über alles | Experiences above all | Laser Tag, VR, Escape Room, Bouldering |

### H5: Indoor/Outdoor
**Dimension**: Indoor/Outdoor
**Question (DE)**: "Wo fühlt sich [Name] am wohlsten?"
**Question (EN)**: "Where does [Name] feel most comfortable?"

| Value | Label (DE) | Label (EN) | Activity Examples |
|-------|-----------|-----------|-------------------|
| `indoor` | Drinnen | Indoors | Escape Room, VR, Bowling, Spa |
| `outdoor` | Draußen | Outdoors | Boat, Kayak, Walking Tour, Paintball |
| `mix` | Mix aus beidem | Mix of both | Flexible combinations |

### H6: Evening Style
**Dimension**: Nightlife bridge (Energy + Drinking)
**Question (DE)**: "Wie sieht der perfekte Abend für [Name] aus?"
**Question (EN)**: "What does the perfect evening look like for [Name]?"

| Value | Label (DE) | Label (EN) | Activity Examples |
|-------|-----------|-----------|-------------------|
| `dinner_only` | Gemütliches Dinner, dann Feierabend | Cozy dinner, then home | Dinner-only activities |
| `dinner_bar` | Dinner + Drinks in einer Bar | Dinner + Drinks at a bar | Beer Hall, Live Music, Pub Quiz |
| `full_night` | Dinner + Bar Crawl + Club | Dinner + Bar Crawl + Club | Club Entry, Bar Crawl |

---

## Group Questions (Step 3) — 6 Questions

### G1: Average Age
**Dimension**: Age Appropriateness
**Question (DE)**: "Durchschnittsalter der Gruppe?"
**Question (EN)**: "Average age of the group?"

| Value | Label | Matching Bias |
|-------|-------|--------------|
| `21-25` | 21–25 | Physical, party, budget-friendly |
| `26-30` | 26–30 | Balanced mix |
| `31-35` | 31–35 | Experiences, tastings, quality |
| `35+` | 35+ | Premium, wellness, refined |

### G2: Group Cohesion
**Dimension**: Bonding Type — THE Relationship Preservation Factor
**Question (DE)**: "Wie gut kennt sich die Gruppe?"
**Question (EN)**: "How well does the group know each other?"

| Value | Label (DE) | Label (EN) | Matching Logic |
|-------|-----------|-----------|----------------|
| `close_friends` | Enge Freunde | Close friends | Everything goes, competitive OK |
| `mixed` | Gemischt | Mixed | Need ice-breaker mix |
| `strangers` | Kennen sich kaum | Barely know each other | Cooperative/ice-breaker REQUIRED |

**Ice-Breaker Bonus**: +3 for cooperative activities when G2 = `strangers` or `mixed`

### G3: Fitness Level
**Dimension**: Energy (Group reality check)
**Question (DE)**: "Wie sportlich ist die Gruppe?"
**Question (EN)**: "How sporty is the group?"

| Value | Label (DE) | Label (EN) | Matching Logic |
|-------|-----------|-----------|----------------|
| `low` | Eher gemütlich | Rather chill | Excludes Paintball, Bouldering, Trampoline |
| `medium` | Durchschnittlich aktiv | Moderately active | Broadest selection |
| `high` | Sehr sportlich | Very sporty | Boosts physical activities |

### G4: Drinking Culture
**Dimension**: Drinking Focus (Group perspective)
**Question (DE)**: "Welche Rolle spielt Alkohol für die Gruppe?"
**Question (EN)**: "What role does alcohol play for the group?"

| Value | Label (DE) | Label (EN) | Matching Logic |
|-------|-----------|-----------|----------------|
| `low` | Wenig/kein Alkohol | Little/no alcohol | Excludes tasting, bar-heavy activities |
| `social` | Gesellig | Social drinking | Drinks as accompaniment |
| `central` | Trinken ist zentral | Drinking is central | Boosts tastings, bar crawl, pub quiz |

### G5: Group Dynamic (NEW — replaces Budget)
**Dimension**: Social Dynamic (Group perspective)
**Question (DE)**: "Wie tickt die Gruppe zusammen?"
**Question (EN)**: "How does the group vibe together?"

| Value | Label (DE) | Label (EN) | Matching Logic |
|-------|-----------|-----------|----------------|
| `team_players` | Team-Player | Team players | Boosts Escape Room, Cooking, Scavenger Hunt |
| `competitive` | Wettkampf-Typ | Competitive type | Boosts Go-Kart, Darts, Laser Tag |
| `relaxed` | Entspannt | Relaxed | Boosts Comedy, Tastings, Dining |

**Cross-Reference with H3**: Creates 2D conflict detection matrix (see below)

### G6: Group Vibe (Multi-Select, max 2)
**Dimension**: Overall interest areas
**Question (DE)**: "Was interessiert die Gruppe am meisten?"
**Question (EN)**: "What interests the group the most?"

| Value | Label (DE) | Label (EN) | Activity Category |
|-------|-----------|-----------|-------------------|
| `action` | Action & Adrenalin | Action & Adrenaline | Laser Tag, Go-Kart, Paintball |
| `culture` | Kultur & Entdecken | Culture & Explore | Walking Tour, Scavenger Hunt, Comedy |
| `nightlife` | Nightlife & Party | Nightlife & Party | Club, Bar Crawl, Live Music |
| `food` | Food & Genuss | Food & Indulgence | Tastings, Cooking, Food Tour |
| `wellness` | Wellness & Entspannung | Wellness & Relaxation | Spa, Massage, Boat on Maschsee |

---

## Relationship Preservation: H3 × G5 Conflict Matrix

This is the core mechanism that prevents the AI from creating packages that cause group friction:

| | G5 = Team-Players | G5 = Competitive | G5 = Relaxed |
|---|---|---|---|
| **H3 = Cooperative** | PERFECT MATCH: Pure coop (Escape Room, Cooking) | ADAPT: Team-based competition (Laser Tag teams, Bowling teams) +2 bonus | MODERATE: Social cooperative (Food Tour, Walking Tour) |
| **H3 = Competitive** | ADAPT: Friendly team challenges (Pub Quiz, Scavenger Hunt) | PERFECT MATCH: Pure competition (Go-Kart, Darts, Axe Throwing) | CONFLICT: Reduce competitive scores by -2. Choose soft competition (Bowling, Table Football) |
| **H3 = Spectator** | MODERATE: Social spectator (Comedy + Team activity mix) +1 | ADAPT: Light competition + spectator (Darts + Comedy) | PERFECT MATCH: Pure enjoyment (Tasting, Dining, Spa) |

---

## Changes from Current Implementation

### Removed Questions
| Old Question | Why Removed |
|-------------|-------------|
| Travel Distance (G) | City already selected in Step 1 |
| Event Duration (G) | Locked to "1 Day" in MVP |
| Gathering Size (H) | Covered by participant count in Step 1 |
| Social Approach (H) | Too abstract ("Wallflower/Butterfly" doesn't map to activities) |

### New Questions
| New Question | Why Added |
|-------------|-----------|
| H2: Spotlight Comfort | Directly affects public-facing activities (Bar Crawl with tasks vs intimate cooking) |
| H4: Enjoyment Type | Critical differentiator: Food vs Drinks vs Experience — drives 3 major activity clusters |
| H6: Evening Style | Determines if nightlife activities enter the package |
| G5: Group Dynamic | Creates H3×G5 conflict matrix — core of Relationship Preservation |

### Modified Questions
| Question | Change |
|----------|--------|
| H1: Energy Level | Added "party" option (was 3 options, now 4) |
| H3: Participation Style → Competition vs Teamwork | Renamed, options changed from active/passive/competitive/cooperative to cooperative/competitive/spectator |
| G6: Vibe Preference | Added "wellness" option, changed to max 2 multi-select |

---

## Scoring Matrix Reference

Full activity scoring matrix with all 12 questions × 53 activities is documented in:
**`Activities_lists/ACTIVITY_MATCHING_MATRIX.md`**

---

## Algorithm Summary

1. **Score Calculation**: Sum scores across all 12 questions per activity
2. **Ice-Breaker Bonus**: +3 for cooperative activities when G2 = strangers/mixed
3. **H3×G5 Conflict Prevention**: Cross-reference honoree vs group dynamic preferences
4. **Hard Filters**: Exclude activities with -1 on critical group answers
5. **Package Assembly**: Top-N activities with diversity rules (max 1 dining, max 1 nightlife, min 1 active)
6. **Time Slot Assignment**: Morning/Afternoon → Active; Evening → Dinner + Tastings; Night → Club/Bar

---

## Implementation Notes

1. **City-agnostic scoring**: The matrix works for all cities. Only the provider database changes per city.
2. **Seasonal flags**: Outdoor activities (Boat Rental, Kayak/SUP, BBQ, Beach Day, Harbor Cruise, Guided Bike Tour) get -2 in winter months (Nov–Mar).
3. **Store changes**: wizardStore needs updated types for new question values.
4. **Translation keys**: New i18n keys needed in `en.ts` and `de.ts` for all question labels.
5. **Package matching**: `src/utils/packageMatching.ts` needs rewrite to use new scoring matrix.
6. **Manual packages**: Until AI is fully automated, packages are assembled manually using matrix scores as guidance.
