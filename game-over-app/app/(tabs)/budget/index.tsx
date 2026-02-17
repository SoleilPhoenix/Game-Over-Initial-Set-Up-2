/**
 * Budget Dashboard Screen (Phase 9)
 * Budget tracking, contributions, and payment status
 * Matches the dark theme glassmorphic design from UI specifications
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Animated, ScrollView, RefreshControl, Pressable, StyleSheet, Alert, View, Image, FlatList, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/hooks/queries/useEvents';
import { useBooking } from '@/hooks/queries/useBookings';
import { useParticipants } from '@/hooks/queries/useParticipants';
import { useUser } from '@/stores/authStore';
import { DARK_THEME } from '@/constants/theme';
import { useTranslation, getTranslation } from '@/i18n';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import type { Database } from '@/lib/supabase/types';

type Event = Database['public']['Tables']['events']['Row'] & {
  city?: { name: string } | null;
};

// Avatar colors for participant initials
const AVATAR_COLORS = [
  'rgba(139, 92, 246, 0.2)', // purple
  'rgba(20, 184, 166, 0.2)', // teal
  'rgba(236, 72, 153, 0.2)', // pink
  'rgba(59, 130, 246, 0.2)', // blue
  'rgba(249, 115, 22, 0.2)', // orange
];

type BudgetCategory = 'total' | 'collected' | 'pending';

export default function BudgetDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory>('total');
  const { t } = useTranslation();
  const BUDGET_TABS = ['total', 'collected', 'pending'] as const;
  const { handlers: swipeHandlers, animatedStyle: swipeAnimStyle, switchTab: switchCategoryAnimated } = useSwipeTabs(BUDGET_TABS, selectedCategory, setSelectedCategory);

  // Fetch user's events
  const {
    data: events,
    isLoading: eventsLoading,
    refetch: refetchEvents,
    isRefetching,
  } = useEvents();

  // Filter booked events
  const bookedEvents = useMemo(() => {
    return (events || []).filter((e: Event) => e.status === 'booked' || e.status === 'completed');
  }, [events]);

  // Check if we have booked events FIRST (before any other queries)
  const hasBookedEvents = bookedEvents.length > 0;

  // Get user avatar or initials (needed for both states)
  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  // Define handlers before early return
  const handleRefresh = useCallback(() => {
    refetchEvents();
  }, [refetchEvents]);

  const handleNotifications = () => {
    router.push('/notifications');
  };

  // Auto-select first booked event
  React.useEffect(() => {
    if (!selectedEventId && hasBookedEvents) {
      setSelectedEventId(bookedEvents[0].id);
    }
  }, [bookedEvents, selectedEventId, hasBookedEvents]);

  // ONLY fetch booking if we have booked events (prevent unnecessary queries)
  const { data: booking, isLoading: bookingLoading } = useBooking(
    hasBookedEvents ? (selectedEventId || undefined) : undefined
  );

  // ONLY fetch participants if we have booked events
  const { data: participants, isLoading: participantsLoading } = useParticipants(
    hasBookedEvents ? (selectedEventId || undefined) : undefined
  );

  const selectedEvent = bookedEvents.find((e: Event) => e.id === selectedEventId);

  // Calculate budget stats
  const budgetStats = useMemo(() => {
    if (!booking || !participants) {
      return {
        totalBudget: 0,
        collected: 0,
        pending: 0,
        percentage: 0,
        paidCount: 0,
        pendingCount: 0,
      };
    }

    const totalBudget = booking.total_amount_cents || 0;
    let collected = 0;
    let paidCount = 0;
    let pendingCount = 0;

    participants.forEach((p) => {
      if (p.payment_status === 'paid') {
        collected += p.contribution_amount_cents || 0;
        paidCount++;
      } else if (p.payment_status === 'pending') {
        pendingCount++;
      }
    });

    return {
      totalBudget,
      collected,
      pending: totalBudget - collected,
      percentage: totalBudget > 0 ? Math.round((collected / totalBudget) * 100) : 0,
      paidCount,
      pendingCount,
    };
  }, [booking, participants]);

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Handle remind all
  const handleRemindAll = useCallback(() => {
    const tr = getTranslation();
    Alert.alert(
      tr.budget.sendRemindersTitle,
      tr.budget.sendRemindersMessage.replace('{{count}}', String(budgetStats.pendingCount)),
      [
        { text: tr.common.cancel, style: 'cancel' },
        {
          text: tr.budget.send,
          onPress: () => {
            Alert.alert(tr.budget.success, tr.budget.remindersSent);
          },
        },
      ]
    );
  }, [budgetStats.pendingCount]);

  // Only show loading for booking/participants data when we have events
  const isLoading = hasBookedEvents && (bookingLoading || participantsLoading);

  // Render category tabs
  const renderCategoryTabs = () => (
    <View style={styles.filterContainer}>
      <View style={styles.filterPill}>
        {(['total', 'collected', 'pending'] as BudgetCategory[]).map((category) => (
          <Pressable
            key={category}
            onPress={() => switchCategoryAnimated(category)}
            style={[
              styles.filterTab,
              selectedCategory === category && styles.filterTabActive,
            ]}
            testID={`filter-tab-${category}`}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedCategory === category && styles.filterTabTextActive,
              ]}
            >
              {category === 'total' ? t.budget.filterTotal : category === 'collected' ? t.budget.filterCollected : t.budget.filterPending}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // Empty state - show if no booked events OR still loading (prevents flash of $0 budget UI)
  if (eventsLoading || !hasBookedEvents) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={[DARK_THEME.deepNavy, DARK_THEME.background]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={20}>
            <XStack alignItems="center" gap={12}>
              <View style={styles.avatarContainer}>
                {userAvatar ? (
                  <Image source={{ uri: userAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{userInitial}</Text>
                  </View>
                )}
                <View style={styles.onlineIndicator} />
              </View>
              <Text style={styles.headerTitle}>Budget</Text>
            </XStack>
            <Pressable
              onPress={handleNotifications}
              style={styles.notificationButton}
              testID="notifications-button"
            >
              <Ionicons name="notifications-outline" size={24} color={DARK_THEME.textPrimary} />
            </Pressable>
          </XStack>
          {renderCategoryTabs()}
        </View>
        <FlatList
          data={[]}
          renderItem={null}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            paddingBottom: insets.bottom + 180,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={DARK_THEME.primary}
              colors={[DARK_THEME.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <YStack justifyContent="center" alignItems="center">
              <View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={[`${DARK_THEME.primary}30`, `${DARK_THEME.primary}10`]}
                  style={styles.emptyIconGradient}
                >
                  <Text fontSize={56}>💰</Text>
                </LinearGradient>
              </View>
              <Text fontSize={24} fontWeight="800" color={DARK_THEME.textPrimary} marginBottom={8} textAlign="center">
                {t.budget.noBudgetTitle}
              </Text>
              <Text
                fontSize={16}
                color={DARK_THEME.textTertiary}
                textAlign="center"
                maxWidth={240}
                lineHeight={24}
              >
                {t.budget.noBudgetSubtitle}
              </Text>
            </YStack>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background */}
      <LinearGradient
        colors={[DARK_THEME.deepNavy, DARK_THEME.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={20}>
          {/* Avatar and Title */}
          <XStack alignItems="center" gap={12}>
            <View style={styles.avatarContainer}>
              {userAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{userInitial}</Text>
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </View>
            <Text style={styles.headerTitle}>Budget</Text>
          </XStack>

          {/* Notification Bell */}
          <Pressable
            onPress={handleNotifications}
            style={styles.notificationButton}
            testID="notifications-button"
          >
            <Ionicons name="notifications-outline" size={24} color={DARK_THEME.textPrimary} />
          </Pressable>
        </XStack>

        {/* Category Tabs */}
        {renderCategoryTabs()}
      </View>

      <Animated.View style={[{ flex: 1 }, swipeAnimStyle]} {...swipeHandlers}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={DARK_THEME.primary}
          />
        }
      >
        {isLoading ? (
          <YStack flex={1} justifyContent="center" alignItems="center" padding="$8">
            <Spinner size="large" color={DARK_THEME.primary} />
          </YStack>
        ) : (
          <>
            {/* Total Budget Card */}
            <View style={styles.glassCard}>
              {/* Gradient blur effect */}
              <View style={styles.gradientBlur} />

              <YStack gap="$2" style={{ position: 'relative', zIndex: 1 }}>
                <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$1">
                  <Text fontSize={14} fontWeight="500" color={DARK_THEME.textTertiary} letterSpacing={0.5}>
                    {t.budget.totalBudget}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{t.budget.onTrack}</Text>
                  </View>
                </XStack>

                <XStack alignItems="baseline" gap="$2" marginBottom="$4">
                  <Text fontSize={36} fontWeight="700" color={DARK_THEME.textPrimary} letterSpacing={-1}>
                    {formatCurrency(budgetStats.collected)}
                  </Text>
                  <Text fontSize={14} fontWeight="500" color={DARK_THEME.textTertiary}>
                    {t.budget.ofAmount.replace('{{amount}}', formatCurrency(budgetStats.totalBudget))}
                  </Text>
                </XStack>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View
                    style={[styles.progressBar, { width: `${budgetStats.percentage}%`, backgroundColor: DARK_THEME.primary }]}
                  />
                </View>

                {/* Stats Row */}
                <XStack
                  justifyContent="space-between"
                  alignItems="center"
                  paddingTop="$3"
                  marginTop="$1"
                  borderTopWidth={1}
                  borderTopColor={DARK_THEME.borderLight}
                >
                  <XStack alignItems="center" gap="$1.5">
                    <View style={styles.statDot} />
                    <Text fontSize={12} fontWeight="500" color={DARK_THEME.textSecondary}>
                      {t.budget.spent} ({budgetStats.percentage}%)
                    </Text>
                  </XStack>
                  <Text fontSize={12} fontWeight="500" color={DARK_THEME.textTertiary}>
                    {formatCurrency(budgetStats.pending)} {t.budget.remaining}
                  </Text>
                </XStack>
              </YStack>
            </View>

            {/* Group Contributions */}
            <YStack marginBottom="$4">
              <XStack justifyContent="space-between" alignItems="center" marginBottom="$3" paddingHorizontal="$1">
                <Text fontSize={12} fontWeight="700" color={DARK_THEME.textTertiary} textTransform="uppercase" letterSpacing={0.8}>
                  {t.budget.groupContributions}
                </Text>
                {budgetStats.pendingCount > 0 && (
                  <Pressable onPress={handleRemindAll}>
                    <Text fontSize={12} fontWeight="500" color={DARK_THEME.primary}>
                      {t.budget.remindAll}
                    </Text>
                  </Pressable>
                )}
              </XStack>

              <View style={styles.glassCard}>
                {participants?.map((participant, index) => {
                  const isPaid = participant.payment_status === 'paid';
                  const isPending = participant.payment_status === 'pending';
                  const perPerson = booking?.per_person_cents || 0;
                  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                  const initials = (participant.profile?.full_name || 'U')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  const isCurrentUser = index === 0; // Simplified - would check actual user

                  return (
                    <Pressable
                      key={participant.id}
                      style={[
                        styles.contributionRow,
                        index !== (participants?.length || 0) - 1 && styles.contributionRowBorder,
                      ]}
                    >
                      <XStack alignItems="center" gap="$3" flex={1}>
                        {/* Avatar */}
                        {participant.profile?.avatar_url ? (
                          <View style={styles.participantAvatarGradient}>
                            <Image
                              source={{ uri: participant.profile.avatar_url }}
                              style={styles.participantAvatar}
                            />
                          </View>
                        ) : (
                          <View style={[styles.participantAvatarInitials, { backgroundColor: avatarColor }]}>
                            <Text style={styles.participantInitialsText}>{initials}</Text>
                          </View>
                        )}

                        {/* Info */}
                        <YStack>
                          <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                            {participant.profile?.full_name || 'Unknown'}
                            {isCurrentUser && ` (${t.budget.you})`}
                          </Text>
                          <Text fontSize={12} color={DARK_THEME.textTertiary}>
                            {isPending
                              ? `${formatCurrency(perPerson - (participant.contribution_amount_cents || 0))} ${t.budget.remaining}`
                              : `${formatCurrency(perPerson)} ${t.budget.contribution}`
                            }
                          </Text>
                        </YStack>
                      </XStack>

                      {/* Status Badge */}
                      <View style={[
                        styles.paymentBadge,
                        isPaid && styles.paidBadge,
                        isPending && styles.pendingBadge,
                      ]}>
                        <Ionicons
                          name={isPaid ? 'checkmark' : 'time-outline'}
                          size={12}
                          color={isPaid ? DARK_THEME.success : DARK_THEME.warning}
                        />
                        <Text style={[
                          styles.paymentBadgeText,
                          { color: isPaid ? DARK_THEME.success : DARK_THEME.warning }
                        ]}>
                          {isPaid ? t.budget.paid : t.budget.pending}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </YStack>

            {/* Hidden Cost Alerts */}
            <YStack marginBottom="$4">
              <Text
                fontSize={12}
                fontWeight="700"
                color={DARK_THEME.textTertiary}
                textTransform="uppercase"
                letterSpacing={0.8}
                marginBottom="$3"
                marginLeft="$1"
              >
                {t.budget.hiddenCostAlerts}
              </Text>
              <View style={[styles.glassCard, styles.emptyStateCard]}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="shield-checkmark" size={24} color="rgba(52, 211, 153, 0.8)" />
                </View>
                <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary} marginBottom="$1">
                  {t.budget.noHiddenCosts}
                </Text>
                <Text fontSize={12} color={DARK_THEME.textTertiary} textAlign="center" maxWidth={220} lineHeight={18}>
                  {t.budget.noHiddenCostsDesc}
                </Text>
              </View>
            </YStack>

            {/* Refund Tracking */}
            <YStack marginBottom="$6">
              <Text
                fontSize={12}
                fontWeight="700"
                color={DARK_THEME.textTertiary}
                textTransform="uppercase"
                letterSpacing={0.8}
                marginBottom="$3"
                marginLeft="$1"
              >
                {t.budget.refundTracking}
              </Text>
              <View style={styles.glassCard}>
                {/* Example refund items */}
                <Pressable style={[styles.refundRow, styles.contributionRowBorder]}>
                  <XStack alignItems="center" gap="$3" flex={1}>
                    <View style={styles.refundIcon}>
                      <Ionicons name="home-outline" size={18} color={DARK_THEME.textSecondary} />
                    </View>
                    <YStack>
                      <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                        {t.budget.airbnbDeposit}
                      </Text>
                      <Text fontSize={12} color={DARK_THEME.textTertiary}>
                        {t.budget.securityHold}
                      </Text>
                    </YStack>
                  </XStack>
                  <YStack alignItems="flex-end">
                    <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                      +$500.00
                    </Text>
                    <View style={styles.processingBadge}>
                      <Text style={styles.processingText}>{t.budget.processing}</Text>
                    </View>
                  </YStack>
                </Pressable>

                <Pressable style={styles.refundRow}>
                  <XStack alignItems="center" gap="$3" flex={1}>
                    <View style={styles.refundIcon}>
                      <Ionicons name="car-outline" size={18} color={DARK_THEME.textSecondary} />
                    </View>
                    <YStack>
                      <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                        {t.budget.uberAdjustment}
                      </Text>
                      <Text fontSize={12} color={DARK_THEME.textTertiary}>
                        {t.budget.overcharge}
                      </Text>
                    </YStack>
                  </XStack>
                  <YStack alignItems="flex-end">
                    <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                      +$12.50
                    </Text>
                    <View style={styles.receivedBadge}>
                      <Text style={styles.receivedText}>{t.budget.received}</Text>
                    </View>
                  </YStack>
                </Pressable>
              </View>
            </YStack>

            {/* Footer */}
            <Text fontSize={12} color={DARK_THEME.textTertiary} textAlign="center" marginTop="$2">
              {t.budget.dataUpdated}
            </Text>
          </>
        )}
      </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  header: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.glassBorder,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: DARK_THEME.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: DARK_THEME.background,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DARK_THEME.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  headerButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 180,
  },
  glassCard: {
    backgroundColor: DARK_THEME.glassLight,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientBlur: {
    position: 'absolute',
    top: -48,
    right: -48,
    width: 160,
    height: 160,
    backgroundColor: `${DARK_THEME.primary}4D`,
    borderRadius: 80,
    opacity: 0.3,
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: DARK_THEME.borderLight,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  progressContainer: {
    height: 12,
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#60A5FA',
  },
  contributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  contributionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.borderLight,
  },
  participantAvatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
    backgroundColor: `${DARK_THEME.primary}50`,
  },
  participantAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DARK_THEME.background,
  },
  participantAvatarInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DARK_THEME.borderLight,
  },
  participantInitialsText: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK_THEME.textSecondary,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  paidBadge: {
    backgroundColor: `${DARK_THEME.success}1A`,
    borderColor: `${DARK_THEME.success}33`,
  },
  pendingBadge: {
    backgroundColor: `${DARK_THEME.warning}1A`,
    borderColor: `${DARK_THEME.warning}33`,
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  emptyStateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  refundIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DARK_THEME.borderLight,
  },
  processingBadge: {
    backgroundColor: `${'#F97316'}1A`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  processingText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(249, 115, 22, 0.8)',
  },
  receivedBadge: {
    backgroundColor: `${DARK_THEME.success}1A`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  receivedText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(34, 197, 94, 0.8)',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: DARK_THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetCategoryBar: {
    backgroundColor: DARK_THEME.glassLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
  },
  progressBarEmpty: {
    height: 6,
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  filterPill: {
    flexDirection: 'row',
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 25,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#5A7EB0',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
