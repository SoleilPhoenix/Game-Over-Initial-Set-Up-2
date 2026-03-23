/**
 * Budget Dashboard Screen (Phase 9)
 * Budget tracking, contributions, and payment status
 * Matches the dark theme glassmorphic design from UI specifications
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, ScrollView, RefreshControl, Pressable, StyleSheet, Alert, Share, Modal, View, Image, FlatList, StatusBar, PanResponder, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useEvents } from '@/hooks/queries/useEvents';
import { useBooking } from '@/hooks/queries/useBookings';
import { useParticipants, participantKeys } from '@/hooks/queries/useParticipants';
import { useInviteGuests } from '@/hooks/queries/useInvites';
import { useUser } from '@/stores/authStore';
import { DARK_THEME } from '@/constants/theme';
import { useTabBarStore } from '@/stores/tabBarStore';
import { useTranslation, getTranslation } from '@/i18n';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import { getEventImage, resolveImageSource } from '@/constants/packageImages';
import { loadBudgetInfo, loadDesiredParticipants, loadGuestDetails, type BudgetInfo, type GuestDetail } from '@/lib/participantCountCache';
import { supabase } from '@/lib/supabase/client';
import { useUrgentPayment } from '@/hooks/useUrgentPayment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { Database } from '@/lib/supabase/types';
import type { EventWithDetails } from '@/repositories/events';

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

// Unique colors for custom categories / custom refunds (never overlap with EXPENSE_CATEGORIES or REFUND_TEMPLATES)
const CUSTOM_COLORS = [
  { color: '#06B6D4', bg: 'rgba(6,182,212,0.15)'  },   // cyan
  { color: '#EAB308', bg: 'rgba(234,179,8,0.15)'  },   // yellow
  { color: '#F43F5E', bg: 'rgba(244,63,94,0.15)'  },   // rose
  { color: '#0EA5E9', bg: 'rgba(14,165,233,0.15)' },   // sky
  { color: '#D97706', bg: 'rgba(217,119,6,0.15)'  },   // amber
];

function SwipeableRefundRow({
  description, amount, processingLabel, processingText, showBorder, onDelete, icon, color, bg,
}: {
  description: string; amount: string; processingLabel: string; processingText: string; showBorder: boolean; onDelete: () => void;
  icon?: string; color?: string; bg?: string;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) translateX.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -80) {
          Animated.timing(translateX, { toValue: -400, duration: 150, useNativeDriver: true }).start(() => onDelete());
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[{ transform: [{ translateX }] }, showBorder && styles.contributionRowBorder]}
      {...panResponder.panHandlers}
    >
      <View style={styles.refundRow}>
        <XStack alignItems="center" gap="$3" flex={1}>
          <View style={[styles.refundIcon, { backgroundColor: bg ?? 'rgba(255,255,255,0.08)' }]}>
            <Ionicons name={(icon ?? 'receipt-outline') as any} size={18} color={color ?? DARK_THEME.textSecondary} />
          </View>
          <YStack>
            <Text style={{ fontSize: 14, fontWeight: '500', color: DARK_THEME.textPrimary }}>{description}</Text>
            <Text style={{ fontSize: 12, color: DARK_THEME.textTertiary }}>{processingLabel}</Text>
          </YStack>
        </XStack>
        <YStack alignItems="flex-end">
          <Text style={{ fontSize: 14, fontWeight: '500', color: DARK_THEME.textPrimary }}>+€{amount}</Text>
          <View style={styles.processingBadge}>
            <Text style={styles.processingText}>{processingText}</Text>
          </View>
        </YStack>
      </View>
    </Animated.View>
  );
}

export default function BudgetDashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasUnseenUrgency, markUrgencySeen, isGuestContribution, guestUrgentEvent, guestDaysLeft } = useUrgentPayment();
  // eventId = opened via /(tabs)/budget?eventId=xxx (old approach, kept for safety)
  // id     = opened via /event/[id]/budget (event-stack, router.back() works correctly)
  const { eventId: rawEventIdParam, id: pathId } = useLocalSearchParams<{ eventId?: string; id?: string }>();
  const eventIdParam = rawEventIdParam || pathId;
  const insets = useSafeAreaInsets();
  const user = useUser();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventIdParam || null);
  const [markingPaidUserId, setMarkingPaidUserId] = useState<string | null>(null);
  // Derived: is the current user the organizer of the selected event?
  // Used to hide organizer-only actions (Pay Remaining Balance, Invite Guests, Remind All).
  const [eventSelectorOpen, setEventSelectorOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory>('package');
  const [cachedBudget, setCachedBudget] = useState<BudgetInfo | null>(null);
  const [cachedParticipantCount, setCachedParticipantCount] = useState<number | null>(null);
  const [cachedGuests, setCachedGuests] = useState<Record<number, GuestDetail>>({});
  const { t } = useTranslation();
  const setTabBarHidden = useTabBarStore((s) => s.setHidden);

  // Remind-all channel picker modal
  const [remindModal, setRemindModal] = useState<{
    visible: boolean;
    sendStatus: 'idle' | 'sending' | 'done';
    activeChannel: 'email' | 'sms' | 'whatsapp' | null;
    results: Array<{ status: string; recipient: string; error?: string }>;
  }>({ visible: false, sendStatus: 'idle', activeChannel: null, results: [] });

  // Expense modal
  const [expenseModal, setExpenseModal] = useState<{
    visible: boolean;
    categoryKey: string | null;
    viewMode: 'list' | 'form';
    description: string;
    amount: string;
    paidBy: 'you' | 'other';
    paidByPerson: string | null;
    contributors: string[];
    editingIndex: number | null;
    payerDropdownOpen: boolean;
  }>({ visible: false, categoryKey: null, viewMode: 'form', description: '', amount: '', paidBy: 'you', paidByPerson: null, contributors: [], editingIndex: null, payerDropdownOpen: false });

  const [addedExpenses, setAddedExpenses] = useState<Array<{
    categoryKey: string; description: string; amount: string;
    paidBy: 'you' | 'other'; paidByPerson?: string | null; contributors: string[];
  }>>([]);

  // Custom categories (user-created)
  const [customCategories, setCustomCategories] = useState<ExpenseCategory[]>([]);
  const [customCatModal, setCustomCatModal] = useState<{
    visible: boolean;
    label: string;
  }>({ visible: false, label: '' });

  // Refund modal
  const [refundModal, setRefundModal] = useState<{
    visible: boolean;
    templateKey: string | null;
    description: string;
    amount: string;
  }>({ visible: false, templateKey: null, description: '', amount: '' });

  const [addedRefunds, setAddedRefunds] = useState<Array<{ description: string; amount: string; status: 'processing' | 'received'; icon?: string; color?: string; bg?: string; }>>([]);

  // Ref always holds latest contributors — avoids declaration-order TDZ issue with useCallback
  const allContributorsRef = useRef<Array<{ id: string; name: string; userId?: string | null; role?: string }>>([]);

  // Drag-to-dismiss for budget modals (matches destination.tsx pattern)
  const expenseSheetY = useRef(new Animated.Value(0)).current;
  const refundSheetY = useRef(new Animated.Value(0)).current;
  const customCatSheetY = useRef(new Animated.Value(0)).current;

  const makeModalPan = (sheetY: Animated.Value, onClose: () => void) =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) sheetY.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          Animated.timing(sheetY, { toValue: 800, duration: 200, useNativeDriver: true }).start(() => {
            onClose(); sheetY.setValue(0);
          });
        } else {
          Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 8 }).start();
        }
      },
    });

  const expenseSheetPan = useRef(makeModalPan(expenseSheetY, () => setExpenseModal(prev => ({ ...prev, visible: false })))).current;
  const refundSheetPan = useRef(makeModalPan(refundSheetY, () => setRefundModal(prev => ({ ...prev, visible: false })))).current;
  const customCatSheetPan = useRef(makeModalPan(customCatSheetY, () => setCustomCatModal(prev => ({ ...prev, visible: false })))).current;

  const openExpenseModal = useCallback((categoryKey: string) => {
    const existing = addedExpenses.filter(e => e.categoryKey === categoryKey);
    setExpenseModal(prev => ({
      ...prev,
      editingIndex: null,
      categoryKey,
      viewMode: existing.length > 0 ? 'list' : 'form',
      description: '',
      amount: '',
      paidBy: 'you',
      paidByPerson: null,
      contributors: [],
      visible: true,
    }));
  }, [addedExpenses]);

  const openEditExpense = useCallback((globalIdx: number) => {
    const exp = addedExpenses[globalIdx];
    if (!exp) return;
    setExpenseModal(prev => ({
      ...prev,
      editingIndex: globalIdx,
      categoryKey: exp.categoryKey,
      description: exp.description,
      amount: exp.amount,
      paidBy: exp.paidBy,
      paidByPerson: exp.paidByPerson || null,
      contributors: exp.contributors,
      viewMode: 'form',
      visible: true,
    }));
  }, [addedExpenses]);

  const submitExpense = useCallback(() => {
    if (!expenseModal.description.trim() || !expenseModal.amount.trim() || !expenseModal.categoryKey) return;
    const newExpense = {
      categoryKey: expenseModal.categoryKey,
      description: expenseModal.description.trim(),
      amount: expenseModal.amount.trim(),
      paidBy: expenseModal.paidBy,
      paidByPerson: expenseModal.paidBy === 'other' ? expenseModal.paidByPerson : null,
      contributors: expenseModal.contributors,
    };
    setAddedExpenses(prev => {
      const updated = expenseModal.editingIndex !== null
        ? prev.map((e, i) => i === expenseModal.editingIndex ? newExpense : e)
        : [...prev, newExpense];
      if (selectedEventId) {
        AsyncStorage.setItem(`gameover:expenses:${selectedEventId}`, JSON.stringify(updated));
      }
      return updated;
    });
    setExpenseModal(prev => ({ ...prev, editingIndex: null, visible: false }));
  }, [expenseModal, selectedEventId]);

  const openRefundModal = useCallback(() => {
    setRefundModal({ visible: true, templateKey: null, description: '', amount: '' });
  }, []);

  const submitRefund = useCallback(() => {
    if (!refundModal.description.trim() || !refundModal.amount.trim()) return;
    const tmpl = REFUND_TEMPLATES.find(t => t.key === refundModal.templateKey);
    setAddedRefunds(prev => {
      const customColor = CUSTOM_COLORS[prev.length % CUSTOM_COLORS.length];
      const updated = [{
        description: refundModal.description.trim(),
        amount: refundModal.amount.trim(),
        status: 'processing' as const,
        icon: tmpl?.icon ?? 'receipt-outline',
        color: tmpl?.color ?? customColor.color,
        bg: tmpl?.bg ?? customColor.bg,
      }, ...prev];
      if (selectedEventId) {
        AsyncStorage.setItem(`gameover:refunds:${selectedEventId}`, JSON.stringify(updated));
      }
      return updated;
    });
    setRefundModal(prev => ({ ...prev, visible: false }));
  }, [refundModal, selectedEventId]);

  // Hide tab bar when opened from Event Summary (eventIdParam present).
  // Also refetch participants on focus so payment status reflects "I've Paid" from Notifications screen.
  useFocusEffect(
    useCallback(() => {
      if (eventIdParam) setTabBarHidden(true);
      if (selectedEventId) {
        queryClient.invalidateQueries({ queryKey: participantKeys.byEvent(selectedEventId) });
      }
      return () => setTabBarHidden(false);
    }, [eventIdParam, selectedEventId, queryClient])
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
    return (events || []).filter((e: EventWithDetails) => e.status === 'booked' || e.status === 'completed');
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
    markUrgencySeen();
    if (isGuestContribution && guestUrgentEvent) {
      router.push(`/event/${guestUrgentEvent.id}/budget` as any);
    } else {
      router.push('/notifications');
    }
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

  const selectedEvent = bookedEvents.find((e: EventWithDetails) => e.id === selectedEventId);
  const isOrganizer = selectedEvent?.created_by === user?.id;

  // Fetch invite codes to include non-registered invited guests in contributors list
  const { data: rawInviteGuests = [] } = useInviteGuests(selectedEventId ?? null);
  const inviteCodeGuests = useMemo(
    () => rawInviteGuests
      .filter(ic => ic.guest_email || ic.guest_first_name)
      .map(ic => ({
        id: ic.id,
        name: [ic.guest_first_name, ic.guest_last_name].filter(Boolean).join(' ')
          || ic.guest_email?.split('@')[0] || 'Guest',
        email: ic.guest_email?.toLowerCase() || '',
      })),
    [rawInviteGuests]
  );

  // Load all persisted data when event changes
  useEffect(() => {
    if (!selectedEventId) return;
    // Reset local state before loading new event's data
    setAddedExpenses([]);
    setAddedRefunds([]);
    setCustomCategories([]);
    // Budget cache
    loadBudgetInfo(selectedEventId).then(info => setCachedBudget(info ?? null));
    loadDesiredParticipants(selectedEventId).then(count => setCachedParticipantCount(count ?? null));
    loadGuestDetails(selectedEventId).then(guests => setCachedGuests(guests ?? {}));
    // Persisted expenses / refunds / custom categories
    AsyncStorage.getItem(`gameover:expenses:${selectedEventId}`).then(json => {
      if (json) try { setAddedExpenses(JSON.parse(json)); } catch {}
    });
    AsyncStorage.getItem(`gameover:refunds:${selectedEventId}`).then(json => {
      if (json) try { setAddedRefunds(JSON.parse(json)); } catch {}
    });
    AsyncStorage.getItem(`gameover:custom_cats:${selectedEventId}`).then(json => {
      if (json) try { setCustomCategories(JSON.parse(json)); } catch {}
    });
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
      // Use actual paid amount from cache (full payment vs deposit)
      const collected = cachedBudget?.paidAmountCents ?? deposit;
      return {
        totalBudget: total,
        collected,
        pending: Math.max(0, total - collected),
        percentage: total > 0 ? Math.round((collected / total) * 100) : 0,
        paidCount: 1, // organizer paid deposit
        pendingCount: Math.max(0, payingCount - 1),
        perPerson,
        payingCount,
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

    const perPersonCents = booking!.per_person_cents || 0;
    // Reverse-engineer paying count from total: assumes total = perPerson × count × 1.1 (10% service fee)
    // This is display-only — not used for payment calculations
    const dbPayingCount = perPersonCents > 0 ? Math.round(totalBudget / (perPersonCents * 1.1)) : (participants?.length || 0);
    return {
      totalBudget,
      collected,
      pending: totalBudget - collected,
      percentage: totalBudget > 0 ? Math.round((collected / totalBudget) * 100) : 0,
      paidCount,
      perPerson: perPersonCents,
      pendingCount,
      payingCount: dbPayingCount,
    };
  }, [booking, participants, cachedBudget, cachedParticipantCount, cachedGuests]);

  // Format currency (with cents)
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  // Format currency rounded to nearest euro (no decimal places)
  const formatCurrencyRounded = (cents: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(cents / 100));
  };

  // Format Deposit and Due so they always sum exactly to the rounded total.
  // Deposit floors to avoid overcharging upfront; Due = total - deposit (no independent rounding).
  const formatDepositAndDue = (collectedCents: number, totalCents: number) => {
    const fmt = (euros: number) => new Intl.NumberFormat('de-DE', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(euros);
    const depositEuros = Math.round(collectedCents / 100);
    const totalEuros = Math.round(totalCents / 100);
    const dueEuros = totalEuros - depositEuros;
    return { deposit: fmt(depositEuros), due: fmt(dueEuros) };
  };

  // Navigate to share/invite screen
  const handleInvite = useCallback(() => {
    const effectiveEventId = selectedEventId || eventIdParam;
    if (effectiveEventId) {
      router.push(`/event/${effectiveEventId}/share`);
    } else {
      Alert.alert(t.budget.noEventSelected, t.budget.noEventSelectedMsg);
    }
  }, [selectedEventId, eventIdParam, router]);

  // Remind All — opens channel picker modal (same UX as Manage Invitations)
  const handleRemindAll = useCallback(() => {
    setRemindModal({ visible: true, sendStatus: 'idle', activeChannel: null, results: [] });
  }, []);

  // Send reminder via chosen channel using the guest-invitations edge function
  const handleRemindViaChannel = useCallback(async (channel: 'email' | 'sms' | 'whatsapp') => {
    if (!selectedEventId) return;
    setRemindModal(prev => ({ ...prev, activeChannel: channel, sendStatus: 'sending' }));
    try {
      await supabase.auth.refreshSession().catch(() => {});
      const guestDetailsMap = await loadGuestDetails(selectedEventId);
      const guests = Object.entries(guestDetailsMap).map(([, g]) => ({
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email,
        phone: g.phone,
      })).filter(g => g.email || g.phone);

      const { data, error } = await supabase.functions.invoke('send-guest-invitations', {
        body: { eventId: selectedEventId, channel, guests },
      });
      if (error) {
        let detail = error.message ?? 'Unknown error';
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) detail = body.error;
        } catch {}
        Alert.alert(t.budget.sendFailed, detail);
        setRemindModal(prev => ({ ...prev, sendStatus: 'idle' }));
        return;
      }
      setRemindModal(prev => ({ ...prev, results: data?.results ?? [], sendStatus: 'done' }));
    } catch {
      Alert.alert(t.common.error, t.budget.errorSendingReminders);
      setRemindModal(prev => ({ ...prev, sendStatus: 'idle' }));
    }
  }, [selectedEventId]);

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

  // Build demo participant list only when neither DB booking nor DB participants exist
  const demoParticipants = useMemo(() => {
    if (booking) return null; // real booking record — use DB participants
    if (participants && participants.length > 0) return null; // DB participants loaded — use them directly
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
        // +1 so numbers align with participants screen (organizer = slot 1, first guest = slot 2, etc.)
        : `Guest ${i + 1}`;
      list.push({ id: `g-${i}`, name, status: 'pending', amount: budgetStats.perPerson });
    }
    // Add honoree ONLY if they pay their own share:
    // payingCount >= cachedParticipantCount means everyone (including honoree) is paying.
    // If payingCount < cachedParticipantCount the group is covering the honoree's share.
    const honoreeName = selectedEvent?.honoree_name;
    const honoreeIsPaying =
      cachedBudget?.payingCount != null && cachedParticipantCount != null
        ? cachedBudget.payingCount >= cachedParticipantCount
        : false;
    if (honoreeName && honoreeIsPaying) {
      // Remove last guest placeholder so honoree slot doesn't add an extra person.
      // Loop ran i=1..totalPaying-1, giving totalPaying-1 guests. Together with
      // organizer + honoree that would be totalPaying+1. Pop one guest to correct.
      if (list.length > 1) list.pop();
      list.push({ id: 'honoree', name: honoreeName, status: 'pending', amount: budgetStats.perPerson });
    }
    return list;
  }, [booking, participants, cachedBudget, cachedParticipantCount, cachedGuests, userName, budgetStats, selectedEvent]);

  // Sort DB participants so organizer is always first in contribution list
  const sortedParticipants = useMemo(() => {
    if (!participants) return null;
    return [...(participants as any[])].sort((a, b) => {
      if (a.role === 'organizer') return -1;
      if (b.role === 'organizer') return 1;
      return 0;
    });
  }, [participants]);

  // Normalised contributor list for expense modal (works with both demo + DB participants)
  // Includes userId + role for filtering (exclude self, exclude honoree)
  const allContributors = useMemo<Array<{ id: string; name: string; userId?: string | null; role?: string }>>(() => {
    if (demoParticipants) return demoParticipants.map(p => ({
      id: p.id,
      name: p.name,
      userId: p.id === 'organizer' ? (selectedEvent?.created_by ?? null) : null,
      role: p.id === 'organizer' ? 'organizer' : p.id === 'honoree' ? 'honoree' : 'guest',
    }));
    if (sortedParticipants) {
      const base: Array<{ id: string; name: string; userId?: string | null; role?: string }> =
        sortedParticipants.map(p => ({
          id: p.id as string,
          name: p.profile?.full_name || p.profile?.email?.split('@')[0] || 'Guest',
          userId: (p as any).user_id ?? null,
          role: (p as any).role,
        }));
      // Add non-registered invited guests from invite_codes (e.g. Hans Zimmer), deduplicated
      const registeredEmails = new Set(
        sortedParticipants
          .map(p => p.profile?.email?.toLowerCase())
          .filter(Boolean)
      );
      const seenInvites = new Set<string>();
      for (const ic of inviteCodeGuests) {
        if (ic.email && registeredEmails.has(ic.email)) continue; // already registered
        const dedupeKey = ic.email || ic.name.toLowerCase();
        if (seenInvites.has(dedupeKey)) continue;
        seenInvites.add(dedupeKey);
        base.push({ id: `invite-${ic.id}`, name: ic.name, userId: null, role: 'guest' });
      }
      // Also include locally-cached guests (entered in Manage Invitations but not yet sent)
      for (const guest of Object.values(cachedGuests)) {
        const name = [guest.firstName, guest.lastName].filter(Boolean).join(' ');
        const email = guest.email?.toLowerCase() || '';
        if (!name && !email) continue;
        if (email && registeredEmails.has(email)) continue;
        const dedupeKey = email || name.toLowerCase();
        if (seenInvites.has(dedupeKey)) continue;
        seenInvites.add(dedupeKey);
        base.push({ id: `cached-${dedupeKey}`, name: name || email.split('@')[0] || 'Guest', userId: null, role: 'guest' });
      }
      return base;
    }
    return [];
  }, [demoParticipants, sortedParticipants, inviteCodeGuests, cachedGuests, selectedEvent?.created_by]);
  // Keep ref in sync so openExpenseModal always has the latest list
  allContributorsRef.current = allContributors;

  // Registered participant emails (for deduplication with invite guests)
  const registeredEmailSet = useMemo(() => new Set(
    (sortedParticipants || []).map(p => p.profile?.email?.toLowerCase()).filter(Boolean) as string[]
  ), [sortedParticipants]);

  // Non-registered invited guests to show in Group Contributions
  // Includes both invite_codes (sent invitations) AND locally-cached guests (entered but not yet sent)
  // Deduplicated so the same person never appears twice
  const nonRegisteredInviteGuests = useMemo(() => {
    if (demoParticipants) return [];
    const seen = new Set<string>();
    const result: Array<{ id: string; name: string; email: string }> = [];
    // 1. Sent invitations (invite_codes DB rows)
    for (const ic of inviteCodeGuests) {
      if (ic.email && registeredEmailSet.has(ic.email)) continue;
      const dedupeKey = ic.email || ic.name.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      result.push(ic);
    }
    // 2. Locally-cached guests (entered in Manage Invitations but not yet formally invited)
    for (const guest of Object.values(cachedGuests)) {
      const name = [guest.firstName, guest.lastName].filter(Boolean).join(' ');
      const email = guest.email?.toLowerCase() || '';
      if (!name && !email) continue;
      if (email && registeredEmailSet.has(email)) continue;
      const dedupeKey = email || name.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      result.push({ id: `cached-${dedupeKey}`, name: name || email.split('@')[0] || 'Guest', email });
    }
    return result;
  }, [demoParticipants, inviteCodeGuests, registeredEmailSet, cachedGuests]);

  // For "Someone else paid" — exclude current user AND honoree (can't pay yourself or honoree)
  const payerOptions = useMemo(
    () => allContributors.filter(c =>
      c.role !== 'honoree' &&
      c.id !== 'honoree' &&
      c.userId !== user?.id
    ),
    [allContributors, user?.id]
  );

  // Days until event (calendar-date comparison — no time-of-day skew)
  const daysUntilEvent = useMemo(() => {
    if (!selectedEvent?.start_date) return null;
    const start = new Date(selectedEvent.start_date);
    const now = new Date();
    const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((startMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));
  }, [selectedEvent?.start_date]);

  // Fire a local notification once when event is within 14 days and balance unpaid.
  // Keyed by days-remaining so it re-fires if the user opens the app on a new day.
  useEffect(() => {
    if (!selectedEventId || !selectedEvent?.start_date) return;
    if (budgetStats.percentage >= 100) return;
    if (daysUntilEvent === null || daysUntilEvent <= 0 || daysUntilEvent > 14) return;
    const notifKey = `gameover:notif_14day:${selectedEventId}:${daysUntilEvent}`;
    AsyncStorage.getItem(notifKey).then(already => {
      if (already) return;
      const eventName = selectedEvent.title
        || (selectedEvent.honoree_name ? `${selectedEvent.honoree_name}'s Event` : 'your event');
      const tr = getTranslation();
      Notifications.scheduleNotificationAsync({
        content: {
          title: (tr.budget as any).notif14DayTitle,
          body: (tr.budget as any).notif14DayBody
            .replace('{{eventName}}', eventName)
            .replace('{{count}}', String(daysUntilEvent))
            .replace('{{amount}}', formatCurrencyRounded(budgetStats.pending)),
          data: { screen: '/(tabs)/budget', eventId: selectedEventId },
          sound: true,
        },
        trigger: null,
      }).catch(() => {});
      AsyncStorage.setItem(notifKey, 'shown');
    });
  }, [selectedEventId, daysUntilEvent, budgetStats.percentage]);

  // All expense categories (preset + user-created)
  const allExpenseCategories = useMemo<ExpenseCategory[]>(
    () => [...EXPENSE_CATEGORIES, ...customCategories],
    [customCategories]
  );

  // Helper: save custom categories to AsyncStorage
  const saveCustomCategories = useCallback((cats: ExpenseCategory[]) => {
    if (selectedEventId) {
      AsyncStorage.setItem(`gameover:custom_cats:${selectedEventId}`, JSON.stringify(cats));
    }
  }, [selectedEventId]);

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
              {hasUnseenUrgency && <View style={styles.notificationUrgentDot} />}
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
            {hasUnseenUrgency && <View style={styles.notificationUrgentDot} />}
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
            refreshing={isRefetching}
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
                {/* Main stats — dynamic based on payment state */}
                {budgetStats.percentage >= 100 ? (
                  /* Fully paid: Package Price left (green), Due €0 right (grey) */
                  <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$3">
                    <YStack gap={4}>
                      <Text fontSize={12} fontWeight="500" color={DARK_THEME.textTertiary} letterSpacing={0.5}>
                        Total Package Paid
                      </Text>
                      <Text fontSize={24} fontWeight="700" color="#10B981" letterSpacing={-0.5}>
                        {formatCurrencyRounded(budgetStats.totalBudget)}
                      </Text>
                    </YStack>
                    <YStack gap={4} alignItems="flex-end">
                      <Text fontSize={12} fontWeight="500" color={DARK_THEME.textTertiary} letterSpacing={0.3}>
                        Due
                      </Text>
                      <Text fontSize={24} fontWeight="700" color={DARK_THEME.textTertiary} letterSpacing={-0.5}>
                        {formatCurrencyRounded(0)}
                      </Text>
                    </YStack>
                  </XStack>
                ) : (
                  /* Deposit paid, remainder still due */
                  (() => {
                    const { deposit: fmtDeposit, due: fmtDue } = formatDepositAndDue(budgetStats.collected, budgetStats.totalBudget);
                    return (
                  <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$3">
                    <YStack gap={4}>
                      <Text fontSize={12} fontWeight="500" color={DARK_THEME.textTertiary} letterSpacing={0.5}>
                        Deposit (25%)
                      </Text>
                      <Text fontSize={24} fontWeight="700" color="#10B981" letterSpacing={-0.5}>
                        {fmtDeposit}
                      </Text>
                    </YStack>
                    <YStack gap={4} alignItems="flex-end">
                      <Text fontSize={12} fontWeight="500" color={DARK_THEME.textTertiary} letterSpacing={0.3}>
                        Due (75%)
                      </Text>
                      <Text fontSize={24} fontWeight="700" color={DARK_THEME.textPrimary} letterSpacing={-0.5}>
                        {fmtDue}
                      </Text>
                      {daysUntilEvent !== null && daysUntilEvent > 0 && (
                        <Text
                          fontSize={11}
                          fontWeight="600"
                          color={daysUntilEvent <= 14 ? '#F97316' : DARK_THEME.textTertiary}
                          letterSpacing={0.2}
                        >
                          {(t.budget as any).dueInDays.replace('{{count}}', String(daysUntilEvent))}
                        </Text>
                      )}
                    </YStack>
                  </XStack>
                    );
                  })()
                )}

                {/* Progress Bar: blue = paid portion, bordeaux background = remaining */}
                <View style={styles.progressContainer}>
                  <View
                    style={[styles.progressBar, {
                      width: `${budgetStats.percentage}%`,
                      backgroundColor: DARK_THEME.primary,
                    }]}
                  />
                </View>

                {/* Price Breakdown — always shown */}
                {budgetStats.payingCount > 0 && (() => {
                  const pkgSlug = cachedBudget?.packageId || (booking as any)?.package_id || '';
                  const pkgTier = pkgSlug.split('-').pop() as string;
                  const tierPriceCents: Record<string, number> = { essential: 9900, classic: 14900, grand: 19900 };
                  const tierNames: Record<string, string> = { essential: 'Bronze', classic: 'Silver', grand: 'Gold' };
                  const basePerPkg = tierPriceCents[pkgTier] ?? budgetStats.perPerson;
                  const pkgName = tierNames[pkgTier] || 'Package';
                  const totalCount = cachedParticipantCount || (budgetStats.payingCount + 1);
                  const honoreeExcluded = cachedParticipantCount != null && budgetStats.payingCount < cachedParticipantCount;
                  const baseAmount = basePerPkg * totalCount;
                  const serviceFee = Math.ceil(baseAmount * 0.1);
                  const grandTotal = baseAmount + serviceFee;
                  const perPayingPerson = honoreeExcluded ? Math.ceil(grandTotal / budgetStats.payingCount) : 0;
                  return (
                    <View style={{ marginTop: 8 }}>
                      {/* Thin divider */}
                      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 8 }} />
                      {/* Row 1: package price × total participants */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text fontSize={12} color={DARK_THEME.textTertiary}>
                          {formatCurrencyRounded(basePerPkg)} / {pkgName} Package × {totalCount}
                        </Text>
                        <Text fontSize={12} color={DARK_THEME.textTertiary}>
                          {formatCurrencyRounded(baseAmount)}
                        </Text>
                      </View>
                      {/* Row 2: service fee */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text fontSize={12} color="rgba(249,115,22,0.9)">Service Fee (10%)</Text>
                        <Text fontSize={12} color="rgba(249,115,22,0.9)">{formatCurrencyRounded(serviceFee)}</Text>
                      </View>
                      {/* Row 3: total — thin divider + total line */}
                      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 6 }} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: honoreeExcluded ? 8 : 0 }}>
                        <Text fontSize={12} fontWeight="600" color={DARK_THEME.textSecondary}>Total Package Price</Text>
                        <Text fontSize={12} fontWeight="600" color={DARK_THEME.textSecondary}>{formatCurrencyRounded(grandTotal)}</Text>
                      </View>
                      {/* Row 4: per paying person — only when honoree is covered by group */}
                      {honoreeExcluded && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.12)' }}>
                          <Text fontSize={11} color={DARK_THEME.textTertiary}>
                            ↳ {budgetStats.payingCount} persons · Honoree covered by group
                          </Text>
                          <Text fontSize={11} fontWeight="600" color={DARK_THEME.textSecondary}>
                            {formatCurrencyRounded(perPayingPerson)}/person
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Pay Remaining Balance — organizers only */}
                {budgetStats.percentage < 100 && budgetStats.pending > 0 && (
                  isOrganizer ? (
                    <Pressable
                      style={styles.payRemainingButton}
                      onPress={() => {
                        if (!selectedEventId) return;
                        const packageIdForPayment = cachedBudget?.packageId || (booking as any)?.package_id;
                        const participantsForPayment = cachedBudget?.payingCount;
                        const params = new URLSearchParams({ payFull: '1' });
                        if (packageIdForPayment) params.set('packageId', packageIdForPayment);
                        if (participantsForPayment) params.set('participants', String(participantsForPayment + 1));
                        if (selectedEvent?.city_id) params.set('cityId', selectedEvent.city_id);
                        params.set('amountCents', String(budgetStats.pending));
                        params.set('totalCents', String(budgetStats.totalBudget));
                        router.push(`/booking/${selectedEventId}/payment?${params.toString()}` as any);
                      }}
                    >
                      <View style={styles.payRemainingIcon}>
                        <Ionicons name="card-outline" size={20} color="#F97316" />
                      </View>
                      <YStack flex={1}>
                        <Text style={styles.payRemainingTitle}>{(t.budget as any).payRemainingBtn}</Text>
                        <Text style={styles.payRemainingSubtitleText}>
                          {formatCurrencyRounded(budgetStats.pending)} · {(t.budget as any).payRemainingSubtitle}
                        </Text>
                      </YStack>
                      <Ionicons name="chevron-forward" size={18} color={DARK_THEME.textTertiary} />
                    </Pressable>
                  ) : (
                    <View style={styles.guestRemainingInfo}>
                      <Ionicons name="information-circle-outline" size={18} color={DARK_THEME.textSecondary} />
                      <Text style={styles.guestRemainingText}>
                        The remaining {formatCurrencyRounded(budgetStats.pending)} will be paid by the organizer 14 days before the event.
                      </Text>
                    </View>
                  )
                )}
              </YStack>
            </View>

            {/* Group Contributions */}
            <YStack marginBottom="$4">
              <XStack justifyContent="space-between" alignItems="center" marginBottom="$3" paddingHorizontal="$1">
                <Text fontSize={12} fontWeight="700" color={DARK_THEME.textTertiary} textTransform="uppercase" letterSpacing={0.8}>
                  {t.budget.groupContributions}
                </Text>
                {isOrganizer && budgetStats.pendingCount > 0 && (
                  <Pressable onPress={handleRemindAll}>
                    <Text fontSize={12} fontWeight="500" color={DARK_THEME.primary}>
                      {t.budget.remindAll}
                    </Text>
                  </Pressable>
                )}
              </XStack>

              <View style={[styles.glassCard, { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8 }]}>
                {/* Use demo participants when no DB booking, otherwise DB participants */}
                {(demoParticipants || sortedParticipants)?.map((participantRaw, index) => {
                  type DemoP = { id: string; name: string; status: 'paid' | 'pending'; amount: number };
                  const isDemo = !!demoParticipants;
                  // Normalise to common shape
                  const name = isDemo
                    ? (participantRaw as DemoP).name
                    : (((participantRaw as any).profile?.full_name) || (participantRaw as any).profile?.email?.split('@')[0] || '—');
                  const isOrganizerRow = isDemo
                    ? (participantRaw as DemoP).id === 'organizer'
                    : (participantRaw as any).role === 'organizer';
                  const isPaid = isDemo
                    ? (participantRaw as DemoP).status === 'paid'
                    // Organizer is always considered paid — they covered the deposit for the whole group
                    : (participantRaw as any).payment_status === 'paid' || isOrganizerRow;
                  const isPending = !isPaid;
                  const perPersonAmount = booking?.per_person_cents || budgetStats.perPerson || 0;
                  const amountForRow = isDemo
                    ? (participantRaw as DemoP).amount
                    // Organizer: show deposit paid (not full per-person) when balance still outstanding
                    : isOrganizerRow && budgetStats.percentage < 100
                      ? budgetStats.collected
                      : perPersonAmount;
                  // isCurrentUser: true when this row represents the currently logged-in user.
                  // Demo mode: index 0 is always the organizer — mark as (You) only if they ARE the organizer.
                  // DB mode: compare user_id directly.
                  const isCurrentUser = isDemo
                    ? (participantRaw as DemoP).id === 'organizer'
                      ? selectedEvent?.created_by === user?.id
                      : false
                    : (participantRaw as any).user_id === user?.id;
                  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                  const initials = (name.split(' ').map((n: string) => n[0] || '').filter(Boolean).join('').toUpperCase().slice(0, 2)) || '?';
                  const key = (participantRaw as any).id as string;

                  return (
                    <React.Fragment key={key}>
                      <View
                        style={[
                          styles.contributionRow,
                          (index !== ((demoParticipants || sortedParticipants)?.length || 0) - 1 || nonRegisteredInviteGuests.length > 0) && styles.contributionRowBorder,
                        ]}
                      >
                        {/* Avatar */}
                        <View style={[styles.participantAvatarInitials, { backgroundColor: avatarColor }]}>
                          <Text style={styles.participantInitialsText}>{initials}</Text>
                        </View>

                        {/* Name + amount — flex: 1 with right margin to keep space for badge */}
                        <View style={{ flex: 1, marginLeft: 12, marginRight: 4 }}>
                          <Text
                            style={{ fontSize: 14, fontWeight: '500', color: DARK_THEME.textPrimary }}
                            numberOfLines={1}
                          >
                            {name}{isCurrentUser ? ` ${t.budget.you}` : ''}
                          </Text>
                          <Text
                            style={{ fontSize: 12, color: DARK_THEME.textTertiary }}
                            numberOfLines={1}
                          >
                            {isPending
                              ? t.budget.pendingOwes.replace('{{amount}}', formatCurrency(amountForRow))
                              : t.budget.contribution.replace('{{amount}}', formatCurrency(amountForRow))
                            }
                          </Text>
                        </View>

                        {/* Status Badge — compact, top-aligned */}
                        <View style={[
                          styles.paymentBadge,
                          { flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 },
                          isPaid ? styles.paidBadge : styles.pendingBadge,
                        ]}>
                          <Ionicons
                            name={isPaid ? 'checkmark' : 'time-outline'}
                            size={10}
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

                      {/* "I've Paid" button — guest's own pending row only */}
                      {isCurrentUser && isPending && !isOrganizer && !isDemo && (
                        <Pressable
                          style={[styles.markPaidButton, markingPaidUserId === user?.id && { opacity: 0.6 }]}
                          disabled={markingPaidUserId === user?.id}
                          onPress={() => {
                            Alert.alert(
                              t.budget.confirmPayment,
                              t.budget.confirmPaymentMsg,
                              [
                                { text: t.budget.notYet, style: 'cancel' },
                                {
                                  text: t.budget.yesPaid,
                                  onPress: async () => {
                                    if (!selectedEventId || !user?.id) return;
                                    setMarkingPaidUserId(user.id);
                                    try {
                                      await supabase
                                        .from('event_participants')
                                        .update({ payment_status: 'paid' })
                                        .eq('event_id', selectedEventId)
                                        .eq('user_id', user.id);
                                      queryClient.invalidateQueries({ queryKey: participantKeys.byEvent(selectedEventId) });
                                      queryClient.invalidateQueries({ queryKey: ['guestParticipations', user.id] });
                                      Alert.alert(t.budget.thankYou, t.budget.paymentConfirmedMsg);
                                    } catch {
                                      Alert.alert(t.common.error, t.budget.errorUpdatingStatus);
                                    } finally {
                                      setMarkingPaidUserId(null);
                                    }
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={14} color={DARK_THEME.primary} />
                          <Text style={styles.markPaidButtonText}>I've Paid</Text>
                        </Pressable>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Non-registered invited guests (invited but not yet signed up) */}
                {nonRegisteredInviteGuests.map((ic, idx) => {
                  const perPerson = booking?.per_person_cents || budgetStats.perPerson || 0;
                  const avatarColor = AVATAR_COLORS[((demoParticipants || sortedParticipants)?.length || 0 + idx) % AVATAR_COLORS.length];
                  const initials = ic.name.split(' ').map((n: string) => n[0] || '').filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';
                  const isLast = idx === nonRegisteredInviteGuests.length - 1;
                  return (
                    <View
                      key={`invite-${ic.id}`}
                      style={[styles.contributionRow, !isLast && styles.contributionRowBorder]}
                    >
                      <View style={[styles.participantAvatarInitials, { backgroundColor: avatarColor }]}>
                        <Text style={styles.participantInitialsText}>{initials}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12, marginRight: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: DARK_THEME.textPrimary }} numberOfLines={1}>
                          {ic.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: DARK_THEME.textTertiary }} numberOfLines={1}>
                          {t.budget.pendingOwes.replace('{{amount}}', formatCurrency(perPerson))}
                        </Text>
                      </View>
                      <View style={[styles.paymentBadge, { flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }, styles.pendingBadge]}>
                        <Ionicons name="time-outline" size={10} color={DARK_THEME.warning} />
                        <Text style={[styles.paymentBadgeText, { color: DARK_THEME.warning }]}>{t.budget.pending}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Invite button — organizers only */}
              {isOrganizer && (
                <Pressable style={styles.inviteButton} onPress={handleInvite}>
                  <View style={styles.inviteButtonIcon}>
                    <Ionicons name="share-social-outline" size={18} color="#5A7EB0" />
                  </View>
                  <Text style={styles.inviteButtonText} numberOfLines={1}>
                    Invite Guests — Email, SMS, WhatsApp
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={DARK_THEME.textTertiary} />
                </Pressable>
              )}

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
                  onPress={() => { setExpenseModal(prev => ({ ...prev, categoryKey: null, viewMode: 'form', visible: true })); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Ionicons name="add-circle-outline" size={16} color={DARK_THEME.primary} />
                  <Text fontSize={12} fontWeight="500" color={DARK_THEME.primary}>Add</Text>
                </Pressable>
              </XStack>
              <View style={styles.glassCard}>
                {allExpenseCategories.map((item, index) => {
                  const catExpenses = [...addedExpenses.filter(e => e.categoryKey === item.key)].reverse();
                  const totalCents = catExpenses.reduce((sum, e) => {
                    const val = parseFloat(e.amount.replace(',', '.'));
                    return sum + (isNaN(val) ? 0 : val);
                  }, 0);
                  const showBorder = index < allExpenseCategories.length - 1 || true; // always border between rows
                  return (
                    <View key={item.key}>
                      {/* Category header row — tap anywhere to open modal */}
                      <Pressable style={[styles.refundRow, styles.contributionRowBorder]} onPress={() => openExpenseModal(item.key)}>
                        <XStack alignItems="center" gap="$3" flex={1}>
                          <View style={[styles.refundIcon, { backgroundColor: item.bg }]}>
                            <Ionicons name={item.icon as any} size={18} color={item.color} />
                          </View>
                          <YStack>
                            <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                              {item.labelKey in t.budget ? (t.budget as any)[item.labelKey] : item.labelKey}
                            </Text>
                            {catExpenses.length === 0 && item.packageNote && (
                              <>
                                <Text fontSize={12} color={DARK_THEME.textTertiary}>Extra cost beyond package</Text>
                                <Text fontSize={11} color="rgba(156,163,175,0.65)">Pre & post-event</Text>
                              </>
                            )}
                            {catExpenses.length === 0 && !item.packageNote && (
                              <Text fontSize={12} color={DARK_THEME.textTertiary}>
                                {(t.budget as any).expenseEstimated}
                              </Text>
                            )}
                          </YStack>
                        </XStack>
                        <XStack alignItems="center" gap={8}>
                          {catExpenses.length > 0 && (
                            <Text fontSize={14} fontWeight="600" color={item.color}>
                              €{totalCents.toFixed(2).replace('.', ',')}
                            </Text>
                          )}
                          <Pressable
                            onPress={() => openExpenseModal(item.key)}
                            hitSlop={8}
                            style={styles.categoryAddBtn}
                          >
                            <Ionicons name="add-circle" size={22} color={item.color} />
                          </Pressable>
                        </XStack>
                      </Pressable>
                      {/* Expanded sub-items — tap to edit */}
                      {catExpenses.map((exp, ei) => {
                        const globalIdx = addedExpenses.indexOf(exp);
                        return (
                          <Pressable
                            key={ei}
                            style={[
                              styles.expenseSubRow,
                              ei < catExpenses.length - 1 && styles.expenseSubRowBorder,
                            ]}
                            onPress={() => openEditExpense(globalIdx)}
                          >
                            <View style={styles.expenseSubIndent} />
                            <Text style={styles.expenseSubDesc} numberOfLines={1}>{exp.description}</Text>
                            <Ionicons name="pencil-outline" size={12} color={DARK_THEME.textTertiary} style={{ marginRight: 4 }} />
                            <Text style={[styles.expenseSubAmount, { color: item.color }]}>
                              €{exp.amount}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })}
                {/* Add custom category row */}
                <Pressable
                  style={styles.addCustomCategoryRow}
                  onPress={() => {
                    setCustomCatModal({ visible: true, label: '' });
                  }}
                >
                  <View style={[styles.refundIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <Ionicons name="add" size={18} color={DARK_THEME.textTertiary} />
                  </View>
                  <Text style={{ fontSize: 14, color: DARK_THEME.textTertiary, flex: 1 }}>
                    Add custom category
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={DARK_THEME.textTertiary} />
                </Pressable>
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
                {addedRefunds.length === 0 ? (
                  <Pressable onPress={openRefundModal} style={styles.emptyRefundBox}>
                    <Ionicons name="receipt-outline" size={22} color={DARK_THEME.textTertiary} />
                    <Text style={styles.emptyRefundText}>Tap + Add to track a refund</Text>
                  </Pressable>
                ) : (
                  addedRefunds.map((refund, i) => (
                    <SwipeableRefundRow
                      key={i}
                      description={refund.description}
                      amount={refund.amount}
                      icon={refund.icon}
                      color={refund.color}
                      bg={refund.bg}
                      processingLabel={t.budget.securityHold}
                      processingText={t.budget.processing}
                      showBorder={i < addedRefunds.length - 1}
                      onDelete={() => {
                        const updated = addedRefunds.filter((_, idx) => idx !== i);
                        setAddedRefunds(updated);
                        if (selectedEventId) {
                          AsyncStorage.setItem(`gameover:refunds:${selectedEventId}`, JSON.stringify(updated));
                        }
                      }}
                    />
                  ))
                )}
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

      {/* ─── Expense Popup — inline, no Modal (matches destination.tsx drag pattern) ─── */}
      {expenseModal.visible && (
        <View style={styles.popupOverlay} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setExpenseModal(prev => ({ ...prev, visible: false }))} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: expenseSheetY }] }]}>
              <View {...expenseSheetPan.panHandlers} style={styles.modalDragHandleArea}>
                <View style={styles.modalDragHandle} />
              </View>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {!expenseModal.categoryKey ? (
                  /* ── Mode 1: Category picker ── */
                  <>
                    <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
                      <Text style={styles.modalTitle}>Select Category</Text>
                      <Pressable onPress={() => setExpenseModal(prev => ({ ...prev, visible: false }))} hitSlop={10}>
                        <Ionicons name="close" size={22} color={DARK_THEME.textSecondary} />
                      </Pressable>
                    </XStack>
                    {allExpenseCategories.map(cat => (
                      <Pressable
                        key={cat.key}
                        style={styles.templateRow}
                        onPress={() => {
                          const existing = addedExpenses.filter(e => e.categoryKey === cat.key);
                          setExpenseModal(prev => ({
                            ...prev,
                            categoryKey: cat.key,
                            viewMode: existing.length > 0 ? 'list' : 'form',
                            description: '',
                            amount: '',
                            paidBy: 'you',
                            paidByPerson: null,
                            contributors: [],
                          }));
                        }}
                      >
                        <View style={[styles.refundIcon, { backgroundColor: cat.bg }]}>
                          <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                        </View>
                        <Text style={styles.templateLabel}>
                          {cat.labelKey in t.budget ? (t.budget as any)[cat.labelKey] : cat.labelKey}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={DARK_THEME.textTertiary} />
                      </Pressable>
                    ))}
                    {/* Add custom category */}
                    <Pressable
                      style={styles.templateRow}
                      onPress={() => {
                        setExpenseModal(prev => ({ ...prev, visible: false }));
                        setCustomCatModal({ visible: true, label: '' });
                      }}
                    >
                      <View style={[styles.refundIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                        <Ionicons name="add" size={18} color={DARK_THEME.textTertiary} />
                      </View>
                      <Text style={[styles.templateLabel, { color: DARK_THEME.textTertiary }]}>Add custom category</Text>
                      <Ionicons name="chevron-forward" size={16} color={DARK_THEME.textTertiary} />
                    </Pressable>
                  </>
                ) : expenseModal.viewMode === 'list' ? (
                  /* ── Mode 2: Existing expenses list ── */
                  (() => {
                    const expCat = allExpenseCategories.find(c => c.key === expenseModal.categoryKey)!;
                    const catExpenses = [...addedExpenses.filter(e => e.categoryKey === expenseModal.categoryKey)].reverse();
                    return (
                      <>
                        <XStack alignItems="center" gap={12} marginBottom={20}>
                          <View style={[styles.modalCatIcon, { backgroundColor: expCat.bg }]}>
                            <Ionicons name={expCat.icon as any} size={22} color={expCat.color} />
                          </View>
                          <YStack flex={1}>
                            <Text style={styles.modalTitle}>
                              {expCat.labelKey in t.budget ? (t.budget as any)[expCat.labelKey] : expCat.labelKey}
                            </Text>
                            <Text style={styles.modalNote}>{catExpenses.length} expense{catExpenses.length !== 1 ? 's' : ''}</Text>
                          </YStack>
                          <Pressable onPress={() => setExpenseModal(prev => ({ ...prev, visible: false }))} hitSlop={10}>
                            <Ionicons name="close" size={22} color={DARK_THEME.textSecondary} />
                          </Pressable>
                        </XStack>
                        {catExpenses.map((exp, i) => {
                          const globalIdx = addedExpenses.indexOf(exp);
                          return (
                            <Pressable
                              key={i}
                              style={[styles.expenseListRow, i < catExpenses.length - 1 && styles.contributionRowBorder]}
                              onPress={() => {
                                setExpenseModal(prev => ({
                                  ...prev,
                                  editingIndex: globalIdx,
                                  description: exp.description,
                                  amount: exp.amount,
                                  paidBy: exp.paidBy,
                                  paidByPerson: exp.paidByPerson || null,
                                  contributors: exp.contributors,
                                  viewMode: 'form',
                                }));
                              }}
                            >
                              <YStack flex={1}>
                                <Text style={{ fontSize: 14, fontWeight: '500', color: DARK_THEME.textPrimary }}>{exp.description}</Text>
                                <Text style={{ fontSize: 11, color: DARK_THEME.textTertiary }}>
                                  {exp.paidBy === 'other' ? `Paid by ${exp.paidByPerson || 'someone else'}` : 'Paid by you'}
                                  {exp.contributors.length > 0 ? ` · ${exp.contributors.length} contributors` : ''}
                                </Text>
                              </YStack>
                              <Ionicons name="pencil-outline" size={14} color={DARK_THEME.textTertiary} style={{ marginRight: 6 }} />
                              <Text style={{ fontSize: 14, fontWeight: '600', color: expCat.color }}>€{exp.amount}</Text>
                            </Pressable>
                          );
                        })}
                        <Pressable
                          style={[styles.submitButton, { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                          onPress={() => {
                            setExpenseModal(prev => ({
                              ...prev,
                              viewMode: 'form',
                              description: '',
                              amount: '',
                              paidBy: 'you',
                              paidByPerson: null,
                              contributors: [],
                            }));
                          }}
                        >
                          <Ionicons name="add" size={18} color="#FFFFFF" />
                          <Text style={styles.submitButtonText}>Add Another</Text>
                        </Pressable>
                        <Pressable style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setExpenseModal(prev => ({ ...prev, categoryKey: null }))}>
                          <Text style={{ color: DARK_THEME.textSecondary, fontSize: 13 }}>← Change category</Text>
                        </Pressable>
                      </>
                    );
                  })()
                ) : (
                  /* ── Mode 3: Expense form with contributor selection ── */
                  (() => {
                    const expCat = allExpenseCategories.find(c => c.key === expenseModal.categoryKey)!;
                    const hasExisting = addedExpenses.filter(e => e.categoryKey === expenseModal.categoryKey).length > 0;
                    return (
                      <>
                        <XStack alignItems="center" gap={12} marginBottom={20}>
                          <View style={[styles.modalCatIcon, { backgroundColor: expCat.bg }]}>
                            <Ionicons name={expCat.icon as any} size={22} color={expCat.color} />
                          </View>
                          <YStack flex={1}>
                            <Text style={styles.modalTitle}>
                              {expCat.labelKey in t.budget ? (t.budget as any)[expCat.labelKey] : expCat.labelKey}
                            </Text>
                            {expCat.packageNote && (
                              <Text style={styles.modalNote}>{(t.budget as any).expensePackageNote || 'Extra costs beyond package'}</Text>
                            )}
                          </YStack>
                          <Pressable onPress={() => setExpenseModal(prev => ({ ...prev, visible: false }))} hitSlop={10}>
                            <Ionicons name="close" size={22} color={DARK_THEME.textSecondary} />
                          </Pressable>
                        </XStack>
                        <Text style={styles.inputLabel}>What was this expense for?</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="e.g. Hotel booking, train tickets..."
                          placeholderTextColor={DARK_THEME.textTertiary}
                          value={expenseModal.description}
                          onChangeText={v => setExpenseModal(prev => ({ ...prev, description: v }))}
                          autoCapitalize="sentences"
                        />
                        <Text style={styles.inputLabel}>Amount (€)</Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="0.00"
                          placeholderTextColor={DARK_THEME.textTertiary}
                          value={expenseModal.amount}
                          onChangeText={v => setExpenseModal(prev => ({ ...prev, amount: v }))}
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.inputLabel}>Who paid?</Text>
                        <XStack gap={10} style={{ marginBottom: expenseModal.paidBy === 'other' ? 12 : 20 }}>
                          {(['you', 'other'] as const).map(opt => (
                            <Pressable
                              key={opt}
                              style={[styles.paidByButton, expenseModal.paidBy === opt && styles.paidByButtonActive]}
                              onPress={() => { setExpenseModal(prev => ({ ...prev, paidBy: opt, paidByPerson: opt !== 'other' ? null : prev.paidByPerson })); }}
                            >
                              <Text style={[styles.paidByText, expenseModal.paidBy === opt && styles.paidByTextActive]}>
                                {opt === 'you' ? 'You' : 'Someone else'}
                              </Text>
                            </Pressable>
                          ))}
                        </XStack>
                        {/* Person picker — dropdown button when "Someone else" is selected */}
                        {expenseModal.paidBy === 'other' && payerOptions.length > 0 && (
                          <View style={{ marginBottom: 16 }}>
                            {/* Dropdown trigger button */}
                            <Pressable
                              style={[styles.dropdownButton, expenseModal.paidByPerson && styles.dropdownButtonSelected]}
                              onPress={() => setExpenseModal(prev => ({ ...prev, payerDropdownOpen: !prev.payerDropdownOpen }))}
                            >
                              <Text style={[styles.dropdownButtonText, expenseModal.paidByPerson && { color: DARK_THEME.textPrimary }]}>
                                {expenseModal.paidByPerson
                                  ? payerOptions.find(c => c.id === expenseModal.paidByPerson)?.name ?? 'Select person'
                                  : 'Select person'}
                              </Text>
                              <Ionicons
                                name={expenseModal.payerDropdownOpen ? 'chevron-up' : 'chevron-down'}
                                size={16}
                                color={DARK_THEME.textTertiary}
                              />
                            </Pressable>
                            {/* Dropdown list — max 4 rows visible, inner scroll for rest */}
                            {expenseModal.payerDropdownOpen && (
                              <View style={[styles.dropdownList, { maxHeight: 176 }]}>
                                <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {payerOptions.map((c, i) => {
                                  const sel = expenseModal.paidByPerson === c.id;
                                  return (
                                    <Pressable
                                      key={c.id}
                                      style={[
                                        styles.dropdownItem,
                                        sel && styles.dropdownItemSelected,
                                        i < payerOptions.length - 1 && styles.dropdownItemBorder,
                                      ]}
                                      onPress={() => {
                                        setExpenseModal(prev => ({ ...prev, paidByPerson: sel ? null : c.id, payerDropdownOpen: false }));
                                      }}
                                    >
                                      <Text style={[styles.dropdownItemText, sel && { color: '#5A7EB0', fontWeight: '700' as const }]}>
                                        {c.name}
                                      </Text>
                                      {sel && <Ionicons name="checkmark" size={16} color="#5A7EB0" />}
                                    </Pressable>
                                  );
                                })}
                                </ScrollView>
                              </View>
                            )}
                          </View>
                        )}
                        {/* Contributors — payer is always excluded to avoid duplication */}
                        {(() => {
                          // When "You" pays, exclude the current user's entry (not index 0 which is always the organizer)
                          const payerExcludedId = expenseModal.paidBy === 'you'
                            ? (allContributors.find(c => c.userId === user?.id)?.id ?? allContributors[0]?.id ?? null)
                            : expenseModal.paidByPerson;
                          const contributorOptions = allContributors.filter(c => c.id !== payerExcludedId);
                          if (contributorOptions.length === 0) return null;
                          return (
                            <>
                              <Text style={styles.inputLabel}>Who should contribute?</Text>
                              {contributorOptions.map(contributor => {
                                const selected = expenseModal.contributors.includes(contributor.id);
                                return (
                                  <Pressable
                                    key={contributor.id}
                                    style={[styles.contributorRow, selected && styles.contributorRowSelected]}
                                    onPress={() => setExpenseModal(prev => ({
                                      ...prev,
                                      contributors: selected
                                        ? prev.contributors.filter(id => id !== contributor.id)
                                        : [...prev.contributors, contributor.id],
                                    }))}
                                  >
                                    <Text style={styles.contributorName}>{contributor.name}</Text>
                                    <View style={[styles.contributorCheck, selected && styles.contributorCheckSelected]}>
                                      {selected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                                    </View>
                                  </Pressable>
                                );
                              })}
                            </>
                          );
                        })()}
                        <Pressable
                          style={[styles.submitButton, { marginTop: 20 }, (!expenseModal.description.trim() || !expenseModal.amount.trim()) && styles.submitButtonDisabled]}
                          onPress={submitExpense}
                          disabled={!expenseModal.description.trim() || !expenseModal.amount.trim()}
                        >
                          <Text style={styles.submitButtonText}>
                            {expenseModal.editingIndex !== null ? 'Save Changes' : 'Add Expense'}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={{ marginTop: 12, alignItems: 'center' }}
                          onPress={() => {
                            if (hasExisting) {
                              setExpenseModal(prev => ({ ...prev, viewMode: 'list' }));
                            } else {
                              setExpenseModal(prev => ({ ...prev, categoryKey: null }));
                            }
                          }}
                        >
                          <Text style={{ color: DARK_THEME.textSecondary, fontSize: 13 }}>
                            {hasExisting ? '← Back to list' : '← Change category'}
                          </Text>
                        </Pressable>
                      </>
                    );
                  })()
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* ─── Refund Popup — inline, no Modal (matches destination.tsx drag pattern) ─── */}
      {refundModal.visible && (
        <View style={styles.popupOverlay} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setRefundModal(prev => ({ ...prev, visible: false }))} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: refundSheetY }] }]}>
              <View {...refundSheetPan.panHandlers} style={styles.modalDragHandleArea}>
                <View style={styles.modalDragHandle} />
              </View>
              <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
                <Text style={styles.modalTitle}>Track a Refund</Text>
                <Pressable onPress={() => setRefundModal(prev => ({ ...prev, visible: false }))} hitSlop={10}>
                  <Ionicons name="close" size={22} color={DARK_THEME.textSecondary} />
                </Pressable>
              </XStack>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
              {!refundModal.templateKey ? (
                /* Template selection */
                <>
                  <Text style={styles.inputLabel}>Choose a refund type</Text>
                  {REFUND_TEMPLATES.map(tmpl => (
                    <Pressable
                      key={tmpl.key}
                      style={styles.templateRow}
                      onPress={() => {
                        setRefundModal(prev => ({ ...prev, templateKey: tmpl.key, description: tmpl.label }));
                      }}
                    >
                      <View style={[styles.refundIcon, { backgroundColor: tmpl.bg }]}>
                        <Ionicons name={tmpl.icon as any} size={18} color={tmpl.color} />
                      </View>
                      <Text style={styles.templateLabel}>{tmpl.label}</Text>
                      <Ionicons name="chevron-forward" size={16} color={DARK_THEME.textTertiary} />
                    </Pressable>
                  ))}
                  {/* Custom refund */}
                  <Pressable
                    style={styles.templateRow}
                    onPress={() => { setRefundModal(prev => ({ ...prev, templateKey: 'custom', description: '' })); }}
                  >
                    <View style={[styles.refundIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                      <Ionicons name="add" size={18} color={DARK_THEME.textTertiary} />
                    </View>
                    <Text style={[styles.templateLabel, { color: DARK_THEME.textTertiary }]}>Custom description</Text>
                    <Ionicons name="chevron-forward" size={16} color={DARK_THEME.textTertiary} />
                  </Pressable>
                </>
              ) : (
                /* Refund form */
                <>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={refundModal.description}
                    onChangeText={v => setRefundModal(prev => ({ ...prev, description: v }))}
                    autoCapitalize="sentences"
                  />
                  <Text style={styles.inputLabel}>Expected Amount (€)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0.00"
                    placeholderTextColor={DARK_THEME.textTertiary}
                    value={refundModal.amount}
                    onChangeText={v => setRefundModal(prev => ({ ...prev, amount: v }))}
                    keyboardType="decimal-pad"
                  />
                  <Pressable
                    style={[styles.submitButton, { marginTop: 8 }, (!refundModal.description.trim() || !refundModal.amount.trim()) && styles.submitButtonDisabled]}
                    onPress={submitRefund}
                    disabled={!refundModal.description.trim() || !refundModal.amount.trim()}
                  >
                    <Text style={styles.submitButtonText}>Track Refund</Text>
                  </Pressable>
                  <Pressable style={{ marginTop: 12, marginBottom: 8, alignItems: 'center' }} onPress={() => setRefundModal(prev => ({ ...prev, templateKey: null }))}>
                    <Text style={{ color: DARK_THEME.textSecondary, fontSize: 13 }}>← Change type</Text>
                  </Pressable>
                </>
              )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* ─── Custom Category Popup — inline, no Modal (matches destination.tsx drag pattern) ─── */}
      {customCatModal.visible && (
        <View style={styles.popupOverlay} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setCustomCatModal(prev => ({ ...prev, visible: false }))} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Animated.View style={[styles.modalSheet, { transform: [{ translateY: customCatSheetY }] }]}>
              <View {...customCatSheetPan.panHandlers} style={styles.modalDragHandleArea}>
                <View style={styles.modalDragHandle} />
              </View>
              <XStack justifyContent="space-between" alignItems="center" marginBottom={20}>
                <Text style={styles.modalTitle}>New Category</Text>
                <Pressable onPress={() => setCustomCatModal(prev => ({ ...prev, visible: false }))} hitSlop={10}>
                  <Ionicons name="close" size={22} color={DARK_THEME.textSecondary} />
                </Pressable>
              </XStack>
              <Text style={styles.inputLabel}>Category name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Decorations, Photography..."
                placeholderTextColor={DARK_THEME.textTertiary}
                value={customCatModal.label}
                onChangeText={v => setCustomCatModal(prev => ({ ...prev, label: v }))}
                autoCapitalize="sentences"
                autoFocus
              />
              <Pressable
                style={[styles.submitButton, !customCatModal.label.trim() && styles.submitButtonDisabled]}
                disabled={!customCatModal.label.trim()}
                onPress={() => {
                  const key = `custom_${Date.now()}`;
                  const customCatColor = CUSTOM_COLORS[customCategories.length % CUSTOM_COLORS.length];
                  const newCat: ExpenseCategory = {
                    key,
                    labelKey: customCatModal.label.trim(),
                    icon: 'pricetag-outline',
                    color: customCatColor.color,
                    bg: customCatColor.bg,
                    packageNote: false,
                  };
                  const updated = [...customCategories, newCat];
                  setCustomCategories(updated);
                  saveCustomCategories(updated);
                  setCustomCatModal(prev => ({ ...prev, visible: false }));
                  // Open expense form directly for new category
                  setExpenseModal({ visible: true, categoryKey: key, viewMode: 'form', description: '', amount: '', paidBy: 'you', paidByPerson: null, contributors: [], editingIndex: null, payerDropdownOpen: false });
                }}
              >
                <Text style={styles.submitButtonText}>Create & Add Expense</Text>
              </Pressable>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* ─── Remind All Channel Picker (matches Manage Invitations UX) ── */}
      {remindModal.visible && (() => {
        const guestList = Object.values(cachedGuests);
        const emailCount = guestList.filter(g => g.email).length;
        const phoneCount = guestList.filter(g => g.phone).length;
        const hasEmails = emailCount > 0;
        const hasPhones = phoneCount > 0;
        return (
          <Modal
            visible={remindModal.visible}
            transparent
            animationType="slide"
            onRequestClose={() => setRemindModal(prev => ({ ...prev, visible: false }))}
          >
            <View style={remindStyles.inviteOverlay}>
              <Pressable style={{ flex: 1 }} onPress={() => setRemindModal(prev => ({ ...prev, visible: false }))} />
              <View style={remindStyles.inviteSheet} accessibilityViewIsModal={true}>
                {/* Handle */}
                <View style={remindStyles.inviteHandle} />

                {/* Header */}
                <XStack justifyContent="space-between" alignItems="center" marginBottom={16}>
                  <Text style={remindStyles.inviteTitle}>
                    {remindModal.sendStatus === 'done'
                      ? `${remindModal.activeChannel === 'email' ? 'Email' : remindModal.activeChannel === 'sms' ? 'SMS' : 'WhatsApp'} sent`
                      : 'Remind All Guests'}
                  </Text>
                  {remindModal.sendStatus !== 'sending' && (
                    <Pressable onPress={() => setRemindModal(prev => ({ ...prev, visible: false }))} hitSlop={10}>
                      <Ionicons name="close" size={22} color={DARK_THEME.textSecondary} />
                    </Pressable>
                  )}
                </XStack>

                {/* idle: horizontal 3 channel buttons */}
                {remindModal.sendStatus === 'idle' && (
                  <>
                    <Text style={remindStyles.inviteSectionLabel}>SEND PAYMENT REMINDER VIA</Text>
                    <XStack gap={10} marginBottom={20}>
                      <Pressable
                        style={[remindStyles.inviteChannelBtn, !hasEmails && remindStyles.inviteChannelBtnDisabled]}
                        onPress={() => hasEmails && handleRemindViaChannel('email')}
                      >
                        <Ionicons name="mail-outline" size={22} color={hasEmails ? '#3B82F6' : DARK_THEME.textTertiary} />
                        <Text style={[remindStyles.inviteChannelLabel, { color: hasEmails ? '#3B82F6' : DARK_THEME.textTertiary }]}>Email</Text>
                        <Text style={remindStyles.inviteChannelCount}>{emailCount} guest{emailCount !== 1 ? 's' : ''}</Text>
                      </Pressable>
                      <Pressable
                        style={[remindStyles.inviteChannelBtn, !hasPhones && remindStyles.inviteChannelBtnDisabled]}
                        onPress={() => hasPhones && handleRemindViaChannel('sms')}
                      >
                        <Ionicons name="chatbubble-outline" size={22} color={hasPhones ? '#10B981' : DARK_THEME.textTertiary} />
                        <Text style={[remindStyles.inviteChannelLabel, { color: hasPhones ? '#10B981' : DARK_THEME.textTertiary }]}>SMS</Text>
                        <Text style={remindStyles.inviteChannelCount}>{phoneCount} guest{phoneCount !== 1 ? 's' : ''}</Text>
                      </Pressable>
                      <Pressable
                        style={[remindStyles.inviteChannelBtn, !hasPhones && remindStyles.inviteChannelBtnDisabled]}
                        onPress={() => hasPhones && handleRemindViaChannel('whatsapp')}
                      >
                        <Ionicons name="logo-whatsapp" size={22} color={hasPhones ? '#25D366' : DARK_THEME.textTertiary} />
                        <Text style={[remindStyles.inviteChannelLabel, { color: hasPhones ? '#25D366' : DARK_THEME.textTertiary }]}>WhatsApp</Text>
                        <Text style={remindStyles.inviteChannelCount}>{phoneCount} guest{phoneCount !== 1 ? 's' : ''}</Text>
                      </Pressable>
                    </XStack>
                  </>
                )}

                {/* sending: spinner */}
                {remindModal.sendStatus === 'sending' && (
                  <View style={{ alignItems: 'center', paddingVertical: 32, gap: 16 }}>
                    <ActivityIndicator size="large" color="#5A7EB0" />
                    <Text style={{ fontSize: 15, fontWeight: '600', color: DARK_THEME.textPrimary }}>
                      Sending {remindModal.activeChannel === 'email' ? 'email' : remindModal.activeChannel === 'sms' ? 'SMS' : 'WhatsApp'} reminders…
                    </Text>
                  </View>
                )}

                {/* done: results */}
                {remindModal.sendStatus === 'done' && (
                  <>
                    <View style={{ backgroundColor: DARK_THEME.deepNavy, borderRadius: 12, padding: 12, marginBottom: 16 }}>
                      <Text style={{ fontSize: 13, color: DARK_THEME.textSecondary, marginBottom: 8 }}>
                        {remindModal.results.filter(r => r.status === 'sent').length} sent ·{' '}
                        {remindModal.results.filter(r => r.status === 'failed').length} failed
                      </Text>
                      {remindModal.results.map((r, i) => (
                        <XStack key={i} alignItems="center" gap={10} paddingVertical={6}
                          style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                          <Ionicons
                            name={r.status === 'sent' ? 'checkmark-circle' : 'close-circle'}
                            size={18}
                            color={r.status === 'sent' ? '#10B981' : '#EF4444'}
                          />
                          <Text style={{ flex: 1, fontSize: 13, color: DARK_THEME.textSecondary }}>
                            {r.recipient}{r.error ? ` — ${r.error}` : ''}
                          </Text>
                        </XStack>
                      ))}
                    </View>
                    <Pressable
                      style={[remindStyles.inviteChannelBtn, { flex: 0, paddingHorizontal: 20 }]}
                      onPress={() => { setRemindModal(prev => ({ ...prev, sendStatus: 'idle', results: [], activeChannel: null })); }}
                    >
                      <Text style={[remindStyles.inviteChannelLabel, { color: '#5A7EB0' }]}>Send via another channel</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </Modal>
        );
      })()}
    </View>
  );
}

const remindStyles = StyleSheet.create({
  inviteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  inviteSheet: {
    backgroundColor: '#1E2329',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inviteHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  inviteTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  inviteSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DARK_THEME.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inviteChannelBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 14,
    gap: 4,
  },
  inviteChannelBtnDisabled: {
    opacity: 0.35,
  },
  inviteChannelLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inviteChannelCount: {
    fontSize: 11,
    color: DARK_THEME.textTertiary,
  },
});

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
  notificationUrgentDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F97316',
    borderWidth: 2,
    borderColor: DARK_THEME.surfaceCard,
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
    backgroundColor: '#6B1A2A',
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
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
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
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(90, 126, 176, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(90, 126, 176, 0.25)',
  },
  markPaidButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK_THEME.primary,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  inviteButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(90, 126, 176, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  guestRemainingInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(90, 126, 176, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(90, 126, 176, 0.25)',
  },
  guestRemainingText: {
    flex: 1,
    fontSize: 13,
    color: DARK_THEME.textSecondary,
    lineHeight: 18,
  },
  payRemainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderRadius: 0,            // glassCard overflow:hidden clips to card corners
    padding: 14,
    marginTop: 16,
    marginHorizontal: -24,      // extend to glassCard edges (padding: 24)
    marginBottom: -24,          // extend to glassCard bottom
    borderTopWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  payRemainingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payRemainingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
  payRemainingSubtitleText: {
    fontSize: 12,
    color: DARK_THEME.textTertiary,
    marginTop: 2,
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
  popupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  modalDragHandleArea: {
    alignSelf: 'stretch',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSheet: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '85%',
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: 16,
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
  emptyRefundBox: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyRefundText: {
    fontSize: 14,
    color: DARK_THEME.textTertiary,
  },
  expenseListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: DARK_THEME.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  contributorRowSelected: {
    backgroundColor: 'rgba(90,126,176,0.12)',
    borderColor: '#5A7EB0',
  },
  contributorName: {
    fontSize: 14,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  contributorCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: DARK_THEME.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributorCheckSelected: {
    backgroundColor: '#5A7EB0',
    borderColor: '#5A7EB0',
  },
  categoryAddBtn: {
    padding: 2,
  },
  expenseSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingRight: 16,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  expenseSubRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  expenseSubIndent: {
    width: 52, // aligns with icon+gap in parent row
  },
  expenseSubDesc: {
    flex: 1,
    fontSize: 12,
    color: DARK_THEME.textSecondary,
  },
  expenseSubAmount: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  addCustomCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: DARK_THEME.borderLight,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DARK_THEME.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dropdownButtonSelected: {
    borderColor: '#5A7EB0',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: DARK_THEME.textTertiary,
    flex: 1,
  },
  dropdownList: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(90,126,176,0.12)',
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dropdownItemText: {
    fontSize: 14,
    color: DARK_THEME.textPrimary,
  },
});
