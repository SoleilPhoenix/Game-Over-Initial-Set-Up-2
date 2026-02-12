# Activity Matching Matrix — AI-Matching Algorithmus Basis

## Overview

This document defines the scoring matrix that maps questionnaire answers (6 Honoree + 6 Group questions) to activities. Each activity receives a score per answer option. The AI matching engine sums scores across all 12 questions to rank activities for package creation.

**Scoring**: 2 = perfect match, 1 = good match, 0 = neutral, -1 = poor match

---

## Question Reference

### Honoree Questions (H1–H6)

| ID | Question | Options |
|----|----------|---------|
| H1 | Energy Level | `relaxed` / `active` / `action` / `party` |
| H2 | Spotlight Comfort | `background` / `group` / `center_stage` |
| H3 | Competition vs Teamwork | `cooperative` / `competitive` / `spectator` |
| H4 | Enjoyment Type | `food` / `drinks` / `experience` |
| H5 | Indoor/Outdoor | `indoor` / `outdoor` / `mix` |
| H6 | Evening Style | `dinner_only` / `dinner_bar` / `full_night` |

### Group Questions (G1–G6)

| ID | Question | Options |
|----|----------|---------|
| G1 | Average Age | `21-25` / `26-30` / `31-35` / `35+` |
| G2 | Group Cohesion | `close_friends` / `mixed` / `strangers` |
| G3 | Fitness Level | `low` / `medium` / `high` |
| G4 | Drinking Culture | `low` / `social` / `central` |
| G5 | Group Dynamic | `team_players` / `competitive` / `relaxed` |
| G6 | Group Vibe (multi-select, max 2) | `action` / `culture` / `nightlife` / `food` / `wellness` |

---

## Scoring Matrix

### TEAM & COMPETITIVE ACTIVITIES

#### Escape Room (60–90 min)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 0, active: **2**, action: 1, party: 0 |
| H2 Spotlight | background: **2**, group: **2**, center_stage: 0 |
| H3 Dynamic | cooperative: **2**, competitive: 0, spectator: -1 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: 1 |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: **2** |
| G3 Fitness | low: 1, medium: **2**, high: 1 |
| G4 Drinking | low: **2**, social: 1, central: 0 |
| G5 Dynamic | team_players: **2**, competitive: 0, relaxed: 0 |
| G6 Vibe | action: **2**, culture: 1, nightlife: 0, food: 0, wellness: 0 |

**Why ice-breaker**: Requires communication, problem-solving together. Perfect for groups that don't know each other well.

---

#### Laser Tag Session
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: -1, active: 1, action: **2**, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 1, competitive: **2**, spectator: -1 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 0 |
| G3 Fitness | low: -1, medium: 1, high: **2** |
| G4 Drinking | low: **2**, social: 1, central: -1 |
| G5 Dynamic | team_players: 1, competitive: **2**, relaxed: -1 |
| G6 Vibe | action: **2**, culture: 0, nightlife: 0, food: 0, wellness: 0 |

**Note**: Competitive nature can create tension in stranger groups → lower G2 strangers score.

---

#### Bowling + Drinks
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: **2**, action: 0, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 1, competitive: **2**, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 1, experience: 1 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 1 |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: 1, medium: **2**, high: 1 |
| G4 Drinking | low: 1, social: **2**, central: 1 |
| G5 Dynamic | team_players: 1, competitive: **2**, relaxed: 1 |
| G6 Vibe | action: 1, culture: 0, nightlife: 1, food: 0, wellness: 0 |

**Versatile**: Works for almost any group. Low barrier, social, fun with drinks.

---

#### VR Arcade
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 0, active: **2**, action: **2**, party: 0 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 0 |
| H3 Dynamic | cooperative: **2**, competitive: 1, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: 1 |
| G3 Fitness | low: 1, medium: **2**, high: 1 |
| G4 Drinking | low: **2**, social: 1, central: -1 |
| G5 Dynamic | team_players: **2**, competitive: 1, relaxed: 0 |
| G6 Vibe | action: **2**, culture: 1, nightlife: 0, food: 0, wellness: 0 |

---

#### Go-Karting (Indoor/Outdoor)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: -1, active: 1, action: **2**, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 0, competitive: **2**, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: 1, outdoor: 1, mix: **2** |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 0 |
| G3 Fitness | low: 0, medium: 1, high: **2** |
| G4 Drinking | low: **2**, social: 1, central: -1 |
| G5 Dynamic | team_players: 0, competitive: **2**, relaxed: -1 |
| G6 Vibe | action: **2**, culture: 0, nightlife: 0, food: 0, wellness: 0 |

