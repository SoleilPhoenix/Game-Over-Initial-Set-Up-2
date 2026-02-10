/**
 * ChannelListItem Component
 * Displays a chat channel in the channel list
 */

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import type { Database } from '@/lib/supabase/types';

type ChatChannel = Database['public']['Tables']['chat_channels']['Row'];

interface ChannelListItemProps {
  channel: ChatChannel;
  onPress: () => void;
  testID?: string;
}

const getCategoryIcon = (category: ChatChannel['category']): keyof typeof Ionicons.glyphMap => {
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

const getCategoryColor = (category: ChatChannel['category']): string => {
  switch (category) {
    case 'general':
      return colors.light.primary;
    case 'activities':
      return '#47B881';
    case 'accommodation':
      return '#7B68EE';
    case 'budget':
      return '#FF8551';
    default:
      return colors.light.primary;
  }
};

export function ChannelListItem({ channel, onPress, testID }: ChannelListItemProps) {
  const hasUnread = (channel.unread_count ?? 0) > 0;
  const categoryColor = getCategoryColor(channel.category);

  const formatLastMessage = () => {
    if (!channel.last_message_at) return 'No messages yet';
    const date = new Date(channel.last_message_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <XStack alignItems="center" gap="$3" flex={1}>
        {/* Icon */}
        <YStack
          width={44}
          height={44}
          borderRadius="$lg"
          backgroundColor={`${categoryColor}15`}
          alignItems="center"
          justifyContent="center"
        >
          <Ionicons
            name={getCategoryIcon(channel.category)}
            size={22}
            color={categoryColor}
          />
        </YStack>

        {/* Content */}
        <YStack flex={1}>
          <XStack justifyContent="space-between" alignItems="center">
            <Text
              fontSize="$3"
              fontWeight={hasUnread ? '700' : '600'}
              color={hasUnread ? '$textPrimary' : '$textPrimary'}
              numberOfLines={1}
            >
              {channel.name}
            </Text>
            <Text fontSize="$1" color="$textTertiary">
              {formatLastMessage()}
            </Text>
          </XStack>
          <XStack justifyContent="space-between" alignItems="center" marginTop="$1">
            <Text
              fontSize="$2"
              color="$textSecondary"
              numberOfLines={1}
              flex={1}
              marginRight="$2"
            >
              #{channel.category}
            </Text>
            {hasUnread && (
              <YStack
                backgroundColor="$primary"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$full"
                minWidth={20}
                alignItems="center"
              >
                <Text fontSize={11} fontWeight="700" color="white">
                  {(channel.unread_count ?? 0) > 99 ? '99+' : channel.unread_count}
                </Text>
              </YStack>
            )}
          </XStack>
        </YStack>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={18} color={colors.light.textTertiary} />
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  pressed: {
    backgroundColor: colors.light.background,
  },
});
