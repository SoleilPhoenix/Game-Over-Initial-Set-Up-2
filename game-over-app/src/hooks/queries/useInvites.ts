/**
 * Invites Query Hooks
 * React Query hooks for invite codes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invitesRepository, InviteCodeWithEvent } from '@/repositories/invites';
import { useAuthStore } from '@/stores/authStore';
import { participantKeys } from './useParticipants';
import { eventKeys } from './useEvents';

// Query keys
export const inviteKeys = {
  all: ['invites'] as const,
  byCode: (code: string) => [...inviteKeys.all, 'code', code] as const,
  byEvent: (eventId: string) => [...inviteKeys.all, 'event', eventId] as const,
  validation: (code: string) => [...inviteKeys.all, 'validation', code] as const,
};

/**
 * Fetch invite code details by code
 */
export function useInviteByCode(code: string | undefined) {
  return useQuery({
    queryKey: inviteKeys.byCode(code || ''),
    queryFn: () => invitesRepository.getByCode(code!),
    enabled: !!code,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Validate an invite code
 */
export function useValidateInvite(code: string | undefined) {
  return useQuery({
    queryKey: inviteKeys.validation(code || ''),
    queryFn: () => invitesRepository.validate(code!),
    enabled: !!code,
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });
}

/**
 * Fetch all invite codes for an event
 */
export function useInvitesByEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: inviteKeys.byEvent(eventId || ''),
    queryFn: () => invitesRepository.getByEventId(eventId!),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Create a new invite code
 */
export function useCreateInvite() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      eventId,
      expiresInDays,
      maxUses,
    }: {
      eventId: string;
      expiresInDays?: number;
      maxUses?: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return invitesRepository.create(eventId, user.id, { expiresInDays, maxUses });
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.byEvent(eventId) });
    },
  });
}

/**
 * Accept an invite code
 */
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return invitesRepository.accept(inviteCode, user.id);
    },
    onSuccess: (result) => {
      if (result.success && result.eventId) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: participantKeys.byEvent(result.eventId) });
        queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(result.eventId) });
      }
    },
  });
}

/**
 * Deactivate an invite code
 */
export function useDeactivateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inviteId,
      eventId,
    }: {
      inviteId: string;
      eventId: string;
    }) => {
      await invitesRepository.deactivate(inviteId);
      return { inviteId, eventId };
    },
    onSuccess: ({ eventId }) => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.byEvent(eventId) });
    },
  });
}
