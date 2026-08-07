import { describe, expect, it, vi } from 'vitest';
import {
  canNotifyExpenseShares,
  deliverPendingExpenseShareNotifications,
  markMetadataPushed,
  type ExpenseShareNotification,
} from '../../supabase/functions/_shared/expense-share-push';

function notification(
  id: string,
  userId: string,
  pushed?: boolean,
): ExpenseShareNotification {
  return {
    id,
    user_id: userId,
    event_id: 'event-1',
    type: 'expense_share_assigned',
    title: 'Weitere Kosten',
    body: 'Du sollst dich beteiligen.',
    action_url: '/event/event-1/budget',
    metadata: {
      expense_id: 'expense-1',
      ...(pushed === undefined ? {} : { pushed }),
    },
  };
}

describe('expense share push authorization', () => {
  it('allows only the expense creator or event organizer', () => {
    expect(canNotifyExpenseShares('expense-creator', 'expense-creator', 'organizer')).toBe(true);
    expect(canNotifyExpenseShares('organizer', 'expense-creator', 'organizer')).toBe(true);
    expect(canNotifyExpenseShares('other-guest', 'expense-creator', 'organizer')).toBe(false);
  });
});

describe('expense share push idempotency', () => {
  it('does not push the same notification row twice', async () => {
    let rows = [
      notification('notification-1', 'guest-1'),
      notification('notification-2', 'guest-2', true),
    ];
    const send = vi.fn(async () => undefined);
    const markPushed = vi.fn(async (row: ExpenseShareNotification) => {
      rows = rows.map((candidate) => candidate.id === row.id
        ? { ...candidate, metadata: markMetadataPushed(candidate.metadata) }
        : candidate);
    });
    const loadPending = async () => rows.filter(
      (row) => row.metadata?.pushed !== true,
    );

    await deliverPendingExpenseShareNotifications(loadPending, send, markPushed);
    await deliverPendingExpenseShareNotifications(loadPending, send, markPushed);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'guest-1' }));
    expect(markPushed).toHaveBeenCalledTimes(1);
  });
});
