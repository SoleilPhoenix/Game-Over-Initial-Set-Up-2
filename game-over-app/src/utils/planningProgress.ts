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
  { key: 'budget_collected', labelKey: 'collectBudget', descriptionKey: 'collectBudgetDesc', icon: 'wallet-outline', auto: false },
  { key: 'outstanding_payment', labelKey: 'completePayment', descriptionKey: 'completePaymentDesc', icon: 'card-outline', auto: false },
  { key: 'accommodations', labelKey: 'planAccommodation', descriptionKey: 'planAccommodationDesc', icon: 'bed-outline', auto: false },
  { key: 'travel', labelKey: 'organizeTravel', descriptionKey: 'organizeTravelDesc', icon: 'car-outline', auto: false },
  { key: 'surprise_plan', labelKey: 'planSurprise', descriptionKey: 'planSurpriseDesc', icon: 'gift-outline', auto: false },
  { key: 'final_briefing', labelKey: 'finalBriefing', descriptionKey: 'finalBriefingDesc', icon: 'megaphone-outline', auto: true },
];

/**
 * Calculate planning steps for a booked event.
 * Returns empty array for non-booked events.
 */
export function calculatePlanningSteps(
  event: EventWithDetails,
  participants: ParticipantWithProfile[] | undefined,
  checklist: PlanningChecklist | undefined,
  cachedInvitedCount?: number,
  desiredParticipantCount?: number,
): PlanningStep[] {
  if (event.status !== 'booked' && event.status !== 'completed') return [];

  const participantList = participants || [];
  // Non-honoree participants are the relevant group for confirmation thresholds
  const nonHonoree = participantList.filter(p => p.role !== 'honoree');
  // Priority: desired count from wizard cache (most accurate) → actual DB count → non-honoree length
  // desiredParticipantCount excludes honoree (organizer + guests only), so use directly.
  const totalExpected = desiredParticipantCount || event.participant_count || Math.max(nonHonoree.length, 1);
  const threshold = Math.ceil(totalExpected * 0.5);

  // For step 1: use whichever is higher — DB participants or cached invited count
  const invitedCount = Math.max(participantList.length, cachedInvitedCount || 0);
  // Confirmed = organizer (implicit) + participants with confirmed_at set OR with a linked user_id
  // (user_id set means the guest has registered and is part of the event)
  const confirmedCount = nonHonoree.filter(p =>
    p.role === 'organizer' || p.confirmed_at != null || p.user_id != null
  ).length;

  const safeChecklist = checklist || {};

  const rawSteps = STEP_DEFINITIONS.map((def) => {
    let completed = false;

    if (def.auto) {
      switch (def.key) {
        case 'invitations_sent':
          completed = invitedCount >= threshold;
          break;
        case 'group_confirmed':
          // Require at least organizer + 1 guest (min 2) so a solo-organizer event
          // never auto-confirms the group before any guests join.
          completed = confirmedCount >= Math.max(threshold, 2);
          break;
        case 'final_briefing':
          // Auto-completes when all 5 manual planning steps (3-7) are checked
          completed = ['budget_collected', 'outstanding_payment', 'accommodations', 'travel', 'surprise_plan']
            .every(k => !!safeChecklist[k]);
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

  // Enforce sequential completion: a step cannot be complete if any prior step is not.
  // This prevents old checklist data from showing non-sequential completed states.
  const steps: PlanningStep[] = [];
  for (let i = 0; i < rawSteps.length; i++) {
    const prevComplete = i === 0 || steps[i - 1].completed;
    steps.push({ ...rawSteps[i], completed: prevComplete ? rawSteps[i].completed : false });
  }
  return steps;
}

/**
 * Returns progress percentage (0-100) with 12.5% per step.
 */
export function getProgressPercentage(steps: PlanningStep[]): number {
  if (steps.length === 0) return 0;
  const completedCount = steps.filter(s => s.completed).length;
  return Math.round((completedCount / steps.length) * 100);
}

/**
 * Returns the count of completed steps.
 */
export function getCompletedCount(steps: PlanningStep[]): number {
  return steps.filter(s => s.completed).length;
}

/**
 * Returns the i18n labelKey of the first incomplete step, or null if all done.
 * Note: returns a key (e.g. 'inviteParticipants'), not a translated string.
 */
export function getCurrentPhaseLabel(steps: PlanningStep[]): string | null {
  const nextStep = steps.find(s => !s.completed);
  return nextStep ? nextStep.labelKey : null;
}
