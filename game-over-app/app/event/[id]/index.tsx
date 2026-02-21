/**
 * Event Summary Screen — Redesigned
 * Clean header, info card, unified planning progress with checklist, 2×2 planning tools grid
 */

import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent, useUpdateEvent } from '@/hooks/queries/useEvents';
import { useParticipants } from '@/hooks/queries/useParticipants';
import { useBooking } from '@/hooks/queries/useBookings';
import { useCreateInvite } from '@/hooks/queries/useInvites';
import { ShareEventBanner } from '@/components/events';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';
import { getEventImage, resolveImageSource } from '@/constants/packageImages';
import {
  calculatePlanningSteps,
  getProgressPercentage,
  getCompletedCount,
  type PlanningStep,
  type PlanningChecklist,
} from '@/utils/planningProgress';
import { SkeletonEventCard } from '@/components/ui/Skeleton';
import { KenBurnsImage } from '@/components/ui/KenBurnsImage';
import { loadDesiredParticipants, loadChecklist, setChecklistItem } from '@/lib/participantCountCache';

// ─── Planning Tools ────────────────────────────
const TOOL_CONFIGS = [
  { key: 'invitations', icon: 'people', iconBg: 'rgba(236, 72, 153, 0.15)', iconColor: '#EC4899', route: 'participants', isTab: false },
  { key: 'communication', icon: 'chatbubbles', iconBg: 'rgba(59, 130, 246, 0.15)', iconColor: '#3B82F6', route: '/(tabs)/chat', isTab: true },
  { key: 'budget', icon: 'wallet', iconBg: 'rgba(16, 185, 129, 0.15)', iconColor: '#10B981', route: '/(tabs)/budget', isTab: true },
  { key: 'packages', icon: 'gift', iconBg: 'rgba(139, 92, 246, 0.15)', iconColor: '#8B5CF6', route: 'packages', isTab: false },
] as const;

