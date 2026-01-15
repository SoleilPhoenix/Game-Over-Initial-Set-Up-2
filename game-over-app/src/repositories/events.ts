/**
 * Events Repository
 * Data access layer for events
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Event = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];
type EventPreferences = Database['public']['Tables']['event_preferences']['Row'];
type EventPreferencesInsert = Database['public']['Tables']['event_preferences']['Insert'];

export interface EventWithDetails extends Event {
  city: { id: string; name: string; country: string } | null;
  preferences: EventPreferences | null;
  participant_count: number;
}

export const eventsRepository = {
  /**
   * Get all events for a user (as organizer or participant)
   */
  async getByUser(userId: string): Promise<EventWithDetails[]> {
    // Get events where user is creator
    const { data: createdEvents, error: createdError } = await supabase
      .from('events')
      .select(`
        *,
        city:cities(id, name, country),
        preferences:event_preferences(*),
        participants:event_participants(count)
      `)
      .eq('created_by', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (createdError) throw createdError;

    // Get events where user is participant
    const { data: participatingEvents, error: participatingError } = await supabase
      .from('events')
      .select(`
        *,
        city:cities(id, name, country),
        preferences:event_preferences(*),
        participants:event_participants(count)
      `)
      .in('id',
        supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', userId)
          .neq('role', 'organizer')
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (participatingError) throw participatingError;

    // Combine and deduplicate
    const allEvents = [...(createdEvents || []), ...(participatingEvents || [])];
    const uniqueEvents = Array.from(new Map(allEvents.map(e => [e.id, e])).values());

    return uniqueEvents.map(event => ({
      ...event,
      city: event.city as EventWithDetails['city'],
      preferences: event.preferences?.[0] || null,
      participant_count: event.participants?.[0]?.count || 0,
    }));
  },

  /**
   * Get a single event by ID with all details
   */
  async getById(eventId: string): Promise<EventWithDetails | null> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        city:cities(id, name, country),
        preferences:event_preferences(*),
        participants:event_participants(count)
      `)
      .eq('id', eventId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      ...data,
      city: data.city as EventWithDetails['city'],
      preferences: data.preferences?.[0] || null,
      participant_count: data.participants?.[0]?.count || 0,
    };
  },

  /**
   * Create a new event with preferences
   */
  async create(
    event: EventInsert,
    preferences?: Omit<EventPreferencesInsert, 'event_id'>
  ): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single();

    if (error) throw error;

    // Create preferences if provided
    if (preferences) {
      const { error: prefError } = await supabase
        .from('event_preferences')
        .insert({ ...preferences, event_id: data.id });

      if (prefError) throw prefError;
    }

    // Add creator as organizer participant
    const { error: participantError } = await supabase
      .from('event_participants')
      .insert({
        event_id: data.id,
        user_id: event.created_by,
        role: 'organizer',
      });

    if (participantError) throw participantError;

    // Create default chat channel
    const { error: channelError } = await supabase
      .from('chat_channels')
      .insert({
        event_id: data.id,
        name: 'Main Lobby',
        category: 'general',
      });

    if (channelError) throw channelError;

    return data;
  },

  /**
   * Update an existing event
   */
  async update(eventId: string, updates: EventUpdate): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update event preferences
   */
  async updatePreferences(
    eventId: string,
    preferences: Partial<EventPreferencesInsert>
  ): Promise<EventPreferences> {
    const { data, error } = await supabase
      .from('event_preferences')
      .upsert({ ...preferences, event_id: eventId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Soft delete an event
   */
  async delete(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
      .eq('id', eventId);

    if (error) throw error;
  },

  /**
   * Get events by status
   */
  async getByStatus(
    userId: string,
    status: Event['status']
  ): Promise<EventWithDetails[]> {
    const allEvents = await this.getByUser(userId);
    return allEvents.filter(event => event.status === status);
  },
};
