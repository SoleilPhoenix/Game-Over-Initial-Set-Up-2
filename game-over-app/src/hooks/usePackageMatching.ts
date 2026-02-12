/**
 * Package Matching Hook
 * Bridges wizard questionnaire answers → activity scoring → package recommendation
 */

import { useMemo } from 'react';
import {
  scoreActivities,
  SCORE_THRESHOLDS,
  type QuestionnaireAnswers,
  type ScoredActivity,
} from '@/utils/packageMatching';

export type { QuestionnaireAnswers, ScoredActivity };

export interface UseActivityMatchingResult {
  activities: ScoredActivity[];
  topActivities: ScoredActivity[];
  hasStrongMatches: boolean;
}

/**
 * Hook to score activities against questionnaire answers.
 * Returns sorted activities with scores.
 */
export function useActivityMatching(
  answers: QuestionnaireAnswers | undefined
): UseActivityMatchingResult {
  return useMemo(() => {
    if (!answers) {
      return { activities: [], topActivities: [], hasStrongMatches: false };
    }

    const scored = scoreActivities(answers);
    const topActivities = scored.filter(a => a.totalScore >= SCORE_THRESHOLDS.STRONG);

    return {
      activities: scored,
      topActivities,
      hasStrongMatches: topActivities.length > 0,
    };
  }, [answers]);
}

/**
 * Hook for calculating price per person based on participant count
 */
export function usePerPersonPrice(
  totalPriceCents: number,
  participantCount: number
): number {
  return useMemo(() => {
    if (participantCount <= 0) return totalPriceCents;
    return Math.ceil(totalPriceCents / participantCount);
  }, [totalPriceCents, participantCount]);
}

/**
 * Format price from cents to display string
 */
export function formatPrice(cents: number, currency = 'EUR'): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export { SCORE_THRESHOLDS };
