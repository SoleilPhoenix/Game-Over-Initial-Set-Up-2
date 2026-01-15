/**
 * Polls Query Hooks
 * React Query hooks for polls and voting
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pollsRepository, PollWithOptions } from '@/repositories';
import { useAuthStore } from '@/stores/authStore';
import type { Database } from '@/lib/supabase/types';

type PollInsert = Database['public']['Tables']['polls']['Insert'];
type Poll = Database['public']['Tables']['polls']['Row'];

// Query keys
export const pollKeys = {
  all: ['polls'] as const,
  byEvent: (eventId: string) => [...pollKeys.all, 'event', eventId] as const,
  detail: (pollId: string) => [...pollKeys.all, 'detail', pollId] as const,
  active: (eventId: string) => [...pollKeys.all, 'active', eventId] as const,
};

/**
 * Fetch all polls for an event
 */
export function usePolls(eventId: string | undefined) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pollKeys.byEvent(eventId || ''),
    queryFn: () => pollsRepository.getByEventId(eventId!, user?.id),
    enabled: !!eventId,
    staleTime: 1 * 60 * 1000, // 1 minute - polls are more dynamic
  });
}

/**
 * Fetch a single poll by ID
 */
export function usePoll(pollId: string | undefined) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pollKeys.detail(pollId || ''),
    queryFn: () => pollsRepository.getById(pollId!, user?.id),
    enabled: !!pollId,
  });
}

/**
 * Fetch active polls for an event
 */
export function useActivePolls(eventId: string | undefined) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pollKeys.active(eventId || ''),
    queryFn: () => pollsRepository.getActive(eventId!, user?.id),
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Create a new poll
 */
export function useCreatePoll() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      poll,
      options,
    }: {
      poll: Omit<PollInsert, 'created_by'>;
      options: string[];
    }) => {
      return pollsRepository.create(
        { ...poll, created_by: user!.id },
        options
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: pollKeys.byEvent(data.event_id),
      });
    },
  });
}

/**
 * Vote on a poll
 */
export function useVote() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      pollId,
      optionId,
    }: {
      pollId: string;
      optionId: string;
    }) => {
      return pollsRepository.vote(pollId, optionId, user!.id);
    },
    onSuccess: (_, { pollId }) => {
      queryClient.invalidateQueries({
        queryKey: pollKeys.detail(pollId),
      });
      // Also invalidate the event polls list
      queryClient.invalidateQueries({
        queryKey: pollKeys.all,
      });
    },
  });
}

/**
 * Close a poll
 */
export function useClosePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pollId: string) => pollsRepository.close(pollId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: pollKeys.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: pollKeys.byEvent(data.event_id),
      });
    },
  });
}

/**
 * Update poll status
 */
export function useUpdatePollStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pollId,
      status,
    }: {
      pollId: string;
      status: Poll['status'];
    }) => {
      return pollsRepository.updateStatus(pollId, status);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: pollKeys.detail(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: pollKeys.byEvent(data.event_id),
      });
    },
  });
}

/**
 * Add option to a poll
 */
export function useAddPollOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pollId,
      label,
    }: {
      pollId: string;
      label: string;
    }) => {
      return pollsRepository.addOption(pollId, label);
    },
    onSuccess: (_, { pollId }) => {
      queryClient.invalidateQueries({
        queryKey: pollKeys.detail(pollId),
      });
    },
  });
}
