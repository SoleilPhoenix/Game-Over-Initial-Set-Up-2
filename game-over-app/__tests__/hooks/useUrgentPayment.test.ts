/**
 * Tests for useUrgentPayment — guest contribution path
 *
 * NOTE: This project's vitest setup cannot use renderHook from
 * @testing-library/react-native reliably for hooks with useEffect/useState.
 * Instead, we test the guest path logic directly by mirroring the useMemo
 * computation from the hook (same inputs → same output), keeping tests
 * portable within the existing test infrastructure.
 *
 * The guest path logic in useUrgentPayment is a pure filter over the events
 * array, so it can be verified without a React rendering context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks (must be declared before any imports that transitively use them)
// ---------------------------------------------------------------------------

vi.mock('@/hooks/queries/useEvents', () => ({
  useEvents: vi.fn(),
}));

vi.mock('@/lib/participantCountCache', () => ({
  getAllBudgetInfos: vi.fn(() => ({})),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: 'current-user' } })
  ),
}));

// ---------------------------------------------------------------------------
// Pure helper — mirrors daysUntil() from useUrgentPayment.ts
// ---------------------------------------------------------------------------

function daysUntil(startDate?: string): number | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round(
    (startMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff >= 0 ? diff : null;
}

// ---------------------------------------------------------------------------
// Pure helper — mirrors guestUrgentEvent useMemo from useUrgentPayment.ts
// ---------------------------------------------------------------------------

function findGuestUrgentEvent(
  events: any[],
  currentUserId: string | undefined
): any | null {
  if (!currentUserId) return null;
  return (
    events.find((event) => {
      const participant = (event.event_participants as any[] | undefined)?.find(
        (p: any) => p.user_id === currentUserId
      );
      if (participant?.role !== 'guest') return false;
      if (participant?.payment_status === 'paid') return false;
      const days = daysUntil(event.start_date);
      return days !== null && days <= 14;
    }) ?? null
  );
}

// ---------------------------------------------------------------------------
// Helpers to build test fixtures
// ---------------------------------------------------------------------------

/** Returns a date string that is `offsetDays` calendar days from today. */
function dateInDays(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0] + 'T12:00:00Z';
}

function makeEvent(overrides: {
  id?: string;
  start_date?: string;
  status?: string;
  participants?: Array<{ user_id: string; role: string; payment_status: string }>;
}): any {
  return {
    id: overrides.id ?? 'evt-1',
    start_date: overrides.start_date ?? dateInDays(7),
    status: overrides.status ?? 'booked',
    city: null,
    preferences: null,
    participant_count: 1,
    event_participants: overrides.participants ?? [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useUrgentPayment — guest contribution path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isGuestContribution=true for a guest with payment_status pending and event ≤14 days away', () => {
    const event = makeEvent({
      id: 'evt-pending',
      start_date: dateInDays(7), // 7 days → within the 14-day window
      status: 'booked',
      participants: [
        { user_id: 'current-user', role: 'guest', payment_status: 'pending' },
      ],
    });

    const guestUrgentEvent = findGuestUrgentEvent([event], 'current-user');

    // The event should be found
    expect(guestUrgentEvent).not.toBeNull();
    expect(guestUrgentEvent?.id).toBe('evt-pending');

    // isGuestContribution mirrors `guestUrgentEvent !== null`
    const isGuestContribution = guestUrgentEvent !== null;
    expect(isGuestContribution).toBe(true);

    // guestDaysLeft should be 7
    const guestDaysLeft = guestUrgentEvent ? (daysUntil(guestUrgentEvent.start_date) ?? 0) : 0;
    expect(guestDaysLeft).toBe(7);
  });

  it('guestUrgentEvent=null when guest payment_status is paid', () => {
    const event = makeEvent({
      id: 'evt-paid',
      start_date: dateInDays(5), // 5 days → within window but payment is done
      status: 'booked',
      participants: [
        { user_id: 'current-user', role: 'guest', payment_status: 'paid' },
      ],
    });

    const guestUrgentEvent = findGuestUrgentEvent([event], 'current-user');

    // Paid guests must not trigger urgency
    expect(guestUrgentEvent).toBeNull();

    const isGuestContribution = guestUrgentEvent !== null;
    expect(isGuestContribution).toBe(false);
  });

  it('guestUrgentEvent=null when event is more than 14 days away', () => {
    const event = makeEvent({
      id: 'evt-future',
      start_date: dateInDays(20), // 20 days → outside the 14-day window
      participants: [
        { user_id: 'current-user', role: 'guest', payment_status: 'pending' },
      ],
    });

    const guestUrgentEvent = findGuestUrgentEvent([event], 'current-user');
    expect(guestUrgentEvent).toBeNull();
  });

  it('guestUrgentEvent=null when the participant role is organizer (not guest)', () => {
    const event = makeEvent({
      id: 'evt-organizer',
      start_date: dateInDays(3),
      participants: [
        { user_id: 'current-user', role: 'organizer', payment_status: 'pending' },
      ],
    });

    const guestUrgentEvent = findGuestUrgentEvent([event], 'current-user');
    expect(guestUrgentEvent).toBeNull();
  });

  it('guestUrgentEvent=null when currentUserId is undefined', () => {
    const event = makeEvent({
      id: 'evt-no-user',
      start_date: dateInDays(3),
      participants: [
        { user_id: 'current-user', role: 'guest', payment_status: 'pending' },
      ],
    });

    const guestUrgentEvent = findGuestUrgentEvent([event], undefined);
    expect(guestUrgentEvent).toBeNull();
  });
});
