/**
 * Shared hook for urgent payment detection across all tabs.
 * Returns all booked events within ≤14 days (paid or unpaid),
 * sorted soonest-first, plus seen/unseen state for the bell dot.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEvents } from '@/hooks/queries/useEvents';
import { getAllBudgetInfos } from '@/lib/participantCountCache';
import type { EventWithDetails } from '@/repositories/events';
import { useAuthStore } from '@/stores/authStore';
import { participantsRepository } from '@/repositories/participants';

interface BudgetInfo {
  paidAmountCents: number;
  totalCents: number;
  perPersonCents?: number;
  payingCount?: number;
}

function isValidBudgetInfo(val: unknown): val is BudgetInfo {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return typeof obj.paidAmountCents === 'number' && typeof obj.totalCents === 'number';
}

function isValidBudgetInfoMap(val: unknown): val is Record<string, BudgetInfo> {
  if (!val || typeof val !== 'object') return false;
  return Object.values(val as object).every(isValidBudgetInfo);
}

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
  const [budgetInfos, setBudgetInfos] = useState<Record<string, BudgetInfo>>({});
  const [seenEventIds, setSeenEventIds] = useState<Set<string>>(new Set());

  // Re-read budget cache whenever events list changes (events refetch on tab focus).
  // This ensures the bell dot clears after payment updates the AsyncStorage cache.
  useEffect(() => {
    AsyncStorage.getItem('budget_info')
      .then(raw => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (isValidBudgetInfoMap(parsed)) {
            setBudgetInfos(parsed);
          } else {
            console.warn('[useUrgentPayment] budget_info cache invalid schema, skipping');
          }
        } catch {
          console.warn('[useUrgentPayment] budget_info cache parse error');
        }
      })
      .catch(() => {});
  }, [events]);

  useEffect(() => {
    AsyncStorage.getItem(URGENT_SEEN_KEY)
      .then(raw => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.every(id => typeof id === 'string')) {
            setSeenEventIds(new Set(parsed));
          }
        } catch {
          console.warn('[useUrgentPayment] urgent seen key parse error');
        }
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

  // Mark all currently-unpaid urgent events as "seen" (clears the bell dot)
  const markUrgencySeen = useCallback(() => {
    const newIds = new Set(seenEventIds);
    urgentEvents.filter(info => !info.isPaid).forEach(info => newIds.add(info.event.id));
    const arr = [...newIds];
    AsyncStorage.setItem(URGENT_SEEN_KEY, JSON.stringify(arr)).catch(() => {});
    setSeenEventIds(newIds);
  }, [seenEventIds, urgentEvents]);

  const currentUserId = useAuthStore(s => s.user?.id);

  // Fetch current user's guest participations separately (event_participants is never
  // joined by getByUser() to avoid RLS 42P17 recursion — see repositories/events.ts).
  // Using useQuery so data is refreshed on app focus via the existing cache lifecycle.
  const { data: userParticipations = [] } = useQuery({
    queryKey: ['guestParticipations', currentUserId],
    queryFn: () => participantsRepository.getGuestParticipations(currentUserId!),
    enabled: !!currentUserId,
    staleTime: 30 * 1000,
  });

  // Guest urgency: driven by event_participants.payment_status, not budget cache
  const guestUrgentEvent = useMemo(() => {
    if (!currentUserId || userParticipations.length === 0) return null;
    return (events ?? []).find(event => {
      const participation = userParticipations.find(p => p.event_id === event.id);
      if (!participation || participation.role !== 'guest') return false;
      if (participation.payment_status === 'paid') return false;
      const days = daysUntil(event.start_date);
      return days !== null && days <= 14;
    }) ?? null;
  }, [events, currentUserId, userParticipations]);

  const isGuestContribution = guestUrgentEvent !== null;
  const guestDaysLeft = guestUrgentEvent ? (daysUntil(guestUrgentEvent.start_date) ?? 0) : 0;

  // NOTE: For guests, isGuestContribution stays true until payment_status = 'paid' in the DB.
  // Unlike the organizer path (which uses seenEventIds for temporary dismissal),
  // the guest bell dot is a persistent reminder until the organizer marks them as paid.
  // This is intentional — guests have no in-app payment flow.
  const hasUnseenUrgency = useMemo(
    () => urgentEvents.some(info => !info.isPaid) || isGuestContribution,
    [urgentEvents, isGuestContribution]
  );

  return {
    urgentEvent,
    urgentEvents,
    hasUnseenUrgency,
    markUrgencySeen,
    guestUrgentEvent,
    isGuestContribution,
    guestDaysLeft,
  };
}