---

#### Axe Throwing
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 0, active: **2**, action: **2**, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 0, competitive: **2**, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 1, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: **2**, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 1 |
| G3 Fitness | low: 0, medium: **2**, high: **2** |
| G4 Drinking | low: 1, social: **2**, central: 1 |
| G5 Dynamic | team_players: 0, competitive: **2**, relaxed: 0 |
| G6 Vibe | action: **2**, culture: 0, nightlife: 0, food: 0, wellness: 0 |

---

#### Darts Tournament
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: **2**, action: 0, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 0, competitive: **2**, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 1, experience: 1 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: 1 |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 1 |
| G4 Drinking | low: 1, social: **2**, central: **2** |
| G5 Dynamic | team_players: 0, competitive: **2**, relaxed: 1 |
| G6 Vibe | action: 1, culture: 0, nightlife: 1, food: 0, wellness: 0 |

---

#### Billiards + Table Service
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 0 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 0, competitive: **2**, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 1, experience: 1 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 0 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 1, social: **2**, central: 1 |
| G5 Dynamic | team_players: 0, competitive: **2**, relaxed: 1 |
| G6 Vibe | action: 0, culture: 0, nightlife: 1, food: 0, wellness: 0 |

---

#### Table Football Tournament
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: **2**, action: 0, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 1, competitive: **2**, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 1, experience: 1 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 1 |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 1 |
| G3 Fitness | low: 1, medium: **2**, high: 1 |
| G4 Drinking | low: 1, social: **2**, central: **2** |
| G5 Dynamic | team_players: 1, competitive: **2**, relaxed: 0 |
| G6 Vibe | action: 1, culture: 0, nightlife: 1, food: 0, wellness: 0 |

---

#### Paintball / Airsoft
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: -1, active: 0, action: **2**, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 1, competitive: **2**, spectator: -1 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: 0, outdoor: **2**, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: -1 |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: -1 |
| G3 Fitness | low: -1, medium: 1, high: **2** |
| G4 Drinking | low: **2**, social: 1, central: -1 |
| G5 Dynamic | team_players: 1, competitive: **2**, relaxed: -1 |
| G6 Vibe | action: **2**, culture: 0, nightlife: 0, food: 0, wellness: 0 |

**Important**: Strong negative for strangers — competitive physical combat can cause real conflict.

---

#### Trampoline Park
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: -1, active: 1, action: **2**, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 1, competitive: 1, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 0, 35+: -1 |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 1 |
| G3 Fitness | low: -1, medium: 1, high: **2** |
| G4 Drinking | low: **2**, social: 0, central: -1 |
| G5 Dynamic | team_players: 1, competitive: 1, relaxed: 1 |
| G6 Vibe | action: **2**, culture: 0, nightlife: 0, food: 0, wellness: 0 |

---

#### Bouldering / Indoor Climbing
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: -1, active: 1, action: **2**, party: 0 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 1, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: 1 |
| G3 Fitness | low: -1, medium: 1, high: **2** |
| G4 Drinking | low: **2**, social: 1, central: -1 |
| G5 Dynamic | team_players: 1, competitive: 1, relaxed: 0 |
| G6 Vibe | action: **2**, culture: 0, nightlife: 0, food: 0, wellness: 0 |

---

#### Blacklight Mini Golf
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: **2**, action: 0, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 1, competitive: **2**, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 1 |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 1, social: **2**, central: 0 |
| G5 Dynamic | team_players: 1, competitive: **2**, relaxed: 1 |
| G6 Vibe | action: 1, culture: 0, nightlife: 1, food: 0, wellness: 0 |

**Versatile casual**: Similar appeal to Bowling but more visual. Good date-night / party vibes in neon setting.

---

#### Bubble Football
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: -1, active: 1, action: **2**, party: **2** |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 1, competitive: **2**, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: 1, outdoor: **2**, mix: **2** |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: -1 |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: -1, medium: 1, high: **2** |
| G4 Drinking | low: **2**, social: 1, central: -1 |
| G5 Dynamic | team_players: **2**, competitive: **2**, relaxed: -1 |
| G6 Vibe | action: **2**, culture: 0, nightlife: 0, food: 0, wellness: 0 |

**Comedy factor**: The physical absurdity breaks tension even in mixed groups. Team-based structure works for both team_players and competitive.

---

### NIGHTLIFE & BAR ACTIVITIES

