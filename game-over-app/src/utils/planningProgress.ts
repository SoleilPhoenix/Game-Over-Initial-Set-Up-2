/**
 * Planning Progress Utility
 * Calculates the 8-step post-booking planning progress for events
 */

import type { EventWithDetails } from '@/repositories/events';
import type { ParticipantWithProfile } from '@/repositories/participants';

export interface PlanningStep {
  key: string;
  labelKey: string;
  descriptionKey: string;
  completed: boolean;
  auto: boolean; // true = auto-derived from data, false = manual checkbox
  icon: string;
}

export type PlanningChecklist = Record<string, boolean>;

const STEP_DEFINITIONS: Array<{
  key: string;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  auto: boolean;
}> = [
  { key: 'invitations_sent', labelKey: 'inviteParticipants', descriptionKey: 'inviteParticipantsDesc', icon: 'mail-outline', auto: true },
  { key: 'group_confirmed', labelKey: 'groupConfirmed', descriptionKey: 'groupConfirmedDesc', icon: 'people-outline', auto: true },
  { key: 'budget_collected', labelKey: 'collectBudget', descriptionKey: 'collectBudgetDesc', icon: 'wallet-outline', auto: true },
  { key: 'quiz_prepared', labelKey: 'prepareQuiz', descriptionKey: 'prepareQuizDesc', icon: 'help-circle-outline', auto: false },
  { key: 'accommodations', labelKey: 'planAccommodation', descriptionKey: 'planAccommodationDesc', icon: 'bed-outline', auto: false },
  { key: 'travel', labelKey: 'organizeTravel', descriptionKey: 'organizeTravelDesc', icon: 'car-outline', auto: false },
  { key: 'surprise_plan', labelKey: 'planSurprise', descriptionKey: 'planSurpriseDesc', icon: 'gift-outline', auto: false },
  { key: 'final_briefing', labelKey: 'finalBriefing', descriptionKey: 'finalBriefingDesc', icon: 'megaphone-outline', auto: false },
];

/**
 * Calculate planning steps for a booked event.
 * Returns empty array for non-booked events.
 */
export function calculatePlanningSteps(
  event: EventWithDetails,
  participants: ParticipantWithProfile[] | undefined,
  checklist: PlanningChecklist | undefined,
): PlanningStep[] {
  if (event.status !== 'booked' && event.status !== 'completed') return [];

  const totalExpected = event.participant_count || 1;
  const threshold = Math.ceil(totalExpected * 0.5);

  const participantList = participants || [];
  const invitedCount = participantList.length;
  const confirmedCount = participantList.filter(p => p.confirmed_at != null).length;
  const paidCount = participantList.filter(p => p.payment_status === 'paid').length;

  const safeChecklist = checklist || {};

  return STEP_DEFINITIONS.map((def) => {
    let completed = false;

    if (def.auto) {
      switch (def.key) {
        case 'invitations_sent':
          completed = invitedCount >= threshold;
          break;
        case 'group_confirmed':
          completed = confirmedCount >= threshold;
          break;
        case 'budget_collected':
          completed = paidCount >= threshold;
          break;
      }
    } else {
      completed = !!safeChecklist[def.key];
    }

    return {
      key: def.key,
      labelKey: def.labelKey,
      descriptionKey: def.descriptionKey,
      completed,
      auto: def.auto,
      icon: def.icon,
    };
  });
}

/**
 * Returns progress percentage (0-100) with 12.5% per step.
 */
export function getProgressPercentage(steps: PlanningStep[]): number {
  if (steps.length === 0) return 0;
  const completedCount = steps.filter(s => s.completed).length;
  return Math.round((completedCount / 8) * 100);
}

/**
 * Returns the count of completed steps.
 */
export function getCompletedCount(steps: PlanningStep[]): number {
  return steps.filter(s => s.completed).length;
}

/**
 * Returns the label key of the first incomplete step, or null if all done.
 */
export function getCurrentPhaseLabel(steps: PlanningStep[]): string | null {
  const nextStep = steps.find(s => !s.completed);
  return nextStep ? nextStep.labelKey : null;
}
