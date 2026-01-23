/**
 * Chat Screen
 * Shows user's events with their chat channels
 */

import React, { useState, useMemo } from 'react';
import { FlatList, RefreshControl, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/hooks/queries/useEvents';
import { useChannels } from '@/hooks/queries/useChat';
import { ChannelListItem } from '@/components/chat';
import { colors } from '@/constants/colors';
import type { Database } from '@/lib/supabase/types';

type Event = Database['public']['Tables']['events']['Row'] & {
  city?: { name: string } | null;
};

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Fetch user's events
  const {
    data: events,
    isLoading: eventsLoading,
    refetch: refetchEvents,
    isRefetching,
  } = useEvents();

  // Fetch channels for selected event
  const {
    data: channels,
    isLoading: channelsLoading,
  } = useChannels(selectedEventId || undefined);

  // Filter to only show events with status that would have chat
  const activeEvents = useMemo(() => {
    return (events || []).filter(
      (e: Event) => e.status !== 'draft' && e.status !== 'cancelled'
    );
  }, [events]);

  // Auto-select first event if none selected
  React.useEffect(() => {
    if (!selectedEventId && activeEvents.length > 0) {
      setSelectedEventId(activeEvents[0].id);
    }
  }, [activeEvents, selectedEventId]);

  const selectedEvent = activeEvents.find((e: Event) => e.id === selectedEventId);

  const handleChannelPress = (channelId: string) => {
    router.push(`/(tabs)/chat/${channelId}`);
  };

  const handleRefresh = () => {
    refetchEvents();
  };

  // Empty state - no events
  if (!eventsLoading && activeEvents.length === 0) {
    return (
      <YStack flex={1} backgroundColor="$background" testID="chat-screen">
        <YStack
          paddingTop={insets.top + 8}
          paddingHorizontal="$4"
          paddingBottom="$3"
          backgroundColor="$surface"
        >
          <Text fontSize="$6" fontWeight="700" color="$textPrimary">
            Chat
          </Text>
        </YStack>
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
          <YStack
            width={80}
            height={80}
            borderRadius="$full"
            backgroundColor="rgba(37, 140, 244, 0.1)"
            alignItems="center"
            justifyContent="center"
            marginBottom="$4"
          >
            <Ionicons name="chatbubbles-outline" size={40} color={colors.light.primary} />
          </YStack>
          <Text fontSize="$5" fontWeight="700" color="$textPrimary" textAlign="center" marginBottom="$2">
            No Chats Yet
          </Text>
          <Text fontSize="$3" color="$textSecondary" textAlign="center" marginBottom="$4">
            Create an event to start chatting with your group
          </Text>
          <Pressable
            style={styles.createButton}
            onPress={() => router.push('/create-event')}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text color="white" fontWeight="600">
              Create Event
            </Text>
          </Pressable>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" testID="chat-screen">
      {/* Header */}
      <YStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$4"
        paddingBottom="$3"
        backgroundColor="$surface"
      >
        <Text fontSize="$6" fontWeight="700" color="$textPrimary">
          Chat
        </Text>
      </YStack>

      {/* Event Selector */}
      {activeEvents.length > 1 && (
        <YStack
          backgroundColor="$surface"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <FlatList
            horizontal
            data={activeEvents}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventSelector}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.eventChip,
                  item.id === selectedEventId && styles.eventChipSelected,
                ]}
                onPress={() => setSelectedEventId(item.id)}
              >
                <Text
                  fontSize="$2"
                  fontWeight="600"
                  color={item.id === selectedEventId ? 'white' : '$textPrimary'}
                >
                  {item.title || `${item.honoree_name}'s Party`}
                </Text>
              </Pressable>
            )}
          />
        </YStack>
      )}

      {/* Selected Event Header */}
      {selectedEvent && (
        <XStack
          padding="$3"
          backgroundColor="rgba(37, 140, 244, 0.05)"
          alignItems="center"
          gap="$2"
        >
          <Ionicons name="calendar-outline" size={16} color={colors.light.primary} />
          <Text fontSize="$2" color="$primary" fontWeight="500" flex={1}>
            {selectedEvent.title || `${selectedEvent.honoree_name}'s Party`}
          </Text>
          {selectedEvent.city && (
            <Text fontSize="$2" color="$textSecondary">
              {selectedEvent.city.name}
            </Text>
          )}
        </XStack>
      )}

      {/* Channel List */}
      {channelsLoading || eventsLoading ? (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="$primary" />
        </YStack>
      ) : channels && channels.length > 0 ? (
        <FlatList
          data={channels}
          keyExtractor={(item) => item.id}
          testID="channel-list"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              colors={[colors.light.primary]}
              tintColor={colors.light.primary}
            />
          }
          renderItem={({ item, index }) => (
            <ChannelListItem
              channel={item}
              onPress={() => handleChannelPress(item.id)}
              testID={`channel-item-${index}`}
            />
          )}
          ListHeaderComponent={
            <YStack padding="$3" paddingBottom="$2">
              <Text fontSize="$2" fontWeight="600" color="$textSecondary">
                CHANNELS
              </Text>
            </YStack>
          }
        />
      ) : (
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
          <Ionicons name="chatbubble-outline" size={48} color={colors.light.textTertiary} />
          <Text fontSize="$3" color="$textSecondary" textAlign="center" marginTop="$3">
            No channels yet for this event
          </Text>
        </YStack>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  eventSelector: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  eventChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginRight: 8,
  },
  eventChipSelected: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
});