#### Pub Quiz Night
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: **2**, action: 0, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: **2**, competitive: 1, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: **2**, experience: 1 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: **2** |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 0, social: **2**, central: **2** |
| G5 Dynamic | team_players: **2**, competitive: 1, relaxed: 1 |
| G6 Vibe | action: 0, culture: **2**, nightlife: 1, food: 0, wellness: 0 |

**Excellent ice-breaker**: Teams must collaborate on trivia. Works for ANY cohesion level.

---

#### Bar Crawl (Curated Route + Shots)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: -1, active: 1, action: 1, party: **2** |
| H2 Spotlight | background: -1, group: 1, center_stage: **2** |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: **2**, experience: 1 |
| H5 Setting | indoor: 1, outdoor: 1, mix: **2** |
| H6 Evening | dinner_only: -1, dinner_bar: 1, full_night: **2** |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: -1 |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 1 |
| G3 Fitness | low: 0, medium: **2**, high: 1 |
| G4 Drinking | low: -1, social: 1, central: **2** |
| G5 Dynamic | team_players: 1, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 1, nightlife: **2**, food: 0, wellness: 0 |

---

#### Club Entry + Reserved Area
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: -1, active: 0, action: 1, party: **2** |
| H2 Spotlight | background: -1, group: 1, center_stage: **2** |
| H3 Dynamic | cooperative: 0, competitive: 0, spectator: 1 |
| H4 Enjoyment | food: 0, drinks: **2**, experience: 1 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 0 |
| H6 Evening | dinner_only: -1, dinner_bar: 0, full_night: **2** |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 0, 35+: -1 |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 0 |
| G3 Fitness | low: 1, medium: 1, high: 1 |
| G4 Drinking | low: -1, social: 1, central: **2** |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 0, nightlife: **2**, food: 0, wellness: 0 |

---

#### Live Music Bar + Reserved Table
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: 1, action: 0, party: **2** |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 0, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: 0, drinks: **2**, experience: 1 |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: **2** |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: 1 |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 0, social: **2**, central: **2** |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 1, nightlife: **2**, food: 0, wellness: 0 |

---

#### Karaoke Night
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 0, active: 1, action: 0, party: **2** |
| H2 Spotlight | background: -1, group: 1, center_stage: **2** |
| H3 Dynamic | cooperative: 1, competitive: 1, spectator: 1 |
| H4 Enjoyment | food: 0, drinks: **2**, experience: 1 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 0 |
| H6 Evening | dinner_only: -1, dinner_bar: **2**, full_night: **2** |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 0 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 0, social: **2**, central: **2** |
| G5 Dynamic | team_players: 1, competitive: 1, relaxed: 1 |
| G6 Vibe | action: 0, culture: 0, nightlife: **2**, food: 0, wellness: 0 |

**H2 key differentiator**: Only recommended when honoree loves the spotlight. Background-preference kills this activity.

---

### TASTING & CULINARY EXPERIENCES

#### Beer Tasting Flight
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 1 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: 1, drinks: **2**, experience: 0 |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: -1, social: **2**, central: **2** |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 1, nightlife: 0, food: **2**, wellness: 0 |

---

#### Whisky / Rum Tasting
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 0 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: 1, drinks: **2**, experience: 0 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: **2**, full_night: 0 |
| G1 Age | 21-25: 0, 26-30: 1, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: -1, social: 1, central: **2** |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: **2**, nightlife: 0, food: **2**, wellness: 0 |

---

#### Gin Tasting + Botanicals
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 0 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: 1, drinks: **2**, experience: 0 |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: **2**, full_night: 0 |
| G1 Age | 21-25: 0, 26-30: 1, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: -1, social: **2**, central: **2** |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: **2**, nightlife: 0, food: **2**, wellness: 0 |

---

#### Wine Tasting
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: -1, party: 0 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: **2**, drinks: **2**, experience: 0 |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: **2**, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: -1, 26-30: 1, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: -1 |
| G4 Drinking | low: -1, social: **2**, central: 1 |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: **2**, nightlife: 0, food: **2**, wellness: 1 |

---

#### Cooking Class (Private)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 0 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: **2**, competitive: 0, spectator: 0 |
| H4 Enjoyment | food: **2**, drinks: 1, experience: 1 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: **2**, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: 0, 26-30: 1, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: **2** |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: **2**, social: 1, central: 0 |
| G5 Dynamic | team_players: **2**, competitive: 0, relaxed: 1 |
| G6 Vibe | action: 0, culture: 1, nightlife: 0, food: **2**, wellness: 0 |

**Top ice-breaker**: Working together in the kitchen forces natural interaction. Excellent for strangers.

