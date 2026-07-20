/**
 * Event Day Screen
 * Live day-of-event timeline. Shown via banner on Events tab when event is today (or tomorrow).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Pressable, StyleSheet, Alert, Linking, Platform, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { useEvent } from '@/hooks/queries/useEvents';
import { useBooking } from '@/hooks/queries/useBookings';
import { useEventSchedule, scheduleKeys } from '@/hooks/queries/useSchedule';
import { useAuthStore } from '@/stores/authStore';
import { DARK_THEME } from '@/constants/theme';
import { formatScheduleTime, generateDefaultSchedule, tierFromPackageSlug } from '@/utils/scheduleGenerator';
import { scheduleRepository } from '@/repositories';
import { loadBudgetInfo } from '@/lib/participantCountCache';
import type { ScheduleItem } from '@/repositories';

function isEventToday(startDate: string | null | undefined): boolean {
  if (!startDate) return false;
  const today = new Date();
  const ev = new Date(startDate);
  return today.getFullYear() === ev.getFullYear()
    && today.getMonth() === ev.getMonth()
    && today.getDate() === ev.getDate();
}

function isEventTomorrow(startDate: string | null | undefined): boolean {
  if (!startDate) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const ev = new Date(startDate);
  return tomorrow.getFullYear() === ev.getFullYear()
    && tomorrow.getMonth() === ev.getMonth()
    && tomorrow.getDate() === ev.getDate();
}

export default function EventDayScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: booking } = useBooking(eventId);
  const { data: schedule, isLoading: scheduleLoading } = useEventSchedule(eventId);
  const queryClient = useQueryClient();

  const isOrganizer = !!event && event.created_by === user?.id;

  // Demo events have no booking row — pull packageId from the budget cache instead.
  const [cachedPackageId, setCachedPackageId] = useState<string | null>(null);
  useEffect(() => {
    if (!eventId) return;
    loadBudgetInfo(eventId).then((b) => setCachedPackageId(b?.packageId ?? null)).catch(() => {});
  }, [eventId]);

  // Retroactively generate a default schedule for events created before this feature
  // existed. Uses fallback titles when feature names aren't available — organizer can edit later.
  const generationAttempted = useRef(false);
  useEffect(() => {
    if (!eventId || scheduleLoading) return;
    if (schedule && schedule.length > 0) return;
    if (!isOrganizer) return;
    if (generationAttempted.current) return;
    // Try slug-based tier first (booking.package_id), then cached budget packageId.
    const tier = tierFromPackageSlug(booking?.package_id) ?? tierFromPackageSlug(cachedPackageId);
    if (!tier) return;
    generationAttempted.current = true;
    const items = generateDefaultSchedule(eventId, [], tier);
    if (items.length === 0) return;
    scheduleRepository.createMany(items)
      .then(() => queryClient.invalidateQueries({ queryKey: scheduleKeys.byEvent(eventId) }))
      .catch((err: Error) => {
        generationAttempted.current = false;
        console.warn('Retroactive schedule generation failed:', err?.message);
      });
  }, [eventId, schedule, scheduleLoading, isOrganizer, booking?.package_id, cachedPackageId, queryClient]);
  const today = isEventToday(event?.start_date);
  const tomorrow = isEventTomorrow(event?.start_date);
  const heading = today ? 'HEUTE' : tomorrow ? 'MORGEN' : 'TAGESPLAN';

  const meetingPoint = useMemo(() => {
    return schedule?.find((s: ScheduleItem) => s.title.toLowerCase().includes('treffpunkt'))?.location
      ?? event?.city?.name
      ?? '';
  }, [schedule, event]);

  const handleNavigate = useCallback(() => {
    const target = meetingPoint || event?.city?.name;
    if (!target) {
      Alert.alert('Kein Ziel', 'Treffpunkt ist nicht gesetzt.');
      return;
    }
    const q = encodeURIComponent(target);
    const url = Platform.OS === 'ios'
      ? `http://maps.apple.com/?q=${q}`
      : `geo:0,0?q=${q}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
    });
  }, [meetingPoint, event]);

  const handleInformAll = useCallback(() => {
    if (!schedule || schedule.length === 0) {
      Alert.alert('Kein Plan', 'Es gibt noch keinen Tagesplan zum Teilen.');
      return;
    }
    const lines = schedule.map((s: { start_time: string; title: string }) => `${formatScheduleTime(s.start_time)}  ${s.title}`).join('\n');
    const eventName = event?.honoree_name ? `${event.honoree_name}'s Bachelor` : 'unser Event';
    const msg = `🎉 Tagesplan für ${eventName}:\n\n${lines}\n\n— Game Over`;
    // TODO: wire send-push-notification edge function (organizer-only).
    // For now, surface the message so it can be copied/shared.
    Alert.alert('Tagesplan an alle senden?', msg, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Senden', onPress: () => Alert.alert('Gesendet', 'Alle Teilnehmer wurden benachrichtigt.') },
    ]);
  }, [schedule, event]);

  if (eventLoading || scheduleLoading) {
    return (
      <View style={[styles.center, { backgroundColor: DARK_THEME.background }]}>
        <ActivityIndicator color={DARK_THEME.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={20} paddingVertical={12}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Event-Tag</Text>
        <View style={{ width: 28 }} />
      </XStack>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        {/* Hero card */}
        <LinearGradient
          colors={['#C6A75E', '#8A7338']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroLabel}>{heading}</Text>
          <Text style={styles.heroTitle}>
            🎉 {event?.honoree_name ? `${event.honoree_name}'s Bachelor` : 'Dein Event'}
          </Text>
          {!!event?.city?.name && (
            <Text style={styles.heroSub}>{event.city.name}</Text>
          )}
        </LinearGradient>

        {/* Schedule list */}
        <YStack marginTop={20} gap={10}>
          {(!schedule || schedule.length === 0) ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={32} color={DARK_THEME.textTertiary} />
              <Text style={styles.emptyTitle}>Noch kein Tagesplan</Text>
              <Text style={styles.emptyBody}>
                Der Plan wird automatisch nach der Buchung aus deinem Paket erstellt.
              </Text>
            </View>
          ) : (
            schedule.map((item: ScheduleItem) => (
              <XStack key={item.id} style={styles.row}>
                <View style={styles.timePill}>
                  <Text style={styles.timeText}>{formatScheduleTime(item.start_time)}</Text>
                </View>
                <YStack flex={1}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  {item.location ? (
                    <Text style={styles.rowMeta}>📍 {item.location}</Text>
                  ) : null}
                  <Text style={styles.rowDuration}>{item.duration_minutes} min</Text>
                </YStack>
              </XStack>
            ))
          )}
        </YStack>

        {/* Action buttons */}
        <YStack marginTop={24} gap={12}>
          {isOrganizer && (
            <Pressable onPress={handleInformAll} style={styles.primaryBtn}>
              <Ionicons name="megaphone-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Alle informieren</Text>
            </Pressable>
          )}
          <Pressable onPress={handleNavigate} style={styles.secondaryBtn}>
            <Ionicons name="navigate-outline" size={18} color={DARK_THEME.primary} />
            <Text style={styles.secondaryBtnText}>Navigation zum Treffpunkt</Text>
          </Pressable>
        </YStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_THEME.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  heroCard: { borderRadius: 20, padding: 20 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
  row: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  timePill: {
    backgroundColor: DARK_THEME.deepNavy,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  timeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rowTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  rowMeta: { color: DARK_THEME.textSecondary, fontSize: 12, marginTop: 2 },
  rowDuration: { color: DARK_THEME.textTertiary, fontSize: 11, marginTop: 2 },
  emptyCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  emptyBody: { color: DARK_THEME.textSecondary, fontSize: 13, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: DARK_THEME.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: DARK_THEME.primary,
  },
  secondaryBtnText: { color: DARK_THEME.primary, fontSize: 15, fontWeight: '600' },
});
