/**
 * Bookings Repository
 * Data access layer for bookings and payments
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { calculateBookingPricing } from '@/utils/pricing';

type Booking = Database['public']['Tables']['bookings']['Row'];
type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
type Package = Database['public']['Tables']['packages']['Row'];

export interface BookingWithDetails extends Booking {
  package: Package | null;
  event: {
    id: string;
    title: string;
    honoree_name: string;
  } | null;
}

export const bookingsRepository = {
  /**
   * Get booking by event ID
   */
  async getByEventId(eventId: string): Promise<BookingWithDetails | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        package:packages(*),
        event:events(id, title, honoree_name)
      `)
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      ...data,
      package: data.package as Package,
      event: data.event as BookingWithDetails['event'],
    };
  },

  /**
   * Get booking by ID
   */
  async getById(bookingId: string): Promise<BookingWithDetails | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        package:packages(*),
        event:events(id, title, honoree_name)
      `)
      .eq('id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      ...data,
      package: data.package as Package,
      event: data.event as BookingWithDetails['event'],
    };
  },

  /**
   * Create a new booking
   */
  async create(booking: BookingInsert): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .insert(booking)
      .select()
      .single();

    if (error) throw error;

    // NOTE: event.status is intentionally NOT set here. Marking an event 'booked'
    // is reserved for the Stripe webhook (service role) once payment settles — a
    // DB trigger now rejects client-side 'booked' writes. Creating a booking row
    // only records intent to pay; it does not confirm the event.
    return data;
  },

  /**
   * Calculate booking costs — delegates to canonical pricing utility.
   */
  calculateCosts(
    pkg: Package,
    participantCount: number,
    excludeHonoree: boolean = false
  ): {
    packageBaseCents: number;
    servicFeeCents: number;
    totalAmountCents: number;
    payingParticipants: number;
    perPersonCents: number;
  } {
    const result = calculateBookingPricing({
      pricePerPersonCents: pkg.price_per_person_cents,
      baseFeeCents: pkg.base_price_cents,
      totalParticipants: participantCount,
      excludeHonoree,
    });
    return {
      packageBaseCents: result.packageBaseCents,
      servicFeeCents: result.serviceFeeCents,
      totalAmountCents: result.totalCents,
      payingParticipants: result.payingCount,
      perPersonCents: result.perPersonCents,
    };
  },

  // NOTE: updatePaymentStatus() and requestRefund() were removed. payment_status
  // is server-authoritative — a DB trigger rejects client writes to it, and the
  // Stripe webhook is the only writer. Refunds must be issued via Stripe (a
  // server-side edge function), never by flipping the DB column from the client
  // (which never actually moved money). See payment-integrity notes.

  /**
   * Get all bookings for a user
   */
  async getByUser(userId: string): Promise<BookingWithDetails[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        package:packages(*),
        event:events!inner(id, title, honoree_name, created_by)
      `)
      .eq('event.created_by', userId);

    if (error) throw error;

    return (data || []).map(booking => ({
      ...booking,
      package: booking.package as Package,
      event: booking.event as BookingWithDetails['event'],
    }));
  },
};
