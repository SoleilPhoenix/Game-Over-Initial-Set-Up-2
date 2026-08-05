import type { TranslationKeys } from '@/i18n';
import type { Database } from '@/lib/supabase/types';
import type { NotificationEventSummary } from '@/repositories/notifications';

type Notification = Database['public']['Tables']['notifications']['Row'] & {
  event?: NotificationEventSummary | null;
};

type PaymentSuccessTranslations = Pick<
  TranslationKeys['notifications'],
  'paymentSuccessTitle' | 'paymentSuccessBody'
>;

export function resolvePaymentSuccessCopy(
  notification: Notification,
  translations: PaymentSuccessTranslations,
): { title: string; body: string } {
  const storedCopy = { title: notification.title, body: notification.body };

  if (notification.type !== 'payment_success' || !notification.event) {
    return storedCopy;
  }

  const eventTitle = notification.event.title.trim();
  if (!eventTitle) return storedCopy;

  return {
    title: translations.paymentSuccessTitle,
    body: translations.paymentSuccessBody.replace('{{event}}', eventTitle),
  };
}
