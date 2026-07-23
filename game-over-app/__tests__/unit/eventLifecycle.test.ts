import { describe, it, expect } from 'vitest';
import {
  getEventEndDate,
  getDaysAfterEvent,
  isReadOnlyEvent,
  isPastEvent,
  getEventReadOnlyState,
} from '@/utils/eventLifecycle';

// Fixed "now" for deterministic tests: 2026-06-01 14:30 local
const NOW = new Date(2026, 5, 1, 14, 30);

describe('getEventEndDate', () => {
  it('prefers end_date when present', () => {
    const d = getEventEndDate({ start_date: '2026-05-29', end_date: '2026-05-31' });
    expect(d?.getDate()).toBe(31);
  });

  it('falls back to start_date when end_date is missing', () => {
    const d = getEventEndDate({ start_date: '2026-05-30' });
    expect(d?.getDate()).toBe(30);
  });

  it('returns null when both dates are missing', () => {
    expect(getEventEndDate({})).toBeNull();
  });

  it('returns null for invalid date strings', () => {
    expect(getEventEndDate({ start_date: 'not-a-date' })).toBeNull();
  });
});

describe('getDaysAfterEvent', () => {
  it('returns 0 on the event end day', () => {
    expect(getDaysAfterEvent({ start_date: '2026-06-01' }, NOW)).toBe(0);
  });

  it('returns 1 the day after a single-day event', () => {
    expect(getDaysAfterEvent({ start_date: '2026-05-31' }, NOW)).toBe(1);
  });

  it('returns 2 two days after', () => {
    expect(getDaysAfterEvent({ start_date: '2026-05-30' }, NOW)).toBe(2);
  });

  it('returns negative for upcoming events', () => {
    expect(getDaysAfterEvent({ start_date: '2026-06-05' }, NOW)).toBe(-4);
  });

  it('uses end_date for multi-day events', () => {
    // Event runs 5-29 to 5-31 — 1 day after end_date
    expect(getDaysAfterEvent({ start_date: '2026-05-29', end_date: '2026-05-31' }, NOW)).toBe(1);
  });

  it('returns null when no date is set', () => {
    expect(getDaysAfterEvent({}, NOW)).toBeNull();
  });
});

describe('isReadOnlyEvent', () => {
  it('is false during the event day', () => {
    expect(isReadOnlyEvent({ start_date: '2026-06-01' }, NOW)).toBe(false);
  });

  it('is true on Day 1 after end', () => {
    expect(isReadOnlyEvent({ start_date: '2026-05-31' }, NOW)).toBe(true);
  });

  it('is true on Day 5 after end', () => {
    expect(isReadOnlyEvent({ start_date: '2026-05-27' }, NOW)).toBe(true);
  });

  it('is false for upcoming events', () => {
    expect(isReadOnlyEvent({ start_date: '2026-06-10' }, NOW)).toBe(false);
  });
});

describe('isPastEvent', () => {
  it('is false on Day 1 after end (still in main list, but read-only)', () => {
    expect(isPastEvent({ start_date: '2026-05-31' }, NOW)).toBe(false);
  });

  it('is true on Day 2 after end', () => {
    expect(isPastEvent({ start_date: '2026-05-30' }, NOW)).toBe(true);
  });

  it('is true on Day 30 after end', () => {
    expect(isPastEvent({ start_date: '2026-05-02' }, NOW)).toBe(true);
  });
});

describe('getEventReadOnlyState', () => {
  it('allows everything for upcoming events', () => {
    const s = getEventReadOnlyState({ start_date: '2026-06-10' }, NOW);
    expect(s.isReadOnly).toBe(false);
    expect(s.isPast).toBe(false);
    expect(s.canInvite).toBe(true);
    expect(s.canVote).toBe(true);
    expect(s.canEditPackageBudget).toBe(true);
    expect(s.canChat).toBe(true);
    expect(s.canEditOtherExpenses).toBe(true);
    expect(s.canEditPackageDetails).toBe(false); // always view-only
  });

  it('locks invite / vote / package-budget on Day 1 after end', () => {
    const s = getEventReadOnlyState({ start_date: '2026-05-31' }, NOW);
    expect(s.isReadOnly).toBe(true);
    expect(s.isPast).toBe(false);
    expect(s.canInvite).toBe(false);
    expect(s.canVote).toBe(false);
    expect(s.canEditPackageBudget).toBe(false);
    // Always-open features stay open
    expect(s.canChat).toBe(true);
    expect(s.canCreateTopics).toBe(true);
    expect(s.canEditOtherExpenses).toBe(true);
  });

  it('isPast is true 2 days after end', () => {
    const s = getEventReadOnlyState({ start_date: '2026-05-30' }, NOW);
    expect(s.isPast).toBe(true);
    expect(s.isReadOnly).toBe(true); // still read-only
  });

  it('handles events with no date gracefully', () => {
    const s = getEventReadOnlyState({}, NOW);
    expect(s.isReadOnly).toBe(false);
    expect(s.isPast).toBe(false);
    expect(s.daysAfterEnd).toBeNull();
    expect(s.canInvite).toBe(true);
  });
});
