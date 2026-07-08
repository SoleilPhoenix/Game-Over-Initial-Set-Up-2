/**
 * Bookings Query Hooks
 * React Query hooks for booking data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsRepository } from '@/repositories';
import { eventKeys } from './useEvents';
import type { Database } from '@/lib/supabase/types';

type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
type Package = Database['public']['Tables']['packages']['Row'];

// Query keys
export const bookingKeys = {
  all: ['bookings'] as const,
  byEvent: (eventId: string) => [...bookingKeys.all, 'event', eventId] as const,
  detail: (bookingId: string) => [...bookingKeys.all, 'detail', bookingId] as const,
};

/**
 * Fetch booking for an event
 */
export function useBooking(eventId: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.byEvent(eventId || ''),
    queryFn: () => bookingsRepository.getByEventId(eventId!),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch booking by ID
 */
export function useBookingById(bookingId: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.detail(bookingId || ''),
    queryFn: () => bookingsRepository.getById(bookingId!),
    enabled: !!bookingId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Calculate booking costs (client-side helper)
 */
export function useBookingCosts(
  pkg: Package | null | undefined,
  participantCount: number,
  excludeHonoree: boolean = false
) {
  if (!pkg) {
    return {
      packageBaseCents: 0,
      servicFeeCents: 0,
      totalAmountCents: 0,
      payingParticipants: 0,
      perPersonCents: 0,
    };
  }

  return bookingsRepository.calculateCosts(pkg, participantCount, excludeHonoree);
}

/**
 * Create a booking
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (booking: BookingInsert) => bookingsRepository.create(booking),
    onSuccess: (data) => {
      // Invalidate event and booking queries
      queryClient.invalidateQueries({
        queryKey: bookingKeys.byEvent(data.event_id),
      });
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(data.event_id),
      });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

// useUpdatePaymentStatus() and useRequestRefund() were removed: payment_status is
// server-authoritative (Stripe webhook only; a DB trigger blocks client writes).
// Refunds must go through a server-side Stripe flow, not a client DB write.
