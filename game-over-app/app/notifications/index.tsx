/**
 * Notifications Screen (Phase 8)
 * Displays grouped notifications with real-time updates
 * Matches the dark theme design from UI specifications
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Alert, RefreshControl, Pressable, StyleSheet, SectionList, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
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
import { useParticipants, participantKeys } from '@/hooks/queries/useParticipants';
import { useUser } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Notification = Database['public']['Tables']['notifications']['Row'];

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const user = useUser();
  const queryClient = useQueryClient();
  const [guestPayConfirming, setGuestPayConfirming] = useState(false);
  const [guestPayConfirmed, setGuestPayConfirmed] = useState(false);

  // All hooks at the top — no conditional calls
  const { urgentEvents, guestUrgentEvent, guestPaidRecentEvent, isGuestContribution } = useUrgentPayment();

  // isOrganizer: true only if user created the guest-relevant event.
  // Check guestUrgentEvent first; fall back to guestPaidRecentEvent (shown after payment).
  // Never default to true — that would hide the "Contribution Confirmed" card.
  const relevantGuestEvent = guestUrgentEvent ?? guestPaidRecentEvent;
  const isOrganizer = relevantGuestEvent ? relevantGuestEvent.created_by === user?.id : false;

  // Persist "payment confirmed" in AsyncStorage so the card survives navigation.
  const GUEST_PAID_KEY = user?.id ? `gameover:guest_paid_confirmed:${user.id}` : null;
  useEffect(() => {
    if (!GUEST_PAID_KEY) return;
    AsyncStorage.getItem(GUEST_PAID_KEY).then(val => {
      if (val === '1') setGuestPayConfirmed(true);
    }).catch(() => {});
  }, [GUEST_PAID_KEY]);

  // Load participants for the guest's urgent event (to show organizer name)
  const { data: guestEventParticipants } = useParticipants(guestUrgentEvent?.id);
  const organizerName = guestEventParticipants?.find(p => p.role === 'organizer')?.profile?.full_name ?? 'the organizer';

  const handleGuestMarkAsPaid = () => {
    Alert.alert(
      t.notifications.confirmPayment,
      t.notifications.confirmPaymentMsg.replace('{{name}}', organizerName),
      [
        { text: t.notifications.notYet, style: 'cancel' },
        {
          text: t.notifications.yesPaid,
          onPress: async () => {
            if (!guestUrgentEvent?.id || !user?.id) return;
            setGuestPayConfirming(true);
            try {
              const { error: updateError } = await supabase
                .from('event_participants')
                .update({ payment_status: 'paid' })
                .eq('event_id', guestUrgentEvent.id)
                .eq('user_id', user.id);
              if (updateError) throw updateError;
              void supabase.from('notifications').insert({
                event_id: guestUrgentEvent.id,
                title: 'Payment Confirmed',
                body: `A guest has confirmed their payment for ${guestUrgentEvent.title || `${guestUrgentEvent.honoree_name}'s event`}.`,
                type: 'payment_confirmed',
                user_id: user.id,
              });
              queryClient.invalidateQueries({ queryKey: participantKeys.byEvent(guestUrgentEvent.id) });
              queryClient.invalidateQueries({ queryKey: ['guestParticipations', user?.id] });
              setGuestPayConfirmed(true);
              if (GUEST_PAID_KEY) AsyncStorage.setItem(GUEST_PAID_KEY, '1').catch(() => {});
            } catch (e: any) {
              Alert.alert(t.common.error, e.message || t.notifications.errorConfirmPayment);
            } finally {
              setGuestPayConfirming(false);
            }
          },
        },
      ]
    );
  };

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
  const organizerUrgentEvents = urgentEvents.filter(info => info.event.created_by === user?.id);
  const hasAnyContent = hasNotifications || organizerUrgentEvents.length > 0 || isGuestContribution || !!guestPaidRecentEvent || guestPayConfirmed;

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
            (organizerUrgentEvents.length > 0 || (isGuestContribution && !isOrganizer) || ((!!guestPaidRecentEvent || guestPayConfirmed) && !isOrganizer)) ? (
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

                {/* Guest: payment confirmed card (shown after marking as paid — persists via AsyncStorage) */}
                {!isGuestContribution && !isOrganizer && (guestPaidRecentEvent || guestPayConfirmed) && (
                  <View style={[styles.guestPayCard, { borderColor: 'rgba(52, 211, 153, 0.25)', backgroundColor: 'rgba(52, 211, 153, 0.07)' }]}>
                    <XStack alignItems="center" gap={12}>
                      <View style={[styles.urgencyIconCircle, { backgroundColor: 'rgba(52, 211, 153, 0.18)' }]}>
                        <Ionicons name="checkmark-circle" size={18} color="#34D399" />
                      </View>
                      <YStack flex={1}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#34D399' }}>
                          Contribution Confirmed
                        </Text>
                        <Text style={{ fontSize: 12, color: DARK_THEME.textSecondary }} numberOfLines={1}>
                          {guestPaidRecentEvent?.title || (guestPaidRecentEvent?.honoree_name ? `${guestPaidRecentEvent.honoree_name}'s Event` : 'Your Event')}
                        </Text>
                      </YStack>
                      <Ionicons name="checkmark-circle" size={20} color="#34D399" />
                    </XStack>
                    <Text style={{ fontSize: 13, color: DARK_THEME.textSecondary, lineHeight: 20, marginTop: 10 }}>
                      Your payment has been confirmed. The organizer has been notified.
                    </Text>
                  </View>
                )}

                {/* Guest: contribution due + "I've Paid" button */}
                {isGuestContribution && !isOrganizer && guestUrgentEvent && (
                  <View style={styles.guestPayCard}>
                    <XStack alignItems="center" gap={12} marginBottom={10}>
                      <View style={[styles.urgencyIconCircle, { backgroundColor: 'rgba(249, 115, 22, 0.18)' }]}>
                        <Ionicons name="wallet-outline" size={18} color="#F97316" />
                      </View>
                      <YStack flex={1}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#F97316' }}>
                          Contribution Due
                        </Text>
                        <Text style={{ fontSize: 12, color: DARK_THEME.textSecondary }} numberOfLines={1}>
                          {guestUrgentEvent.title || `${guestUrgentEvent.honoree_name}'s Event`}
                        </Text>
                      </YStack>
                      <View style={styles.urgencyBadge}>
                        <Text style={styles.urgencyBadgeText}>URGENT</Text>
                      </View>
                    </XStack>
                    <Text style={{ fontSize: 13, color: DARK_THEME.textSecondary, lineHeight: 20, marginBottom: 12 }}>
                      Please transfer your share to{' '}
                      <Text style={{ color: DARK_THEME.textPrimary, fontWeight: '600' }}>{organizerName}</Text>.
                      {' '}Payment is due 14 days before the event.
                    </Text>
                    {guestPayConfirmed ? (
                      <XStack alignItems="center" gap={8} justifyContent="center">
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#10B981' }}>
                          Payment confirmed — organizer notified
                        </Text>
                      </XStack>
                    ) : (
                      <Pressable
                        style={[styles.guestPayButton, guestPayConfirming && { opacity: 0.6 }]}
                        onPress={handleGuestMarkAsPaid}
                        disabled={guestPayConfirming}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
                          {guestPayConfirming ? 'Confirming…' : "I've Paid — Confirm"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* One row per urgent event (organizer-owned only), sorted soonest first */}
                {organizerUrgentEvents.map((info) => (
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
  guestPayCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(249, 115, 22, 0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    padding: 16,
  },
  guestPayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DARK_THEME.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  urgencyBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#F97316',
    letterSpacing: 0.5,
  },
});