export default function EventSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const { data: event, isLoading: eventLoading } = useEvent(id);
  const { data: participants } = useParticipants(id);
  const { data: booking } = useBooking(id);
  const updateEvent = useUpdateEvent();
  const createInvite = useCreateInvite();

  // Load cached desired participant count (set during wizard/booking)
  const [cachedParticipants, setCachedParticipants] = useState<number | undefined>(undefined);
  // Load cached checklist state (fallback when DB column unavailable)
  const [localChecklist, setLocalChecklist] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!id) return;
    loadDesiredParticipants(id).then(setCachedParticipants);
    loadChecklist(id).then(setLocalChecklist);
  }, [id]);

  // Planning steps (only for booked events)
  // Use DB planning_checklist if available, fallback to local cache
  const effectiveChecklist = useMemo(() => {
    const dbChecklist = (event?.planning_checklist ?? {}) as PlanningChecklist;
    // Merge: local cache overrides DB values (DB might not have the column)
    return { ...dbChecklist, ...localChecklist };
  }, [event, localChecklist]);

  const planningSteps = useMemo(() => {
    if (!event) return [];
    return calculatePlanningSteps(
      event,
      participants ?? undefined,
      effectiveChecklist,
    );
  }, [event, participants, effectiveChecklist]);

  const completedCount = getCompletedCount(planningSteps);
  const progressPct = getProgressPercentage(planningSteps);
  const isBooked = event?.status === 'booked' || event?.status === 'completed';

  // Manual steps (4-7) are locked until all 3 auto steps (1-3) are completed
  const autoStepsDone = planningSteps.slice(0, 3).every(s => s.completed);

  // Derive package highlight from booking tier — the premium feature of the selected package
  const TIER_HIGHLIGHTS: Record<string, string> = {
    essential: 'Reserved Bar Area',
    classic: 'Private Wine Tasting',
    grand: 'Private Yacht Charter',
  };
  const vibeText = useMemo(() => {
    if (!event) return '';

    // Try to get highlight from booking package tier
    const bookingPkg = booking as Record<string, any> | undefined;
    const pkgTier = bookingPkg?.package?.tier || bookingPkg?.tier;
    if (pkgTier && TIER_HIGHLIGHTS[pkgTier]) {
      return TIER_HIGHLIGHTS[pkgTier];
    }

    // Try to extract tier from selected_package_id slug (e.g., "hamburg-classic" → "classic")
    const selectedPkgId = bookingPkg?.selected_package_id;
    if (selectedPkgId && typeof selectedPkgId === 'string') {
      const slugParts = selectedPkgId.split('-');
      const possibleTier = slugParts[slugParts.length - 1];
      if (possibleTier && TIER_HIGHLIGHTS[possibleTier]) {
        return TIER_HIGHLIGHTS[possibleTier];
      }
    }

    // Fallback: first feature from the package if available
    const features = bookingPkg?.package?.features || bookingPkg?.features;
    if (Array.isArray(features) && features.length > 0) {
      return features[0];
    }

    // Final fallback: from event vibe or preferences
    if (event.vibe) return event.vibe;

    // For booked events, always show something meaningful
    if (event.status === 'booked' || event.status === 'completed') {
      return 'Classic Package';
    }

    // Show a meaningful fallback for events still in planning
    if (event.status === 'planning') return t.events.planningPhase || 'Planning in progress';
    return '';
  }, [event, booking]);

  // Generate invite code for sharing
  const handleGenerateInvite = async (): Promise<string> => {
    const invite = await createInvite.mutateAsync({ eventId: id! });
    return invite.code;
  };

  // Toggle a manual checklist item — try DB update, always persist locally
  const handleToggleChecklist = (key: string, currentValue: boolean) => {
    if (!event || !id) return;
    const newValue = !currentValue;

    // Optimistic local update
    setLocalChecklist(prev => ({ ...prev, [key]: newValue }));
    setChecklistItem(id, key, newValue).catch(() => {});

    // Also try DB update (non-blocking, may fail if column doesn't exist)
    updateEvent.mutate({
      eventId: event.id,
      updates: {
        planning_checklist: { ...effectiveChecklist, [key]: newValue },
      } as any,
    }, {
      onError: () => {
        // DB update failed (PGRST204) — local cache already handles persistence
      },
    });
  };

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

  // Confirmed participant count for tool subtext (exclude honoree from display total)
  const confirmedCount = participants?.filter(p => p.confirmed_at != null).length ?? 0;
  // Derive desired total: cache > booking > fallback
  const bookingDesiredTotal = booking
    ? (booking as any).paying_participants + ((booking as any).exclude_honoree ? 1 : 0)
    : 0;
  const rawDesiredTotal = cachedParticipants || bookingDesiredTotal || 10;
  // Display total excludes the honoree (already counted separately)
  const totalParticipants = Math.max(rawDesiredTotal - 1, 1);

  // Per-person cost from booking
  const perPersonCents = booking?.per_person_cents || booking?.total_amount_cents
    ? Math.round((booking?.total_amount_cents || 0) / Math.max(totalParticipants, 1))
    : 0;
  const perPersonDisplay = perPersonCents > 0 ? Math.round(perPersonCents / 100) : null;

  // City image for destination guide — tier-aware from booking data
  const citySlug = event.city?.name?.toLowerCase() || 'berlin';
  const bookingPkgId = (booking as any)?.selected_package_id;
  const cityImage = getEventImage(citySlug, bookingPkgId || event.hero_image_url);

  // Tool subtext
  const getToolSubtext = (key: string): { text: string; color: string } => {
    switch (key) {
      case 'invitations':
        return {
          text: t.eventDetail.confirmed.replace('{{count}}', String(confirmedCount)).replace('{{total}}', String(totalParticipants)),
          color: '#10B981',
        };
      case 'communication':
        return { text: (t.eventDetail as any).chatSubtext || 'Align with your group', color: DARK_THEME.textTertiary };
      case 'budget':
        return {
          text: perPersonDisplay
            ? t.eventDetail.personEst.replace('{{amount}}', String(perPersonDisplay))
            : (t.eventDetail as any).budgetSubtext || 'Track expenses',
          color: DARK_THEME.textTertiary,
        };
      case 'packages':
        return { text: t.eventDetail.selectedPackage, color: DARK_THEME.textTertiary };
      default:
        return { text: '', color: DARK_THEME.textTertiary };
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Header bar ─────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={16}>
          <Pressable onPress={() => router.back()} hitSlop={8} testID="back-button">
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{t.eventDetail.title}</Text>
          <Pressable
            onPress={() => router.push(`/event/${id}/edit`)}
            hitSlop={8}
            testID="edit-button"
          >
            <Ionicons name="create-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </XStack>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Title + Motto ──────────────────────── */}
        <YStack marginBottom={20}>
          <Text style={styles.eventTitle}>{eventTitle}</Text>
          <Text style={styles.motto}>{t.eventDetail.motto}</Text>
        </YStack>

        {/* ─── Info Card ──────────────────────────── */}
        <View style={styles.infoCard}>
          {/* Location */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="location" size={18} color="#3B82F6" />
            </View>
            <YStack flex={1}>
              <Text style={styles.infoLabel}>{t.eventDetail.location}</Text>
              <Text style={styles.infoValue}>{cityName}</Text>
            </YStack>
          </View>

          <View style={styles.infoDivider} />

          {/* Dates */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="calendar" size={18} color="#10B981" />
            </View>
            <YStack flex={1}>
              <Text style={styles.infoLabel}>{t.eventDetail.dates}</Text>
              <Text style={styles.infoValue}>{dateStr}</Text>
            </YStack>
          </View>

          <View style={styles.infoDivider} />

          {/* Package Highlight */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
              <Ionicons name="trophy" size={18} color="#F97316" />
            </View>
            <YStack flex={1}>
              <Text style={styles.infoLabel}>{t.eventDetail.vibe}</Text>
              <Text style={styles.infoValue}>{vibeText || '—'}</Text>
            </YStack>
          </View>
        </View>

        {/* ─── Share / Invite Banner ─────────────── */}
        <View style={{ marginBottom: 20 }}>
          <ShareEventBanner
            eventId={id!}
            eventTitle={eventTitle}
            participantCount={participants?.length || 0}
            onGenerateInvite={handleGenerateInvite}
          />
        </View>

        {/* ─── Planning Tools 2×2 Grid ───────────── */}
        <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>{t.eventDetail.planningTools}</Text>
        <View style={styles.toolsGrid}>
          {TOOL_CONFIGS.map((tool) => {
            const sub = getToolSubtext(tool.key);
            const toolLabel = t.eventDetail[
              tool.key === 'invitations' ? 'manageInvitations'
                : tool.key === 'communication' ? 'communication'
                  : tool.key === 'budget' ? 'budgetTool'
                    : 'packagesTool'
            ];
            return (
              <Pressable
                key={tool.key}
                style={({ pressed }) => [styles.toolCard, pressed && styles.toolCardPressed]}
                onPress={() => router.push(tool.isTab ? tool.route as any : `/event/${id}/${tool.route}`)}
                testID={`planning-tool-${tool.key}`}
              >
                <View style={[styles.toolIconCircle, { backgroundColor: tool.iconBg }]}>
                  <Ionicons name={tool.icon as any} size={22} color={tool.iconColor} />
                </View>
                <Text style={styles.toolLabel}>{toolLabel}</Text>
                <Text style={[styles.toolSubtext, { color: sub.color }]} numberOfLines={1}>
                  {sub.text}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ─── Unified Planning Progress (booked only) ── */}
        {isBooked && planningSteps.length > 0 && (
          <View style={[styles.progressCard, { marginTop: 8 }]}>
            {/* Header + count */}
            <XStack justifyContent="space-between" alignItems="center" marginBottom={10}>
              <Text style={styles.sectionLabel}>{t.eventDetail.planningProgress}</Text>
              <Text style={styles.progressCount}>
                {t.eventDetail.stepsComplete.replace('{{completed}}', String(completedCount))}
              </Text>
            </XStack>

            {/* Segmented progress bar */}
            <View style={styles.segmentedBar}>
              {Array.from({ length: 8 }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.segment,
                    { backgroundColor: i < completedCount ? DARK_THEME.primary : DARK_THEME.deepNavy },
                    i === 0 && styles.segmentFirst,
                    i === 7 && styles.segmentLast,
                  ]}
                />
              ))}
            </View>

            {/* Divider between bar and step list */}
            <View style={[styles.infoDivider, { marginHorizontal: 0, marginTop: 14, marginBottom: 4 }]} />

            {/* Inline step list */}
            {planningSteps.map((step, idx) => (
              <React.Fragment key={step.key}>
                {idx > 0 && <View style={[styles.infoDivider, { marginHorizontal: 0 }]} />}
                <ChecklistRow
                  step={step}
                  stepNumber={idx + 1}
                  t={t}
                  onToggle={handleToggleChecklist}
                  locked={!step.auto && !autoStepsDone}
                />
              </React.Fragment>
            ))}
          </View>
        )}

        {/* ─── Destination Guide ─────────────────── */}
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>{t.eventDetail.destinationGuide}</Text>
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
          <Pressable
            style={styles.ctaButton}
            onPress={() => router.push(`/booking/${id}/summary`)}
            testID="book-package-button"
          >
            <Text style={styles.ctaButtonText}>Book Package</Text>
          </Pressable>
        </View>
      )}
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
}: {
  step: PlanningStep;
  stepNumber: number;
  t: any;
  onToggle: (key: string, current: boolean) => void;
  locked: boolean;
}) {
  const label = (t.eventDetail as any)[step.labelKey] || step.labelKey;
  const isDisabled = step.auto || locked;

  // Icon color: green for completed auto, primary for completed manual, muted otherwise
  const iconBgColor = step.completed
    ? (step.auto ? 'rgba(16, 185, 129, 0.15)' : 'rgba(90, 126, 176, 0.15)')
    : locked
      ? 'rgba(156, 163, 175, 0.08)'
      : 'rgba(156, 163, 175, 0.12)';
  const iconColor = step.completed
    ? (step.auto ? '#10B981' : DARK_THEME.primary)
    : locked
      ? 'rgba(156, 163, 175, 0.4)'
      : DARK_THEME.textTertiary;

  return (
    <Pressable
      style={[styles.checklistRow, locked && { opacity: 0.45 }]}
      onPress={isDisabled ? undefined : () => onToggle(step.key, step.completed)}
      disabled={isDisabled}
    >
      {/* Step icon circle */}
      <View style={[styles.stepIconCircle, { backgroundColor: iconBgColor }]}>
        <Ionicons name={step.icon as any} size={16} color={iconColor} />
      </View>

      {/* Step number + label */}
      <YStack flex={1}>
        <Text style={[styles.checklistLabel, step.completed && styles.checklistLabelDone]}>
          {stepNumber}. {label}
        </Text>
      </YStack>

      {/* Right side: checkbox or lock or AUTO tag */}
      {step.auto ? (
        <XStack alignItems="center" gap={6}>
          <View style={[
            styles.checkbox,
            step.completed && styles.checkboxAuto,
          ]}>
            {step.completed && (
              <Ionicons name="checkmark" size={14} color="#10B981" />
            )}
          </View>
          <Text style={styles.autoTag}>AUTO</Text>
        </XStack>
      ) : locked ? (
        <Ionicons name="lock-closed" size={14} color={DARK_THEME.textTertiary} />
      ) : (
        <View style={[
          styles.checkbox,
          step.completed && styles.checkboxChecked,
        ]}>
          {step.completed && (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          )}
        </View>
      )}
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.glassBorder,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  eventTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: DARK_THEME.textPrimary,
    marginBottom: 4,
  },
  motto: {
    fontSize: 14,
    color: DARK_THEME.textTertiary,
    fontStyle: 'italic',
  },

  // Info Card
  infoCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    padding: 4,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: DARK_THEME.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
    marginTop: 1,
  },
  infoDivider: {
    height: 1,
    backgroundColor: DARK_THEME.glassBorder,
    marginHorizontal: 14,
  },

  // Progress
  progressCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    padding: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  progressCount: {
    fontSize: 13,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
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

  // Planning Tools Grid
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  toolCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    padding: 16,
    alignItems: 'flex-start',
    gap: 8,
  },
  toolCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  toolIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  toolSubtext: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Planning Checklist (inside progress card)
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
    borderColor: DARK_THEME.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: DARK_THEME.primary,
    borderColor: DARK_THEME.primary,
  },
  checkboxAuto: {
    backgroundColor: 'transparent',
    borderColor: '#10B981',
  },
  checklistLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  checklistLabelDone: {
    color: DARK_THEME.textSecondary,
  },
  autoTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    overflow: 'hidden',
  },

  // Destination Guide
  destinationCard: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 160,
    position: 'relative',
  },
  destinationImage: {
    width: '100%',
    height: '100%',
  },
  destinationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  destinationContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  destinationLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  destinationLink: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },

  // CTA Bar
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: DARK_THEME.surface,
    borderTopWidth: 1,
    borderTopColor: DARK_THEME.glassBorder,
  },
  ctaButton: {
    backgroundColor: DARK_THEME.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
