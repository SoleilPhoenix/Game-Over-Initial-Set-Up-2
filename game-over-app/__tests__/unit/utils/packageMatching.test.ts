/**
 * Activity Matching Algorithm Tests
 * Unit tests for the 12-question scoring algorithm
 */

import { describe, it, expect } from 'vitest';
import {
  scoreActivities,
  SCORE_THRESHOLDS,
  type QuestionnaireAnswers,
} from '@/utils/packageMatching';

// Helper: full answer set for "relaxed foodie, mixed group 30+"
const RELAXED_FOODIE: QuestionnaireAnswers = {
  h1: 'relaxed', h2: 'background', h3: 'spectator', h4: 'food', h5: 'indoor', h6: 'dinner_bar',
  g1: '31-35', g2: 'mixed', g3: 'low', g4: 'social', g5: 'relaxed',
  g6: ['food', 'culture'],
};

// Helper: full answer set for "action groom, young close friends"
const ACTION_GROOM: QuestionnaireAnswers = {
  h1: 'action', h2: 'center_stage', h3: 'competitive', h4: 'experience', h5: 'mix', h6: 'full_night',
  g1: '21-25', g2: 'close_friends', g3: 'high', g4: 'central', g5: 'competitive',
  g6: ['action', 'nightlife'],
};

describe('scoreActivities', () => {
  it('should return sorted activities descending by score', () => {
    const results = scoreActivities(RELAXED_FOODIE);

    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].totalScore).toBeGreaterThanOrEqual(results[i].totalScore);
    }
  });

  it('should rank cooking class high for relaxed foodie scenario', () => {
    const results = scoreActivities(RELAXED_FOODIE);
    const cookingClass = results.find(a => a.name === 'Cooking Class');

    expect(cookingClass).toBeDefined();
    expect(cookingClass!.totalScore).toBeGreaterThanOrEqual(SCORE_THRESHOLDS.STRONG);
  });

  it('should rank go-karting high for action groom scenario', () => {
    const results = scoreActivities(ACTION_GROOM);
    const goKarting = results.find(a => a.name === 'Go-Karting');

    expect(goKarting).toBeDefined();
    expect(goKarting!.totalScore).toBeGreaterThanOrEqual(SCORE_THRESHOLDS.GOOD);
  });

  it('should apply hard filter: exclude activities with -1 for strangers when g2=strangers', () => {
    const strangerAnswers: QuestionnaireAnswers = {
      ...RELAXED_FOODIE,
      g2: 'strangers',
    };
    const results = scoreActivities(strangerAnswers);

    // Paintball has g2[strangers] = -1, should be excluded
    const paintball = results.find(a => a.name === 'Paintball / Airsoft');
    expect(paintball).toBeUndefined();
  });

  it('should apply hard filter: exclude activities with -1 for low fitness when g3=low', () => {
    const results = scoreActivities(RELAXED_FOODIE); // g3=low

    // Laser Tag has g3[low] = -1, should be excluded
    const laserTag = results.find(a => a.name === 'Laser Tag Session');
    expect(laserTag).toBeUndefined();
  });

  it('should apply ice-breaker bonus for mixed/stranger groups', () => {
    const mixedAnswers: QuestionnaireAnswers = {
      ...RELAXED_FOODIE,
      g2: 'mixed',
    };
    const closeFriendsAnswers: QuestionnaireAnswers = {
      ...RELAXED_FOODIE,
      g2: 'close_friends',
    };

    const mixedResults = scoreActivities(mixedAnswers);
    const closeFriendsResults = scoreActivities(closeFriendsAnswers);

    // Escape Room is an ice-breaker
    const escapeRoomMixed = mixedResults.find(a => a.name === 'Escape Room');
    const escapeRoomClose = closeFriendsResults.find(a => a.name === 'Escape Room');

    expect(escapeRoomMixed).toBeDefined();
    expect(escapeRoomClose).toBeDefined();
    // Mixed group should get +3 ice-breaker bonus
    expect(escapeRoomMixed!.totalScore).toBeGreaterThan(escapeRoomClose!.totalScore);
  });

  it('should include category information for each activity', () => {
    const results = scoreActivities(RELAXED_FOODIE);

    for (const activity of results) {
      expect(activity.category).toBeTruthy();
      expect(['team', 'nightlife', 'tasting', 'outdoor', 'entertainment', 'wellness', 'dining'])
        .toContain(activity.category);
    }
  });

  it('should use MAX of selected vibes for G6 scoring', () => {
    // With food+culture vibes, activities with high food OR culture should score well
    const results = scoreActivities(RELAXED_FOODIE);
    const wineTasting = results.find(a => a.name === 'Wine Tasting');

    expect(wineTasting).toBeDefined();
    // Wine Tasting has g6: [0, 2, 0, 2, 1] — MAX(culture:2, food:2) = 2
    expect(wineTasting!.totalScore).toBeGreaterThanOrEqual(SCORE_THRESHOLDS.GOOD);
  });

  it('should not include filtered activities for low-drinking group', () => {
    const lowDrinkingAnswers: QuestionnaireAnswers = {
      ...RELAXED_FOODIE,
      g4: 'low',
    };
    const results = scoreActivities(lowDrinkingAnswers);

    // Beer Tasting has g4[low] = -1, should be excluded
    const beerTasting = results.find(a => a.name === 'Beer Tasting Flight');
    expect(beerTasting).toBeUndefined();
  });
});
