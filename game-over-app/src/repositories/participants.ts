/**
 * Participants Repository
 * Data access layer for event participants
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type EventParticipant = Database['public']['Tables']['event_participants']['Row'];
type EventParticipantInsert = Database['public']['Tables']['event_participants']['Insert'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ParticipantWithProfile extends EventParticipant {
  profile: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'> | null;
}

export const participantsRepository = {
  /**
   * Get all participants for an event
   */
  async getByEventId(eventId: string): Promise<ParticipantWithProfile[]> {
    const { data, error } = await supabase
      .from('event_participants')
      .select(`
        *,
        profile:profiles(id, email, full_name, avatar_url)
      `)
      .eq('event_id', eventId)
      .order('invited_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(p => ({
      ...p,
      profile: p.profile as ParticipantWithProfile['profile'],
    }));
  },

  /**
   * Add a participant to an event
   */
  async add(participant: EventParticipantInsert): Promise<EventParticipant> {
    const { data, error } = await supabase
      .from('event_participants')
      .insert(participant)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update participant role or payment status
   */
  async update(
    eventId: string,
    userId: string,
    updates: Partial<Pick<EventParticipant, 'role' | 'payment_status' | 'contribution_amount_cents' | 'confirmed_at'>>
  ): Promise<EventParticipant> {
    const { data, error } = await supabase
      .from('event_participants')
      .update(updates)
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Remove a participant from an event
   */
  async remove(eventId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Confirm participation
   */
  async confirm(eventId: string, userId: string): Promise<EventParticipant> {
    return this.update(eventId, userId, {
      confirmed_at: new Date().toISOString(),
    });
  },

  /**
   * Update payment status for a participant
   */
  async updatePaymentStatus(
    eventId: string,
    userId: string,
    status: EventParticipant['payment_status'],
    amountCents?: number
  ): Promise<EventParticipant> {
    const updates: Partial<EventParticipant> = { payment_status: status };
    if (amountCents !== undefined) {
      updates.contribution_amount_cents = amountCents;
    }
    return this.update(eventId, userId, updates);
  },

  /**
   * Get participant count for an event
   */
  async getCount(eventId: string): Promise<number> {
    const { count, error } = await supabase
      .from('event_participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Check if user is participant of an event
   */
  async isParticipant(eventId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  /**
   * Get user's role in an event
   */
  async getRole(
    eventId: string,
    userId: string
  ): Promise<EventParticipant['role'] | null> {
    const { data, error } = await supabase
      .from('event_participants')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data.role;
  },
};
