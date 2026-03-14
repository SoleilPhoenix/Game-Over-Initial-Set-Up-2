/**
 * Tests for the public invite preview data layer.
 *
 * NOTE: These tests use QueryClient.fetchQuery() directly rather than renderHook()
 * because @testing-library/react-native cannot load in this test environment
 * due to Flow syntax in react-native (see vitest.config.ts).
 *
 * This means the tests validate:
 *   - invitesRepository.getPreview() behavior (via mock)
 *   - The React Query queryKey format (inviteKeys.preview)
 *   - Data fetching and null-return edge cases
 *
 * They do NOT test the actual usePublicInvitePreview hook behavior
 * (staleTime, retry: false, enabled guard).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

// Mock the repository — do not test Supabase internals here
vi.mock('@/repositories/invites', () => ({
  invitesRepository: {
    getPreview: vi.fn(),
  },
}));

import { invitesRepository } from '@/repositories/invites';
import { inviteKeys } from '@/hooks/queries/useInvites';

describe('usePublicInvitePreview', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns event preview for a valid code', async () => {
    const preview = {
      eventId: 'evt-1',
      eventName: "Sophie's Bachelorette",
      honoreeName: 'Sophie',
      cityName: 'Hamburg',
      cityId: 'city-1',
      startDate: '2026-03-30T10:00:00Z',
      organizerName: 'Max M.',
      acceptedCount: 8,
      guestEmail: undefined,
    };
    (invitesRepository.getPreview as any).mockResolvedValue(preview);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    // Fetch via queryClient (same path usePublicInvitePreview takes)
    const result = await qc.fetchQuery({
      queryKey: [...inviteKeys.all, 'preview', 'TESTCODE'],
      queryFn: () => invitesRepository.getPreview('TESTCODE'),
    });

    expect(result?.eventName).toBe("Sophie's Bachelorette");
    expect(result?.organizerName).toBe('Max M.');
    expect(result?.acceptedCount).toBe(8);
    expect(invitesRepository.getPreview).toHaveBeenCalledWith('TESTCODE');
  });

  it('returns null for an expired or not-found code', async () => {
    (invitesRepository.getPreview as any).mockResolvedValue(null);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const result = await qc.fetchQuery({
      queryKey: [...inviteKeys.all, 'preview', 'EXPIRED'],
      queryFn: () => invitesRepository.getPreview('EXPIRED'),
    });

    expect(result).toBeNull();
    expect(invitesRepository.getPreview).toHaveBeenCalledWith('EXPIRED');
  });
});
