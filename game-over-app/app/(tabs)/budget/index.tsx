/**
 * Budget Dashboard Screen (Phase 9)
 * Budget tracking, contributions, and payment status
 * Matches the dark theme glassmorphic design from UI specifications
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ScrollView, RefreshControl, Pressable, StyleSheet, Alert, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/hooks/queries/useEvents';
import { useBooking } from '@/hooks/queries/useBookings';
import { useParticipants } from '@/hooks/queries/useParticipants';
import type { Database } from '@/lib/supabase/types';

type Event = Database['public']['Tables']['events']['Row'] & {
  city?: { name: string } | null;
};

// Dark theme colors
const DARK_THEME = {
  backgroundDark: '#2D3748',
  surfaceDark: 'rgba(45, 55, 72, 0.95)',
  glassCard: 'rgba(45, 55, 72, 0.6)',
  primary: '#4A6FA5',
  primaryLight: '#5A7EB0',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  textPrimary: '#FFFFFF',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  success: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  orange: '#F97316',
};

// Avatar colors for initials
const AVATAR_COLORS = [
  'rgba(139, 92, 246, 0.2)', // purple
  'rgba(20, 184, 166, 0.2)', // teal
  'rgba(236, 72, 153, 0.2)', // pink
  'rgba(59, 130, 246, 0.2)', // blue
  'rgba(249, 115, 22, 0.2)', // orange
];

export default function BudgetDashboardScreen() {
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

  // Filter booked events
  const bookedEvents = useMemo(() => {
    return (events || []).filter((e: Event) => e.status === 'booked' || e.status === 'completed');
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
    Alert.alert(
      'Send Reminders',
      `Send payment reminders to ${budgetStats.pendingCount} participant${budgetStats.pendingCount !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            Alert.alert('Success', 'Payment reminders sent!');
          },
        },
      ]
    );
  }, [budgetStats.pendingCount]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchEvents();
  }, [refetchEvents]);

  const isLoading = eventsLoading || bookingLoading || participantsLoading;

  // Empty state - no booked events
  if (!eventsLoading && bookedEvents.length === 0) {
    return (
      <YStack flex={1} backgroundColor={DARK_THEME.backgroundDark}>
        <XStack
          paddingTop={insets.top + 16}
          paddingHorizontal="$4"
          paddingBottom="$2"
          alignItems="center"
          backgroundColor={DARK_THEME.surfaceDark}
        >
          <Pressable style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={DARK_THEME.textPrimary} />
          </Pressable>
          <Text flex={1} textAlign="center" fontSize={18} fontWeight="700" color={DARK_THEME.textPrimary}>
            Budget Dashboard
          </Text>
          <View style={styles.headerButton} />
        </XStack>
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
          <YStack
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor={`${DARK_THEME.primary}20`}
            alignItems="center"
            justifyContent="center"
            marginBottom="$4"
          >
            <Ionicons name="wallet-outline" size={40} color={DARK_THEME.primary} />
          </YStack>
          <Text fontSize={18} fontWeight="600" color={DARK_THEME.textPrimary} textAlign="center" marginBottom="$2">
            No Budget Yet
          </Text>
          <Text fontSize={14} color={DARK_THEME.textTertiary} textAlign="center" marginBottom="$4">
            Book a package to track your event budget
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)/events')}>
            <Ionicons name="calendar" size={20} color="white" />
            <Text color="white" fontWeight="600">View Events</Text>
          </Pressable>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor={DARK_THEME.backgroundDark} testID="budget-screen">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 16}
        paddingHorizontal="$4"
        paddingBottom="$2"
        alignItems="center"
        backgroundColor={DARK_THEME.surfaceDark}
      >
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={DARK_THEME.textPrimary} />
        </Pressable>
        <Text flex={1} textAlign="center" fontSize={18} fontWeight="700" color={DARK_THEME.textPrimary}>
          Budget Dashboard
        </Text>
        <Pressable style={styles.headerButton}>
          <Ionicons name="options" size={24} color={DARK_THEME.textSecondary} />
        </Pressable>
      </XStack>

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
                      Spent ({budgetStats.percentage}%)
                    </Text>
                  </XStack>
                  <Text fontSize={12} fontWeight="500" color={DARK_THEME.textTertiary}>
                    {formatCurrency(budgetStats.pending)} Remaining
                  </Text>
                </XStack>
              </YStack>
            </View>

            {/* Group Contributions */}
            <YStack marginBottom="$4">
              <XStack justifyContent="space-between" alignItems="center" marginBottom="$3" paddingHorizontal="$1">
                <Text fontSize={12} fontWeight="700" color={DARK_THEME.textTertiary} textTransform="uppercase" letterSpacing={0.8}>
                  Group Contributions
                </Text>
                {budgetStats.pendingCount > 0 && (
                  <Pressable onPress={handleRemindAll}>
                    <Text fontSize={12} fontWeight="500" color={DARK_THEME.primary}>
                      Remind All
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
                          <View style={styles.avatarGradient}>
                            <Image
                              source={{ uri: participant.profile.avatar_url }}
                              style={styles.avatar}
                            />
                          </View>
                        ) : (
                          <View style={[styles.avatarInitials, { backgroundColor: avatarColor }]}>
                            <Text style={styles.initialsText}>{initials}</Text>
                          </View>
                        )}

                        {/* Info */}
                        <YStack>
                          <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                            {participant.profile?.full_name || 'Unknown'}
                            {isCurrentUser && ' (You)'}
                          </Text>
                          <Text fontSize={12} color={DARK_THEME.textTertiary}>
                            {isPending
                              ? `${formatCurrency(perPerson - (participant.contribution_amount_cents || 0))} Remaining`
                              : `${formatCurrency(perPerson)} Contribution`
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
                          {isPaid ? 'Paid' : 'Pending'}
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
                Hidden Cost Alerts
              </Text>
              <View style={[styles.glassCard, styles.emptyStateCard]}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="shield-checkmark" size={24} color="rgba(52, 211, 153, 0.8)" />
                </View>
                <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary} marginBottom="$1">
                  No hidden costs detected
                </Text>
                <Text fontSize={12} color={DARK_THEME.textTertiary} textAlign="center" maxWidth={220} lineHeight={18}>
                  Great job! All expenses are accounted for within the agreed budget.
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
                Refund Tracking
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
                        Airbnb Deposit
                      </Text>
                      <Text fontSize={12} color={DARK_THEME.textTertiary}>
                        Security Hold
                      </Text>
                    </YStack>
                  </XStack>
                  <YStack alignItems="flex-end">
                    <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                      +$500.00
                    </Text>
                    <View style={styles.processingBadge}>
                      <Text style={styles.processingText}>Processing</Text>
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
                        Uber Adjustment
                      </Text>
                      <Text fontSize={12} color={DARK_THEME.textTertiary}>
                        Overcharge
                      </Text>
                    </YStack>
                  </XStack>
                  <YStack alignItems="flex-end">
                    <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                      +$12.50
                    </Text>
                    <View style={styles.receivedBadge}>
                      <Text style={styles.receivedText}>Received</Text>
                    </View>
                  </YStack>
                </Pressable>
              </View>
            </YStack>

            {/* Footer */}
            <Text fontSize={12} color={DARK_THEME.textTertiary} textAlign="center" marginTop="$2">
              Data updated just now
            </Text>
          </>
        )}
      </ScrollView>
    </YStack>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  glassCard: {
    backgroundColor: DARK_THEME.glassCard,
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
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
    backgroundColor: `${DARK_THEME.primary}50`,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DARK_THEME.backgroundDark,
  },
  avatarInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DARK_THEME.borderLight,
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
    backgroundColor: `${DARK_THEME.orange}1A`,
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
});
