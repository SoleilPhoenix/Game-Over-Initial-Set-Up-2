import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/lib/supabase/client';

// Mock supabase.rpc for the atomic audit log call
(supabase as any).rpc = vi.fn().mockResolvedValue({ error: null });

describe('bookingsRepository.create', () => {
  it('inserts the booking and does NOT write event status (webhook owns that)', async () => {
    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReset();

    // Only ONE .from() call expected now: the booking insert. The old code also
    // wrote events.status='booked', which is now reserved for the Stripe webhook
    // (a DB trigger rejects client 'booked' writes), so create() must not do it.
    fromMock.mockImplementationOnce(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'booking-1', event_id: 'event-1' },
        error: null,
      }),
    } as any));

    const { bookingsRepository } = await import('@/repositories/bookings');
    const result = await bookingsRepository.create({
      event_id: 'event-1',
      package_id: 'pkg-1',
    } as any);

    expect(result).toEqual({ id: 'booking-1', event_id: 'event-1' });
    // The events table must NOT be touched by create().
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('bookings');
  });

  it('throws if the booking insert itself fails', async () => {
    const fromMock = vi.mocked(supabase.from);
    fromMock.mockReset();

    fromMock.mockImplementationOnce(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'insert failed', code: '23505' },
      }),
    } as any));

    const { bookingsRepository } = await import('@/repositories/bookings');
    await expect(
      bookingsRepository.create({ event_id: 'event-1', package_id: 'pkg-1' } as any)
    ).rejects.toBeTruthy();
  });
});
