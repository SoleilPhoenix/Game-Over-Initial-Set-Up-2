/**
 * Events Screen
 * Main dashboard showing user's events
 * Matches UI mockup: Avatar header, filter tabs, card layout with thumbnails
 */

import React, { useCallback, useRef, useState, useMemo } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { YStack, XStack, Text, Image } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents, eventKeys } from '@/hooks/queries/useEvents';
import { participantKeys } from '@/hooks/queries/useParticipants';
import { bookingKeys } from '@/hooks/queries/useBookings';
import { useQueryClient } from '@tanstack/react-query';
import { eventsRepository } from '@/repositories';
import { participantsRepository } from '@/repositories';
import { bookingsRepository } from '@/repositories';
import { useUser } from '@/stores/authStore';
import { useWizardStore, type DraftSnapshot } from '@/stores/wizardStore';
import { SkeletonEventCard } from '@/components/ui/Skeleton';
import { useTranslation, getTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';
import { getCurrentPhaseLabel } from '@/utils/planningProgress';
import { getCityImage, resolveImageSource } from '@/constants/packageImages';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import type { EventWithDetails } from '@/repositories';

// Map city UUIDs to slugs for image lookup
const CITY_UUID_TO_SLUG: Record<string, string> = {
  '550e8400-e29b-41d4-a716-446655440101': 'berlin',
  '550e8400-e29b-41d4-a716-446655440102': 'hamburg',
  '550e8400-e29b-41d4-a716-446655440103': 'hannover',
};

type FilterTab = 'all' | 'organizing' | 'attending';

/** Approximate step completion from card data (full detail only on detail page) */
const getBookedStepCount = (event: EventWithDetails): number => {
  const checklist = event.planning_checklist || {};
  // Steps 1-3 are auto — approximate from participant_count on card
  // (We don't have full participant details here, so approximate generously)
  const hasParticipants = event.participant_count > 1; // organizer + at least 1 invite
  const autoSteps = hasParticipants ? 1 : 0; // invitations_sent approximation
  // Steps 4-8 from checklist
  const manualSteps = ['outstanding_payment', 'accommodations', 'travel', 'surprise_plan', 'final_briefing']
    .filter(k => checklist[k]).length;
  return autoSteps + manualSteps;
};

// Step label key → step number mapping for "Step X:" prefix
const STEP_NUMBER: Record<string, number> = {
  inviteParticipants: 1,
  groupConfirmed: 2,
  collectBudget: 3,
  completePayment: 4,
  planAccommodation: 5,
  organizeTravel: 6,
  planSurprise: 7,
  finalBriefing: 8,
};

const getProgressConfig = (event: EventWithDetails, t: any): {
  phase: string;
  percentage: number;
  color: string;
  icon: 'ellipse' | 'checkmark-circle';
  isBooked: boolean;
  completedSteps: number;
} => {
  const status = event.status;
  switch (status) {
    case 'booked': {
      const completed = getBookedStepCount(event);
      const percentage = Math.round((completed / 8) * 100);
      if (completed === 8) {
        return { phase: t.events.allSetReady, percentage: 100, color: '#10B981', icon: 'checkmark-circle', isBooked: true, completedSteps: 8 };
      }
      // Show next step name: "Step X: Label"
      const nextLabelKey = getCurrentPhaseLabel(
        // Build minimal steps from card data for next step detection
        ['invitations_sent', 'group_confirmed', 'budget_collected', 'outstanding_payment', 'accommodations', 'travel', 'surprise_plan', 'final_briefing']
          .map((key, i) => ({
            key,
            labelKey: ['inviteParticipants', 'groupConfirmed', 'collectBudget', 'completePayment', 'planAccommodation', 'organizeTravel', 'planSurprise', 'finalBriefing'][i],
            descriptionKey: '',
            completed: i < completed,
            auto: i < 3,
            icon: '',
          }))
      );
      const stepLabel = nextLabelKey ? (t.eventDetail as any)[nextLabelKey] || nextLabelKey : '';
      const stepNum = nextLabelKey ? STEP_NUMBER[nextLabelKey] || (completed + 1) : (completed + 1);
      const phase = `Step ${stepNum}/8: ${stepLabel}`;
      return {
        phase,
        percentage,
        color: DARK_THEME.primary,
        icon: 'ellipse',
        isBooked: true,
        completedSteps: completed,
      };
    }
    case 'completed':
      return { phase: t.events.allSetReady, percentage: 100, color: '#10B981', icon: 'checkmark-circle', isBooked: true, completedSteps: 8 };
    case 'planning':
      return { phase: t.events.planningPhase, percentage: 45, color: '#3B82F6', icon: 'ellipse', isBooked: false, completedSteps: 0 };
    case 'draft':
    default:
      return { phase: t.events.planningPhase, percentage: 15, color: '#F59E0B', icon: 'ellipse', isBooked: false, completedSteps: 0 };
  }
};

const getDaysLeft = (startDate?: string): string | null => {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return null;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day left';
  return `${diffDays} days left`;
};

const formatDateRange = (startDate?: string, endDate?: string): string => {
  if (!startDate) return 'TBD';
  const start = new Date(startDate);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

  if (!endDate || endDate === startDate) return startStr;
  const end = new Date(endDate);
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  return `${startStr} - ${endStr}`;
};

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const { t } = useTranslation();
  const FILTER_TABS = ['all', 'organizing', 'attending'] as const;
  const { handlers: swipeHandlers, animatedStyle: swipeAnimStyle, switchTab: switchFilterAnimated } = useSwipeTabs(FILTER_TABS, activeFilter, setActiveFilter);

  const queryClient = useQueryClient();
  const { data: events, isLoading, error: eventsError, refetch } = useEvents();

  // Refetch events when screen gains focus (e.g., returning from booking)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Hide events still in wizard booking flow (created at Step 4 but not yet paid)
  const wizardCreatedEventId = useWizardStore((s) => s.createdEventId);

  // Deduplicate events with same honoree+city+date (keeps highest-priority status)
  const deduplicatedEvents = useMemo(() => {
    if (!events || events.length === 0) return events;
    const STATUS_PRIORITY: Record<string, number> = { completed: 4, booked: 3, planning: 2, draft: 1 };
    const seen = new Map<string, EventWithDetails>();
    for (const e of events) {
      const key = `${e.honoree_name?.toLowerCase()}_${e.city_id}_${e.start_date}`;
      const existing = seen.get(key);
      if (!existing || (STATUS_PRIORITY[e.status || ''] || 0) > (STATUS_PRIORITY[existing.status || ''] || 0)) {
        seen.set(key, e);
      }
    }
    return Array.from(seen.values());
  }, [events]);

  // Filter events based on active tab
  // Also hide events still in the wizard booking flow (created but not yet paid)
  const filteredEvents = useMemo(() => {
    if (!deduplicatedEvents) return [];
    // Hide events still going through wizard → booking flow
    const visible = wizardCreatedEventId
      ? deduplicatedEvents.filter((e) => e.id !== wizardCreatedEventId)
      : deduplicatedEvents;
    switch (activeFilter) {
      case 'organizing':
        return visible.filter((e) => e.created_by === user?.id);
      case 'attending':
        return visible.filter((e) => e.created_by !== user?.id);
      default:
        return visible;
    }
  }, [deduplicatedEvents, activeFilter, user?.id, wizardCreatedEventId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  // Draft state (multi-draft) — filter out drafts that match an already-booked event
  const rawDrafts = useWizardStore((s) => s.getAllDrafts());
  const allDrafts = useMemo(() => {
    if (!events || events.length === 0) return rawDrafts;
    // If a booked/completed event exists with the same honoree name, hide the draft
    const bookedNames = new Set(
      events
        .filter(e => e.status === 'booked' || e.status === 'completed')
        .map(e => e.honoree_name?.toLowerCase())
        .filter(Boolean)
    );
    return rawDrafts.filter(d => !bookedNames.has(d.honoreeName?.toLowerCase()));
  }, [rawDrafts, events]);
  const hasDrafts = allDrafts.length > 0;

  const handleCreateEvent = () => {
    const store = useWizardStore.getState();
    if (store.hasDraft()) {
      const tr = getTranslation();
      Alert.alert(
        tr.wizard.existingDraftTitle,
        tr.wizard.existingDraftMessage,
        [
          { text: tr.wizard.cancel, style: 'cancel' },
          {
            text: tr.wizard.continueDraft,
            onPress: () => {
              const drafts = store.getAllDrafts();
              if (drafts.length > 0) handleResumeDraft(drafts[0].id);
            },
          },
          {
            text: tr.wizard.startFresh,
            style: 'destructive',
            onPress: () => {
              useWizardStore.getState().startNewDraft();
              router.push('/create-event');
            },
          },
        ]
      );
      return;
    }
    useWizardStore.getState().startNewDraft();
    router.push('/create-event');
  };

  const handleResumeDraft = (draftId: string) => {
    const store = useWizardStore.getState();
    store.loadDraft(draftId);
    const draft = store.savedDrafts[draftId];
    const step = draft?.currentStep ?? 1;
    const stepPaths = ['/create-event', '/create-event/preferences', '/create-event/participants', '/create-event/packages'];
    const targetPath = stepPaths[Math.min(step - 1, stepPaths.length - 1)] || '/create-event';
    router.push(targetPath as any);
  };

  const handleEventPress = (eventId: string) => {
    // Prefetch detail, participants, and booking in parallel for faster load
    queryClient.prefetchQuery({
      queryKey: eventKeys.detail(eventId),
      queryFn: () => eventsRepository.getById(eventId),
      staleTime: 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: participantKeys.byEvent(eventId),
      queryFn: () => participantsRepository.getByEventId(eventId),
      staleTime: 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: bookingKeys.byEvent(eventId),
      queryFn: () => bookingsRepository.getByEventId(eventId),
      staleTime: 60 * 1000,
    });
    router.push(`/event/${eventId}`);
  };

  const handleNotifications = () => {
    router.push('/notifications');
  };

  const getUserRole = (event: EventWithDetails): 'organizer' | 'guest' => {
    return event.created_by === user?.id ? 'organizer' : 'guest';
  };

  const getPaymentStatus = (event: EventWithDetails): string | null => {
    if (event.status === 'completed') {
      return '100% Paid';
    }
    if (event.status === 'booked') {
      return '25% Paid';
    }
    return null;
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <View style={styles.filterPill}>
        {(['all', 'organizing', 'attending'] as FilterTab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => switchFilterAnimated(tab)}
            style={[
              styles.filterTab,
              activeFilter === tab && styles.filterTabActive,
            ]}
            testID={`filter-tab-${tab}`}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === tab && styles.filterTabTextActive,
              ]}
            >
              {tab === 'all' ? t.events.filterAll : tab === 'organizing' ? t.events.filterOrganizing : t.events.filterAttending}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderSegmentedProgress = (completedSteps: number, color: string) => (
    <View style={styles.segmentedBar}>
      {Array.from({ length: 8 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            { backgroundColor: i < completedSteps ? color : DARK_THEME.deepNavy },
            i === 0 && styles.segmentFirst,
            i === 7 && styles.segmentLast,
          ]}
        />
      ))}
    </View>
  );

  const renderEventCard = ({ item }: { item: EventWithDetails }) => {
    const role = getUserRole(item);
    const progress = getProgressConfig(item, t);
    const daysLeft = getDaysLeft(item.start_date);
    const paymentStatus = getPaymentStatus(item);
    const dateRange = formatDateRange(item.start_date, item.end_date);
    const eventTitle = item.title || `${item.honoree_name}'s Event`;

    return (
      <Pressable
        onPress={() => handleEventPress(item.id)}
        style={({ pressed }) => [
          styles.eventCard,
          pressed && styles.eventCardPressed,
        ]}
        testID={`event-card-${item.id}`}
      >
        <XStack flex={1}>
          {/* Thumbnail */}
          <View style={styles.thumbnailContainer}>
            {item.hero_image_url ? (
              <Image
                source={{ uri: item.hero_image_url }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={resolveImageSource(getCityImage(
                  (item.city?.name?.toLowerCase()) ||
                  CITY_UUID_TO_SLUG[item.city_id || ''] ||
                  'berlin'
                ))}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            )}
          </View>

          {/* Content */}
          <YStack flex={1} marginLeft={14}>
            {/* Title row with menu */}
            <XStack justifyContent="space-between" alignItems="flex-start">
              <Text
                style={styles.eventTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {eventTitle}
              </Text>
              <Pressable
                style={styles.menuButton}
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  // TODO: Show menu
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={DARK_THEME.textSecondary} />
              </Pressable>
            </XStack>

            {/* Date */}
            <XStack alignItems="center" gap={6} marginTop={4}>
              <Ionicons name="calendar-outline" size={14} color={DARK_THEME.textTertiary} />
              <Text style={styles.dateText}>{dateRange}</Text>
            </XStack>

            {/* Role badge */}
            <XStack alignItems="center" gap={8} marginTop={8}>
              <View style={[
                styles.roleBadge,
                role === 'organizer' ? styles.roleBadgeOrganizer : styles.roleBadgeGuest
              ]}>
                <Text style={styles.roleBadgeText}>
                  {role === 'organizer' ? t.events.organizer : t.events.guest}
                </Text>
              </View>
            </XStack>

            {/* Days left + payment status row */}
            {(daysLeft || paymentStatus) && (
              <XStack alignItems="center" gap={8} marginTop={6}>
                {daysLeft && (
                  <Text style={styles.statusText}>{daysLeft}</Text>
                )}
                {paymentStatus && (
                  <View style={styles.paymentBadge}>
                    <Text style={styles.paymentBadgeText}>{paymentStatus}</Text>
                  </View>
                )}
              </XStack>
            )}
          </YStack>
        </XStack>

        {/* Progress section */}
        <View style={styles.progressSection}>
          <XStack justifyContent="space-between" alignItems="center" marginBottom={6}>
            <XStack alignItems="center" gap={6}>
              <Ionicons
                name={progress.icon}
                size={10}
                color={progress.color}
              />
              <Text style={[styles.progressLabel, { color: progress.color }]}>
                {progress.phase}
              </Text>
            </XStack>
            <Text style={[styles.progressPercentage, { color: progress.color }]}>
              {progress.percentage}%
            </Text>
          </XStack>
          {progress.isBooked ? (
            renderSegmentedProgress(progress.completedSteps, progress.color)
          ) : (
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progress.percentage}%`,
                    backgroundColor: progress.color,
                  }
                ]}
              />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const renderStartNewPlanButton = () => (
    <Pressable
      onPress={handleCreateEvent}
      style={({ pressed }) => [
        styles.startNewPlanButton,
        pressed && styles.startNewPlanButtonPressed,
      ]}
      testID="start-new-plan-button"
    >
      <View style={styles.startNewPlanIcon}>
        <Ionicons name="add" size={24} color={DARK_THEME.textTertiary} />
      </View>
      <Text style={styles.startNewPlanText}>{t.events.startNewPlan}</Text>
    </Pressable>
  );

  const renderEmptyState = () => {
    const isAttending = activeFilter === 'attending';
    const emptyTitle = isAttending ? (t.events as any).noAttendingTitle || 'No Invitations Yet' : t.events.noEventsTitle;
    const emptySubtitle = isAttending ? (t.events as any).noAttendingSubtitle || 'When someone invites you to an event, it will appear here.' : t.events.noEventsSubtitle;
    const emptyEmoji = isAttending ? '📬' : '🎊';

    return (
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
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={DARK_THEME.primary}
            colors={[DARK_THEME.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <YStack justifyContent="center" alignItems="center" width="100%" paddingHorizontal={0}>
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={[`${DARK_THEME.primary}30`, `${DARK_THEME.primary}10`]}
                style={styles.emptyIconGradient}
              >
                <Text fontSize={56}>{emptyEmoji}</Text>
              </LinearGradient>
            </View>
            <Text fontSize={24} fontWeight="800" color={DARK_THEME.textPrimary} marginBottom={8}>
              {emptyTitle}
            </Text>
            <Text
              fontSize={16}
              color={DARK_THEME.textSecondary}
              textAlign="center"
              marginBottom={24}
              maxWidth={280}
              lineHeight={24}
            >
              {emptySubtitle}
            </Text>
            {!isAttending && (
              <View style={{ width: '100%', paddingHorizontal: 0 }}>
                {renderStartNewPlanButton()}
              </View>
            )}
          </YStack>
        }
      />
    );
  };

  const renderLoadingState = () => (
    <YStack padding={16} gap={12}>
      {[1, 2, 3].map((i) => (
        <SkeletonEventCard key={i} testID={`skeleton-event-${i}`} />
      ))}
    </YStack>
  );

  const renderSingleDraftCard = (draft: DraftSnapshot) => {
    const draftTitle = draft.honoreeName
      ? `${draft.honoreeName}'s ${draft.partyType === 'bachelor' ? t.events.bachelorParty : t.events.bacheloretteParty}`
      : t.events.newEvent;
    const progressPct = Math.round((draft.currentStep / 4) * 100);

    // Resolve cityId to display name (may be UUID or slug)
    const CITY_NAMES: Record<string, string> = {
      berlin: 'Berlin', hamburg: 'Hamburg', hannover: 'Hannover',
      '550e8400-e29b-41d4-a716-446655440101': 'Berlin',
      '550e8400-e29b-41d4-a716-446655440102': 'Hamburg',
      '550e8400-e29b-41d4-a716-446655440103': 'Hannover',
    };
    const cityName = draft.cityId ? (CITY_NAMES[draft.cityId] || draft.cityId) : null;

    // Format date for display — guard against empty/invalid strings
    let dateStr: string | null = null;
    if (draft.startDate) {
      const parsed = new Date(draft.startDate);
      if (!isNaN(parsed.getTime())) {
        dateStr = parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }

    // Build subtitle: City · Date · X participants
    const subtitleParts: string[] = [];
    if (cityName) subtitleParts.push(cityName);
    subtitleParts.push(dateStr || t.events.noDateLabel);
    if (draft.participantCount > 0) subtitleParts.push(`${draft.participantCount} ${t.events.participantsLabel || 'participants'}`);
    const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' · ') : t.events.noCityLabel;

    const handleDeleteDraft = (draftId: string, title: string) => {
      const tr = getTranslation();
      Alert.alert(
        tr.wizard.deleteDraftTitle || 'Delete Draft',
        tr.wizard.deleteDraftMessage?.replace('{{name}}', title) || `Delete "${title}"?`,
        [
          { text: tr.wizard.cancel, style: 'cancel' },
          {
            text: tr.common?.delete || 'Delete',
            style: 'destructive',
            onPress: () => useWizardStore.getState().deleteDraft(draftId),
          },
        ]
      );
    };

    const renderRightActions = (draftId: string, title: string) => (
      _progress: Animated.AnimatedInterpolation<number>,
      _dragX: Animated.AnimatedInterpolation<number>,
    ) => (
      <Pressable
        onPress={() => handleDeleteDraft(draftId, title)}
        style={styles.swipeDeleteAction}
      >
        <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        <Text style={styles.swipeDeleteText}>{t.common?.delete || 'Delete'}</Text>
      </Pressable>
    );

    return (
      <Swipeable
        key={draft.id}
        renderRightActions={renderRightActions(draft.id, draftTitle)}
        overshootRight={false}
      >
        <Pressable
          onPress={() => handleResumeDraft(draft.id)}
          style={({ pressed }) => [
            styles.eventCard,
            styles.draftCard,
            pressed && styles.eventCardPressed,
          ]}
          testID={`draft-event-card-${draft.id}`}
        >
          <XStack alignItems="center" gap={12}>
            <View style={styles.draftIcon}>
              <Ionicons name="document-text-outline" size={24} color="#F59E0B" />
            </View>
            <YStack flex={1}>
              <XStack alignItems="center" gap={8}>
                <Text style={styles.eventTitle} numberOfLines={1}>{draftTitle}</Text>
                <View style={styles.draftBadge}>
                  <Text style={styles.draftBadgeText}>{t.events.draft}</Text>
                </View>
              </XStack>
              <Text style={styles.dateText} numberOfLines={1}>
                {subtitle}
              </Text>
            </YStack>
            <Ionicons name="chevron-forward" size={20} color={DARK_THEME.textTertiary} />
          </XStack>

          <View style={styles.progressSection}>
            <XStack justifyContent="space-between" alignItems="center" marginBottom={6}>
              <XStack alignItems="center" gap={6}>
                <Ionicons name="ellipse" size={10} color="#F59E0B" />
                <Text style={[styles.progressLabel, { color: '#F59E0B' }]}>{t.events.draft} — {t.events.step} {draft.currentStep}/4</Text>
              </XStack>
              <Text style={[styles.progressPercentage, { color: '#F59E0B' }]}>{progressPct}%</Text>
            </XStack>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressPct}%`, backgroundColor: '#F59E0B' }]} />
            </View>
          </View>
        </Pressable>
      </Swipeable>
    );
  };

  const renderDraftCards = () => {
    // Only show drafts on All and Organizing tabs — they don't belong in Attending
    if (!hasDrafts || activeFilter === 'attending') return null;
    return <>{allDrafts.map(renderSingleDraftCard)}</>;
  };

  const renderListFooter = () => {
    if (!events || events.length === 0) return null;
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        {renderStartNewPlanButton()}
      </View>
    );
  };

  // Get user avatar or initials
  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

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
            <Text style={styles.headerTitle}>{t.events.title}</Text>
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

        {/* Filter Tabs */}
        {renderFilterTabs()}
      </View>

      {/* Error banner */}
      {eventsError && (
        <Pressable
          onPress={handleRefresh}
          style={styles.errorBanner}
        >
          <Ionicons name="alert-circle-outline" size={18} color="#F87171" />
          <Text style={styles.errorText}>
            {t.events.loadError || 'Failed to load events. Tap to retry.'}
          </Text>
        </Pressable>
      )}

      {/* Content — swipe left/right to switch filter tabs */}
      <Animated.View style={[{ flex: 1 }, swipeAnimStyle]} {...swipeHandlers}>
        {isLoading && !events ? (
          renderLoadingState()
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <FlatList
            data={filteredEvents}
            renderItem={renderEventCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: insets.bottom + 180
            }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={DARK_THEME.primary}
                colors={[DARK_THEME.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderDraftCards}
            ListFooterComponent={renderListFooter}
            testID="events-list"
          />
        ) : hasDrafts && activeFilter !== 'attending' ? (
          <FlatList
            data={[]}
            renderItem={null}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: insets.bottom + 180,
            }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={DARK_THEME.primary}
                colors={[DARK_THEME.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <>
                {renderDraftCards()}
                <View style={{ marginTop: 12 }}>
                  {renderStartNewPlanButton()}
                </View>
              </>
            }
          />
        ) : (
          renderEmptyState()
        )}
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
  eventCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  eventCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  thumbnailContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    backgroundColor: DARK_THEME.deepNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  menuButton: {
    padding: 4,
  },
  dateText: {
    fontSize: 14,
    color: DARK_THEME.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeOrganizer: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  roleBadgeGuest: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: DARK_THEME.primary,
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: 13,
    color: DARK_THEME.textSecondary,
  },
  paymentBadge: {
    backgroundColor: 'rgba(90, 126, 176, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5A7EB0',
  },
  progressSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: DARK_THEME.glassBorder,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: DARK_THEME.deepNavy,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  startNewPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
    paddingHorizontal: 24,
    marginHorizontal: 0,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: DARK_THEME.glassBorder,
    backgroundColor: 'transparent',
  },
  startNewPlanButtonPressed: {
    opacity: 0.7,
    backgroundColor: DARK_THEME.glass,
  },
  startNewPlanIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DARK_THEME.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startNewPlanText: {
    fontSize: 16,
    fontWeight: '500',
    color: DARK_THEME.textTertiary,
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
  draftCard: {
    borderColor: '#F59E0B40',
    borderWidth: 1,
    marginBottom: 12,
  },
  draftIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  swipeDeleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 16,
    marginBottom: 12,
    marginLeft: 8,
    gap: 4,
  },
  swipeDeleteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
  },
  errorText: {
    fontSize: 13,
    color: '#F87171',
    flex: 1,
  },
  segmentedBar: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
  },
  segment: {
    flex: 1,
    height: '100%',
    borderRadius: 1,
  },
  segmentFirst: {
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  segmentLast: {
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
});
