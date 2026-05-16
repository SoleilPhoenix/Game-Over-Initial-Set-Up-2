/**
 * Event Summary Screen — Editorial re-skin (content-preserving).
 * ALL logic / hooks / data flow kept 1:1 — only styling switches to
 * the editorial design tokens via useTheme(). Text containers use
 * editorial primitives (DisplayHeading, SectionLabel, GoldButton).
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Alert, ScrollView, Pressable, StyleSheet, View, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent, useUpdateEvent } from '@/hooks/queries/useEvents';
import { useParticipants } from '@/hooks/queries/useParticipants';
import { useAuthStore } from '@/stores/authStore';
import { useBooking } from '@/hooks/queries/useBookings';
import { useCreateInvite } from '@/hooks/queries/useInvites';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { SPACING, RADII, TYPE_SCALE, ambientShadow, type EditorialTheme } from '@/constants/designSystem';
import { DisplayHeading, GoldButton } from '@/components/ui/editorial';
import { ShareModal } from '@/components/ui/ShareModal';
import { getEventImage, resolveImageSource } from '@/constants/packageImages';
import {
  calculatePlanningSteps,
  getProgressPercentage,
  getCompletedCount,
  type PlanningStep,
  type PlanningChecklist,
} from '@/utils/planningProgress';
import { assemblePackages } from '@/utils/packageAssembly';
import { SkeletonEventCard } from '@/components/ui/Skeleton';
import { KenBurnsImage } from '@/components/ui/KenBurnsImage';
import { loadDesiredParticipants, loadChecklist, setChecklistItem, loadInvitedCount, loadBudgetInfo, type BudgetInfo } from '@/lib/participantCountCache';

// ─── Planning Tools ─────────────────────────────
// Icon tints kept as semantic colours — they encode tool identity
// (people / chat / money / gift) and aren't part of the theme swap.
const TOOL_CONFIGS = [
  { key: 'invitations', icon: 'people', iconBg: 'rgba(236, 72, 153, 0.15)', iconColor: '#EC4899', route: 'participants', isTab: false },
  { key: 'communication', icon: 'chatbubbles', iconBg: 'rgba(59, 130, 246, 0.15)', iconColor: '#3B82F6', route: '/(tabs)/chat', isTab: true, passEventId: true },
  { key: 'budget', icon: 'wallet', iconBg: 'rgba(198, 167, 94, 0.15)', iconColor: '#C6A75E', route: 'budget', isTab: false },
  { key: 'packages', icon: 'gift', iconBg: 'rgba(139, 92, 246, 0.15)', iconColor: '#8B5CF6', route: 'packages', isTab: false },
] as const;

// ─── Social Share Platforms ──────────────────────────

export default function EventSummaryScreen() {
  const { id, firstVisit, role: roleParam } = useLocalSearchParams<{ id: string; firstVisit?: string; role?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { data: event, isLoading: eventLoading, error: eventError, refetch: refetchEvent } = useEvent(id);
  const { data: participants, isLoading: isLoadingParticipants } = useParticipants(id);
  const { data: booking } = useBooking(id);
  const currentUserId = useAuthStore(s => s.user?.id);
  const currentParticipant = participants?.find(p => p.user_id === currentUserId);
  const isGuest = roleParam === 'guest' || (!roleParam && currentParticipant?.role === 'guest');
  const updateEvent = useUpdateEvent();
  const createInvite = useCreateInvite();

  const [cachedParticipants, setCachedParticipants] = useState<number | undefined>(undefined);
  const [localChecklist, setLocalChecklist] = useState<Record<string, boolean>>({});
  const [cachedInvitedCount, setCachedInvitedCount] = useState(0);
  const [cachedBudget, setCachedBudget] = useState<BudgetInfo | null>(null);
  useEffect(() => {
    if (!id) return;
    loadDesiredParticipants(id).then(setCachedParticipants);
    loadChecklist(id).then(setLocalChecklist);
    loadBudgetInfo(id).then(info => setCachedBudget(info ?? null));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      loadInvitedCount(id).then(setCachedInvitedCount);
      loadChecklist(id).then(setLocalChecklist);
    }, [id])
  );

  const [showContributionCard, setShowContributionCard] = useState(false);
  const [contributionCents, setContributionCents] = useState(0);

  // ─── Social share modal state ───────────────────
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareInviteCode, setShareInviteCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isGuest || !firstVisit || !currentUserId || !id) return;
    const key = `gameover:contribution_seen:${id}:${currentUserId}`;

    Promise.all([
      AsyncStorage.getItem(key),
      loadBudgetInfo(id),
    ]).then(([seen, info]) => {
      if (seen) return;

      let cents = 0;
      if (info?.totalCents && info?.payingCount) {
        cents = Math.ceil(info.totalCents / info.payingCount);
      } else if (booking?.total_amount_cents && participants?.length) {
        cents = Math.ceil(booking.total_amount_cents / participants.length);
      }

      setContributionCents(cents);
      if (cents > 0) setShowContributionCard(true);
    });
  }, [isGuest, firstVisit, currentUserId, id, booking, participants]);

  const handleDismissContributionCard = async () => {
    const key = `gameover:contribution_seen:${id}:${currentUserId}`;
    await AsyncStorage.setItem(key, '1');
    setShowContributionCard(false);
  };

  const effectiveChecklist = useMemo(() => {
    const dbChecklist = (event?.planning_checklist ?? {}) as PlanningChecklist;
    return { ...dbChecklist, ...localChecklist };
  }, [event, localChecklist]);

  const bookingDesiredTotalEarly = booking
    ? (booking.paying_participants ?? 0) + (booking.exclude_honoree ? 1 : 0)
    : 0;
  const rawDesiredTotalEarly = cachedParticipants || bookingDesiredTotalEarly || 0;
  const nonHonoreeDesiredEarly = rawDesiredTotalEarly > 1 ? rawDesiredTotalEarly - 1 : undefined;

  const planningSteps = useMemo(() => {
    if (!event) return [];
    return calculatePlanningSteps(
      event,
      participants ?? undefined,
      effectiveChecklist,
      cachedInvitedCount,
      nonHonoreeDesiredEarly,
    );
  }, [event, participants, effectiveChecklist, cachedInvitedCount, nonHonoreeDesiredEarly]);

  const completedCount = getCompletedCount(planningSteps);
  const progressPct = getProgressPercentage(planningSteps);
  const isBooked = event?.status === 'booked' || event?.status === 'completed';

  const isBudgetUrgent = useMemo(() => {
    if (!event?.start_date || !cachedBudget) return false;
    const start = new Date(event.start_date);
    const now = new Date();
    const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysLeft = Math.round((startMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 14 && (cachedBudget.paidAmountCents || 0) < cachedBudget.totalCents;
  }, [event?.start_date, cachedBudget]);

  const vibeText = useMemo(() => {
    if (!event) return '';
    if (cachedBudget?.packageHighlight) return cachedBudget.packageHighlight;
    if (cachedBudget?.packageFeatures?.[0]) return cachedBudget.packageFeatures[0];
    if (cachedBudget?.packageId) {
      const parts = cachedBudget.packageId.split('-');
      const citySlug = parts[0];
      const tierSlug = parts[parts.length - 1];
      if (citySlug && tierSlug) {
        try {
          const assembled = assemblePackages({ h1: null, h2: null, h3: null, h4: null, h5: null, h6: null, g1: null, g2: null, g3: null, g4: null, g5: null, g6: [] }, citySlug);
          const match = assembled.find(p => p.tier === tierSlug);
          if (match?.features?.[0]) return match.features[0];
        } catch {}
      }
    }
    const bookingFeatures = (booking?.package as Record<string, unknown> | null)?.features;
    if (Array.isArray(bookingFeatures) && bookingFeatures.length > 0) return bookingFeatures[0] as string;
    if (event.status === 'planning') return t.events.planningPhase || 'Planning in progress';
    return '';
  }, [event, booking, cachedBudget]);

  const handleGenerateInvite = async (): Promise<string> => {
    const invite = await createInvite.mutateAsync({ eventId: id! })
      .catch(error => { console.error('[handleGenerateInvite]', error); throw error; });
    return invite.code;
  };

  useEffect(() => {
    if (!id || !planningSteps.length) return;
    const step2 = planningSteps[1];
    if (step2?.completed) {
      AsyncStorage.setItem(`gameover:step2_confirmed:${id}`, '1').catch(() => {});
    } else {
      AsyncStorage.removeItem(`gameover:step2_confirmed:${id}`).catch(() => {});
    }
  }, [id, planningSteps]);

  const handleToggleChecklist = (key: string, currentValue: boolean) => {
    if (!event || !id) return;
    if (isGuest) {
      Alert.alert(
        t.eventDetail.organizerOnly,
        t.eventDetail.organizerOnlyMsg,
        [{ text: t.common.ok }]
      );
      return;
    }
    const newValue = !currentValue;
    setLocalChecklist(prev => ({ ...prev, [key]: newValue }));
    setChecklistItem(id, key, newValue).catch(() => {});
    updateEvent.mutate({
      eventId: event.id,
      updates: {
        planning_checklist: { ...effectiveChecklist, [key]: newValue },
      } as any,
    }, {
      onError: () => {},
    });
  };

  // ─── Error state ───────────────────────────────
  if (eventError && !event) {
    return (
      <YStack flex={1} backgroundColor={theme.background} justifyContent="center" alignItems="center" padding={24}>
        <Ionicons name="cloud-offline-outline" size={48} color={theme.textTertiary} />
        <Text color={theme.textPrimary} fontSize={16} fontWeight="600" marginTop={16} marginBottom={8} textAlign="center">
          {t.common.error}
        </Text>
        <Text color={theme.textSecondary} fontSize={14} textAlign="center" marginBottom={24}>
          {t.events.loadError}
        </Text>
        <GoldButton
          label={t.common.retry}
          onPress={() => refetchEvent()}
          testID="event-detail-retry-button"
        />
      </YStack>
    );
  }

  // ─── Loading skeleton ──────────────────────────
  if (eventLoading || !event) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <YStack padding={16} gap={16}>
          <View style={{ height: 40 }} />
          <SkeletonEventCard />
          <SkeletonEventCard />
        </YStack>
      </View>
    );
  }

  const eventTitle = event.title || `${event.honoree_name}'s Event`;
  const cityName = event.city?.name || 'Unknown';
  const dateStr = event.start_date
    ? new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'TBD';

  const confirmedCount = participants?.filter(p =>
    p.role !== 'honoree' && (p.role === 'organizer' || p.confirmed_at != null || p.user_id != null)
  ).length ?? 0;
  const bookingDesiredTotal = booking
    ? (booking.paying_participants ?? 0) + (booking.exclude_honoree ? 1 : 0)
    : 0;
  const rawDesiredTotal = cachedParticipants || bookingDesiredTotal || 10;
  const totalParticipants = Math.max(rawDesiredTotal - 1, 1);

  const perPersonCents = booking?.per_person_cents || booking?.total_amount_cents
    ? Math.round((booking?.total_amount_cents || 0) / Math.max(totalParticipants, 1))
    : 0;
  const perPersonDisplay = perPersonCents > 0 ? Math.round(perPersonCents / 100) : null;

  const citySlug = event.city?.name?.toLowerCase() || 'berlin';
  const cityImage = getEventImage(citySlug, booking?.package_id || event.hero_image_url);

  return (
    <View style={styles.container}>
      {/* ─── Header bar ─────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={16}>
          <Pressable onPress={() => router.back()} hitSlop={8} testID="back-button">
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t.eventDetail.title}</Text>
          {!isGuest ? (
            <Pressable onPress={() => router.push(`/event/${id}/edit`)} hitSlop={8} testID="edit-button">
              <Ionicons name="create-outline" size={22} color={theme.textPrimary} />
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </XStack>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Title + Motto (centered per mockup) ──── */}
        <YStack alignItems="center" marginTop={8} marginBottom={24}>
          <DisplayHeading variant="displayMd" style={{ textAlign: 'center', marginBottom: 6 }}>
            {eventTitle}
          </DisplayHeading>
          <Text style={[styles.motto, { textAlign: 'center' }]}>{t.eventDetail.motto}</Text>
        </YStack>

        {/* ─── Info Card (3-column per mockup — Package Highlight gets more room) ── */}
        <View style={styles.infoCard}>
          <View style={[styles.infoColumn, styles.infoColumnNarrow]}>
            <Ionicons name="location" size={22} color={theme.accentGold} />
            <Text style={styles.infoLabel}>{t.eventDetail.location}</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{cityName}</Text>
          </View>

          <View style={[styles.infoColumn, styles.infoColumnNarrow]}>
            <Ionicons name="calendar" size={22} color={theme.accentGold} />
            <Text style={styles.infoLabel}>{t.eventDetail.dates}</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{dateStr}</Text>
          </View>

          <View style={[styles.infoColumn, styles.infoColumnWide]}>
            <Ionicons name="trophy" size={22} color={theme.accentGold} />
            <Text style={styles.infoLabel} numberOfLines={1}>{t.eventDetail.vibe}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{vibeText || '—'}</Text>
          </View>
        </View>

        {/* ─── Share Invite (gold CTA per mockup) ── */}
        {!isGuest && (
          <View style={{ marginBottom: 28 }}>
            <GoldButton
              label="Share Invite — Invite Friends to Join"
              fullWidth
              size="md"
              leftIcon={<Ionicons name="share-social" size={18} color={theme.textOnPrimary} />}
              onPress={async () => {
                try {
                  const code = await handleGenerateInvite();
                  setShareInviteCode(code);
                  setShareModalVisible(true);
                } catch (e: any) {
                  Alert.alert(t.common.error, e?.message || t.events.loadError);
                }
              }}
              testID="share-invite-button"
            />
          </View>
        )}

        {/* ─── Planning Tools 2×2 Grid (mockup: titles only) ── */}
        <DisplayHeading variant="headlineMd" style={{ marginBottom: 16 }}>
          {t.eventDetail.planningTools}
        </DisplayHeading>
        <View style={styles.toolsGrid}>
          {TOOL_CONFIGS.map((tool) => {
            const toolLabel = t.eventDetail[
              tool.key === 'invitations' ? 'manageInvitations'
                : tool.key === 'communication' ? 'communication'
                  : tool.key === 'budget' ? 'budgetTool'
                    : 'packagesTool'
            ];
            const isUrgentBudgetTool = tool.key === 'budget' && isBudgetUrgent;
            return (
              <Pressable
                key={tool.key}
                style={({ pressed }) => [
                  styles.toolCard,
                  isUrgentBudgetTool && styles.toolCardUrgent,
                  pressed && styles.toolCardPressed,
                ]}
                onPress={() => {
                  if (tool.key === 'packages') {
                    const pkgId = cachedBudget?.packageId || booking?.package_id;
                    if (pkgId) {
                      router.push(`/package/${pkgId}?eventId=${id}&viewOnly=1` as any);
                    }
                    return;
                  }
                  const roleQuery = roleParam ? `?role=${roleParam}` : '';
                  const route = tool.isTab
                    ? ((tool as any).passEventId ? `${tool.route}?eventId=${id}` : tool.route)
                    : `/event/${id}/${tool.route}${roleQuery}`;
                  router.push(route as any);
                }}
                testID={`planning-tool-${tool.key}`}
              >
                <Ionicons
                  name={tool.icon as any}
                  size={36}
                  color={isUrgentBudgetTool ? theme.error : theme.accentGold}
                />
                <Text style={styles.toolLabel}>{toolLabel}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ─── Unified Planning Progress (booked only) ── */}
        {isBooked && planningSteps.length > 0 && (
          <View style={[styles.progressCard, { marginTop: 8 }]}>
            <XStack justifyContent="space-between" alignItems="center" marginBottom={14}>
              <DisplayHeading variant="headlineMd">{t.eventDetail.planningProgress}</DisplayHeading>
              <Text style={styles.progressCount}>
                {t.eventDetail.stepsComplete.replace('{{completed}}', String(completedCount))}
              </Text>
            </XStack>

            <View style={styles.segmentedBar}>
              {Array.from({ length: 8 }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.segment,
                    { backgroundColor: i < completedCount ? theme.accentGold : theme.surfaceHigh },
                    i === 0 && styles.segmentFirst,
                    i === 7 && styles.segmentLast,
                  ]}
                />
              ))}
            </View>

            <View style={[styles.infoDivider, { marginHorizontal: 0, marginTop: 14, marginBottom: 4 }]} />

            {planningSteps.map((step, idx) => {
              const locked = idx > 0 && !planningSteps[idx - 1].completed;
              return (
                <React.Fragment key={step.key}>
                  {idx > 0 && <View style={[styles.infoDivider, { marginHorizontal: 0 }]} />}
                  <ChecklistRow
                    step={step}
                    stepNumber={idx + 1}
                    t={t}
                    onToggle={handleToggleChecklist}
                    locked={locked}
                    theme={theme}
                  />
                </React.Fragment>
              );
            })}
          </View>
        )}

        {/* ─── Destination Guide ─────────────────── */}
        <View style={{ marginTop: 20 }}>
          <DisplayHeading variant="headlineMd" style={{ marginBottom: 12 }}>{t.eventDetail.destinationGuide}</DisplayHeading>
          <Pressable
            style={({ pressed }) => [styles.destinationCard, pressed && { opacity: 0.9 }]}
            onPress={() => router.push(`/event/${id}/destination`)}
            testID="destination-guide-card"
          >
            <KenBurnsImage
              source={resolveImageSource(event.hero_image_url || cityImage)}
              style={styles.destinationImage}
              resizeMode="cover"
            />
            <View style={styles.destinationOverlay} />
            <YStack style={styles.destinationContent}>
              <Text style={styles.destinationLabel}>
                {t.eventDetail.topRatedSpots.replace('{{city}}', cityName)}
              </Text>
              <Text style={styles.destinationLink}>{t.eventDetail.viewTips} →</Text>
            </YStack>
          </Pressable>
        </View>
      </ScrollView>

      {/* ─── Book Package CTA (planning only) ──── */}
      {event.status === 'planning' && (
        <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 16 }]}>
          <GoldButton
            label="Book Package"
            fullWidth
            size="lg"
            onPress={() => router.push(`/booking/${id}/summary`)}
            testID="book-package-button"
          />
        </View>
      )}

      {/* ─── First-time Contribution Card (guests only) ── */}
      <Modal
        visible={showContributionCard}
        transparent
        animationType="fade"
        onRequestClose={handleDismissContributionCard}
      >
        <View style={{
          flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center', alignItems: 'center', padding: 24,
        }}>
          <View accessibilityViewIsModal={true} style={{
            backgroundColor: theme.surfaceBright, borderRadius: RADII.xl,
            padding: 24, width: '100%',
            borderWidth: StyleSheet.hairlineWidth, borderColor: theme.accentGold,
          }}>
            <Text style={{ fontSize: 20 }}>💰</Text>
            <DisplayHeading variant="headlineMd" style={{ marginTop: 8 }}>
              Your Contribution
            </DisplayHeading>
            {contributionCents > 0 && (
              <Text style={{ fontSize: 32, fontWeight: '900', color: theme.accentGold, marginTop: 4 }}>
                €{Math.round(contributionCents / 100)}
              </Text>
            )}
            <Text style={{ fontSize: 13, color: theme.textTertiary, marginTop: 8, lineHeight: 20 }}>
              Please transfer this amount to{' '}
              <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>
                {participants?.find(p => p.role === 'organizer')?.profile?.full_name
                  ?? 'the organizer'}
              </Text>
              . Your share is due 14 days before the event.
            </Text>
            <View style={{ marginTop: 20 }}>
              <GoldButton
                label="Got it"
                fullWidth
                onPress={handleDismissContributionCard}
                testID="contribution-card-dismiss"
              />
            </View>
          </View>
        </View>
      </Modal>

      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        eventId={shareInviteCode ?? id}
        eventTitle={eventTitle}
      />
    </View>
  );
}

