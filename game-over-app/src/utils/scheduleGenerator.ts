/**
 * Schedule Generator
 * Builds a default day-of schedule from a package's tier + features.
 *
 * Tier patterns (fixed times, 30-min transfers):
 *   FEIER     (3 features: act, dinner, bar)
 *     15:00–17:30 Aktivität (2.5h)
 *     18:00–20:00 Dinner (2h)
 *     21:00–23:00 Bar (2h)
 *
 *   RAUSCH    (4 features: act1, act2, dinner, bar)
 *     14:00–16:00 Aktivität 1 (2h)
 *     16:30–18:30 Aktivität 2 (2h)
 *     19:00–21:00 Dinner (2h)
 *     21:30–23:30 Bar (2h)
 *
 *   LEGENDE   (5 features: act1, act2, lunch, dinner, bar — assemblePackages
 *              outputs in this order: [act1, act2, lunch, dinner, bar])
 *     12:00–14:00 Mittagessen (2h)
 *     14:00–16:00 Aktivität 1 (2h)
 *     16:30–18:30 Aktivität 2 (2h)
 *     19:00–21:00 Dinner (2h)
 *     21:30–23:30 Bar (2h)
 */

import type { ScheduleItemInsert } from '@/repositories';

export type PackageTier = 'essential' | 'classic' | 'grand';

interface SlotSpec {
  start: string;            // 'HH:MM:SS'
  duration: number;         // minutes
  pickFeature: number;      // index into the features array
  fallbackTitle: string;
}

const PATTERNS: Record<PackageTier, SlotSpec[]> = {
  essential: [
    { start: '15:00:00', duration: 150, pickFeature: 0, fallbackTitle: 'Aktivität' },
    { start: '18:00:00', duration: 120, pickFeature: 1, fallbackTitle: 'Dinner' },
    { start: '21:00:00', duration: 120, pickFeature: 2, fallbackTitle: 'Bar' },
  ],
  classic: [
    { start: '14:00:00', duration: 120, pickFeature: 0, fallbackTitle: 'Aktivität 1' },
    { start: '16:30:00', duration: 120, pickFeature: 1, fallbackTitle: 'Aktivität 2' },
    { start: '19:00:00', duration: 120, pickFeature: 2, fallbackTitle: 'Dinner' },
    { start: '21:30:00', duration: 120, pickFeature: 3, fallbackTitle: 'Bar' },
  ],
  grand: [
    { start: '12:00:00', duration: 120, pickFeature: 2, fallbackTitle: 'Mittagessen' },
    { start: '14:00:00', duration: 120, pickFeature: 0, fallbackTitle: 'Aktivität 1' },
    { start: '16:30:00', duration: 120, pickFeature: 1, fallbackTitle: 'Aktivität 2' },
    { start: '19:00:00', duration: 120, pickFeature: 3, fallbackTitle: 'Dinner' },
    { start: '21:30:00', duration: 120, pickFeature: 4, fallbackTitle: 'Bar' },
  ],
};

export function generateDefaultSchedule(
  eventId: string,
  features: string[],
  tier: PackageTier
): ScheduleItemInsert[] {
  const pattern = PATTERNS[tier];
  if (!pattern) return [];

  return pattern.map((slot, idx) => ({
    event_id: eventId,
    start_time: slot.start,
    duration_minutes: slot.duration,
    title: features[slot.pickFeature] ?? slot.fallbackTitle,
    location: null,
    notes: null,
    sort_order: idx,
  }));
}

/** Format 'HH:MM:SS' → 'HH:MM' for display */
export function formatScheduleTime(t: string): string {
  return t.slice(0, 5);
}

/** Derive package tier from a slug like "berlin-classic" → "classic". */
export function tierFromPackageSlug(slug: string | null | undefined): PackageTier | null {
  if (!slug) return null;
  if (slug.endsWith('-essential')) return 'essential';
  if (slug.endsWith('-classic')) return 'classic';
  if (slug.endsWith('-grand')) return 'grand';
  return null;
}
