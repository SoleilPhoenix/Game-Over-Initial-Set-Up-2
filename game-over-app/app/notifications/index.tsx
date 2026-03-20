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
import { useTranslation } from '@/i18n';
import { useUrgentPayment } from '@/hooks/useUrgentPayment';
import { DARK_THEME } from '@/constants/theme';
import type { Database } from '@/lib/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // All hooks at the top — no conditional calls
  const { urgentEvents } = useUrgentPayment();

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
    console.log('New notification:', notification);
  });

  // Flatten and group DB notifications by date
  const groupedNotifications = useMemo(() => {
    if (!data?.pages) return [];

    const notifications = data.pages.flatMap((page) => page.notifications);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayNotifs = notifications.filter((n) => n.created_at && new Date(n.created_at) >= today);
    const yesterdayNotifs = notifications.filter(
      (n) => n.created_at && new Date(n.created_at) >= yesterday && new Date(n.created_at) < today
    );
    const earlierNotifs = notifications.filter((n) => n.created_at && new Date(n.created_at) < yesterday);

    const sections = [];
    if (todayNotifs.length > 0) sections.push({ title: t.notifications.today, data: todayNotifs });
    if (yesterdayNotifs.length > 0) sections.push({ title: t.notifications.yesterday, data: yesterdayNotifs });
    if (earlierNotifs.length > 0) sections.push({ title: t.notifications.earlier, data: earlierNotifs });

    return sections;
  }, [data]);

  const handleNotificationPress = useCallback((notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
  }, [markAsReadMutation]);

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <YStack paddingHorizontal="$4" paddingVertical="$3" marginLeft="$1">
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

  const renderItem = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
      testID={`notification-${item.id}`}
    />
  );

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor={DARK_THEME.background}>
        <Spinner size="large" color={DARK_THEME.primary} />
      </YStack>
    );
  }

  const hasNotifications = groupedNotifications.length > 0;
  const hasAnyContent = hasNotifications || urgentEvents.length > 0;

  return (
    <YStack flex={1} backgroundColor={DARK_THEME.background} testID="notifications-screen">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal="$4"
        paddingBottom="$2"
        alignItems="center"
        backgroundColor={DARK_THEME.glass}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          testID="back-button"
        >
          <Ionicons name="arrow-back" size={24} color={DARK_THEME.textPrimary} />
        </Pressable>
        <Text
          flex={1}
          textAlign="center"
          fontSize={18}
          fontWeight="700"
          color={DARK_THEME.textPrimary}
          letterSpacing={-0.3}
        >
          {t.notifications.title}
        </Text>
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

      {hasAnyContent ? (
        <SectionList
          sections={groupedNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            urgentEvents.length > 0 ? (
              <>
                {/* TODAY label above all urgency rows */}
                <YStack paddingHorizontal="$4" paddingTop="$3" paddingBottom="$1" marginLeft="$1">
                  <Text
                    fontSize={12}
                    fontWeight="700"
                    color={DARK_THEME.textTertiary}
                    style={{ textTransform: 'uppercase', letterSpacing: 1 }}
                  >
                    {t.notifications.today}
                  </Text>
                </YStack>

                {/* One row per urgent event, sorted soonest first */}
                {urgentEvents.map((info) => (
                  <React.Fragment key={info.event.id}>
                    <Pressable
                      style={[styles.urgencyRow, info.isPaid && styles.urgencyRowPaid]}
                      onPress={() => router.push(`/event/${info.event.id}/budget` as any)}
                    >
                      {/* Icon */}
                      <View style={[styles.urgencyIconCircle, info.isPaid && styles.urgencyIconCirclePaid]}>
                        <Ionicons
                          name={info.isPaid ? 'checkmark-circle' : 'warning'}
                          size={18}
                          color={info.isPaid ? '#34D399' : '#F97316'}
                        />
                      </View>

                      {/* Text — unpaid: status on top; paid: event name on top */}
                      <YStack flex={1} gap={2}>
                        {info.isPaid ? (
                          // Paid: event name prominent on top, status label below
                          <>
                            <Text fontSize={14} fontWeight="700" color={DARK_THEME.textPrimary} numberOfLines={1}>
                              {info.event.title || `${info.event.honoree_name}'s Party`}
                              {` · ${
                                info.daysLeft === 0
                                  ? 'today'
                                  : info.daysLeft === 1
                                  ? '1 day left'
                                  : `${info.daysLeft} days left`
                              }`}
                            </Text>
                            <Text fontSize={12} color={DARK_THEME.textSecondary}>
                              Payment Complete
                            </Text>
                          </>
                        ) : (
                          // Unpaid: status label prominent on top, event name below
                          <>
                            <Text fontSize={14} fontWeight="700" color="#F97316">
                              Payment Outstanding
                            </Text>
                            <Text fontSize={12} color={DARK_THEME.textSecondary} numberOfLines={1}>
                              {info.event.title || `${info.event.honoree_name}'s Party`}
                              {` · ${
                                info.daysLeft === 0
                                  ? 'today'
                                  : info.daysLeft === 1
                                  ? '1 day left'
                                  : `${info.daysLeft} days left`
                              }`}
                            </Text>
                          </>
                        )}
                      </YStack>

                      {/* Right indicator: green checkmark if paid, orange dot if unpaid */}
                      {info.isPaid ? (
                        <Ionicons name="checkmark-circle" size={20} color="#34D399" />
                      ) : (
                        <View style={styles.unseenDot} />
                      )}
                    </Pressable>
                    <View style={styles.rowDivider} />
                  </React.Fragment>
                ))}
              </>
            ) : null
          }
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
        /* Only show "All Caught Up" when there is truly nothing */
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
            {t.notifications.allCaughtUp}
          </Text>
          <Text fontSize={13} color={DARK_THEME.textTertiary} textAlign="center">
            {t.notifications.noNewNotifications}
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
  // Unpaid urgency row — orange tint
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(249, 115, 22, 0.07)',
  },
  // Paid urgency row — no tint, slightly dimmed
  urgencyRowPaid: {
    backgroundColor: 'transparent',
  },
  urgencyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyIconCirclePaid: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  unseenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 68,
  },
});