---

#### Cocktail Making Course
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: **2**, action: 0, party: 1 |
| H2 Spotlight | background: **2**, group: **2**, center_stage: 0 |
| H3 Dynamic | cooperative: **2**, competitive: 0, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: **2**, experience: 1 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: 1 |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: **2** |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: -1, social: **2**, central: **2** |
| G5 Dynamic | team_players: **2**, competitive: 0, relaxed: 1 |
| G6 Vibe | action: 0, culture: 1, nightlife: 1, food: 0, wellness: 0 |

**Drinks counterpart to Cooking Class**: Same cooperative hands-on format, but targets H4=drinks instead of H4=food. Excellent ice-breaker.

---

#### Food Tour (3–4 Stops)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: **2**, action: 0, party: 0 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: **2**, drinks: 1, experience: 1 |
| H5 Setting | indoor: 0, outdoor: 1, mix: **2** |
| H6 Evening | dinner_only: **2**, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: 0, 26-30: 1, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: **2** |
| G3 Fitness | low: 1, medium: **2**, high: 0 |
| G4 Drinking | low: 1, social: **2**, central: 0 |
| G5 Dynamic | team_players: 1, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: **2**, nightlife: 0, food: **2**, wellness: 0 |

---

#### BBQ Grill & Chill (Private Space + Catering)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: 1 |
| H4 Enjoyment | food: **2**, drinks: 1, experience: 0 |
| H5 Setting | indoor: 0, outdoor: **2**, mix: 1 |
| H6 Evening | dinner_only: **2**, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 1, social: **2**, central: 1 |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 0, nightlife: 0, food: **2**, wellness: 1 |

---

### OUTDOOR & ADVENTURE

#### Harbor / River Cruise (Guided)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: -1, party: 1 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 0, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: 1, drinks: 1, experience: **2** |
| H5 Setting | indoor: 0, outdoor: **2**, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: **2**, full_night: 0 |
| G1 Age | 21-25: 0, 26-30: 1, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 1, social: **2**, central: 1 |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: **2**, nightlife: 0, food: 0, wellness: 1 |

**City signature**: Hamburg Hafenrundfahrt, Berlin Spree-Fahrt. Passive guided experience on larger vessel — distinct from active small boat/pedal boat rental.

---

#### Guided Bike Tour
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 0, active: **2**, action: 1, party: 0 |
| H2 Spotlight | background: **2**, group: **2**, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: -1, outdoor: **2**, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: 1 |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: **2** |
| G3 Fitness | low: 0, medium: **2**, high: **2** |
| G4 Drinking | low: **2**, social: 1, central: -1 |
| G5 Dynamic | team_players: 1, competitive: 0, relaxed: 1 |
| G6 Vibe | action: 1, culture: **2**, nightlife: 0, food: 0, wellness: 0 |

**Active culture hybrid**: More physical than Walking Tour, covers more ground. Good ice-breaker for strangers.

---

#### Boat Rental / Pedal Boat (Seasonal)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 1 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: 0, drinks: 1, experience: **2** |
| H5 Setting | indoor: -1, outdoor: **2**, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 1, social: **2**, central: 1 |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 1, nightlife: 0, food: 0, wellness: **2** |

---

#### Kayak / SUP (Seasonal)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 0, active: **2**, action: 1, party: 0 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: **2**, competitive: 1, spectator: -1 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: -1, outdoor: **2**, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: 1 |
| G3 Fitness | low: -1, medium: **2**, high: **2** |
| G4 Drinking | low: **2**, social: 0, central: -1 |
| G5 Dynamic | team_players: **2**, competitive: 1, relaxed: 0 |
| G6 Vibe | action: **2**, culture: 0, nightlife: 0, food: 0, wellness: 1 |

---

#### Outdoor Scavenger Hunt (App-Based)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 0, active: **2**, action: 1, party: 1 |
| H2 Spotlight | background: 0, group: **2**, center_stage: **2** |
| H3 Dynamic | cooperative: **2**, competitive: 1, spectator: -1 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: -1, outdoor: **2**, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: **2** |
| G3 Fitness | low: 0, medium: **2**, high: 1 |
| G4 Drinking | low: **2**, social: 1, central: 0 |
| G5 Dynamic | team_players: **2**, competitive: 1, relaxed: 0 |
| G6 Vibe | action: 1, culture: **2**, nightlife: 0, food: 0, wellness: 0 |

**Great ice-breaker**: Teams solving challenges outdoors. Perfect for mixed groups.

---

