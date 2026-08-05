import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/supabase/client';
import {
  isOpsNotificationType,
  notificationsRepository,
} from '@/repositories/notifications';

describe('notificationsRepository ops filtering', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
  });

  it('recognizes every ops_ notification type, including unknown legacy types', () => {
    expect(isOpsNotificationType('ops_cron_health')).toBe(true);
    expect(isOpsNotificationType('ops_removed_legacy_check')).toBe(true);
    expect(isOpsNotificationType('payment_success')).toBe(false);
    expect(isOpsNotificationType('ops')).toBe(false);
  });

  it('removes ops_ rows from the list even if the database response contains them', async () => {
    const event = {
      status: 'booked',
      title: "Hans's Bachelor",
      honoree_name: 'Hans Zimmer',
    };
    const baseRow = {
      action_url: null,
      body: 'Body',
      created_at: '2026-08-05T10:00:00.000Z',
      event_id: 'event-1',
      is_read: false,
      metadata: null,
      title: 'Title',
      user_id: 'user-1',
      event,
    };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [
          { ...baseRow, id: 'ops-1', type: 'ops_removed_legacy_check' },
          { ...baseRow, id: 'payment-1', type: 'payment_success' },
        ],
        error: null,
      }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const result = await notificationsRepository.getByUserId('user-1');

    expect(result.notifications).toEqual([
      expect.objectContaining({ id: 'payment-1', event }),
    ]);
    expect(chain.not).toHaveBeenCalledWith('type', 'like', 'ops\\_%');
  });

  it('does not count ops_ rows as unread even if the database response contains them', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({
        data: [
          { type: 'ops_future_health_check', event: null },
          { type: 'payment_success', event: { status: 'booked' } },
          { type: 'event_update', event: { status: 'cancelled' } },
        ],
        error: null,
      }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    await expect(notificationsRepository.getUnreadCount('user-1')).resolves.toBe(1);
  });
});