// ─── Checklist Row Component ───────────────────
function ChecklistRow({
  step,
  stepNumber,
  t,
  onToggle,
  locked,
  theme,
}: {
  step: PlanningStep;
  stepNumber: number;
  t: any;
  onToggle: (key: string, current: boolean) => void;
  locked: boolean;
  theme: EditorialTheme;
}) {
  const label = (t.eventDetail as any)[step.labelKey] || step.labelKey;
  const isDisabled = step.auto || locked;

  const iconBgColor = step.completed
    ? 'rgba(198, 167, 94, 0.2)'
    : locked
      ? 'rgba(156, 163, 175, 0.08)'
      : 'rgba(156, 163, 175, 0.12)';
  const iconColor = step.completed
    ? theme.accentGold
    : locked
      ? 'rgba(156, 163, 175, 0.4)'
      : theme.textTertiary;

  return (
    <Pressable
      style={[rowStyles.checklistRow, locked && { opacity: 0.45 }]}
      onPress={isDisabled ? undefined : () => onToggle(step.key, step.completed)}
      disabled={isDisabled}
    >
      <View style={[rowStyles.stepIconCircle, { backgroundColor: iconBgColor }]}>
        <Ionicons name={step.icon as any} size={16} color={iconColor} />
      </View>

      <YStack flex={1}>
        <Text style={[
          rowStyles.checklistLabel,
          { color: theme.textPrimary },
          step.completed && { color: theme.textSecondary },
        ]}>
          {stepNumber}. {label}
        </Text>
      </YStack>

      {step.auto ? (
        <XStack alignItems="center" gap={6}>
          <Text style={rowStyles.autoTag}>AUTO</Text>
          <View style={[
            rowStyles.checkbox,
            { borderColor: theme.textTertiary },
            step.completed && rowStyles.checkboxAuto,
          ]}>
            {step.completed && (
              <Ionicons name="checkmark" size={14} color="#C6A75E" />
            )}
          </View>
        </XStack>
      ) : locked ? (
        <Ionicons name="lock-closed" size={14} color={theme.textTertiary} />
      ) : (
        /* Manual step — same visual as AUTO checkbox */
        <View style={[
          rowStyles.checkbox,
          { borderColor: step.completed ? '#C6A75E' : theme.textTertiary },
          step.completed && { backgroundColor: 'rgba(198,167,94,0.1)' },
        ]}>
          {step.completed && (
            <Ionicons name="checkmark" size={14} color="#C6A75E" />
          )}
        </View>
      )}
    </Pressable>
  );
}