#### Photo Challenge Walk + Print
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: **2**, action: 0, party: 1 |
| H2 Spotlight | background: 0, group: **2**, center_stage: **2** |
| H3 Dynamic | cooperative: **2**, competitive: 1, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: 0, outdoor: **2**, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: **2** |
| G3 Fitness | low: 1, medium: **2**, high: 0 |
| G4 Drinking | low: **2**, social: 1, central: 0 |
| G5 Dynamic | team_players: **2**, competitive: 1, relaxed: 0 |
| G6 Vibe | action: 0, culture: **2**, nightlife: 0, food: 0, wellness: 0 |

---

#### Walking Tour ("Drinks & Stories")
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: **2**, action: 0, party: 0 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: 0, drinks: 1, experience: **2** |
| H5 Setting | indoor: -1, outdoor: **2**, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: **2**, full_night: 0 |
| G1 Age | 21-25: 0, 26-30: 1, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: **2** |
| G3 Fitness | low: 1, medium: **2**, high: 0 |
| G4 Drinking | low: 0, social: **2**, central: 1 |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: **2**, nightlife: 0, food: 1, wellness: 0 |

---

#### Street Art / Underground Tour
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: **2**, action: 0, party: 0 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: 0, outdoor: 1, mix: **2** |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: **2** |
| G3 Fitness | low: 1, medium: **2**, high: 0 |
| G4 Drinking | low: **2**, social: 1, central: 0 |
| G5 Dynamic | team_players: 1, competitive: 0, relaxed: 1 |
| G6 Vibe | action: 0, culture: **2**, nightlife: 0, food: 0, wellness: 0 |

**Berlin highlight**: URBAN NATION, Berliner Unterwelten. Younger age bias than traditional Walking Tour. Great ice-breaker.

---

#### Beach Day + Games (Seasonal)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: **2**, action: 1, party: **2** |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 1, competitive: 1, spectator: 1 |
| H4 Enjoyment | food: 0, drinks: 1, experience: **2** |
| H5 Setting | indoor: -1, outdoor: **2**, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: 0, medium: **2**, high: **2** |
| G4 Drinking | low: 1, social: **2**, central: 1 |
| G5 Dynamic | team_players: 1, competitive: 1, relaxed: 1 |
| G6 Vibe | action: **2**, culture: 0, nightlife: 0, food: 0, wellness: 1 |

**Seasonal outdoor**: Hamburg StrandPauli, similar beach club formats. Flexible structure accommodates all group dynamics. Seasonal flag same as other outdoor activities.

---

### ENTERTAINMENT & CULTURE

#### Creative Workshop (Graffiti / Ceramics / DIY)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 0 |
| H2 Spotlight | background: **2**, group: **2**, center_stage: 0 |
| H3 Dynamic | cooperative: **2**, competitive: 0, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: 1 |
| G2 Cohesion | close_friends: 1, mixed: **2**, strangers: **2** |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: **2**, social: 1, central: -1 |
| G5 Dynamic | team_players: **2**, competitive: 0, relaxed: 1 |
| G6 Vibe | action: 0, culture: **2**, nightlife: 0, food: 0, wellness: 1 |

**Top ice-breaker**: Creating something together naturally bonds strangers. Produces physical souvenir of the event.

---

#### Dance Class (Salsa / Bachata)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 0, active: **2**, action: 0, party: **2** |
| H2 Spotlight | background: -1, group: **2**, center_stage: **2** |
| H3 Dynamic | cooperative: **2**, competitive: 0, spectator: -1 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: 0, medium: **2**, high: 1 |
| G4 Drinking | low: **2**, social: 1, central: 0 |
| G5 Dynamic | team_players: **2**, competitive: 0, relaxed: 0 |
| G6 Vibe | action: 1, culture: **2**, nightlife: 1, food: 0, wellness: 0 |

**Party + culture hybrid**: Fun physical activity that doubles as ice-breaker. H2 is key — only for groups comfortable with some spotlight.

---

#### Musical / Theater Show
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: -1, party: 0 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 0, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: 0, drinks: 1, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: 0, 26-30: 1, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: **2**, social: 1, central: 0 |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: **2**, nightlife: 1, food: 0, wellness: 0 |

**Premium spectator**: Hamburg Stage Entertainment, Berlin theater scene. More formal than Comedy — appeals to older, refined groups.

---

#### Comedy Show + Pre-Drinks
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 1 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 0, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: 0, drinks: 1, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: **2** |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 1, social: **2**, central: 1 |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: **2**, nightlife: 1, food: 0, wellness: 0 |

