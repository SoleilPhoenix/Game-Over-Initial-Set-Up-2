/** Participant total includes the honoree. */
export const MIN_PARTICIPANT_COUNT = 3;
export const MAX_PARTICIPANT_COUNT = 50;
export const DEFAULT_PARTICIPANT_COUNT = 10;

export function clampParticipantCount(count: number): number {
  if (!Number.isFinite(count)) return DEFAULT_PARTICIPANT_COUNT;
  return Math.max(MIN_PARTICIPANT_COUNT, Math.min(MAX_PARTICIPANT_COUNT, count));
}
