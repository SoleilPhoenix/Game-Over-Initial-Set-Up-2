/**
 * Event refund React Query hooks.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  refundsRepository,
  type CreateEventRefund,
  type EventRefund,
  type UpdateEventRefund,
} from '@/repositories/refunds';

export type {
  CreateEventRefund,
  EventRefund,
  RefundStatus,
  UpdateEventRefund,
} from '@/repositories/refunds';

export const refundKeys = {
  all: ['refunds'] as const,
  byEvent: (eventId: string) => [...refundKeys.all, 'event', eventId] as const,
};

export function useEventRefunds(eventId: string | undefined) {
  return useQuery({
    queryKey: refundKeys.byEvent(eventId ?? ''),
    queryFn: () => refundsRepository.getByEventId(eventId!),
    enabled: !!eventId,
  });
}

export function useCreateRefund(eventId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (refund: CreateEventRefund) => refundsRepository.create(refund),
    onSettled: () => {
      if (eventId) queryClient.invalidateQueries({ queryKey: refundKeys.byEvent(eventId) });
    },
  });
}

export function useImportRefunds(eventId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (refunds: CreateEventRefund[]) => refundsRepository.createMany(refunds),
    onSettled: () => {
      if (eventId) queryClient.invalidateQueries({ queryKey: refundKeys.byEvent(eventId) });
    },
  });
}

export function useUpdateRefund(eventId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateEventRefund }) =>
      refundsRepository.update(id, patch),
    onMutate: async ({ id, patch }) => {
      if (!eventId) return;
      const key = refundKeys.byEvent(eventId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<EventRefund[]>(key);
      queryClient.setQueryData<EventRefund[]>(key, (current) =>
        (current ?? []).map((refund) =>
          refund.id === id ? { ...refund, ...patch } : refund
        )
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (eventId && context?.previous) {
        queryClient.setQueryData(refundKeys.byEvent(eventId), context.previous);
      }
    },
    onSettled: () => {
      if (eventId) queryClient.invalidateQueries({ queryKey: refundKeys.byEvent(eventId) });
    },
  });
}

export function useDeleteRefund(eventId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => refundsRepository.delete(id),
    onMutate: async (id) => {
      if (!eventId) return;
      const key = refundKeys.byEvent(eventId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<EventRefund[]>(key);
      queryClient.setQueryData<EventRefund[]>(key, (current) =>
        (current ?? []).filter((refund) => refund.id !== id)
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (eventId && context?.previous) {
        queryClient.setQueryData(refundKeys.byEvent(eventId), context.previous);
      }
    },
    onSettled: () => {
      if (eventId) queryClient.invalidateQueries({ queryKey: refundKeys.byEvent(eventId) });
    },
  });
}
