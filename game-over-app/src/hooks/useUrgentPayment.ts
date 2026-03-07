/**
 * Shared hook for urgent payment detection across all tabs.
 * Returns all booked events within ≤14 days (paid or unpaid),
 * sorted soonest-first, plus seen/unseen state for the bell dot.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEvents } from '@/hooks/queries/useEvents';
import { getAllBudgetInfos } from '@/lib/participantCountCache';
import type { EventWithDetails } from '@/repositories/events';

// New key — stores JSON array of event IDs the user has acknowledged
const URGENT_SEEN_KEY = 'gameover:urgent_seen_events';

export type UrgentEventInfo = {
  event: EventWithDetails;
  daysLeft: number;
  isPaid: boolean;
  isSeen: boolean;
};

function daysUntil(startDate?: string): number | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((startMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

export function useUrgentPayment() {
  const { data: events } = useEvents();
  const [budgetInfos, setBudgetInfos] = useState<Record<string, any>>({});
  const [seenEventIds, setSeenEventIds] = useState<Set<string>>(new Set());

  // Re-read budget cache whenever events list changes (events refetch on tab focus).
  // This ensures the bell dot clears after payment updates the AsyncStorage cache.
  useEffect(() => {
    AsyncStorage.getItem('budget_info')
      .then(raw => { if (raw) setBudgetInfos(JSON.parse(raw)); })
      .catch(() => {});
  }, [events]);

  useEffect(() => {
    AsyncStorage.getItem(URGENT_SEEN_KEY)
      .then(raw => {
        if (raw) setSeenEventIds(new Set(JSON.parse(raw) as string[]));
      })
      .catch(() => {});
  }, []);

  // All booked events with ≤14 days, sorted soonest first (includes paid ones)
  const urgentEvents: UrgentEventInfo[] = useMemo(() => {
    return (events ?? [])
      .filter(e => {
        if (e.status !== 'booked') return false;
        const days = daysUntil(e.start_date);
        return days !== null && days <= 14;
      })
      .map(e => {
        const days = daysUntil(e.start_date) ?? 0;
        // Prefer in-memory cache (updated synchronously after payment) over AsyncStorage state
        const budget = getAllBudgetInfos()[e.id] ?? budgetInfos[e.id];
        // No budget info = event status 'booked' is authoritative → treat as fully paid
        const isPaid = !budget ? true : (budget.paidAmountCents || 0) >= budget.totalCents;
        const isSeen = seenEventIds.has(e.id);
        return { event: e, daysLeft: days, isPaid, isSeen };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [events, budgetInfos, seenEventIds]);

  // Most urgent UNPAID event — kept for backward compat with tab bell Alerts
  const urgentEvent: EventWithDetails | null = useMemo(
    () => urgentEvents.find(info => !info.isPaid)?.event ?? null,
    [urgentEvents]
  );

  // Bell dot = any unpaid urgent event — stays orange until payment is made, NOT cleared by viewing
  const hasUnseenUrgency = useMemo(
    () => urgentEvents.some(info => !info.isPaid),
    [urgentEvents]
  );

  // Mark all currently-unpaid urgent events as "seen" (clears the bell dot)
  const markUrgencySeen = useCallback(() => {
    const newIds = new Set(seenEventIds);
    urgentEvents.filter(info => !info.isPaid).forEach(info => newIds.add(info.event.id));
    const arr = [...newIds];
    AsyncStorage.setItem(URGENT_SEEN_KEY, JSON.stringify(arr)).catch(() => {});
    setSeenEventIds(newIds);
  }, [seenEventIds, urgentEvents]);

  return { urgentEvent, urgentEvents, hasUnseenUrgency, markUrgencySeen };
}