**Universal**: Shared laughter bonds any group. Excellent for all cohesion levels.

---

#### Private Poker Night (Dealer + Chips)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: **2**, action: 0, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 0, competitive: **2**, spectator: 0 |
| H4 Enjoyment | food: 0, drinks: **2**, experience: 1 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 0 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: **2** |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 0 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 0, social: **2**, central: **2** |
| G5 Dynamic | team_players: 0, competitive: **2**, relaxed: 0 |
| G6 Vibe | action: 1, culture: 0, nightlife: 1, food: 0, wellness: 0 |

---

#### Sports Viewing (Lounge + Snack Platters)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 1 |
| H2 Spotlight | background: **2**, group: 1, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: 1, drinks: **2**, experience: 0 |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 0 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 0, social: **2**, central: **2** |
| G5 Dynamic | team_players: 1, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 1, culture: 0, nightlife: 1, food: 1, wellness: 0 |

---

### WELLNESS & RELAXATION

#### Spa / Sauna Day Pass
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 0, action: -1, party: -1 |
| H2 Spotlight | background: **2**, group: 1, center_stage: -1 |
| H3 Dynamic | cooperative: 0, competitive: -1, spectator: **2** |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: **2**, dinner_bar: 0, full_night: -1 |
| G1 Age | 21-25: 0, 26-30: 1, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: -1 |
| G3 Fitness | low: **2**, medium: 1, high: -1 |
| G4 Drinking | low: **2**, social: 1, central: -1 |
| G5 Dynamic | team_players: 0, competitive: -1, relaxed: **2** |
| G6 Vibe | action: -1, culture: 0, nightlife: -1, food: 0, wellness: **2** |

---

#### Massage Add-On (Chair/Short Sessions)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 0, action: -1, party: 0 |
| H2 Spotlight | background: **2**, group: 1, center_stage: -1 |
| H3 Dynamic | cooperative: 0, competitive: -1, spectator: 1 |
| H4 Enjoyment | food: 0, drinks: 0, experience: **2** |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: 0, full_night: -1 |
| G1 Age | 21-25: 0, 26-30: 1, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 0 |
| G3 Fitness | low: **2**, medium: 1, high: -1 |
| G4 Drinking | low: **2**, social: 0, central: -1 |
| G5 Dynamic | team_players: 0, competitive: -1, relaxed: **2** |
| G6 Vibe | action: -1, culture: 0, nightlife: -1, food: 0, wellness: **2** |

---

### DINING EXPERIENCES

#### Brunch Buffet (All-You-Can-Eat)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 0 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: 1 |
| H4 Enjoyment | food: **2**, drinks: 1, experience: 0 |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: **2**, dinner_bar: 0, full_night: 0 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: **2**, social: 1, central: 0 |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 0, nightlife: 0, food: **2**, wellness: 0 |

**Note**: Best as opening activity — sets relaxed tone for the day.

---

#### Steakhouse Dinner (Set Menu)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 0, action: -1, party: 0 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 0, competitive: 0, spectator: 1 |
| H4 Enjoyment | food: **2**, drinks: 1, experience: 0 |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: **2**, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: 0, 26-30: 1, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 1, social: **2**, central: 0 |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 0, nightlife: 0, food: **2**, wellness: 0 |

---

#### Burger + Beer Combo
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: 1, action: 0, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 0 |
| H3 Dynamic | cooperative: 0, competitive: 0, spectator: 1 |
| H4 Enjoyment | food: **2**, drinks: 1, experience: 0 |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 1 |
| G4 Drinking | low: 1, social: **2**, central: 1 |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 0, nightlife: 0, food: **2**, wellness: 0 |

---

#### Tapas / Shared Plates
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 0 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: 1 |
| H4 Enjoyment | food: **2**, drinks: 1, experience: 0 |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: **2**, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: **2** |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 1, social: **2**, central: 0 |
| G5 Dynamic | team_players: 1, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 1, nightlife: 0, food: **2**, wellness: 0 |

**Social dining**: Sharing plates forces interaction — good for any group cohesion.

---

#### Sushi Dinner (Set Platter + Drinks)
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 0, action: -1, party: 0 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 0 |
| H3 Dynamic | cooperative: 0, competitive: 0, spectator: 1 |
| H4 Enjoyment | food: **2**, drinks: 1, experience: 0 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: **2**, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: 1, 26-30: **2**, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 1, social: **2**, central: 0 |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 1, nightlife: 0, food: **2**, wellness: 0 |

---

