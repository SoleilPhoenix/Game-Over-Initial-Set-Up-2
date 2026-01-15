/**
 * Events Query Hooks
 * React Query hooks for event data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsRepository, EventWithDetails } from '@/repositories';
import { useAuthStore } from '@/stores/authStore';
import type { Database } from '@/lib/supabase/types';

type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];
type EventPreferencesInsert = Database['public']['Tables']['event_preferences']['Insert'];

// Query keys
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (userId: string) => [...eventKeys.lists(), userId] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (eventId: string) => [...eventKeys.details(), eventId] as const,
};

/**
 * Fetch all events for the current user
 */
export function useEvents() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: eventKeys.list(user?.id || ''),
    queryFn: () => eventsRepository.getByUser(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single event by ID
 */
export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: eventKeys.detail(eventId || ''),
    queryFn: () => eventsRepository.getById(eventId!),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create a new event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({
      event,
      preferences,
    }: {
      event: Omit<EventInsert, 'created_by'>;
      preferences?: Omit<EventPreferencesInsert, 'event_id'>;
    }) => {
      return eventsRepository.create(
        { ...event, created_by: user!.id },
        preferences
      );
    },
    onSuccess: () => {
      // Invalidate events list
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

/**
 * Update an event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      updates,
    }: {
      eventId: string;
      updates: EventUpdate;
    }) => {
      return eventsRepository.update(eventId, updates);
    },
    onSuccess: (_, { eventId }) => {
      // Invalidate specific event and list
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

/**
 * Update event preferences
 */
export function useUpdateEventPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      preferences,
    }: {
      eventId: string;
      preferences: Partial<EventPreferencesInsert>;
    }) => {
      return eventsRepository.updatePreferences(eventId, preferences);
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

/**
 * Delete an event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => eventsRepository.delete(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

/**
 * Filter events by role
 */
export function useFilteredEvents(
  filter: 'all' | 'organizing' | 'attending'
) {
  const { data: events, ...rest } = useEvents();
  const user = useAuthStore((state) => state.user);

  const filteredEvents = events?.filter((event) => {
    if (filter === 'all') return true;
    if (filter === 'organizing') return event.created_by === user?.id;
    if (filter === 'attending') return event.created_by !== user?.id;
    return true;
  });

  return { data: filteredEvents, ...rest };
}
