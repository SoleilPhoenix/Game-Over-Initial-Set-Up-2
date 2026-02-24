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
 * Vote on a poll (supports changing vote).
 * Uses optimistic updates for immediate UI feedback.
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
    onMutate: async ({ pollId, optionId }) => {
      // Cancel any in-flight refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: pollKeys.all });

      // Optimistically update all matching poll lists in cache
      queryClient.setQueriesData<PollWithOptions[]>(
        { queryKey: pollKeys.all, exact: false },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map(poll => {
            if (poll.id !== pollId) return poll;
            const prevVoteOptionId = poll.user_vote;
            const updatedOptions = poll.options.map(opt => {
              let delta = 0;
              if (opt.id === optionId) delta = 1;                 // new vote
              if (opt.id === prevVoteOptionId) delta = -1;        // remove old vote
              return { ...opt, vote_count: Math.max(0, (opt.vote_count ?? 0) + delta) };
            });
            return {
              ...poll,
              options: updatedOptions,
              total_votes: updatedOptions.reduce((s, o) => s + (o.vote_count ?? 0), 0),
              user_vote: optionId,
            };
          });
        }
      );
    },
    onError: () => {
      // On error only: refetch to rollback optimistic update
      queryClient.invalidateQueries({ queryKey: pollKeys.all });
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

/**
 * Delete a poll — optimistically removes from cache for instant UI feedback
 */
export function useDeletePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pollId: string) => pollsRepository.delete(pollId),
    onMutate: async (pollId: string) => {
      await queryClient.cancelQueries({ queryKey: pollKeys.all });
      // Snapshot current state for rollback on error
      const snapshot = queryClient.getQueriesData<PollWithOptions[]>({ queryKey: pollKeys.all, exact: false });
      // Optimistically remove the poll from all cached poll lists
      queryClient.setQueriesData<PollWithOptions[]>(
        { queryKey: pollKeys.all, exact: false },
        (old) => Array.isArray(old) ? old.filter(p => p.id !== pollId) : old
      );
      return { snapshot };
    },
    onError: (_err, _pollId, context) => {
      // Rollback to snapshot on error
      if (context?.snapshot) {
        context.snapshot.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    // No onSettled invalidation — the optimistic update is the source of truth on success
  });
}
