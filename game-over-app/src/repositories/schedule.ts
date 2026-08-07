/**
 * Event Schedule Repository
 * Day-of-event timeline items (activities with start time + duration).
 *
 * NOTE: `event_schedule_items` is not yet in the generated Database types
 * (regenerate via `npx supabase gen types ...`). Until then we route
 * through `(supabase as any)` to access the new table.
 */

import { supabase } from '@/lib/supabase/client';

export interface ScheduleItem {
  id: string;
  event_id: string;
  start_time: string;        // 'HH:MM:SS' (Postgres TIME)
  duration_minutes: number;
  title: string;
  location: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ScheduleItemInsert = Omit<
  ScheduleItem,
  'id' | 'created_at' | 'updated_at'
>;

export type ScheduleItemUpdate = Partial<
  Pick<ScheduleItem, 'start_time' | 'duration_minutes' | 'title' | 'location' | 'notes' | 'sort_order'>
>;

const sb = supabase as any;

export const scheduleRepository = {
  async getByEventId(eventId: string): Promise<ScheduleItem[]> {
    const { data, error } = await sb
      .from('event_schedule_items')
      .select('*')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as ScheduleItem[];
  },

  async createMany(items: ScheduleItemInsert[]): Promise<ScheduleItem[]> {
    if (items.length === 0) return [];
    const { data, error } = await sb
      .from('event_schedule_items')
      .insert(items)
      .select();
    if (error) throw error;
    return (data ?? []) as ScheduleItem[];
  },

  async update(id: string, patch: ScheduleItemUpdate): Promise<ScheduleItem> {
    const { data, error } = await sb
      .from('event_schedule_items')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as ScheduleItem;
  },

  async delete(id: string): Promise<void> {
    const { error } = await sb
      .from('event_schedule_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async deleteAllForEvent(eventId: string): Promise<void> {
    const { error } = await sb
      .from('event_schedule_items')
      .delete()
      .eq('event_id', eventId);
    if (error) throw error;
  },
};
