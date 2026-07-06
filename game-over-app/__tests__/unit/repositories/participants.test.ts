import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase/client';
import { participantsRepository } from '@/repositories';

// Chainable mock: .update(payload).eq(...).eq(...) resolves to { error }.
function mockUpdateChain() {
  const updateSpy = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  });
  vi.mocked(supabase.from).mockReturnValue({ update: updateSpy } as any);
  return updateSpy;
}

describe('participantsRepository — guest payment claim vs organizer confirm', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
  });

  it('claimPayment writes ONLY payment_claimed_at — a guest can never self-set payment_status/role', async () => {
    const updateSpy = mockUpdateChain();

    await participantsRepository.claimPayment('event-1', 'user-1');

    expect(supabase.from).toHaveBeenCalledWith('event_participants');
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const payload = updateSpy.mock.calls[0][0];
    expect(payload).toHaveProperty('payment_claimed_at');
    expect(typeof payload.payment_claimed_at).toBe('string');
    // The critical guarantee: the guest claim path touches no privileged column.
    expect(payload).not.toHaveProperty('payment_status');
    expect(payload).not.toHaveProperty('role');
    expect(payload).not.toHaveProperty('contribution_amount_cents');
  });

  it('confirmPayment (organizer path) sets payment_status to paid and nothing else', async () => {
    const updateSpy = mockUpdateChain();

    await participantsRepository.confirmPayment('event-1', 'user-1');

    const payload = updateSpy.mock.calls[0][0];
    expect(payload).toEqual({ payment_status: 'paid' });
  });

  it('claimPayment surfaces a rejection from the database (e.g. trigger block)', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'blocked', code: 'P0001' } }),
      }),
    });
    vi.mocked(supabase.from).mockReturnValue({ update: updateSpy } as any);

    await expect(participantsRepository.claimPayment('event-1', 'user-1')).rejects.toBeTruthy();
  });
});
