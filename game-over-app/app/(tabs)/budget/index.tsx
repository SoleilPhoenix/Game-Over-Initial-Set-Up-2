/**
 * Budget Dashboard Screen (Phase 9)
 * Budget tracking, contributions, and payment status
 * Matches the dark theme glassmorphic design from UI specifications
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Animated, ScrollView, RefreshControl, Pressable, StyleSheet, Alert, View, Image, FlatList, StatusBar, PanResponder, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/hooks/queries/useEvents';
import { useBooking } from '@/hooks/queries/useBookings';
import { useParticipants } from '@/hooks/queries/useParticipants';
import { useUser } from '@/stores/authStore';
import { DARK_THEME } from '@/constants/theme';
import { useTabBarStore } from '@/stores/tabBarStore';
import { useTranslation, getTranslation } from '@/i18n';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import { getEventImage, resolveImageSource } from '@/constants/packageImages';
import { loadBudgetInfo, loadDesiredParticipants, loadGuestDetails, type BudgetInfo, type GuestDetail } from '@/lib/participantCountCache';
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

type BudgetCategory = 'package' | 'otherExpenses';

type ExpenseCategory = { key: string; icon: string; color: string; bg: string; labelKey: string; packageNote: boolean };
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { key: 'gifts',         icon: 'gift-outline',            color: '#EC4899', bg: 'rgba(236,72,153,0.15)',  labelKey: 'expenseGifts',         packageNote: false },
  { key: 'transport',     icon: 'car-outline',             color: '#10B981', bg: 'rgba(16,185,129,0.15)',  labelKey: 'expenseTransport',     packageNote: false },
  { key: 'accommodation', icon: 'bed-outline',             color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  labelKey: 'expenseAccommodation', packageNote: false },
  { key: 'activities',    icon: 'game-controller-outline', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', labelKey: 'expenseActivities',    packageNote: true },
  { key: 'food',          icon: 'restaurant-outline',      color: '#F97316', bg: 'rgba(249,115,22,0.15)',  labelKey: 'expenseFood',          packageNote: true },
];

const REFUND_TEMPLATES = [
  { key: 'hotel_deposit',    label: 'Hotel Security Deposit',  icon: 'home-outline',            color: '#3B82F6', bg: 'rgba(59,130,246,0.15)'  },
  { key: 'venue_deposit',    label: 'Event Venue Deposit',     icon: 'storefront-outline',      color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)'  },
  { key: 'activity_payment', label: 'Activity Pre-payment',    icon: 'game-controller-outline', color: '#F97316', bg: 'rgba(249,115,22,0.15)'  },
  { key: 'transport_prepay', label: 'Transport Pre-payment',   icon: 'car-outline',             color: '#10B981', bg: 'rgba(16,185,129,0.15)'  },
  { key: 'restaurant_deposit', label: 'Restaurant Deposit',   icon: 'restaurant-outline',      color: '#EC4899', bg: 'rgba(236,72,153,0.15)'  },
];

export default function BudgetDashboardScreen() {
  const router = useRouter();
  // eventId = opened via /(tabs)/budget?eventId=xxx (old approach, kept for safety)
  // id     = opened via /event/[id]/budget (event-stack, router.back() works correctly)
  const { eventId: rawEventIdParam, id: pathId } = useLocalSearchParams<{ eventId?: string; id?: string }>();
  const eventIdParam = rawEventIdParam || pathId;
  const insets = useSafeAreaInsets();
  const user = useUser();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventIdParam || null);
  const [eventSelectorOpen, setEventSelectorOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory>('package');
  const [cachedBudget, setCachedBudget] = useState<BudgetInfo | null>(null);
  const [cachedParticipantCount, setCachedParticipantCount] = useState<number | null>(null);
  const [cachedGuests, setCachedGuests] = useState<Record<number, GuestDetail>>({});
  const { t } = useTranslation();
  const setTabBarHidden = useTabBarStore((s) => s.setHidden);

  // Expense modal
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [expenseCategoryKey, setExpenseCategoryKey] = useState<string | null>(null);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaidBy, setExpensePaidBy] = useState<'you' | 'split'>('you');
  const [addedExpenses, setAddedExpenses] = useState<Array<{ categoryKey: string; description: string; amount: string; paidBy: 'you' | 'split' }>>([]);

  // Refund modal
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundTemplateKey, setRefundTemplateKey] = useState<string | null>(null);
  const [refundDescription, setRefundDescription] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [addedRefunds, setAddedRefunds] = useState<Array<{ description: string; amount: string; status: 'processing' | 'received' }>>([]);

  const openExpenseModal = useCallback((categoryKey: string) => {
    setExpenseCategoryKey(categoryKey);
    setExpenseDescription('');
    setExpenseAmount('');
    setExpensePaidBy('you');
    setExpenseModalVisible(true);
  }, []);

  const submitExpense = useCallback(() => {
    if (!expenseDescription.trim() || !expenseAmount.trim() || !expenseCategoryKey) return;
    setAddedExpenses(prev => [...prev, { categoryKey: expenseCategoryKey, description: expenseDescription.trim(), amount: expenseAmount.trim(), paidBy: expensePaidBy }]);
    setExpenseModalVisible(false);
  }, [expenseDescription, expenseAmount, expenseCategoryKey, expensePaidBy]);

  const openRefundModal = useCallback(() => {
    setRefundTemplateKey(null);
    setRefundDescription('');
    setRefundAmount('');
    setRefundModalVisible(true);
  }, []);

  const submitRefund = useCallback(() => {
    if (!refundDescription.trim() || !refundAmount.trim()) return;
    setAddedRefunds(prev => [...prev, { description: refundDescription.trim(), amount: refundAmount.trim(), status: 'processing' }]);
    setRefundModalVisible(false);
  }, [refundDescription, refundAmount]);

  // Hide tab bar when opened from Event Summary (eventIdParam present)
  useFocusEffect(
    useCallback(() => {
      if (eventIdParam) setTabBarHidden(true);
      return () => setTabBarHidden(false);
    }, [eventIdParam])
  );

  const BUDGET_TABS = ['package', 'otherExpenses'] as const;
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

  // Auto-select nearest booked event (skip if opened from Event Summary)
  const hasAutoSelected = React.useRef(false);
  useEffect(() => {
    if (hasAutoSelected.current || bookedEvents.length === 0 || eventIdParam) return;
    hasAutoSelected.current = true;
    const now = Date.now();
    const sorted = [...bookedEvents].sort((a, b) => {
      const aDate = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const bDate = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      const aFuture = aDate >= now ? 0 : 1;
      const bFuture = bDate >= now ? 0 : 1;
      if (aFuture !== bFuture) return aFuture - bFuture;
      return aDate - bDate;
    });
    setSelectedEventId(sorted[0].id);
  }, [bookedEvents]);

  // ONLY fetch booking if we have booked events (prevent unnecessary queries)
  const { data: booking, isLoading: bookingLoading } = useBooking(
    hasBookedEvents ? (selectedEventId || undefined) : undefined
  );

  // ONLY fetch participants if we have booked events
  const { data: participants, isLoading: participantsLoading } = useParticipants(
    hasBookedEvents ? (selectedEventId || undefined) : undefined
  );

  const selectedEvent = bookedEvents.find((e: Event) => e.id === selectedEventId);

  // Load cached budget + participant data for demo-mode events (no DB booking record)
  useEffect(() => {
    if (!selectedEventId) return;
    loadBudgetInfo(selectedEventId).then(info => setCachedBudget(info ?? null));
    loadDesiredParticipants(selectedEventId).then(count => setCachedParticipantCount(count ?? null));
    loadGuestDetails(selectedEventId).then(guests => setCachedGuests(guests ?? {}));
  }, [selectedEventId]);

  // Calculate budget stats — fall back to cache when DB booking doesn't exist
  const budgetStats = useMemo(() => {
    // Demo mode: no DB booking record — build from cached data or estimates
    if (!booking) {
      const guestCount = Object.keys(cachedGuests).length;
      const payingCount = cachedBudget?.payingCount
        || (cachedParticipantCount ? cachedParticipantCount - 1 : 0)
        || guestCount
        || 0;
      const perPerson = cachedBudget?.perPersonCents || 14900; // €149 default (classic tier)
      const total = cachedBudget?.totalCents || (payingCount * perPerson);
      const deposit = Math.round(total * 0.25);
      return {
        totalBudget: total,
        collected: deposit,
        pending: total - deposit,
        percentage: total > 0 ? Math.round((deposit / total) * 100) : 0,
        paidCount: 1, // organizer paid deposit
        pendingCount: Math.max(0, payingCount - 1),
        perPerson,
      };
    }

    const totalBudget = booking!.total_amount_cents || 0;
    let collected = 0;
    let paidCount = 0;
    let pendingCount = 0;

    (participants ?? []).forEach((p) => {
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
      perPerson: booking!.per_person_cents || 0,
      pendingCount,
    };
  }, [booking, participants, cachedBudget, cachedParticipantCount, cachedGuests]);

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
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

  // Navigate back — always use router.back(); when accessed via /event/[id]/budget
  // the stack correctly returns to Event Summary without any loops
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Left-edge swipe to go back
  const swipeBackResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx > 20 && Math.abs(gs.dy) < 60 && gs.moveX < 40,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 40) router.back();
      },
    })
  ).current;

  // Build demo participant list when no DB booking record exists
  const demoParticipants = useMemo(() => {
    if (booking) return null; // real data — use DB participants
    const guestCount = Object.keys(cachedGuests).length;
    const totalPaying = (cachedBudget?.payingCount
      || (cachedParticipantCount ? cachedParticipantCount - 1 : 0)
      || guestCount
      || 0);
    if (totalPaying === 0) return null;
    const list: Array<{ id: string; name: string; status: 'paid' | 'pending'; amount: number }> = [];
    // Organizer (current user) — paid the 25% deposit
    list.push({ id: 'organizer', name: userName, status: 'paid', amount: budgetStats.collected });
    // Other participants from guest details cache or placeholders
    for (let i = 1; i < totalPaying; i++) {
      const guest = cachedGuests[i];
      const name = guest?.firstName
        ? `${guest.firstName}${guest.lastName ? ' ' + guest.lastName : ''}`
        : `Guest ${i}`;
      list.push({ id: `g-${i}`, name, status: 'pending', amount: budgetStats.perPerson });
    }
    // Add honoree if they have a name (shown as a pending participant at the bottom)
    const honoreeName = selectedEvent?.honoree_name;
    if (honoreeName) {
      list.push({ id: 'honoree', name: honoreeName, status: 'pending', amount: budgetStats.perPerson });
    }
    return list;
  }, [booking, cachedBudget, cachedParticipantCount, cachedGuests, userName, budgetStats, selectedEvent]);

  // Event selector
  const selectedEventName = selectedEvent
    ? (selectedEvent.title || (selectedEvent.honoree_name ? `${selectedEvent.honoree_name}'s Event` : 'Event'))
    : 'Select Event';

  const renderEventSelector = () => {
    if (bookedEvents.length === 0) return null;

    const selectedCitySlug = (selectedEvent?.city as any)?.name?.toLowerCase() || 'berlin';
    const selectedCityImage = getEventImage(selectedCitySlug, selectedEvent?.hero_image_url);

    return (
      <View style={styles.eventSelectorWrapper}>
        <Pressable
          style={styles.eventSelectorCard}
          onPress={() => !eventIdParam && bookedEvents.length > 1 && setEventSelectorOpen(!eventSelectorOpen)}
          testID="budget-event-selector"
        >
          <Image
            source={resolveImageSource(selectedEvent?.hero_image_url || selectedCityImage)}
            style={styles.eventSelectorImage}
            resizeMode="cover"
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.eventSelectorLabel}>
              {t.budget.totalBudget ? 'CURRENT EVENT' : 'CURRENT EVENT'}
            </Text>
            <Text style={styles.eventSelectorName} numberOfLines={1}>
              {selectedEventName}
            </Text>
            {selectedEvent?.start_date && (
              <Text style={styles.eventSelectorDate}>
                {new Date(selectedEvent.start_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' \u2022 '}
                {(selectedEvent.city as any)?.name || ''}
              </Text>
            )}
          </View>
          {!eventIdParam && bookedEvents.length > 1 && (
            <View style={styles.eventSelectorChevron}>
              <Ionicons
                name={eventSelectorOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={DARK_THEME.textPrimary}
              />
            </View>
          )}
        </Pressable>

        {!eventIdParam && eventSelectorOpen && (
          <View style={styles.eventDropdown}>
            {[...bookedEvents]
              .sort((a, b) => {
                if (a.id === selectedEventId) return -1;
                if (b.id === selectedEventId) return 1;
                const aDate = a.start_date ? new Date(a.start_date).getTime() : Infinity;
                const bDate = b.start_date ? new Date(b.start_date).getTime() : Infinity;
                return aDate - bDate;
              })
              .map(ev => {
                const isSelected = ev.id === selectedEventId;
                const evName = ev.title || (ev.honoree_name ? `${ev.honoree_name}'s Event` : 'Event');
                const evCitySlug = (ev.city as any)?.name?.toLowerCase() || 'berlin';
                const evCityImage = getEventImage(evCitySlug, ev.hero_image_url);
                return (
                  <Pressable
                    key={ev.id}
                    style={[styles.eventDropdownItem, isSelected && styles.eventDropdownItemActive]}
                    onPress={() => {
                      setSelectedEventId(ev.id);
                      setEventSelectorOpen(false);
                    }}
                  >
                    <Image
                      source={resolveImageSource(ev.hero_image_url || evCityImage)}
                      style={styles.eventDropdownImage}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={[
                        styles.eventDropdownText,
                        isSelected && styles.eventDropdownTextActive,
                      ]} numberOfLines={1}>
                        {evName}
                      </Text>
                      <Text style={styles.eventDropdownDate}>
                        {(ev.city as any)?.name || ''}
                        {ev.start_date ? ` \u2022 ${new Date(ev.start_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}` : ''}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#5A7EB0" />
                    )}
                  </Pressable>
                );
              })}
          </View>
        )}
      </View>
    );
  };

  // Render category tabs
  const renderCategoryTabs = () => (
    <View style={styles.filterContainer}>
      <View style={styles.filterPill}>
        {(['package', 'otherExpenses'] as BudgetCategory[]).map((category) => (
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
              {category === 'package' ? (t.budget as any).filterPackage : (t.budget as any).filterOtherExpenses}
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
    <View style={styles.container} {...(eventIdParam ? swipeBackResponder.panHandlers : {})}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background */}
      <LinearGradient
        colors={[DARK_THEME.deepNavy, DARK_THEME.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={20}>
          {/* Back button (from Event Summary) or Avatar */}
          <XStack alignItems="center" gap={12}>
            {eventIdParam ? (
              <Pressable
                onPress={handleBack}
                hitSlop={8}
                style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="arrow-back" size={24} color={DARK_THEME.textPrimary} />
              </Pressable>
            ) : (
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
              </View>
            )}
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

      {/* Event Selector */}
      {renderEventSelector()}

      <Animated.View style={[{ flex: 1 }, swipeAnimStyle]} {...swipeHandlers}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || isLoading}
            onRefresh={handleRefresh}
            tintColor={DARK_THEME.primary}
          />
        }
      >
        <>
          {selectedCategory === 'package' ? (
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
                      {t.budget.spent.replace('{{percentage}}', String(budgetStats.percentage))}
                    </Text>
                  </XStack>
                  <Text fontSize={12} fontWeight="500" color={DARK_THEME.textTertiary}>
                    {t.budget.remaining.replace('{{amount}}', formatCurrency(budgetStats.pending))}
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
                {/* Use demo participants when no DB booking, otherwise DB participants */}
                {(demoParticipants || participants)?.map((participantRaw, index) => {
                  type DemoP = { id: string; name: string; status: 'paid' | 'pending'; amount: number };
                  const isDemo = !!demoParticipants;
                  // Normalise to common shape
                  const name = isDemo
                    ? (participantRaw as DemoP).name
                    : (((participantRaw as any).profile?.full_name) || (participantRaw as any).profile?.email?.split('@')[0] || '—');
                  const isPaid = isDemo
                    ? (participantRaw as DemoP).status === 'paid'
                    : (participantRaw as any).payment_status === 'paid';
                  const isPending = !isPaid;
                  const amountForRow = isDemo
                    ? (participantRaw as DemoP).amount
                    : (booking?.per_person_cents || budgetStats.perPerson || 0);
                  const isCurrentUser = index === 0;
                  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                  const initials = (name.split(' ').map((n: string) => n[0] || '').filter(Boolean).join('').toUpperCase().slice(0, 2)) || '?';
                  const key = (participantRaw as any).id as string;

                  return (
                    <View
                      key={key}
                      style={[
                        styles.contributionRow,
                        index !== ((demoParticipants || participants)?.length || 0) - 1 && styles.contributionRowBorder,
                      ]}
                    >
                      <XStack alignItems="center" gap="$3" flex={1}>
                        {/* Avatar initials */}
                        <View style={[styles.participantAvatarInitials, { backgroundColor: avatarColor }]}>
                          <Text style={styles.participantInitialsText}>{initials}</Text>
                        </View>

                        {/* Info */}
                        <YStack>
                          <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                            {name}{isCurrentUser ? ` ${t.budget.you}` : ''}
                          </Text>
                          <Text fontSize={12} color={DARK_THEME.textTertiary}>
                            {isPending
                              ? t.budget.remaining.replace('{{amount}}', formatCurrency(amountForRow))
                              : t.budget.contribution.replace('{{amount}}', formatCurrency(amountForRow))
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
                    </View>
                  );
                })}
              </View>
            </YStack>
            </>
          ) : (
            <>
            {/* Expense Breakdown */}
            <YStack marginBottom="$4">
              <XStack justifyContent="space-between" alignItems="center" marginBottom="$3" paddingHorizontal="$1">
                <Text fontSize={12} fontWeight="700" color={DARK_THEME.textTertiary} textTransform="uppercase" letterSpacing={0.8}>
                  {(t.budget as any).expenseBreakdown}
                </Text>
                <Pressable
                  onPress={() => setExpenseModalVisible(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Ionicons name="add-circle-outline" size={16} color={DARK_THEME.primary} />
                  <Text fontSize={12} fontWeight="500" color={DARK_THEME.primary}>Add</Text>
                </Pressable>
              </XStack>
              <View style={styles.glassCard}>
                {EXPENSE_CATEGORIES.map((item, index) => {
                  const catExpenses = addedExpenses.filter(e => e.categoryKey === item.key);
                  const totalCents = catExpenses.reduce((sum, e) => {
                    const val = parseFloat(e.amount.replace(',', '.'));
                    return sum + (isNaN(val) ? 0 : val);
                  }, 0);
                  return (
                    <Pressable
                      key={item.key}
                      style={[styles.refundRow, index < EXPENSE_CATEGORIES.length - 1 && styles.contributionRowBorder]}
                      onPress={() => openExpenseModal(item.key)}
                    >
                      <XStack alignItems="center" gap="$3" flex={1}>
                        <View style={[styles.refundIcon, { backgroundColor: item.bg }]}>
                          <Ionicons name={item.icon as any} size={18} color={item.color} />
                        </View>
                        <YStack>
                          <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                            {(t.budget as any)[item.labelKey]}
                          </Text>
                          <Text fontSize={12} color={DARK_THEME.textTertiary}>
                            {catExpenses.length > 0
                              ? `${catExpenses.length} expense${catExpenses.length > 1 ? 's' : ''}`
                              : item.packageNote
                                ? (t.budget as any).expensePackageNote || 'Extra costs beyond package'
                                : (t.budget as any).expenseEstimated}
                          </Text>
                        </YStack>
                      </XStack>
                      {catExpenses.length > 0
                        ? <Text fontSize={14} fontWeight="600" color={item.color}>€{totalCents.toFixed(2).replace('.', ',')}</Text>
                        : <Text fontSize={14} fontWeight="500" color={DARK_THEME.textTertiary}>—</Text>
                      }
                    </Pressable>
                  );
                })}
              </View>
            </YStack>

            {/* Refund Tracking */}
            <YStack marginBottom="$6">
              <XStack justifyContent="space-between" alignItems="center" marginBottom="$3" paddingHorizontal="$1">
                <Text fontSize={12} fontWeight="700" color={DARK_THEME.textTertiary} textTransform="uppercase" letterSpacing={0.8}>
                  {t.budget.refundTracking}
                </Text>
                <Pressable
                  onPress={openRefundModal}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Ionicons name="add-circle-outline" size={16} color={DARK_THEME.primary} />
                  <Text fontSize={12} fontWeight="500" color={DARK_THEME.primary}>Add</Text>
                </Pressable>
              </XStack>
              <View style={styles.glassCard}>
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
                    <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>+€250</Text>
                    <View style={styles.processingBadge}>
                      <Text style={styles.processingText}>{t.budget.processing}</Text>
                    </View>
                  </YStack>
                </Pressable>

                <Pressable style={styles.refundRow}>
                  <XStack alignItems="center" gap="$3" flex={1}>
                    <View style={styles.refundIcon}>
                      <Ionicons name="storefront-outline" size={18} color={DARK_THEME.textSecondary} />
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
                    <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>+€80</Text>
                    <View style={styles.receivedBadge}>
                      <Text style={styles.receivedText}>{t.budget.received}</Text>
                    </View>
                  </YStack>
                </Pressable>

                {/* Dynamically added refunds */}
                {addedRefunds.map((refund, i) => (
                  <View key={i} style={[styles.refundRow, styles.contributionRowBorder]}>
                    <XStack alignItems="center" gap="$3" flex={1}>
                      <View style={styles.refundIcon}>
                        <Ionicons name="receipt-outline" size={18} color={DARK_THEME.textSecondary} />
                      </View>
                      <YStack>
                        <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>{refund.description}</Text>
                        <Text fontSize={12} color={DARK_THEME.textTertiary}>{t.budget.securityHold}</Text>
                      </YStack>
                    </XStack>
                    <YStack alignItems="flex-end">
                      <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>+€{refund.amount}</Text>
                      <View style={styles.processingBadge}>
                        <Text style={styles.processingText}>{t.budget.processing}</Text>
                      </View>
                    </YStack>
                  </View>
                ))}
              </View>
            </YStack>
            </>
          )}

            {/* Footer */}
            <Text fontSize={12} color={DARK_THEME.textTertiary} textAlign="center" marginTop="$2">
              {t.budget.dataUpdated}
            </Text>
        </>
      </ScrollView>
      </Animated.View>

      {/* ─── Expense Modal ─── */}
      <Modal
        visible={expenseModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setExpenseModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setExpenseModalVisible(false)} />
            <View style={styles.modalSheet}>
              {/* Category picker if opened from global "Add" button */}
              {!expenseCategoryKey ? (
                <>
                  <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
                    <Text style={styles.modalTitle}>Select Category</Text>
                    <Pressable onPress={() => setExpenseModalVisible(false)} hitSlop={10}>
                      <Ionicons name="close" size={22} color={DARK_THEME.textSecondary} />
                    </Pressable>
                  </XStack>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <Pressable
                      key={cat.key}
                      style={styles.templateRow}
                      onPress={() => setExpenseCategoryKey(cat.key)}
                    >
                      <View style={[styles.refundIcon, { backgroundColor: cat.bg }]}>
                        <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                      </View>
                      <Text style={styles.templateLabel}>{(t.budget as any)[cat.labelKey]}</Text>
                      <Ionicons name="chevron-forward" size={16} color={DARK_THEME.textTertiary} />
                    </Pressable>
                  ))}
                </>
              ) : (
                /* Expense form */
                (() => {
                  const expCat = EXPENSE_CATEGORIES.find(c => c.key === expenseCategoryKey)!;
                  return (
                    <>
                      <XStack alignItems="center" gap={12} marginBottom={20}>
                        <View style={[styles.modalCatIcon, { backgroundColor: expCat.bg }]}>
                          <Ionicons name={expCat.icon as any} size={22} color={expCat.color} />
                        </View>
                        <YStack flex={1}>
                          <Text style={styles.modalTitle}>{(t.budget as any)[expCat.labelKey]}</Text>
                          {expCat.packageNote && (
                            <Text style={styles.modalNote}>{(t.budget as any).expensePackageNote || 'Extra costs beyond package'}</Text>
                          )}
                        </YStack>
                        <Pressable onPress={() => setExpenseModalVisible(false)} hitSlop={10}>
                          <Ionicons name="close" size={22} color={DARK_THEME.textSecondary} />
                        </Pressable>
                      </XStack>
                      <Text style={styles.inputLabel}>What was this expense for?</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. Hotel booking, train tickets..."
                        placeholderTextColor={DARK_THEME.textTertiary}
                        value={expenseDescription}
                        onChangeText={setExpenseDescription}
                        autoCapitalize="sentences"
                      />
                      <Text style={styles.inputLabel}>Amount (€)</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="0.00"
                        placeholderTextColor={DARK_THEME.textTertiary}
                        value={expenseAmount}
                        onChangeText={setExpenseAmount}
                        keyboardType="decimal-pad"
                      />
                      <Text style={styles.inputLabel}>Who paid?</Text>
                      <XStack gap={10} style={{ marginBottom: 20 }}>
                        {(['you', 'split'] as const).map(opt => (
                          <Pressable
                            key={opt}
                            style={[styles.paidByButton, expensePaidBy === opt && styles.paidByButtonActive]}
                            onPress={() => setExpensePaidBy(opt)}
                          >
                            <Text style={[styles.paidByText, expensePaidBy === opt && styles.paidByTextActive]}>
                              {opt === 'you' ? 'You' : 'Split equally'}
                            </Text>
                          </Pressable>
                        ))}
                      </XStack>
                      <Pressable
                        style={[styles.submitButton, (!expenseDescription.trim() || !expenseAmount.trim()) && styles.submitButtonDisabled]}
                        onPress={submitExpense}
                        disabled={!expenseDescription.trim() || !expenseAmount.trim()}
                      >
                        <Text style={styles.submitButtonText}>Add Expense</Text>
                      </Pressable>
                      <Pressable style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setExpenseCategoryKey(null)}>
                        <Text style={{ color: DARK_THEME.textSecondary, fontSize: 13 }}>← Change category</Text>
                      </Pressable>
                    </>
                  );
                })()
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Refund Modal ─── */}
      <Modal
        visible={refundModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRefundModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <Pressable style={{ flex: 1 }} onPress={() => setRefundModalVisible(false)} />
            <View style={styles.modalSheet}>
              <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
                <Text style={styles.modalTitle}>Track a Refund</Text>
                <Pressable onPress={() => setRefundModalVisible(false)} hitSlop={10}>
                  <Ionicons name="close" size={22} color={DARK_THEME.textSecondary} />
                </Pressable>
              </XStack>

              {!refundTemplateKey ? (
                /* Template selection */
                <>
                  <Text style={styles.inputLabel}>Choose a refund type</Text>
                  {REFUND_TEMPLATES.map(tmpl => (
                    <Pressable
                      key={tmpl.key}
                      style={styles.templateRow}
                      onPress={() => {
                        setRefundTemplateKey(tmpl.key);
                        setRefundDescription(tmpl.label);
                      }}
                    >
                      <View style={[styles.refundIcon, { backgroundColor: tmpl.bg }]}>
                        <Ionicons name={tmpl.icon as any} size={18} color={tmpl.color} />
                      </View>
                      <Text style={styles.templateLabel}>{tmpl.label}</Text>
                      <Ionicons name="chevron-forward" size={16} color={DARK_THEME.textTertiary} />
                    </Pressable>
                  ))}
                </>
              ) : (
                /* Refund form */
                <>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={refundDescription}
                    onChangeText={setRefundDescription}
                    autoCapitalize="sentences"
                  />
                  <Text style={styles.inputLabel}>Expected Amount (€)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0.00"
                    placeholderTextColor={DARK_THEME.textTertiary}
                    value={refundAmount}
                    onChangeText={setRefundAmount}
                    keyboardType="decimal-pad"
                  />
                  <Pressable
                    style={[styles.submitButton, (!refundDescription.trim() || !refundAmount.trim()) && styles.submitButtonDisabled]}
                    onPress={submitRefund}
                    disabled={!refundDescription.trim() || !refundAmount.trim()}
                  >
                    <Text style={styles.submitButtonText}>Track Refund</Text>
                  </Pressable>
                  <Pressable style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setRefundTemplateKey(null)}>
                    <Text style={{ color: DARK_THEME.textSecondary, fontSize: 13 }}>← Change type</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  // Event Selector
  eventSelectorWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    zIndex: 10,
  },
  eventSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#5A7EB0',
    borderRadius: 16,
    padding: 14,
  },
  eventSelectorImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  eventSelectorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  eventSelectorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventSelectorDate: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  eventSelectorChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDropdown: {
    marginTop: 6,
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    overflow: 'hidden',
  },
  eventDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.glassBorder,
  },
  eventDropdownItemActive: {
    backgroundColor: 'rgba(90, 126, 176, 0.12)',
  },
  eventDropdownImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  eventDropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  eventDropdownTextActive: {
    color: '#5A7EB0',
    fontWeight: '700',
  },
  eventDropdownDate: {
    fontSize: 11,
    color: DARK_THEME.textTertiary,
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
  // ─── Modals ────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  modalNote: {
    fontSize: 11,
    color: DARK_THEME.textTertiary,
    marginTop: 2,
  },
  modalCatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: DARK_THEME.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: DARK_THEME.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: DARK_THEME.textPrimary,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  paidByButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: DARK_THEME.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  paidByButtonActive: {
    backgroundColor: 'rgba(90,126,176,0.2)',
    borderColor: '#5A7EB0',
  },
  paidByText: {
    fontSize: 13,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  paidByTextActive: {
    color: '#5A7EB0',
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#5A7EB0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(90,126,176,0.3)',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  templateLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: DARK_THEME.textPrimary,
  },
});