// Row styles independent of theme (only layout + neutral tones).
const rowStyles = StyleSheet.create({
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    gap: 10,
  },
  stepIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxAuto: {
    backgroundColor: 'transparent',
    borderColor: '#C6A75E',
  },
  checklistLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  autoTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#C6A75E',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(198, 167, 94, 0.15)',
    overflow: 'hidden',
  },
});

// ─── Styles (theme-aware factory) ──────────────
function makeStyles(theme: EditorialTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.ghostBorder,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.textPrimary,
      fontFamily: TYPE_SCALE.titleLg.fontFamily,
    },
    motto: {
      fontSize: 14,
      color: theme.textTertiary,
      fontStyle: 'italic',
      fontFamily: TYPE_SCALE.body.fontFamily,
    },

    // Info Card — 3 columns in one row (mockup)
    infoCard: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceCard,
      borderRadius: RADII.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.ghostBorder,
      paddingVertical: 18,
      paddingHorizontal: 8,
      marginBottom: 20,
      ...ambientShadow(theme),
    },
    infoColumn: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 6,
      paddingHorizontal: 4,
    },
    infoColumnNarrow: { flex: 0.85 },
    infoColumnWide: { flex: 1.3 },
    infoLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      fontFamily: TYPE_SCALE.label.fontFamily,
      textAlign: 'center',
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textPrimary,
      fontFamily: TYPE_SCALE.titleMd.fontFamily,
      textAlign: 'center',
    },
    infoDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.ghostBorder,
      marginHorizontal: 14,
    },

    // Progress
    progressCard: {
      backgroundColor: theme.surfaceCard,
      borderRadius: RADII.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.ghostBorder,
      padding: 16,
      marginBottom: 20,
      ...ambientShadow(theme),
    },
    progressCount: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textSecondary,
      fontFamily: TYPE_SCALE.body.fontFamily,
    },
    segmentedBar: {
      flexDirection: 'row',
      gap: 3,
      height: 8,
    },
    segment: {
      flex: 1,
      height: '100%',
      borderRadius: 1,
    },
    segmentFirst: {
      borderTopLeftRadius: 4,
      borderBottomLeftRadius: 4,
    },
    segmentLast: {
      borderTopRightRadius: 4,
      borderBottomRightRadius: 4,
    },

    // Planning Tools Grid (mockup: centered, gold-outlined, title only)
    toolsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginBottom: 24,
    },
    toolCard: {
      width: '47%',
      flexGrow: 1,
      minHeight: 140,
      backgroundColor: theme.surfaceCard,
      borderRadius: RADII.lg,
      borderWidth: 1,
      borderColor: theme.accentGold,
      paddingVertical: 24,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      ...ambientShadow(theme),
    },
    toolCardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    toolCardUrgent: {
      borderColor: theme.error,
      borderWidth: 1.5,
    },
    toolLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textPrimary,
      fontFamily: TYPE_SCALE.titleMd.fontFamily,
      textAlign: 'center',
    },

    // Destination Guide (mockup: gold-bordered card, gold headline)
    destinationCard: {
      borderRadius: RADII.lg,
      overflow: 'hidden',
      height: 180,
      position: 'relative',
      borderWidth: 1,
      borderColor: theme.accentGold,
      ...ambientShadow(theme),
    },
    destinationImage: {
      width: '100%',
      height: '100%',
    },
    destinationOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(13, 27, 42, 0.62)',
    },
    destinationContent: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
    },
    destinationLabel: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 4,
      fontFamily: TYPE_SCALE.headlineMd.fontFamily,
    },
    destinationLink: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
      fontFamily: TYPE_SCALE.body.fontFamily,
    },

    // CTA Bar
    ctaBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      backgroundColor: theme.surfaceLow,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.ghostBorder,
    },
  });
}
