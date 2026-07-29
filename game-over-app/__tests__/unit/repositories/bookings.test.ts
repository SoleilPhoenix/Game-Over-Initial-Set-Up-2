import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase/client';

// Mock supabase.rpc for the atomic audit log call
(supabase as any).rpc = vi.fn().mockResolvedValue({ error: null });

describe('bookingsRepository.create', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
  });

  /**
   * Guards the payment-integrity invariant: `enforce_event_status_integrity` locks the
   * transition to 'booked' to the service role, so the client must not attempt it.
   *
   * This test replaces an earlier one that asserted the opposite - that create() throws
   * when the event status update fails. That encoded a real bug: the update was always
   * rejected, and the throw aborted the payment AFTER the booking row had been written,
   * leaving an orphaned booking on a draft event (GO-0614B6, 2026-07-29).
   *
   * stripe-webhook flips the event to 'booked' once payment actually succeeds.
   */
  it('inserts the booking and never touches the events table', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'booking-1', event_id: 'event-1' },
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single,
    } as any));

    const { bookingsRepository } = await import('@/repositories/bookings');
    const result = await bookingsRepository.create({
      event_id: 'event-1',
      package_id: 'pkg-1',
    } as any);

    expect(result).toEqual({ id: 'booking-1', event_id: 'event-1' });

    const touchedTables = vi.mocked(supabase.from).mock.calls.map(([table]) => table);
    expect(touchedTables).toContain('bookings');
    expect(touchedTables).not.toContain('events');
  });

  it('propagates a failed booking insert', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'insert denied', code: '42501' },
      }),
    } as any));

    const { bookingsRepository } = await import('@/repositories/bookings');
    await expect(
      bookingsRepository.create({ event_id: 'event-1', package_id: 'pkg-1' } as any)
    ).rejects.toMatchObject({ message: 'insert denied' });
  });
});
