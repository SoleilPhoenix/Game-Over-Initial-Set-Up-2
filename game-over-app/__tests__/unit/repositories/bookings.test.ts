import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase/client';

// Mock supabase.rpc for the atomic audit log call
(supabase as any).rpc = vi.fn().mockResolvedValue({ error: null });

describe('bookingsRepository.create', () => {
  it('throws if event status update fails after booking insert', async () => {
    // First .from() call: booking insert — succeeds
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'booking-1', event_id: 'event-1' },
        error: null,
      }),
    } as any));

    // Second .from() call: event status update — fails
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: { message: 'RLS violation', code: '42501' },
      }),
    } as any));

    const { bookingsRepository } = await import('@/repositories/bookings');
    await expect(
      bookingsRepository.create({ event_id: 'event-1', package_id: 'pkg-1' } as any)
    ).rejects.toThrow('event status update failed');
  });
});
