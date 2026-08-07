/**
 * Event Schedule Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  scheduleRepository,
  type ScheduleItem,
  type ScheduleItemInsert,
  type ScheduleItemUpdate,
} from '@/repositories';

export const scheduleKeys = {
  all: ['schedule'] as const,
  byEvent: (eventId: string) => [...scheduleKeys.all, 'event', eventId] as const,
};

export function useEventSchedule(eventId: string | undefined) {
  return useQuery({
    queryKey: scheduleKeys.byEvent(eventId || ''),
    queryFn: () => scheduleRepository.getByEventId(eventId!),
    enabled: !!eventId,
    staleTime: 60 * 1000,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: ScheduleItemInsert[]) => scheduleRepository.createMany(items),
    onSuccess: (_data, items) => {
      const eventId = items[0]?.event_id;
      if (eventId) qc.invalidateQueries({ queryKey: scheduleKeys.byEvent(eventId) });
    },
  });
}

export function useUpdateScheduleItem(eventId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ScheduleItemUpdate }) =>
      scheduleRepository.update(id, patch),
    onMutate: async ({ id, patch }) => {
      if (!eventId) return;
      const key = scheduleKeys.byEvent(eventId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ScheduleItem[]>(key);
      qc.setQueryData<ScheduleItem[]>(key, (old) =>
        (old ?? []).map((item) => (item.id === id ? { ...item, ...patch } : item))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (!eventId || !ctx?.previous) return;
      qc.setQueryData(scheduleKeys.byEvent(eventId), ctx.previous);
    },
    onSettled: () => {
      if (eventId) qc.invalidateQueries({ queryKey: scheduleKeys.byEvent(eventId) });
    },
  });
}

export function useDeleteScheduleItem(eventId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduleRepository.delete(id),
    onSettled: () => {
      if (eventId) qc.invalidateQueries({ queryKey: scheduleKeys.byEvent(eventId) });
    },
  });
}
