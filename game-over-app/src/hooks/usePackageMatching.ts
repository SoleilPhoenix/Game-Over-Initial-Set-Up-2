/**
 * Package Matching Hook
 * Processes packages with match scores based on user preferences
 */

import { useMemo } from 'react';
import {
  calculatePackageScore,
  isBestMatchScore,
  BEST_MATCH_THRESHOLD,
  type EventPreferences,
  type PackageMatchingFields,
} from '@/utils/packageMatching';

// Type for package data from the API
export interface PackageData extends PackageMatchingFields {
  id: string;
  name: string;
  tier: 'essential' | 'classic' | 'grand';
  base_price_cents: number;
  price_per_person_cents: number;
  rating: number;
  review_count: number;
  features?: string[];
  hero_image_url?: string;
  [key: string]: unknown; // Allow additional fields
}

// Package with match score and best match indicator
export interface ScoredPackage extends PackageData {
  matchScore: number;
  isBestMatch: boolean;
}

// Return type for the hook
export interface UsePackageMatchingResult {
  packages: ScoredPackage[];
  bestMatch: ScoredPackage | null;
  hasBestMatch: boolean;
  averageScore: number;
}

/**
 * Hook to process packages with match scores and sorting
 *
 * @param rawPackages - Array of packages from the API
 * @param preferences - User's event preferences for matching
 * @returns Sorted packages with scores, best match identification
 */
export function usePackageMatching(
  rawPackages: PackageData[] | undefined,
  preferences: EventPreferences | undefined
): UsePackageMatchingResult {
  const result = useMemo(() => {
    // Handle empty or undefined data
    if (!rawPackages?.length) {
      return {
        packages: [],
        bestMatch: null,
        hasBestMatch: false,
        averageScore: 0,
      };
    }

    const prefs = preferences || {};

    // Calculate scores for all packages
    const scoredPackages: ScoredPackage[] = rawPackages.map(pkg => ({
      ...pkg,
      matchScore: calculatePackageScore(pkg, prefs),
      isBestMatch: false, // Will be set below
    }));

    // Sort by match score (highest first), then by rating for tie-breaking
    scoredPackages.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      // Tie-breaker: higher rating wins
      return b.rating - a.rating;
    });

    // Identify best match (highest score that meets threshold)
    let bestMatch: ScoredPackage | null = null;
    if (scoredPackages.length > 0) {
      const topPackage = scoredPackages[0];
      if (isBestMatchScore(topPackage.matchScore)) {
        topPackage.isBestMatch = true;
        bestMatch = topPackage;
      }
    }

    // Calculate average score
    const totalScore = scoredPackages.reduce((sum, pkg) => sum + pkg.matchScore, 0);
    const averageScore = scoredPackages.length > 0
      ? Math.round(totalScore / scoredPackages.length)
      : 0;

    return {
      packages: scoredPackages,
      bestMatch,
      hasBestMatch: bestMatch !== null,
      averageScore,
    };
  }, [rawPackages, preferences]);

  return result;
}

/**
 * Hook for calculating price per person based on participant count
 *
 * @param totalPriceCents - Total package price in cents
 * @param participantCount - Number of paying participants
 * @returns Price per person in cents
 */
export function usePerPersonPrice(
  totalPriceCents: number,
  participantCount: number
): number {
  return useMemo(() => {
    if (participantCount <= 0) {
      return totalPriceCents;
    }
    return Math.ceil(totalPriceCents / participantCount);
  }, [totalPriceCents, participantCount]);
}

/**
 * Format price from cents to display string
 *
 * @param cents - Price in cents
 * @param currency - Currency code (default: EUR)
 * @returns Formatted price string
 */
export function formatPrice(cents: number, currency = 'EUR'): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export { BEST_MATCH_THRESHOLD };
