/**
 * Bookings Repository
 * Data access layer for bookings and payments
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Booking = Database['public']['Tables']['bookings']['Row'];
type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
type BookingUpdate = Database['public']['Tables']['bookings']['Update'];
type Package = Database['public']['Tables']['packages']['Row'];

export interface BookingWithDetails extends Booking {
  package: Package | null;
  event: {
    id: string;
    title: string;
    honoree_name: string;
  } | null;
}

const SERVICE_FEE_PERCENTAGE = 0.10; // 10%
const MIN_SERVICE_FEE_CENTS = 5000; // €50

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

    // Update event status to 'booked'
    await supabase
      .from('events')
      .update({ status: 'booked' })
      .eq('id', booking.event_id);

    return data;
  },

  /**
   * Calculate booking costs
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
    const payingParticipants = excludeHonoree
      ? Math.max(1, participantCount - 1)
      : participantCount;

    const packageBaseCents =
      pkg.base_price_cents + pkg.price_per_person_cents * participantCount;

    const calculatedFee = Math.round(packageBaseCents * SERVICE_FEE_PERCENTAGE);
    const servicFeeCents = Math.max(calculatedFee, MIN_SERVICE_FEE_CENTS);

    const totalAmountCents = packageBaseCents + servicFeeCents;
    const perPersonCents = Math.ceil(totalAmountCents / payingParticipants);

    return {
      packageBaseCents,
      servicFeeCents,
      totalAmountCents,
      payingParticipants,
      perPersonCents,
    };
  },

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    bookingId: string,
    status: Booking['payment_status'],
    stripePaymentIntentId?: string
  ): Promise<Booking> {
    const updates: BookingUpdate = {
      payment_status: status,
    };

    if (stripePaymentIntentId) {
      updates.stripe_payment_intent_id = stripePaymentIntentId;
    }

    // Add to audit log
    const { data: existing } = await supabase
      .from('bookings')
      .select('audit_log')
      .eq('id', bookingId)
      .single();

    const auditLog = Array.isArray(existing?.audit_log) ? existing.audit_log : [];
    auditLog.push({
      action: 'payment_status_updated',
      status,
      timestamp: new Date().toISOString(),
    });

    updates.audit_log = auditLog;

    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Request a refund
   */
  async requestRefund(bookingId: string, reason: string): Promise<Booking> {
    const { data: existing } = await supabase
      .from('bookings')
      .select('audit_log')
      .eq('id', bookingId)
      .single();

    const auditLog = Array.isArray(existing?.audit_log) ? existing.audit_log : [];
    auditLog.push({
      action: 'refund_requested',
      reason,
      timestamp: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from('bookings')
      .update({
        payment_status: 'refunded',
        audit_log: auditLog,
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

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
