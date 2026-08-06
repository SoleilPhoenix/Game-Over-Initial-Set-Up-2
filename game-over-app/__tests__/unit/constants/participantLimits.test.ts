import { describe, expect, it } from 'vitest';
import {
  clampParticipantCount,
  DEFAULT_PARTICIPANT_COUNT,
  MAX_PARTICIPANT_COUNT,
  MIN_PARTICIPANT_COUNT,
} from '@/constants/participantLimits';

describe('participant limits', () => {
  it('defines the supported participant range including the honoree', () => {
    expect(MIN_PARTICIPANT_COUNT).toBe(3);
    expect(MAX_PARTICIPANT_COUNT).toBe(50);
    expect(DEFAULT_PARTICIPANT_COUNT).toBeGreaterThanOrEqual(MIN_PARTICIPANT_COUNT);
  });

  it('clamps legacy and oversized participant counts to the supported range', () => {
    expect(clampParticipantCount(1)).toBe(MIN_PARTICIPANT_COUNT);
    expect(clampParticipantCount(51)).toBe(MAX_PARTICIPANT_COUNT);
  });
});
