/**
 * Chat Channel Screen
 * Displays messages in a channel with real-time updates
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useChannel,
  useMessages,
  useSendMessage,
  useRealtimeMessages,
  useMarkChannelAsRead,
} from '@/hooks/queries/useChat';
import { useAuthStore } from '@/stores/authStore';
import { MessageBubble, MessageInput } from '@/components/chat';
import { colors } from '@/constants/colors';
import type { MessageWithAuthor } from '@/repositories/messages';

export default function ChatChannelScreen() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const user = useAuthStore((state) => state.user);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Fetch channel info
  const { data: channel, isLoading: channelLoading } = useChannel(channelId);

  // Fetch messages with infinite scroll
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(channelId);

  // Send message mutation
  const sendMessageMutation = useSendMessage();

  // Mark as read mutation
  const markAsReadMutation = useMarkChannelAsRead();

  // Combine all messages from paginated data
  const messages = React.useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page) => page.messages);
  }, [messagesData]);

  // Real-time message subscription
  const handleNewMessage = useCallback((message: MessageWithAuthor) => {
    // Scroll to bottom when new message arrives
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useRealtimeMessages(channelId, handleNewMessage);

  // Mark channel as read when opening
  useEffect(() => {
    if (channelId) {
      markAsReadMutation.mutate(channelId);
    }
  }, [channelId]);

  // Keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      if (flatListRef.current && messages.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [messages.length]);

  // Send message handler
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!channelId || !content.trim()) return;

      try {
        await sendMessageMutation.mutateAsync({
          channel_id: channelId,
          content: content.trim(),
        });

        // Scroll to bottom after sending
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [channelId, sendMessageMutation]
  );

  // Load more messages
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Render message item
  const renderMessage = useCallback(
    ({ item, index }: { item: MessageWithAuthor; index: number }) => {
      const isOwnMessage = item.user_id === user?.id;
      const previousMessage = index > 0 ? messages[index - 1] : null;

      // Show avatar if different user from previous message
      const showAvatar =
        !previousMessage || previousMessage.user_id !== item.user_id;

      // Show timestamp every 5 messages or different user
      const showTimestamp = showAvatar || index % 5 === 0;

      return (
        <MessageBubble
          message={item}
          isOwnMessage={isOwnMessage}
          showAvatar={showAvatar}
          showTimestamp={showTimestamp}
        />
      );
    },
    [user?.id, messages]
  );

  const getCategoryIcon = (category: string | undefined): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'general':
        return 'chatbubbles';
      case 'activities':
        return 'bicycle';
      case 'accommodation':
        return 'bed';
      case 'budget':
        return 'wallet';
      default:
        return 'chatbubble';
    }
  };

  if (channelLoading || messagesLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.light.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
      testID="chat-screen"
    >
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack
          paddingTop={insets.top + 8}
          paddingHorizontal="$3"
          paddingBottom="$3"
          alignItems="center"
          backgroundColor="$surface"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
          gap="$2"
        >
          <XStack
            width={40}
            height={40}
            borderRadius="$full"
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.7 }}
            onPress={() => router.back()}
            testID="back-button"
          >
            <Ionicons name="arrow-back" size={24} color="#1A202C" />
          </XStack>

          <YStack
            width={36}
            height={36}
            borderRadius="$md"
            backgroundColor="rgba(37, 140, 244, 0.1)"
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons
              name={getCategoryIcon(channel?.category)}
              size={18}
              color={colors.light.primary}
            />
          </YStack>

          <YStack flex={1}>
            <Text fontSize="$4" fontWeight="700" color="$textPrimary" numberOfLines={1}>
              {channel?.name || 'Chat'}
            </Text>
            <Text fontSize="$1" color="$textSecondary">
              #{channel?.category || 'general'}
            </Text>
          </YStack>

          <XStack
            width={40}
            height={40}
            borderRadius="$full"
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.7 }}
            testID="info-button"
          >
            <Ionicons name="information-circle-outline" size={24} color="#64748B" />
          </XStack>
        </XStack>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          testID="chat-messages-list"
          contentContainerStyle={{
            paddingVertical: 16,
            flexGrow: 1,
          }}
          inverted={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            isFetchingNextPage ? (
              <YStack padding="$4" alignItems="center">
                <Spinner size="small" color="$primary" />
              </YStack>
            ) : null
          }
          ListEmptyComponent={
            <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
              <YStack
                width={60}
                height={60}
                borderRadius="$full"
                backgroundColor="rgba(37, 140, 244, 0.1)"
                alignItems="center"
                justifyContent="center"
                marginBottom="$3"
              >
                <Ionicons name="chatbubble-outline" size={28} color={colors.light.primary} />
              </YStack>
              <Text fontSize="$3" fontWeight="600" color="$textPrimary" marginBottom="$1">
                No messages yet
              </Text>
              <Text fontSize="$2" color="$textSecondary" textAlign="center">
                Start the conversation!
              </Text>
            </YStack>
          }
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
          showsVerticalScrollIndicator={false}
        />

        {/* Message Input */}
        <YStack paddingBottom={keyboardVisible ? 0 : insets.bottom}>
          <MessageInput
            onSend={handleSendMessage}
            isLoading={sendMessageMutation.isPending}
            placeholder="Type a message..."
          />
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}
