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

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveCityId(cityId: string): Promise<string> {
  if (UUID_REGEX.test(cityId)) return cityId;

  // cityId is a slug (e.g. "hannover") — look up the real UUID by name
  const { data } = await supabase
    .from('cities')
    .select('id')
    .ilike('name', cityId)
    .limit(1)
    .maybeSingle();

  if (!data?.id) {
    throw new Error(`City not found: "${cityId}". Ensure city exists in the database.`);
  }
  return data.id;
}

export const eventsRepository = {
  /**
   * Get all events for a user (as organizer or participant)
   */
  async getByUser(userId: string): Promise<EventWithDetails[]> {
    // Query 1: Events where user is creator
    // Only join cities (safe RLS: public read for authenticated).
    // Avoid joining event_preferences / event_participants here because
    // their RLS policies reference the events table, causing 42P17
    // infinite recursion on some Supabase configurations.
    const { data: createdEvents, error: createdError } = await supabase
      .from('events')
      .select(`
        *,
        city:cities(id, name, country)
      `)
      .eq('created_by', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (createdError) {
      console.error('[events.getByUser] created query failed:', createdError.code, createdError.message);
      throw createdError;
    }

    // Query 2: Events where user is a non-organizer participant
    let participatingEvents: typeof createdEvents = [];
    try {
      const { data: participantRows } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', userId)
        .neq('role', 'organizer');

      const participantEventIds = (participantRows || []).map(r => r.event_id);
      if (participantEventIds.length > 0) {
        const { data, error } = await supabase
          .from('events')
          .select(`*, city:cities(id, name, country)`)
          .in('id', participantEventIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[events.getByUser] participating query failed:', error.code, error.message);
        } else {
          participatingEvents = data;
        }
      }
    } catch (err) {
      console.warn('[events.getByUser] participating lookup failed, skipping:', err);
    }

    // Combine and deduplicate
    const allEvents = [...(createdEvents || []), ...(participatingEvents || [])];
    const uniqueEvents = Array.from(new Map(allEvents.map(e => [e.id, e])).values());

    // Fetch participant counts separately (non-blocking)
    let countMap = new Map<string, number>();
    try {
      const eventIds = uniqueEvents.map(e => e.id);
      if (eventIds.length > 0) {
        const { data: counts } = await supabase
          .from('event_participants')
          .select('event_id')
          .in('event_id', eventIds);

        if (counts) {
          for (const row of counts) {
            countMap.set(row.event_id, (countMap.get(row.event_id) || 0) + 1);
          }
        }
      }
    } catch {
      // Non-critical — default to 0
    }

    return uniqueEvents.map(event => ({
      ...event,
      city: event.city as EventWithDetails['city'],
      preferences: null,
      participant_count: countMap.get(event.id) || 0,
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
        city:cities(id, name, country)
      `)
      .eq('id', eventId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('[events.getById] failed:', error.code, error.message);
      throw error;
    }

    // Fetch preferences separately (avoids RLS recursion)
    let preferences: EventPreferences | null = null;
    try {
      const { data: prefs } = await supabase
        .from('event_preferences')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();
      preferences = prefs;
    } catch {
      // Non-critical
    }

    // Fetch participant count separately
    let participantCount = 0;
    try {
      const { count } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);
      participantCount = count || 0;
    } catch {
      // Non-critical
    }

    return {
      ...data,
      city: data.city as EventWithDetails['city'],
      preferences,
      participant_count: participantCount,
    };
  },

  /**
   * Create a new event with preferences
   * Uses client-side UUID to avoid .select() after .insert()
   * which triggers SELECT RLS policy recursion (42P17)
   */
  async create(
    event: EventInsert,
    preferences?: Omit<EventPreferencesInsert, 'event_id'>
  ): Promise<Event> {
    const eventId = generateUUID();

    // Resolve city slug (e.g. "hannover") to real UUID if needed
    const resolvedCityId = await resolveCityId(event.city_id);
    const insertData = { ...event, city_id: resolvedCityId } as EventInsert & { id: string };
    insertData.id = eventId;

    const { error } = await supabase
      .from('events')
      .insert(insertData as any);

    if (error) throw error;

    // Build return object from known data (avoids SELECT RLS issue)
    const now = new Date().toISOString();
    const createdEvent = {
      id: eventId,
      ...event,
      status: event.status || 'draft',
      created_at: now,
      updated_at: now,
      deleted_at: null,
      hero_image_url: null,
    } as Event;

    // Create preferences if provided
    if (preferences) {
      const { error: prefError } = await supabase
        .from('event_preferences')
        .insert({ ...preferences, event_id: eventId });

      if (prefError) {
        console.warn('Failed to create event preferences:', prefError.message);
      }
    }

    // Add creator as organizer participant
    const { error: participantError } = await supabase
      .from('event_participants')
      .insert({
        event_id: eventId,
        user_id: event.created_by,
        role: 'organizer',
      });

    if (participantError) {
      console.warn('Failed to add organizer participant:', participantError.message);
    }

    // Create default chat channel
    const { error: channelError } = await supabase
      .from('chat_channels')
      .insert({
        event_id: eventId,
        name: 'Main Lobby',
        category: 'general',
      });

    if (channelError) {
      console.warn('Failed to create chat channel:', channelError.message);
    }

    return createdEvent;
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
