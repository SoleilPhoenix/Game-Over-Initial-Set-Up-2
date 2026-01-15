/**
 * Notifications Screen (Phase 8)
 * Displays grouped notifications with real-time updates
 * Matches the dark theme design from UI specifications
 */

import React, { useCallback, useMemo } from 'react';
import { RefreshControl, Pressable, StyleSheet, SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useRealtimeNotifications,
  useUnreadNotificationsCount,
} from '@/hooks/queries/useNotifications';
import { NotificationItem } from '@/components/notifications';
import type { Database } from '@/lib/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];

// Dark theme colors
const DARK_THEME = {
  backgroundDark: '#2D3748',
  surfaceDark: 'rgba(45, 55, 72, 0.95)',
  primary: '#4A6FA5',
  border: 'rgba(255, 255, 255, 0.05)',
  textPrimary: '#FFFFFF',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Fetch notifications
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useNotifications();

  // Unread count
  const { data: unreadCount } = useUnreadNotificationsCount();

  // Mutations
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  // Subscribe to real-time notifications
  useRealtimeNotifications((notification) => {
    // Could show a toast here
    console.log('New notification:', notification);
  });

  // Flatten and group notifications
  const groupedNotifications = useMemo(() => {
    if (!data?.pages) return [];

    const notifications = data.pages.flatMap((page) => page.notifications);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayNotifs = notifications.filter((n) => new Date(n.created_at) >= today);
    const yesterdayNotifs = notifications.filter(
      (n) => new Date(n.created_at) >= yesterday && new Date(n.created_at) < today
    );
    const earlierNotifs = notifications.filter((n) => new Date(n.created_at) < yesterday);

    const sections = [];
    if (todayNotifs.length > 0) {
      sections.push({ title: 'Today', data: todayNotifs });
    }
    if (yesterdayNotifs.length > 0) {
      sections.push({ title: 'Yesterday', data: yesterdayNotifs });
    }
    if (earlierNotifs.length > 0) {
      sections.push({ title: 'Earlier', data: earlierNotifs });
    }

    return sections;
  }, [data]);

  // Handle notification press
  const handleNotificationPress = useCallback((notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
  }, [markAsReadMutation]);

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Render section header
  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <YStack
      paddingHorizontal="$4"
      paddingVertical="$3"
      marginLeft="$1"
    >
      <Text
        fontSize={12}
        fontWeight="700"
        color={DARK_THEME.textTertiary}
        textTransform="uppercase"
        letterSpacing={1}
      >
        {section.title}
      </Text>
    </YStack>
  );

  // Render notification item
  const renderItem = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
      testID={`notification-${item.id}`}
    />
  );

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor={DARK_THEME.backgroundDark}>
        <Spinner size="large" color={DARK_THEME.primary} />
      </YStack>
    );
  }

  const hasNotifications = groupedNotifications.length > 0;

  return (
    <YStack flex={1} backgroundColor={DARK_THEME.backgroundDark} testID="notifications-screen">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal="$4"
        paddingBottom="$2"
        alignItems="center"
        backgroundColor={DARK_THEME.surfaceDark}
      >
        {/* Back button */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          testID="back-button"
        >
          <Ionicons name="arrow-back" size={24} color={DARK_THEME.textPrimary} />
        </Pressable>

        {/* Title */}
        <Text
          flex={1}
          textAlign="center"
          fontSize={18}
          fontWeight="700"
          color={DARK_THEME.textPrimary}
          letterSpacing={-0.3}
        >
          Notifications
        </Text>

        {/* Mark all as read */}
        <Pressable
          style={styles.markAllButton}
          onPress={handleMarkAllAsRead}
          disabled={markAllAsReadMutation.isPending || !hasNotifications || !unreadCount}
        >
          <Ionicons
            name="checkmark-done"
            size={24}
            color={unreadCount && unreadCount > 0 ? DARK_THEME.textPrimary : DARK_THEME.textTertiary}
          />
        </Pressable>
      </XStack>

      {/* Notifications List */}
      {hasNotifications ? (
        <SectionList
          sections={groupedNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={DARK_THEME.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <YStack padding="$4" alignItems="center">
                <Spinner size="small" color={DARK_THEME.primary} />
              </YStack>
            ) : (
              <YStack height={100} />
            )
          }
        />
      ) : (
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$8">
          <YStack
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor="rgba(52, 211, 153, 0.1)"
            alignItems="center"
            justifyContent="center"
            marginBottom="$4"
            style={{ shadowColor: 'rgba(52, 211, 153, 0.15)', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 15 }}
          >
            <Ionicons name="checkmark-done" size={40} color="#34D399" />
          </YStack>
          <Text fontSize={16} fontWeight="600" color={DARK_THEME.textPrimary} marginBottom="$2">
            All Caught Up!
          </Text>
          <Text fontSize={13} color={DARK_THEME.textTertiary} textAlign="center">
            You have no new notifications
          </Text>
        </YStack>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  markAllButton: {
    width: 48,
    height: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderRadius: 24,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },
});
