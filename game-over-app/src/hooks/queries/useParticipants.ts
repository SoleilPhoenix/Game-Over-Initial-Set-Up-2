/**
 * Participants Query Hooks
 * React Query hooks for event participants
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { participantsRepository, ParticipantWithProfile } from '@/repositories';
import { eventKeys } from './useEvents';
import type { Database } from '@/lib/supabase/types';

type EventParticipantInsert = Database['public']['Tables']['event_participants']['Insert'];

// Query keys
export const participantKeys = {
  all: ['participants'] as const,
  byEvent: (eventId: string) => [...participantKeys.all, 'event', eventId] as const,
};

/**
 * Fetch participants for an event
 */
export function useParticipants(eventId: string | undefined) {
  return useQuery({
    queryKey: participantKeys.byEvent(eventId || ''),
    queryFn: () => participantsRepository.getByEventId(eventId!),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get participant count for an event
 */
export function useParticipantCount(eventId: string | undefined) {
  return useQuery({
    queryKey: [...participantKeys.byEvent(eventId || ''), 'count'],
    queryFn: () => participantsRepository.getCount(eventId!),
    enabled: !!eventId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Add a participant to an event
 */
export function useAddParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (participant: EventParticipantInsert) =>
      participantsRepository.add(participant),
    onSuccess: (_, { event_id }) => {
      queryClient.invalidateQueries({
        queryKey: participantKeys.byEvent(event_id),
      });
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(event_id),
      });
    },
  });
}

/**
 * Remove a participant from an event
 */
export function useRemoveParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
    }: {
      eventId: string;
      userId: string;
    }) => {
      await participantsRepository.remove(eventId, userId);
      return { eventId, userId };
    },
    onSuccess: ({ eventId }) => {
      queryClient.invalidateQueries({
        queryKey: participantKeys.byEvent(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(eventId),
      });
    },
  });
}

/**
 * Confirm participation
 */
export function useConfirmParticipation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
    }: {
      eventId: string;
      userId: string;
    }) => {
      return participantsRepository.confirm(eventId, userId);
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: participantKeys.byEvent(eventId),
      });
    },
  });
}

/**
 * Update participant payment status
 */
export function useUpdateParticipantPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
      status,
      amountCents,
    }: {
      eventId: string;
      userId: string;
      status: ParticipantWithProfile['payment_status'];
      amountCents?: number;
    }) => {
      return participantsRepository.updatePaymentStatus(
        eventId,
        userId,
        status,
        amountCents
      );
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: participantKeys.byEvent(eventId),
      });
    },
  });
}