#### BBQ Ribs + Beer Tower
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: 1, action: 0, party: **2** |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 0, competitive: 0, spectator: 1 |
| H4 Enjoyment | food: **2**, drinks: **2**, experience: 0 |
| H5 Setting | indoor: 1, outdoor: 1, mix: **2** |
| H6 Evening | dinner_only: 1, dinner_bar: **2**, full_night: 1 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 1 |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 1 |
| G4 Drinking | low: 0, social: **2**, central: **2** |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 0, nightlife: 0, food: **2**, wellness: 0 |

---

#### Pizza Party + Craft Beer
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 1, action: 0, party: 1 |
| H2 Spotlight | background: 1, group: **2**, center_stage: 0 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: 1 |
| H4 Enjoyment | food: **2**, drinks: 1, experience: 0 |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 1, dinner_bar: **2**, full_night: 0 |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 0 |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 1, social: **2**, central: 1 |
| G5 Dynamic | team_players: 1, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 0, nightlife: 0, food: **2**, wellness: 0 |

---

#### Private Dining Room + Chef's Menu
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: **2**, active: 0, action: -1, party: 0 |
| H2 Spotlight | background: **2**, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 0, competitive: 0, spectator: **2** |
| H4 Enjoyment | food: **2**, drinks: 1, experience: 1 |
| H5 Setting | indoor: **2**, outdoor: -1, mix: 1 |
| H6 Evening | dinner_only: **2**, dinner_bar: 1, full_night: 0 |
| G1 Age | 21-25: -1, 26-30: 1, 31-35: **2**, 35+: **2** |
| G2 Cohesion | close_friends: **2**, mixed: 1, strangers: 0 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: 1, social: **2**, central: 0 |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 1, nightlife: 0, food: **2**, wellness: 0 |

---

#### Beer Hall / Platter Night
| Question | Option → Score |
|----------|---------------|
| H1 Energy | relaxed: 1, active: 1, action: 0, party: **2** |
| H2 Spotlight | background: 1, group: **2**, center_stage: 1 |
| H3 Dynamic | cooperative: 1, competitive: 0, spectator: 1 |
| H4 Enjoyment | food: 1, drinks: **2**, experience: 0 |
| H5 Setting | indoor: **2**, outdoor: 0, mix: 1 |
| H6 Evening | dinner_only: 0, dinner_bar: **2**, full_night: **2** |
| G1 Age | 21-25: **2**, 26-30: **2**, 31-35: 1, 35+: 1 |
| G2 Cohesion | close_friends: **2**, mixed: **2**, strangers: 1 |
| G3 Fitness | low: **2**, medium: **2**, high: 0 |
| G4 Drinking | low: -1, social: **2**, central: **2** |
| G5 Dynamic | team_players: 0, competitive: 0, relaxed: **2** |
| G6 Vibe | action: 0, culture: 1, nightlife: 1, food: **2**, wellness: 0 |

---

## Matching Algorithm Logic

### Step 1: Score Calculation

For each activity, sum scores across all 12 questions based on user answers:

```
total_score = H1_score + H2_score + H3_score + H4_score + H5_score + H6_score
            + G1_score + G2_score + G3_score + G4_score + G5_score + G6_score
```

For G6 (multi-select), take the MAX score of the selected vibes:
```
G6_score = max(score for each selected vibe)
```

### Step 2: Ice-Breaker Bonus

If G2 = `strangers` or `mixed`, add +3 bonus to activities tagged as ice-breakers:
- Escape Room
- Cooking Class
- Cocktail Making Course
- Creative Workshop
- Scavenger Hunt
- Pub Quiz
- Food Tour
- Photo Challenge
- Walking Tour
- Guided Bike Tour
- Street Art / Underground Tour
- Tapas/Shared Plates

### Step 3: H3×G5 Conflict Prevention (Relationship Preservation)

Cross-reference honoree's preference (H3) with group dynamic (G5):
- H3=`competitive` + G5=`relaxed` → **Reduce** competitive activity scores by -2 (prevent pushing relaxed group into intense competition)
- H3=`cooperative` + G5=`competitive` → **Boost** team-based competition activities by +2 (Laser Tag teams, Bowling teams — satisfies both)
- H3=`spectator` + G5=`team_players` → **Boost** social spectator activities by +1 (Comedy, Sports Viewing with group bonding element)

### Step 4: Hard Filters

HARD FILTERS (exclude activity entirely):
- If G2 = `strangers` AND activity has G2_strangers score of -1 → EXCLUDE
- If G3 = `low` AND activity has G3_low score of -1 → EXCLUDE
- If G4 = `low` AND activity has G4_low score of -1 → EXCLUDE
- If G5 = `relaxed` AND activity has G5_relaxed score of -1 → EXCLUDE

