/**
 * NotificationItem Component
 * Displays a single notification with glassmorphic styling
 * Matches the dark theme design from UI specifications
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Database } from '@/lib/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];

// Dark theme colors
const DARK_THEME = {
  backgroundDark: '#15181D',
  secondary: '#2D3748',
  glassCard: 'rgba(45, 55, 72, 0.7)',
  glassOverlay: 'rgba(255, 255, 255, 0.05)',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
};

// Notification type configuration with colors
const NOTIFICATION_CONFIG: Record<
  string,
  {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
    glowColor?: string;
    hasAction?: boolean;
    actionLabel?: string;
    warningBorder?: boolean;
  }
> = {
  // Relationship/Health notifications
  relationship_health: {
    icon: 'heart',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.2)',
    glowColor: 'rgba(236, 72, 153, 0.3)',
    hasAction: true,
    actionLabel: 'View Insights',
  },

  // Conflict/Warning notifications
  conflict_detected: {
    icon: 'warning',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.2)',
    hasAction: true,
    actionLabel: 'Resolve in Voting Tab',
    warningBorder: true,
  },

  // Budget notifications
  budget_update: {
    icon: 'cash',
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.2)',
  },
  payment_received: {
    icon: 'cash',
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.2)',
  },
  payment_failed: {
    icon: 'card',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.2)',
    warningBorder: true,
  },
  payment_reminder: {
    icon: 'card-outline',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.2)',
    hasAction: true,
    actionLabel: 'Pay Now',
  },

  // Booking notifications
  booking_confirmed: {
    icon: 'checkmark-circle',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.2)',
  },
  booking_cancelled: {
    icon: 'close-circle',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.2)',
  },
  booking_reminder: {
    icon: 'alarm',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.2)',
  },

  // Feedback notifications
  feedback_received: {
    icon: 'chatbox-ellipses',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.2)',
  },

  // Poll notifications
  poll_created: {
    icon: 'bar-chart',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.2)',
    hasAction: true,
    actionLabel: 'Vote Now',
  },
  poll_closing: {
    icon: 'time',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.2)',
    hasAction: true,
    actionLabel: 'Vote Now',
  },
  poll_closed: {
    icon: 'checkmark-done',
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.2)',
    hasAction: true,
    actionLabel: 'View Results',
  },
  poll_vote: {
    icon: 'hand-left',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.2)',
  },

  // Chat notifications
  new_message: {
    icon: 'chatbubble',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.2)',
  },
  mention: {
    icon: 'at',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.2)',
  },

  // Event notifications
  event_update: {
    icon: 'calendar',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.2)',
    hasAction: true,
    actionLabel: 'View Event',
  },
  event_cancelled: {
    icon: 'calendar-outline',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.2)',
    warningBorder: true,
  },
  invite_accepted: {
    icon: 'person-add',
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.2)',
  },
  new_participant: {
    icon: 'people',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.2)',
  },

  // Default
  default: {
    icon: 'notifications',
    color: '#9CA3AF',
    bgColor: 'rgba(156, 163, 175, 0.2)',
  },
};

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  testID?: string;
}

export function NotificationItem({
  notification,
  onPress,
  testID,
}: NotificationItemProps) {
  const router = useRouter();
  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.default;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    // Navigate to action URL if available
    if (notification.action_url) {
      router.push(notification.action_url as any);
    }
  };

  const handleActionPress = () => {
    if (notification.action_url) {
      router.push(notification.action_url as any);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        config.warningBorder && styles.warningBorder,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      testID={testID}
    >
      {/* Glass overlay */}
      <View style={styles.glassOverlay} />

      <XStack gap="$4" flex={1}>
        {/* Icon */}
        <YStack
          width={48}
          height={48}
          borderRadius={24}
          backgroundColor={config.bgColor}
          alignItems="center"
          justifyContent="center"
          style={config.glowColor ? { shadowColor: config.glowColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 15 } : undefined}
        >
          <Ionicons name={config.icon} size={24} color={config.color} />
        </YStack>

        {/* Content */}
        <YStack flex={1} gap="$1">
          <XStack justifyContent="space-between" alignItems="flex-start">
            <Text
              fontSize={14}
              fontWeight="600"
              color={DARK_THEME.textPrimary}
              numberOfLines={1}
              flex={1}
              marginRight="$2"
            >
              {notification.title}
            </Text>
            <Text fontSize={10} color={DARK_THEME.textTertiary} fontWeight="500">
              {notification.created_at && formatTime(notification.created_at)}
            </Text>
          </XStack>

          {notification.body && (
            <Text
              fontSize={12}
              color={DARK_THEME.textSecondary}
              numberOfLines={2}
              lineHeight={18}
            >
              {notification.body}
            </Text>
          )}

          {/* Action button or link */}
          {config.hasAction && (
            <Pressable
              onPress={handleActionPress}
              style={({ pressed }) => [
                config.warningBorder ? styles.actionButton : styles.actionLink,
                pressed && styles.actionPressed,
              ]}
            >
              {config.warningBorder ? (
                <XStack alignItems="center" gap="$2" flex={1}>
                  <Ionicons name="hand-left" size={16} color={config.color} />
                  <Text fontSize={11} fontWeight="600" color={`${config.color}EE`} flex={1}>
                    {config.actionLabel}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={config.color} />
                </XStack>
              ) : (
                <XStack alignItems="center" gap="$1">
                  <Text fontSize={10} fontWeight="700" color={config.color} textTransform="uppercase" letterSpacing={0.5}>
                    {config.actionLabel}
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={config.color} />
                </XStack>
              )}
            </Pressable>
          )}
        </YStack>
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: DARK_THEME.glassCard,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: DARK_THEME.glassOverlay,
  },
  warningBorder: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionButton: {
    marginTop: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionLink: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPressed: {
    opacity: 0.7,
  },
});
