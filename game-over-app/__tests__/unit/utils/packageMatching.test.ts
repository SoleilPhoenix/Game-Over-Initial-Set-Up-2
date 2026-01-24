/**
 * Package Matching Utility Tests
 * Unit tests for the package scoring algorithm
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePackageScore,
  calculatePackageScoreBreakdown,
  isBestMatchScore,
  formatMatchPercentage,
  BEST_MATCH_THRESHOLD,
  PackageMatchingFields,
  EventPreferences,
} from '@/utils/packageMatching';

describe('packageMatching', () => {
  describe('calculatePackageScore', () => {
    it('should return 0 when no preferences match', () => {
      const pkg: PackageMatchingFields = {
        ideal_gathering_size: ['large'],
        ideal_energy_level: ['high_energy'],
        ideal_vibe: ['party'],
      };

      const preferences: EventPreferences = {
        gathering_size: 'intimate',
        energy_level: 'low_key',
        vibe_preferences: ['relaxing'],
      };

      const score = calculatePackageScore(pkg, preferences);

      // Score should be relatively low for non-matching preferences
      expect(score).toBeLessThan(50);
    });

    it('should return high score for perfect match', () => {
      const pkg: PackageMatchingFields = {
        ideal_gathering_size: ['small_group'],
        ideal_energy_level: ['moderate'],
        ideal_vibe: ['adventurous', 'cultural'],
      };

      const preferences: EventPreferences = {
        gathering_size: 'small_group',
        energy_level: 'moderate',
        vibe_preferences: ['adventurous', 'cultural'],
      };

      const score = calculatePackageScore(pkg, preferences);

      expect(score).toBe(100);
    });

    it('should handle null/undefined values gracefully', () => {
      const pkg: PackageMatchingFields = {
        ideal_gathering_size: null,
        ideal_energy_level: undefined,
        ideal_vibe: [],
      };

      const preferences: EventPreferences = {
        gathering_size: 'small_group',
        energy_level: null,
        vibe_preferences: undefined,
      };

      const score = calculatePackageScore(pkg, preferences);

      expect(score).toBe(0);
    });

    it('should give partial score for adjacent gathering sizes', () => {
      const pkg: PackageMatchingFields = {
        ideal_gathering_size: ['small_group'],
        ideal_energy_level: ['moderate'],
        ideal_vibe: ['relaxing'],
      };

      const preferences: EventPreferences = {
        gathering_size: 'intimate', // Adjacent to small_group
        energy_level: 'moderate',
        vibe_preferences: ['relaxing'],
      };

      const score = calculatePackageScore(pkg, preferences);

      // Should be less than perfect but still good
      expect(score).toBeGreaterThan(60);
      expect(score).toBeLessThan(100);
    });

    it('should give partial score for adjacent energy levels', () => {
      const pkg: PackageMatchingFields = {
        ideal_gathering_size: ['small_group'],
        ideal_energy_level: ['moderate'],
        ideal_vibe: ['relaxing'],
      };

      const preferences: EventPreferences = {
        gathering_size: 'small_group',
        energy_level: 'high_energy', // Adjacent to moderate
        vibe_preferences: ['relaxing'],
      };

      const score = calculatePackageScore(pkg, preferences);

      expect(score).toBeGreaterThan(60);
      expect(score).toBeLessThan(100);
    });
  });

  describe('calculatePackageScoreBreakdown', () => {
    it('should return detailed score breakdown', () => {
      const pkg: PackageMatchingFields = {
        ideal_gathering_size: ['small_group'],
        ideal_energy_level: ['moderate'],
        ideal_vibe: ['adventurous'],
      };

      const preferences: EventPreferences = {
        gathering_size: 'small_group',
        energy_level: 'moderate',
        vibe_preferences: ['adventurous'],
      };

      const breakdown = calculatePackageScoreBreakdown(pkg, preferences);

      expect(breakdown.gatheringScore).toBe(40); // WEIGHTS.GATHERING_SIZE
      expect(breakdown.energyScore).toBe(30); // WEIGHTS.ENERGY_LEVEL
      expect(breakdown.vibeScore).toBeGreaterThan(0);
      expect(breakdown.totalScore).toBe(100);
    });

    it('should have individual scores sum to total', () => {
      const pkg: PackageMatchingFields = {
        ideal_gathering_size: ['party'],
        ideal_energy_level: ['high_energy'],
        ideal_vibe: ['party', 'clubbing'],
      };

      const preferences: EventPreferences = {
        gathering_size: 'party',
        energy_level: 'moderate',
        vibe_preferences: ['nightlife'],
      };

      const breakdown = calculatePackageScoreBreakdown(pkg, preferences);

      // Total should be sum of components (capped at 100)
      const sum = breakdown.gatheringScore + breakdown.energyScore + breakdown.vibeScore;
      expect(breakdown.totalScore).toBe(Math.min(100, sum));
    });
  });

  describe('isBestMatchScore', () => {
    it('should return true for scores >= threshold', () => {
      expect(isBestMatchScore(BEST_MATCH_THRESHOLD)).toBe(true);
      expect(isBestMatchScore(BEST_MATCH_THRESHOLD + 1)).toBe(true);
      expect(isBestMatchScore(100)).toBe(true);
    });

    it('should return false for scores < threshold', () => {
      expect(isBestMatchScore(BEST_MATCH_THRESHOLD - 1)).toBe(false);
      expect(isBestMatchScore(0)).toBe(false);
      expect(isBestMatchScore(50)).toBe(false);
    });
  });

  describe('formatMatchPercentage', () => {
    it('should format score as percentage string', () => {
      expect(formatMatchPercentage(100)).toBe('100% match');
      expect(formatMatchPercentage(75)).toBe('75% match');
      expect(formatMatchPercentage(0)).toBe('0% match');
    });

    it('should round decimal scores', () => {
      expect(formatMatchPercentage(75.5)).toBe('76% match');
      expect(formatMatchPercentage(75.4)).toBe('75% match');
    });
  });

  describe('fuzzy matching', () => {
    it('should match case-insensitively', () => {
      const pkg: PackageMatchingFields = {
        ideal_gathering_size: ['Small_Group'],
        ideal_energy_level: ['MODERATE'],
        ideal_vibe: ['Adventurous'],
      };

      const preferences: EventPreferences = {
        gathering_size: 'small_group',
        energy_level: 'moderate',
        vibe_preferences: ['adventurous'],
      };

      const score = calculatePackageScore(pkg, preferences);

      expect(score).toBe(100);
    });

    it('should match with different separators', () => {
      const pkg: PackageMatchingFields = {
        ideal_gathering_size: ['small-group'],
        ideal_energy_level: ['high energy'],
        ideal_vibe: null,
      };

      const preferences: EventPreferences = {
        gathering_size: 'small_group',
        energy_level: 'high_energy',
        vibe_preferences: null,
      };

      const score = calculatePackageScore(pkg, preferences);

      // Should match despite different separators
      expect(score).toBe(70); // 40 + 30 for gathering and energy
    });
  });
});
