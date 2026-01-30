/**
 * Budget Screen
 * Budget tracking with Overview, Expenses, and Contributors tabs
 * Dark glassmorphic design matching Events/Chat screens
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ScrollView, RefreshControl, Pressable, StyleSheet, Alert, View, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Image } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useEvents } from '@/hooks/queries/useEvents';
import { useBooking } from '@/hooks/queries/useBookings';
import { useParticipants } from '@/hooks/queries/useParticipants';
import { useUser } from '@/stores/authStore';
import { DARK_THEME } from '@/constants/theme';
import type { Database } from '@/lib/supabase/types';

type Event = Database['public']['Tables']['events']['Row'] & {
  city?: { name: string } | null;
};

type TabType = 'overview' | 'expenses' | 'contributors';

// Avatar colors for initials
const AVATAR_COLORS = [
  'rgba(139, 92, 246, 0.2)',
  'rgba(20, 184, 166, 0.2)',
  'rgba(236, 72, 153, 0.2)',
  'rgba(59, 130, 246, 0.2)',
  'rgba(249, 115, 22, 0.2)',
];

export default function BudgetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get user avatar
  const avatarUrl = user?.user_metadata?.avatar_url;
  const userInitials = useMemo(() => {
    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }, [user]);

  // Fetch user's events
  const {
    data: events,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useEvents();

  // Filter booked events (events that have budget data)
  const bookedEvents = useMemo(() => {
    return (events || []).filter((e: Event) => e.status === 'booked' || e.status === 'completed');
  }, [events]);

  // Check if user has any events at all
  const hasAnyEvents = useMemo(() => {
    return (events || []).length > 0;
  }, [events]);

  // Auto-select first booked event
  React.useEffect(() => {
    if (!selectedEventId && bookedEvents.length > 0) {
      setSelectedEventId(bookedEvents[0].id);
    }
  }, [bookedEvents, selectedEventId]);

  // Fetch booking for selected event
  const { data: booking, isLoading: bookingLoading } = useBooking(selectedEventId || undefined);

  // Fetch participants for selected event
  const { data: participants, isLoading: participantsLoading } = useParticipants(
    selectedEventId || undefined
  );

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchEvents();
    setIsRefreshing(false);
  };

  // Check if we're in empty state (no events at all)
  // Also show empty state while loading to avoid flash
  const hasNoEvents = eventsLoading || !hasAnyEvents;

  // Check if we have events but no booked events (no budget data yet)
  const hasEventsButNoBudget = !eventsLoading && hasAnyEvents && bookedEvents.length === 0;

  // Check if we have booked events but no actual booking data
  // Also include loading state to avoid showing $0.00 card
  const hasBookedEventsButNoData = !eventsLoading && bookedEvents.length > 0 && (bookingLoading || !booking);

  // Empty state content configuration per tab
  const emptyStateConfig = {
    overview: {
      emoji: '💰',
      title: 'No Budget Yet',
      subtitleLine1: 'Create your first event and',
      subtitleLine2: 'start tracking your budget!',
    },
    expenses: {
      emoji: '🧾',
      title: 'No Expenses Yet',
      subtitleLine1: 'Create your first event and',
      subtitleLine2: 'start tracking expenses!',
    },
    contributors: {
      emoji: '👥',
      title: 'No Contributors Yet',
      subtitleLine1: 'Create your first event and',
      subtitleLine2: 'start inviting contributors!',
    },
  };

  // Render empty state content - matches Events/Chat screens exactly
  const renderEmptyState = () => {
    const config = emptyStateConfig[activeTab];
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding={24}>
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={[`${DARK_THEME.primary}30`, `${DARK_THEME.primary}10`]}
            style={styles.emptyIconGradient}
          >
            <Text fontSize={56}>{config.emoji}</Text>
          </LinearGradient>
        </View>
        <Text fontSize={24} fontWeight="800" color={DARK_THEME.textPrimary} marginBottom={8}>
          {config.title}
        </Text>
        <Text
          fontSize={16}
          color={DARK_THEME.textSecondary}
          textAlign="center"
          marginBottom={24}
          maxWidth={280}
          lineHeight={24}
        >
          {config.subtitleLine1}{'\n'}{config.subtitleLine2}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={() => router.push('/create-event')}
          testID="create-event-button"
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Create Event</Text>
        </Pressable>
      </YStack>
    );
  };

  // Render "has events but no budget" state
  const renderNoBudgetState = () => {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding={24}>
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={[`${DARK_THEME.primary}30`, `${DARK_THEME.primary}10`]}
            style={styles.emptyIconGradient}
          >
            <Text fontSize={56}>📊</Text>
          </LinearGradient>
        </View>
        <Text fontSize={24} fontWeight="800" color={DARK_THEME.textPrimary} marginBottom={8}>
          No Budget Data
        </Text>
        <Text
          fontSize={16}
          color={DARK_THEME.textSecondary}
          textAlign="center"
          marginBottom={24}
          maxWidth={280}
          lineHeight={24}
        >
          Book a package for your event to{'\n'}start tracking your budget!
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={() => router.push('/(tabs)/events')}
          testID="view-events-button"
        >
          <Ionicons name="calendar" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>View Events</Text>
        </Pressable>
      </YStack>
    );
  };

  // Render budget content
  const renderBudgetContent = () => {
    if (bookingLoading || participantsLoading) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center" padding={24}>
          <Text color={DARK_THEME.textSecondary}>Loading budget data...</Text>
        </YStack>
      );
    }

    return (
      <>
        {/* Total Budget Card */}
        <View style={styles.glassCard} testID="budget-summary-card">
          <View style={styles.gradientBlur} />
          <YStack gap="$2" style={{ position: 'relative', zIndex: 1 }}>
            <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$1">
              <Text fontSize={14} fontWeight="500" color={DARK_THEME.textTertiary} letterSpacing={0.5}>
                Total Budget
              </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>On Track</Text>
              </View>
            </XStack>

            <XStack alignItems="baseline" gap="$2" marginBottom="$4">
              <Text fontSize={36} fontWeight="700" color={DARK_THEME.textPrimary} letterSpacing={-1}>
                {formatCurrency(budgetStats.collected)}
              </Text>
              <Text fontSize={14} fontWeight="500" color={DARK_THEME.textTertiary}>
                of {formatCurrency(budgetStats.totalBudget)}
              </Text>
            </XStack>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View
                style={[styles.progressBar, { width: `${budgetStats.percentage}%` }]}
              />
            </View>

            {/* Stats Row */}
            <XStack
              justifyContent="space-between"
              alignItems="center"
              paddingTop="$3"
              marginTop="$1"
              borderTopWidth={1}
              borderTopColor={DARK_THEME.glassBorder}
            >
              <XStack alignItems="center" gap="$1.5">
                <View style={styles.statDot} />
                <Text fontSize={12} fontWeight="500" color={DARK_THEME.textSecondary}>
                  Collected ({budgetStats.percentage}%)
                </Text>
              </XStack>
              <Text fontSize={12} fontWeight="500" color={DARK_THEME.textTertiary}>
                {formatCurrency(budgetStats.pending)} Remaining
              </Text>
            </XStack>
          </YStack>
        </View>

        {/* Contributors Section */}
        {activeTab === 'contributors' && participants && participants.length > 0 && (
          <YStack marginBottom="$4">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3" paddingHorizontal="$1">
              <Text fontSize={12} fontWeight="700" color={DARK_THEME.textTertiary} textTransform="uppercase" letterSpacing={0.8}>
                Group Contributions
              </Text>
            </XStack>

            <View style={styles.glassCard}>
              {participants.map((participant, index) => {
                const isPaid = participant.payment_status === 'paid';
                const perPerson = booking?.per_person_cents || 0;
                const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                const initials = (participant.profile?.full_name || 'U')
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <View
                    key={participant.id}
                    style={[
                      styles.contributionRow,
                      index !== (participants?.length || 0) - 1 && styles.contributionRowBorder,
                    ]}
                  >
                    <XStack alignItems="center" gap="$3" flex={1}>
                      <View style={[styles.avatarInitials, { backgroundColor: avatarColor }]}>
                        <Text style={styles.initialsText}>{initials}</Text>
                      </View>
                      <YStack>
                        <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                          {participant.profile?.full_name || 'Unknown'}
                        </Text>
                        <Text fontSize={12} color={DARK_THEME.textTertiary}>
                          {formatCurrency(perPerson)} Contribution
                        </Text>
                      </YStack>
                    </XStack>
                    <View style={[styles.paymentBadge, isPaid ? styles.paidBadge : styles.pendingBadge]}>
                      <Ionicons
                        name={isPaid ? 'checkmark' : 'time-outline'}
                        size={12}
                        color={isPaid ? '#22C55E' : '#EAB308'}
                      />
                      <Text style={[styles.paymentBadgeText, { color: isPaid ? '#22C55E' : '#EAB308' }]}>
                        {isPaid ? 'Paid' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </YStack>
        )}
      </>
    );
  };

  return (
    <View style={styles.container} testID="budget-screen">
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[DARK_THEME.deepNavy, DARK_THEME.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header - Matching Events/Chat screen structure exactly */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          {/* Left: Avatar (navigates to profile) + Title */}
          <XStack alignItems="center" gap={12}>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              style={({ pressed }) => [
                styles.avatarContainer,
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
              ]}
              testID="avatar-profile-button"
            >
              <LinearGradient
                colors={[DARK_THEME.primary, '#60A5FA']}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarInner}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      width={36}
                      height={36}
                      borderRadius={18}
                    />
                  ) : (
                    <Text fontSize={14} fontWeight="700" color={DARK_THEME.textPrimary}>
                      {userInitials}
                    </Text>
                  )}
                </View>
              </LinearGradient>
              <View style={styles.onlineIndicator} />
            </Pressable>
            <Text fontSize={20} fontWeight="700" color={DARK_THEME.textPrimary}>
              Budget
            </Text>
          </XStack>

          {/* Right: Notification bell */}
          <Pressable
            onPress={() => router.push('/notifications')}
            style={({ pressed }) => [
              styles.bellButton,
              pressed && styles.bellButtonPressed,
            ]}
            testID="notifications-button"
          >
            <Ionicons name="notifications-outline" size={24} color={DARK_THEME.textPrimary} />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        {/* Tab Filters: Overview / Expenses / Contributors - INSIDE header like Events */}
        <View style={styles.tabFiltersContainer}>
          <BlurView intensity={10} tint="dark" style={styles.tabFiltersBlur}>
            <View style={styles.tabFiltersInner}>
              {(['overview', 'expenses', 'contributors'] as TabType[]).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tabFilter,
                    activeTab === tab && styles.tabFilterActive,
                  ]}
                  testID={`filter-tab-${tab}`}
                >
                  <Text
                    fontSize={13}
                    fontWeight="600"
                    color={activeTab === tab ? DARK_THEME.textPrimary : DARK_THEME.textSecondary}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </BlurView>
        </View>
      </View>

      {/* Content */}
      {hasNoEvents ? (
        <ScrollView
          contentContainerStyle={styles.emptyScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={DARK_THEME.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderEmptyState()}
        </ScrollView>
      ) : hasEventsButNoBudget || hasBookedEventsButNoData ? (
        <ScrollView
          contentContainerStyle={styles.emptyScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={DARK_THEME.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderNoBudgetState()}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={DARK_THEME.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderBudgetContent()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.glassBorder,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: DARK_THEME.background,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DARK_THEME.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    position: 'relative',
  },
  bellButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  tabFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabFiltersBlur: {
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  tabFiltersInner: {
    flexDirection: 'row',
    backgroundColor: DARK_THEME.glass,
    padding: 4,
  },
  tabFilter: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  tabFilterActive: {
    backgroundColor: DARK_THEME.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DARK_THEME.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: DARK_THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  glassCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
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
    borderColor: DARK_THEME.glassBorder,
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
    backgroundColor: DARK_THEME.primary,
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
    paddingVertical: 12,
  },
  contributionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.glassBorder,
  },
  avatarInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  initialsText: {
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
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  pendingBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