### Step 5: Package Assembly

Sort activities by total_score descending. Build packages:
- **S-Package (3 activities)**: Top 3 scored activities, ensuring diversity:
  - Max 1 dining activity
  - Max 1 nightlife activity
  - At least 1 "active" activity (non-dining, non-spectator)

- **M-Package (4 activities)**: Top 4 with same diversity rules + at least 1 dining

- **L-Package (5 activities)**: Top 5 with same diversity rules + at least 1 dining + at least 1 evening activity

### Step 6: Time Slot Assignment

Activities are assigned to time slots:
- **Morning/Afternoon** (10:00-17:00): Active activities, outdoor, tastings, tours
- **Evening Starter** (17:00-20:00): Dinner, tastings, bar activities
- **Night** (20:00+): Club, bar crawl, live music, pub quiz

### Scoring Range Reference

- **Maximum possible score**: ~24 (if all 12 questions give score 2)
- **Strong match**: 15+ total score
- **Good match**: 10-14 total score
- **Weak match**: 5-9 total score
- **Poor match**: below 5 (likely filtered out)

---

## Example Scenarios

### Scenario 1: "Relaxed Foodie Bride, Mixed Group 30+"
**Answers**: H1=relaxed, H2=background, H3=spectator, H4=food, H5=indoor, H6=dinner_bar, G1=31-35, G2=mixed, G3=low, G4=social, G5=relaxed, G6=food+culture

**Top Activities**:
1. Cooking Class (22pts) — cooperative, food, indoor, ice-breaker for mixed group
2. Wine Tasting (20pts) — relaxed, food+drinks, premium, culture
3. Private Dining (19pts) — relaxed, food, premium, intimate
4. Comedy Show (18pts) — spectator, culture, universal group bonding
5. Food Tour (17pts) — food, culture, ice-breaker

**S-Package**: Cooking Class → Wine Tasting → Comedy Show
**M-Package**: + Private Dining
**L-Package**: + Food Tour

### Scenario 2: "Action Groom, Young Close Friends"
**Answers**: H1=action, H2=center_stage, H3=competitive, H4=experience, H5=mix, H6=full_night, G1=21-25, G2=close_friends, G3=high, G4=central, G5=competitive, G6=action+nightlife

**Top Activities**:
1. Go-Karting (22pts) — action, competitive, experience
2. Laser Tag (21pts) — action, competitive, close friends
3. Bar Crawl (20pts) — party, full night, central drinking
4. Axe Throwing (19pts) — action, competitive, drinks
5. Club Entry (18pts) — party, full night, nightlife

**S-Package**: Go-Karting → Axe Throwing → Bar Crawl
**M-Package**: + Laser Tag
**L-Package**: + Club Entry

### Scenario 3: "Social Groom, Stranger Group, Team-Players"
**Answers**: H1=active, H2=group, H3=cooperative, H4=drinks, H5=indoor, H6=dinner_bar, G1=26-30, G2=strangers, G3=medium, G4=social, G5=team_players, G6=action+culture

**Top Activities** (with ice-breaker bonus):
1. Escape Room (25pts) — cooperative, ice-breaker +3, strangers score 2
2. Pub Quiz (24pts) — cooperative, ice-breaker +3, drinks, universal cohesion
3. Bowling (20pts) — budget, social, universal
4. Scavenger Hunt (19pts) — cooperative, ice-breaker +3, culture
5. Beer Hall (17pts) — budget, social drinks, group bonding

**S-Package**: Escape Room → Pub Quiz → Bowling
**M-Package**: + Scavenger Hunt
**L-Package**: + Beer Hall

---

## Notes for Implementation

1. **City-agnostic**: This matrix applies identically across all cities (Hannover, Hamburg, Berlin). Activity types and scoring are universal — only the provider database changes per city.

2. **Seasonal adjustments**: Outdoor activities (Boat Rental, Kayak/SUP, BBQ, Beach Day, Harbor Cruise, Guided Bike Tour) should have a seasonal flag. In winter months (Nov-Mar), reduce outdoor activity scores by -2.

3. **Package diversity rules** prevent monotonous packages (e.g., 5 tastings). The algorithm ensures variety in activity types.

4. **Manual override**: Event planners can manually adjust packages. The AI provides the recommendation, humans refine.

5. **Future enhancement**: As user feedback accumulates, adjust scoring weights based on actual satisfaction data.
