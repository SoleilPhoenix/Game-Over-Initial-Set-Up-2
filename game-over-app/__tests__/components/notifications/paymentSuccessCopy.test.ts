import { describe, expect, it } from 'vitest';
import de from '@/i18n/de';
import { resolvePaymentSuccessCopy } from '@/components/notifications/paymentSuccessCopy';

const storedNotification = {
  action_url: '/event/event-1',
  body: "Your booking for Hans Zimmer's Hans's Bachelor has been confirmed.",
  created_at: '2026-08-05T10:00:00.000Z',
  event_id: 'event-1',
  id: 'notification-1',
  is_read: false,
  metadata: null,
  title: 'Payment Successful!',
  type: 'payment_success',
  user_id: 'user-1',
};

describe('payment_success notification copy', () => {
  it('uses localized copy and the event title without adding a second possessive', () => {
    const copy = resolvePaymentSuccessCopy(
      {
        ...storedNotification,
        event: {
          status: 'booked',
          title: "Hans's Bachelor",
          honoree_name: 'Hans Zimmer',
        },
      },
      de.notifications,
    );

    expect(copy).toEqual({
      title: 'Zahlung erfolgreich!',
      body: 'Deine Buchung für „Hans\'s Bachelor“ wurde bestätigt.',
    });
  });

  it('keeps the stored title and body when the event association is missing', () => {
    expect(resolvePaymentSuccessCopy(
      { ...storedNotification, event: null },
      de.notifications,
    )).toEqual({
      title: storedNotification.title,
      body: storedNotification.body,
    });
  });
});
