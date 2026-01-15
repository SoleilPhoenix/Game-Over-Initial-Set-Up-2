/**
 * Chat Query Hooks
 * React Query hooks for chat channels and messages
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { channelsRepository, messagesRepository, MessageWithAuthor } from '@/repositories';
import { useAuthStore } from '@/stores/authStore';
import type { Database } from '@/lib/supabase/types';

type ChatChannelInsert = Database['public']['Tables']['chat_channels']['Insert'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

// Query keys
export const chatKeys = {
  all: ['chat'] as const,
  channels: (eventId: string) => [...chatKeys.all, 'channels', eventId] as const,
  channel: (channelId: string) => [...chatKeys.all, 'channel', channelId] as const,
  messages: (channelId: string) => [...chatKeys.all, 'messages', channelId] as const,
  unreadCount: (eventId: string) => [...chatKeys.all, 'unread', eventId] as const,
};

/**
 * Fetch all channels for an event
 */
export function useChannels(eventId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.channels(eventId || ''),
    queryFn: () => channelsRepository.getByEventId(eventId!),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch a single channel
 */
export function useChannel(channelId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.channel(channelId || ''),
    queryFn: () => channelsRepository.getById(channelId!),
    enabled: !!channelId,
  });
}

/**
 * Fetch messages for a channel with infinite scroll
 */
export function useMessages(channelId: string | undefined) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(channelId || ''),
    queryFn: ({ pageParam = 0 }) =>
      messagesRepository.getByChannelId(channelId!, pageParam),
    enabled: !!channelId,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length : undefined,
    initialPageParam: 0,
  });
}

/**
 * Get total unread count for an event
 */
export function useUnreadCount(eventId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.unreadCount(eventId || ''),
    queryFn: () => channelsRepository.getTotalUnreadCount(eventId!),
    enabled: !!eventId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Create a new channel
 */
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (channel: ChatChannelInsert) => channelsRepository.create(channel),
    onSuccess: (_, { event_id }) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.channels(event_id),
      });
    },
  });
}

/**
 * Send a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (message: Omit<MessageInsert, 'user_id'>) =>
      messagesRepository.send({ ...message, user_id: user!.id }),
    onSuccess: (_, { channel_id }) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(channel_id),
      });
    },
  });
}

/**
 * Mark channel as read
 */
export function useMarkChannelAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (channelId: string) => channelsRepository.markAsRead(channelId),
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.channel(channelId),
      });
    },
  });
}

/**
 * Subscribe to realtime messages
 */
export function useRealtimeMessages(
  channelId: string | undefined,
  onMessage: (message: MessageWithAuthor) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!channelId) return;

    const unsubscribe = messagesRepository.subscribeToChannel(
      channelId,
      (message) => {
        // Add message to cache
        queryClient.setQueryData(
          chatKeys.messages(channelId),
          (old: any) => {
            if (!old) return old;
            const lastPage = old.pages[old.pages.length - 1];
            return {
              ...old,
              pages: [
                ...old.pages.slice(0, -1),
                {
                  ...lastPage,
                  messages: [...lastPage.messages, message],
                },
              ],
            };
          }
        );

        // Notify callback
        onMessage(message as MessageWithAuthor);
      }
    );

    return unsubscribe;
  }, [channelId, queryClient, onMessage]);
}
