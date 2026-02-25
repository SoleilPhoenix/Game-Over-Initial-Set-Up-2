/**
 * Chat Channel Screen
 * Displays messages in a channel with real-time updates
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Keyboard, Alert, Pressable, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  useDeleteChannel,
} from '@/hooks/queries/useChat';
import { useAuthStore } from '@/stores/authStore';
import { MessageBubble, MessageInput } from '@/components/chat';
import { colors } from '@/constants/colors';
import { DARK_THEME } from '@/constants/theme';
import { useTranslation, getTranslation } from '@/i18n';
import type { MessageWithAuthor } from '@/repositories/messages';

// A local channel has a timestamp ID (e.g. "1771618701111"), not a UUID.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LocalMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string;
}

export default function ChatChannelScreen() {
  const { channelId, name: channelNameParam, category: channelCategoryParam, icon: channelIconParam } = useLocalSearchParams<{
    channelId: string;
    name?: string;
    category?: string;
    icon?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const user = useAuthStore((state) => state.user);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const { t } = useTranslation();

  // Local channels have a timestamp ID — skip all DB operations for them
  const isDbChannel = UUID_REGEX.test(channelId ?? '');

  // Load persisted local messages when channel opens
  useEffect(() => {
    if (isDbChannel || !channelId) return;
    const storageKey = `local-messages-${channelId}`;
    AsyncStorage.getItem(storageKey).then(raw => {
      if (raw) {
        try {
          const loaded = JSON.parse(raw) as LocalMessage[];
          setLocalMessages(loaded);
        } catch {}
      }
    });
  }, [channelId, isDbChannel]);

  // Scroll to bottom after persisted local messages are loaded on mount
  useEffect(() => {
    if (!isDbChannel && localMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 150);
    }
  }, [isDbChannel]); // Only run on mount for local channels

  // Fetch channel info (only for real DB channels)
  const { data: channel, isLoading: channelLoading } = useChannel(isDbChannel ? channelId : undefined);

  // Fetch messages with infinite scroll (only for real DB channels)
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(isDbChannel ? channelId : undefined);

  // Send message mutation
  const sendMessageMutation = useSendMessage();

  // Mark as read mutation
  const markAsReadMutation = useMarkChannelAsRead();

  // Delete channel mutation
  const deleteChannelMutation = useDeleteChannel();

  const handleDeleteChannel = () => {
    Alert.alert(
      'Delete Channel',
      `Are you sure you want to delete "${channelDisplayName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setInfoModalVisible(false);
            if (!isDbChannel) {
              // Local channel — remove messages AND channel entry from AsyncStorage
              // Await all storage operations before navigating to avoid race condition
              try {
                await AsyncStorage.removeItem(`local-messages-${channelId}`);
                const raw = await AsyncStorage.getItem('localChannelsByEvent');
                if (raw) {
                  const map = JSON.parse(raw) as Record<string, Array<{ id: string; channels: Array<{ id: string }> }>>;
                  for (const eventKey of Object.keys(map)) {
                    for (const section of map[eventKey]) {
                      section.channels = section.channels.filter((ch: any) => ch.id !== channelId);
                    }
                  }
                  await AsyncStorage.setItem('localChannelsByEvent', JSON.stringify(map));
                }
              } catch {}
              router.back();
            } else {
              try {
                await deleteChannelMutation.mutateAsync(channelId!);
                router.back();
              } catch {
                Alert.alert('Error', 'Could not delete channel.');
              }
            }
          },
        },
      ]
    );
  };

  // Combine all messages from paginated data
  const messages = React.useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page) => page.messages);
  }, [messagesData]);

  // For local channels, merge local messages into display list
  const displayMessages: any[] = isDbChannel
    ? messages
    : localMessages.map(m => ({
        ...m,
        profiles: { full_name: m.user_name, avatar_url: null },
      }));

  // Channel display name and category (from DB or URL params for local channels)
  const channelDisplayName = isDbChannel ? (channel?.name ?? 'Chat') : (channelNameParam ?? 'Chat');
  const channelDisplayCategory = isDbChannel ? (channel?.category ?? 'general') : (channelCategoryParam ?? 'general');

  // Real-time message subscription (only for real DB channels)
  const handleNewMessage = useCallback((message: MessageWithAuthor) => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useRealtimeMessages(isDbChannel ? channelId : undefined, handleNewMessage);

  // Mark channel as read when opening (only for real DB channels)
  useEffect(() => {
    if (channelId && isDbChannel) {
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

      // Local channels (non-UUID IDs) — store messages in AsyncStorage
      if (!isDbChannel) {
        const newMsg: LocalMessage = {
          id: Date.now().toString(),
          content: content.trim(),
          created_at: new Date().toISOString(),
          user_id: user?.id ?? 'local',
          user_name: user?.user_metadata?.full_name ?? 'You',
        };
        const updatedMessages = [...localMessages, newMsg];
        setLocalMessages(updatedMessages);
        // Persist to AsyncStorage
        AsyncStorage.setItem(`local-messages-${channelId}`, JSON.stringify(updatedMessages)).catch(() => {});
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        return;
      }

      try {
        await sendMessageMutation.mutateAsync({
          channel_id: channelId,
          content: content.trim(),
        });

        // Scroll to bottom after sending
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error: any) {
        const msg = error?.message || '';
        const tr = getTranslation();
        if (msg.includes('infinite recursion') || msg.includes('42P17')) {
          Alert.alert(
            tr.chat.dbConfigTitle,
            tr.chat.dbConfigMessage
          );
        } else {
          Alert.alert(tr.common.error, tr.chat.sendFailed);
        }
        console.error('Failed to send message:', error);
      }
    },
    [channelId, sendMessageMutation, localMessages]
  );

  // Load more messages
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Render message item
  const renderMessage = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isOwnMessage = item.user_id === user?.id || (!isDbChannel && item.user_id === (user?.id ?? 'local'));
      const previousMessage = index > 0 ? displayMessages[index - 1] : null;

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
    [user?.id, displayMessages, isDbChannel]
  );

  const CATEGORY_COLORS: Record<string, string> = {
    general: '#8B5CF6',
    accommodation: '#3B82F6',
    activities: '#F97316',
    budget: '#10B981',
  };

  const getCategoryIcon = (category: string | undefined): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'general':       return 'chatbubbles';
      case 'activities':    return 'game-controller';
      case 'accommodation': return 'bed';
      case 'budget':        return 'cash';
      default:              return 'chatbubble';
    }
  };

  // Use the icon passed from the Topics list, fall back to category default
  const headerIcon = (channelIconParam ?? getCategoryIcon(channelDisplayCategory)) as keyof typeof Ionicons.glyphMap;
  const headerColor = CATEGORY_COLORS[channelDisplayCategory ?? 'general'] ?? '#5A7EB0';
  const headerBg = `${headerColor}26`; // 15% opacity

  // Remove full-screen loading - show UI immediately with loading states
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: DARK_THEME.background }}
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
            <Ionicons name="arrow-back" size={24} color={DARK_THEME.textPrimary} />
          </XStack>

          <YStack
            width={36}
            height={36}
            borderRadius="$md"
            backgroundColor={headerBg}
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons
              name={headerIcon}
              size={18}
              color={headerColor}
            />
          </YStack>

          <YStack flex={1}>
            <Text fontSize="$4" fontWeight="700" color="$textPrimary" numberOfLines={1}>
              {channelDisplayName}
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
            onPress={() => setInfoModalVisible(true)}
          >
            <Ionicons name="information-circle-outline" size={24} color={DARK_THEME.textSecondary} />
          </XStack>
        </XStack>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          testID="chat-messages-list"
          contentContainerStyle={{
            paddingVertical: 16,
            paddingBottom: 80, // Space for input field at bottom
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
                backgroundColor="rgba(90, 126, 176, 0.15)"
                alignItems="center"
                justifyContent="center"
                marginBottom="$3"
              >
                <Ionicons name="chatbubble-outline" size={28} color="#5A7EB0" />
              </YStack>
              <Text fontSize="$3" fontWeight="600" color="$textPrimary" marginBottom="$1">
                {t.chat.noMessages}
              </Text>
              <Text fontSize="$2" color="$textSecondary" textAlign="center">
                {t.chat.startConversation}
              </Text>
            </YStack>
          }
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
          showsVerticalScrollIndicator={false}
        />

        {/* Message Input - positioned at bottom */}
        <YStack
          paddingBottom={keyboardVisible ? 0 : 8}
          paddingHorizontal="$3"
        >
          <MessageInput
            onSend={handleSendMessage}
            isLoading={sendMessageMutation.isPending}
            placeholder={t.chat.typeMessage}
          />
        </YStack>
      </YStack>

      {/* Channel Info Modal — bottom sheet */}
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}
          onPress={() => setInfoModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: '#1E2329',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 32,
              borderTopWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            }}
            onPress={() => {}}
          >
            {/* Header row: title + close */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Channel Info</Text>
              <Pressable onPress={() => setInfoModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </Pressable>
            </View>

            {/* 1. Category — text only */}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: headerColor, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
                {channelDisplayCategory.toUpperCase()}
              </Text>
            </View>

            {/* 2. Channel name */}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name={headerIcon} size={18} color={headerColor} />
              <Text numberOfLines={2} style={{ flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                {channelDisplayName}
              </Text>
            </View>

            {/* 3. Created by */}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="person-outline" size={18} color={headerColor} />
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                {!isDbChannel
                  ? (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You')
                  : '—'}
              </Text>
            </View>

            {/* 4. Created at */}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="calendar-outline" size={18} color={headerColor} />
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                {isDbChannel && channel?.created_at
                  ? new Date(channel.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
                  : !isDbChannel && channelId
                    ? new Date(Number(channelId)).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
              </Text>
            </View>

            {/* Delete channel button */}
            <Pressable
              style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 10, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}
              onPress={handleDeleteChannel}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>Delete Channel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
