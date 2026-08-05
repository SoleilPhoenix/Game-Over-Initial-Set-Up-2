import { describe, expect, it } from 'vitest';
import de from '@/i18n/de';
import en from '@/i18n/en';
import { resolvePaymentReminderCopy } from '@/components/notifications/paymentReminderCopy';

const storedNotification = {
  action_url: '/booking/event-1/payment',
  body: 'Final notice: Pay €858.75 today or event is cancelled. Only 25% deposit retained.',
  created_at: '2026-08-05T10:00:00.000Z',
  event_id: 'event-1',
  id: 'notification-1',
  is_read: false,
  metadata: null,
  title: 'Final Notice: Payment Due Today',
  type: 'payment_reminder_final',
  user_id: 'user-1',
};

describe('payment reminder notification copy', () => {
  it('reads a prefixed Euro amount and renders the German final notice', () => {
    expect(resolvePaymentReminderCopy(
      storedNotification,
      de.notifications.paymentReminders,
      'de',
    )).toEqual({
      title: 'Letzte Frist: heute zahlen',
      body: 'Letzte Frist: zahle heute 858,75 €. Sonst wird das Event morgen storniert und die Anzahlung (25 %) einbehalten.',
    });
  });

  it('reads a suffixed Euro amount and renders English copy', () => {
    expect(resolvePaymentReminderCopy(
      {
        ...storedNotification,
        type: 'payment_reminder_urgent_8',
        title: 'Morgen ist Zahlungsfrist',
        body: 'Morgen läuft die Frist ab: der Restbetrag von 858,75 € muss bis dahin da sein.',
      },
      en.notifications.paymentReminders,
      'en',
    )).toEqual({
      title: 'Payment Deadline Is Tomorrow',
      body: 'The deadline is tomorrow: your remaining balance of €858.75 has to be in by then.',
    });
  });

  it.each([
    'notice_18',
    'request_16',
    'followup_14',
    'followup_12',
    'urgent_10',
    'urgent_9',
    'urgent_8',
    'final_7',
    'cancelled_6',
    'normal',
    'moderate',
    'urgent',
    'final',
  ])('localizes the %s milestone', (type) => {
    const copy = resolvePaymentReminderCopy(
      { ...storedNotification, type: `payment_reminder_${type}` },
      de.notifications.paymentReminders,
      'de',
    );

    expect(copy.title).toBe(de.notifications.paymentReminders[
      type as keyof typeof de.notifications.paymentReminders
    ].title);
    expect(copy.body).toContain('858,75 €');
  });

  it('keeps stored copy for an unknown reminder type', () => {
    expect(resolvePaymentReminderCopy(
      { ...storedNotification, type: 'payment_reminder_unknown' },
      de.notifications.paymentReminders,
      'de',
    )).toEqual({
      title: storedNotification.title,
      body: storedNotification.body,
    });
  });

  it('keeps stored copy when the amount does not match the strict currency shape', () => {
    const notification = {
      ...storedNotification,
      body: 'Final notice: pay €858.7 today.',
    };

    expect(resolvePaymentReminderCopy(
      notification,
      de.notifications.paymentReminders,
      'de',
    )).toEqual({
      title: notification.title,
      body: notification.body,
    });
  });

  it('keeps stored copy when more than one amount makes extraction ambiguous', () => {
    const notification = {
      ...storedNotification,
      body: 'Pay €858.75, not €900.00, today.',
    };

    expect(resolvePaymentReminderCopy(
      notification,
      de.notifications.paymentReminders,
      'de',
    )).toEqual({
      title: notification.title,
      body: notification.body,
    });
  });
});
