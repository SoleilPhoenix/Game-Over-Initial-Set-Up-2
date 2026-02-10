/**
 * Messages Repository
 * Data access layer for chat messages
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Message = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface MessageWithAuthor extends Message {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
}

const PAGE_SIZE = 50;

export const messagesRepository = {
  /**
   * Get messages for a channel with pagination
   */
  async getByChannelId(
    channelId: string,
    page: number = 0
  ): Promise<{ messages: MessageWithAuthor[]; hasMore: boolean }> {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from('messages')
      .select(
        `
        *,
        author:profiles(id, full_name, avatar_url)
      `,
        { count: 'exact' }
      )
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Note: messages->profiles relation may need FK in Supabase
    const messages = (data || []).map(m => ({
      ...m,
      author: (m as any).author as MessageWithAuthor['author'],
    }));

    // Reverse to show oldest first in UI
    messages.reverse();

    return {
      messages,
      hasMore: (count || 0) > to + 1,
    };
  },

  /**
   * Send a message
   */
  async send(message: MessageInsert): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;

    // Update channel's last_message_at
    await supabase
      .from('chat_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', message.channel_id);

    return data;
  },

  /**
   * Get messages after a specific timestamp (for polling)
   */
  async getNewMessages(
    channelId: string,
    afterTimestamp: string
  ): Promise<MessageWithAuthor[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(
        `
        *,
        author:profiles(id, full_name, avatar_url)
      `
      )
      .eq('channel_id', channelId)
      .gt('created_at', afterTimestamp)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(m => ({
      ...m,
      author: (m as any).author as MessageWithAuthor['author'],
    }));
  },

  /**
   * Subscribe to new messages (realtime)
   */
  subscribeToChannel(
    channelId: string,
    onMessage: (message: Message) => void
  ): () => void {
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          onMessage(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  /**
   * Get message count for a channel
   */
  async getCount(channelId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channelId);

    if (error) throw error;
    return count || 0;
  },
};
