/**
 * Event Lifecycle State
 *
 * Defines when events transition from "active" to "read-only" to "past".
 *
 * Timeline (using device-local timezone, midnight boundary):
 *   - Day 0 (event day or earlier):       fully active
 *   - Day 1 after end_date:               read-only (greyed UI, no new edits)
 *   - Day 2+ after end_date:              past (moved to Past Sessions section)
 *
 * Multi-day events use `end_date` when available, otherwise fall back to `start_date`.
 *
 * Even when read-only/past, Chat and Other-Expenses remain editable so the group
 * can settle the bill and discuss the event afterwards.
 */

export interface EventLike {
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
}

export interface EventReadOnlyState {
  /** True from Day 1 after event ends. UI should grey out edit affordances. */
  isReadOnly: boolean;
  /** True from Day 2 after event ends. Event moves to Past Sessions section. */
  isPast: boolean;
  /** Number of days since the event ended. Negative for upcoming events. Null if no date. */
  daysAfterEnd: number | null;

  // Per-feature flags
  canInvite: boolean;             // Invitations: disabled after event ends
  canVote: boolean;               // Polls voting: disabled after event ends
  canCreateTopics: boolean;       // Discussion topics: always open
  canChat: boolean;               // Chat: always open (post-event coordination)
  canEditPackageBudget: boolean;  // Package cost line: frozen after event
  canEditOtherExpenses: boolean;  // Other expenses: always editable
  canEditPackageDetails: boolean; // Package details: never editable (visual archive only)
}

/** Strip time-of-day from a Date — returns a Date at local midnight. */
function toLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Returns the effective "end" of an event (end_date if set, otherwise start_date). */
export function getEventEndDate(event: EventLike): Date | null {
  const raw = event.end_date || event.start_date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Whole days elapsed since the event ended, using local timezone midnight boundaries.
 * Returns:
 *   negative — event is upcoming or in progress
 *   0        — today is the event end day
 *   1        — yesterday was the event end day (Day 1 after — read-only)
 *   2+       — moved to Past Sessions
 *   null     — no valid date on the event
 */
export function getDaysAfterEvent(event: EventLike, now: Date = new Date()): number | null {
  const end = getEventEndDate(event);
  if (!end) return null;
  const endMidnight = toLocalMidnight(end);
  const nowMidnight = toLocalMidnight(now);
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((nowMidnight.getTime() - endMidnight.getTime()) / MS_PER_DAY);
}

/** True from the day AFTER the event ends. */
export function isReadOnlyEvent(event: EventLike, now: Date = new Date()): boolean {
  const days = getDaysAfterEvent(event, now);
  return days !== null && days >= 1;
}

/** True from 2 days AFTER the event ends. Event belongs in Past Sessions. */
export function isPastEvent(event: EventLike, now: Date = new Date()): boolean {
  const days = getDaysAfterEvent(event, now);
  return days !== null && days >= 2;
}

/**
 * Single source of truth for which actions are allowed on an event based on lifecycle.
 * Used by Events list, Invitations, Polls, Budget, Chat, and Package detail screens.
 */
export function getEventReadOnlyState(event: EventLike, now: Date = new Date()): EventReadOnlyState {
  const daysAfterEnd = getDaysAfterEvent(event, now);
  const isReadOnly = daysAfterEnd !== null && daysAfterEnd >= 1;
  const isPast = daysAfterEnd !== null && daysAfterEnd >= 2;

  return {
    isReadOnly,
    isPast,
    daysAfterEnd,
    // Locked by read-only state
    canInvite: !isReadOnly,
    canVote: !isReadOnly,
    canEditPackageBudget: !isReadOnly,
    // Always open — group still needs these after the event
    canCreateTopics: true,
    canChat: true,
    canEditOtherExpenses: true,
    // Package details have always been view-only
    canEditPackageDetails: false,
  };
}
