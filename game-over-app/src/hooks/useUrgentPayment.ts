/**
 * Shared hook for urgent payment detection across all tabs.
 * Returns the first event with ≤14 days remaining and an unpaid balance,
 * plus seen/unseen state for the notification dot.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEvents } from '@/hooks/queries/useEvents';
import type { EventWithDetails } from '@/repositories/events';

const URGENT_SEEN_KEY = 'gameover:urgent_payment_seen';

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
  const [seenKey, setSeenKey] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('budget_info')
      .then(raw => { if (raw) setBudgetInfos(JSON.parse(raw)); })
      .catch(() => {});
    AsyncStorage.getItem(URGENT_SEEN_KEY)
      .then(val => setSeenKey(val))
      .catch(() => {});
  }, []);

  // Find booked events with ≤14 days left and unpaid balance
  const urgentEvent: EventWithDetails | null = (events ?? []).find(e => {
    if (e.status !== 'booked') return false;
    const days = daysUntil(e.start_date);
    if (days === null || days > 14) return false;
    const budget = budgetInfos[e.id];
    if (!budget) return false;
    return (budget.paidAmountCents || 0) < budget.totalCents;
  }) ?? null;

  // Urgency key changes when event ID or days-remaining changes
  const currentUrgencyKey = urgentEvent
    ? `${urgentEvent.id}:${daysUntil(urgentEvent.start_date)}`
    : null;

  const hasUnseenUrgency = !!currentUrgencyKey && currentUrgencyKey !== seenKey;

  const markUrgencySeen = useCallback(() => {
    if (!currentUrgencyKey) return;
    AsyncStorage.setItem(URGENT_SEEN_KEY, currentUrgencyKey).catch(() => {});
    setSeenKey(currentUrgencyKey);
  }, [currentUrgencyKey]);

  return { urgentEvent, hasUnseenUrgency, markUrgencySeen };
}
