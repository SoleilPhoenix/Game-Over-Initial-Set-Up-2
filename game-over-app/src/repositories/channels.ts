/**
 * Chat Channels Repository
 * Data access layer for chat channels
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type ChatChannel = Database['public']['Tables']['chat_channels']['Row'];
type ChatChannelInsert = Database['public']['Tables']['chat_channels']['Insert'];
type ChatChannelWithUnreadRow = Database['public']['Views']['chat_channels_with_unread']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ChatChannelWithUnread extends ChatChannel {
  unread_count: number;
  creator_name: Profile['full_name'];
}

function mapChannelWithUnread(row: ChatChannelWithUnreadRow): ChatChannelWithUnread {
  if (
    row.id === null ||
    row.event_id === null ||
    row.name === null ||
    row.category === null
  ) {
    throw new Error('Invalid channel returned by chat_channels_with_unread');
  }

  return {
    id: row.id,
    event_id: row.event_id,
    name: row.name,
    category: row.category,
    created_at: row.created_at,
    created_by: row.created_by,
    last_message_at: row.last_message_at,
    unread_count: row.unread_count ?? 0,
    creator_name: null,
  };
}

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) throw new Error('Authentication required for channel operation');

  return data.user.id;
}

export const channelsRepository = {
  /**
   * Get all channels for an event
   */
  async getByEventId(eventId: string): Promise<ChatChannelWithUnread[]> {
    const { data, error } = await supabase
      .from('chat_channels_with_unread')
      .select('*')
      .eq('event_id', eventId)
      .order('category', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapChannelWithUnread);
  },

  /**
   * Get a single channel by ID
   */
  async getById(channelId: string): Promise<ChatChannelWithUnread | null> {
    const { data, error } = await supabase
      .from('chat_channels_with_unread')
      .select('*')
      .eq('id', channelId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const channel = mapChannelWithUnread(data);
    if (!channel.created_by) return channel;

    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', channel.created_by)
      .maybeSingle();

    if (creatorError) {
      console.warn('[channelsRepository.getById] creator profile fetch failed:', creatorError.message);
      return channel;
    }

    return { ...channel, creator_name: creator?.full_name ?? null };
  },

  /**
   * Create a new channel
   */
  async create(channel: ChatChannelInsert): Promise<ChatChannel> {
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from('chat_channels')
      .insert({ ...channel, created_by: userId })
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
   * Mark channel as read for the authenticated user
   */
  async markAsRead(channelId: string): Promise<void> {
    const userId = await getAuthenticatedUserId();
    const { error } = await supabase
      .from('channel_read_state')
      .upsert(
        {
          channel_id: channelId,
          user_id: userId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'channel_id,user_id' }
      );

    if (error) throw error;
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
  ): Promise<ChatChannelWithUnread[]> {
    const { data, error } = await supabase
      .from('chat_channels_with_unread')
      .select('*')
      .eq('event_id', eventId)
      .eq('category', category)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapChannelWithUnread);
  },

  /**
   * Delete a channel
   */
  async delete(channelId: string): Promise<void> {
    const { data, error } = await supabase
      .from('chat_channels')
      .delete()
      .eq('id', channelId)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Channel was not deleted or delete permission was denied');
    }
  },

  /**
   * Get total unread count for an event
   */
  async getTotalUnreadCount(eventId: string): Promise<number> {
    const { data, error } = await supabase
      .from('chat_channels_with_unread')
      .select('unread_count')
      .eq('event_id', eventId);

    if (error) throw error;
    return (data || []).reduce((sum, ch) => sum + (ch.unread_count ?? 0), 0);
  },
};
