/**
 * Package Matching Utility
 * Algorithm for scoring packages against user preferences
 */

// Types for package matching
export interface PackageMatchingFields {
  ideal_gathering_size?: string[] | null;
  ideal_energy_level?: string[] | null;
  ideal_vibe?: string[] | null;
  rating?: number;
  review_count?: number;
}

export interface EventPreferences {
  gathering_size?: string | null;
  energy_level?: string | null;
  vibe_preferences?: string[] | null;
}

export interface MatchScoreBreakdown {
  gatheringScore: number;
  energyScore: number;
  vibeScore: number;
  totalScore: number;
}

// Scoring weights
const WEIGHTS = {
  GATHERING_SIZE: 40,
  ENERGY_LEVEL: 30,
  VIBE: 30,
} as const;

// Minimum score threshold for "Best Match" badge
export const BEST_MATCH_THRESHOLD = 70;

/**
 * Normalize string for fuzzy matching
 * Handles case insensitivity and common variations
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Calculate fuzzy match score between two strings
 * Returns 1.0 for exact match, partial scores for similar strings
 */
function fuzzyMatch(value: string, target: string): number {
  const normalizedValue = normalizeString(value);
  const normalizedTarget = normalizeString(target);

  // Exact match
  if (normalizedValue === normalizedTarget) {
    return 1.0;
  }

  // Check if one contains the other
  if (normalizedValue.includes(normalizedTarget) || normalizedTarget.includes(normalizedValue)) {
    return 0.8;
  }

  // Check for word overlap
  const valueWords = new Set(normalizedValue.split(' '));
  const targetWords = new Set(normalizedTarget.split(' '));
  const intersection = [...valueWords].filter(w => targetWords.has(w));

  if (intersection.length > 0) {
    const unionSize = new Set([...valueWords, ...targetWords]).size;
    return (intersection.length / unionSize) * 0.6;
  }

  return 0;
}

/**
 * Calculate gathering size match score
 * Handles exact matches and adjacent size categories
 */
function calculateGatheringSizeScore(
  packageSizes: string[] | null | undefined,
  preferredSize: string | null | undefined
): number {
  if (!preferredSize || !packageSizes?.length) {
    return 0;
  }

  // Direct match
  if (packageSizes.some(size => normalizeString(size) === normalizeString(preferredSize))) {
    return WEIGHTS.GATHERING_SIZE;
  }

  // Adjacent match (e.g., "intimate" vs "small_group")
  const sizeOrder = ['intimate', 'small_group', 'party', 'large'];
  const prefIndex = sizeOrder.findIndex(s => normalizeString(s) === normalizeString(preferredSize));

  if (prefIndex !== -1) {
    for (const size of packageSizes) {
      const pkgIndex = sizeOrder.findIndex(s => normalizeString(s) === normalizeString(size));
      if (pkgIndex !== -1) {
        const distance = Math.abs(prefIndex - pkgIndex);
        if (distance === 1) {
          return WEIGHTS.GATHERING_SIZE * 0.6; // 60% for adjacent
        }
        if (distance === 2) {
          return WEIGHTS.GATHERING_SIZE * 0.3; // 30% for two steps away
        }
      }
    }
  }

  return 0;
}

/**
 * Calculate energy level match score
 * Handles exact matches and adjacent energy levels
 */
function calculateEnergyLevelScore(
  packageLevels: string[] | null | undefined,
  preferredLevel: string | null | undefined
): number {
  if (!preferredLevel || !packageLevels?.length) {
    return 0;
  }

  // Direct match
  if (packageLevels.some(level => normalizeString(level) === normalizeString(preferredLevel))) {
    return WEIGHTS.ENERGY_LEVEL;
  }

  // Adjacent match
  const energyOrder = ['low_key', 'moderate', 'high_energy'];
  const prefIndex = energyOrder.findIndex(e => normalizeString(e) === normalizeString(preferredLevel));

  if (prefIndex !== -1) {
    for (const level of packageLevels) {
      const pkgIndex = energyOrder.findIndex(e => normalizeString(e) === normalizeString(level));
      if (pkgIndex !== -1) {
        const distance = Math.abs(prefIndex - pkgIndex);
        if (distance === 1) {
          return WEIGHTS.ENERGY_LEVEL * 0.6; // 60% for adjacent
        }
      }
    }
  }

  return 0;
}

/**
 * Calculate vibe match score using fuzzy text matching
 * Supports partial matches across multiple vibe preferences
 */
function calculateVibeScore(
  packageVibes: string[] | null | undefined,
  preferredVibes: string[] | null | undefined
): number {
  if (!preferredVibes?.length || !packageVibes?.length) {
    return 0;
  }

  let totalMatchScore = 0;
  const matchedPrefs: Set<string> = new Set();

  for (const prefVibe of preferredVibes) {
    let bestMatch = 0;

    for (const pkgVibe of packageVibes) {
      const matchScore = fuzzyMatch(prefVibe, pkgVibe);
      if (matchScore > bestMatch) {
        bestMatch = matchScore;
      }
    }

    if (bestMatch > 0) {
      matchedPrefs.add(prefVibe);
      totalMatchScore += bestMatch;
    }
  }

  // Calculate percentage of preferences matched
  const matchPercentage = matchedPrefs.size / preferredVibes.length;
  const averageMatchQuality = totalMatchScore / preferredVibes.length;

  // Combine match percentage and quality
  const combinedScore = (matchPercentage * 0.7 + averageMatchQuality * 0.3);

  return Math.round(combinedScore * WEIGHTS.VIBE);
}

/**
 * Main function: Calculate package match score against user preferences
 * Returns a score from 0-100
 */
export function calculatePackageScore(
  pkg: PackageMatchingFields,
  preferences: EventPreferences
): number {
  const gatheringScore = calculateGatheringSizeScore(
    pkg.ideal_gathering_size,
    preferences.gathering_size
  );

  const energyScore = calculateEnergyLevelScore(
    pkg.ideal_energy_level,
    preferences.energy_level
  );

  const vibeScore = calculateVibeScore(
    pkg.ideal_vibe,
    preferences.vibe_preferences
  );

  const totalScore = gatheringScore + energyScore + vibeScore;

  // Ensure score is between 0 and 100
  return Math.min(100, Math.max(0, Math.round(totalScore)));
}

/**
 * Get detailed score breakdown for debugging/display
 */
export function calculatePackageScoreBreakdown(
  pkg: PackageMatchingFields,
  preferences: EventPreferences
): MatchScoreBreakdown {
  const gatheringScore = calculateGatheringSizeScore(
    pkg.ideal_gathering_size,
    preferences.gathering_size
  );

  const energyScore = calculateEnergyLevelScore(
    pkg.ideal_energy_level,
    preferences.energy_level
  );

  const vibeScore = calculateVibeScore(
    pkg.ideal_vibe,
    preferences.vibe_preferences
  );

  return {
    gatheringScore: Math.round(gatheringScore),
    energyScore: Math.round(energyScore),
    vibeScore: Math.round(vibeScore),
    totalScore: Math.min(100, Math.max(0, Math.round(gatheringScore + energyScore + vibeScore))),
  };
}

/**
 * Determine if a score qualifies for "Best Match" status
 */
export function isBestMatchScore(score: number): boolean {
  return score >= BEST_MATCH_THRESHOLD;
}

/**
 * Format match score as percentage string
 */
export function formatMatchPercentage(score: number): string {
  return `${Math.round(score)}% match`;
}
