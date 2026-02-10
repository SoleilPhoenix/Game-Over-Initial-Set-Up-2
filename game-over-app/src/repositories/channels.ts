/**
 * Chat Channels Repository
 * Data access layer for chat channels
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type ChatChannel = Database['public']['Tables']['chat_channels']['Row'];
type ChatChannelInsert = Database['public']['Tables']['chat_channels']['Insert'];

export const channelsRepository = {
  /**
   * Get all channels for an event
   */
  async getByEventId(eventId: string): Promise<ChatChannel[]> {
    const { data, error } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('event_id', eventId)
      .order('category', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single channel by ID
   */
  async getById(channelId: string): Promise<ChatChannel | null> {
    const { data, error } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  /**
   * Create a new channel
   */
  async create(channel: ChatChannelInsert): Promise<ChatChannel> {
    const { data, error } = await supabase
      .from('chat_channels')
      .insert(channel)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update channel name
   */
  async updateName(channelId: string, name: string): Promise<ChatChannel> {
    const { data, error } = await supabase
      .from('chat_channels')
      .update({ name })
      .eq('id', channelId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update unread count
   */
  async updateUnreadCount(
    channelId: string,
    unreadCount: number
  ): Promise<void> {
    const { error } = await supabase
      .from('chat_channels')
      .update({ unread_count: unreadCount })
      .eq('id', channelId);

    if (error) throw error;
  },

  /**
   * Mark channel as read (reset unread count)
   */
  async markAsRead(channelId: string): Promise<void> {
    await this.updateUnreadCount(channelId, 0);
  },

  /**
   * Update last message timestamp
   */
  async updateLastMessageAt(channelId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', channelId);

    if (error) throw error;
  },

  /**
   * Get channels by category
   */
  async getByCategory(
    eventId: string,
    category: ChatChannel['category']
  ): Promise<ChatChannel[]> {
    const { data, error } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('event_id', eventId)
      .eq('category', category)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get total unread count for an event
   */
  async getTotalUnreadCount(eventId: string): Promise<number> {
    const { data, error } = await supabase
      .from('chat_channels')
      .select('unread_count')
      .eq('event_id', eventId);

    if (error) throw error;
    return (data || []).reduce((sum, ch) => sum + (ch.unread_count ?? 0), 0);
  },
};
