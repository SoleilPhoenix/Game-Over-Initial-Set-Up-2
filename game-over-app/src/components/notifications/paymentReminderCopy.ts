import type { TranslationKeys } from '@/i18n';
import type { Database } from '@/lib/supabase/types';
import type { NotificationEventSummary } from '@/repositories/notifications';

type Notification = Database['public']['Tables']['notifications']['Row'] & {
  event?: NotificationEventSummary | null;
};

type PaymentReminderTranslations = TranslationKeys['notifications']['paymentReminders'];
type PaymentReminderType = keyof PaymentReminderTranslations;
type PaymentReminderLanguage = 'en' | 'de';

const PAYMENT_REMINDER_PREFIX = 'payment_reminder_';

// Matches exactly the currency shapes written by the reminder job and their
// localized equivalent: €1,234.56 or 1.234,56 €. The surrounding guards keep
// malformed separators and partial numbers from being accepted.
const EURO_AMOUNT_PATTERN = /(?:€(?: |\u00a0)?((?:0|[1-9]\d{0,2}(?:,\d{3})*|[1-9]\d*)\.\d{2})|(?:^|[^\d.,])((?:0|[1-9]\d{0,2}(?:\.\d{3})*|[1-9]\d*),\d{2})(?: |\u00a0)?€)(?![\d.,])/g;

function extractEuroCents(text: string): number | null {
  const matches = [...text.matchAll(EURO_AMOUNT_PATTERN)];
  if (matches.length !== 1) return null;

  const [, prefixedAmount, suffixedAmount] = matches[0];
  const normalized = prefixedAmount
    ? prefixedAmount.replace(/,/g, '')
    : suffixedAmount?.replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;

  const [euros, cents] = normalized.split('.');
  const amountCents = Number(euros) * 100 + Number(cents);
  return Number.isSafeInteger(amountCents) ? amountCents : null;
}

const PAYMENT_REMINDER_TYPES: Record<string, PaymentReminderType> = {
  notice_18: 'notice_18',
  request_16: 'request_16',
  followup_14: 'followup_14',
  followup_12: 'followup_12',
  urgent_10: 'urgent_10',
  urgent_9: 'urgent_9',
  urgent_8: 'urgent_8',
  final_7: 'final_7',
  cancelled_6: 'cancelled_6',
  // Rows from the previous reminder ladder used the urgency as their suffix.
  normal: 'normal',
  moderate: 'moderate',
  urgent: 'urgent',
  final: 'final',
};

export function resolvePaymentReminderCopy(
  notification: Notification,
  translations: PaymentReminderTranslations,
  language: PaymentReminderLanguage,
): { title: string; body: string } {
  const storedCopy = { title: notification.title, body: notification.body };

  if (!notification.type.startsWith(PAYMENT_REMINDER_PREFIX)) return storedCopy;

  const storedReminderType = notification.type.slice(PAYMENT_REMINDER_PREFIX.length);
  const reminderType = PAYMENT_REMINDER_TYPES[storedReminderType];
  if (!reminderType) return storedCopy;

  const amountCents = extractEuroCents(notification.body);
  if (amountCents === null) return storedCopy;

  const amount = new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(amountCents / 100);
  const copy = translations[reminderType];

  return {
    title: copy.title,
    body: copy.body.replace('{{amount}}', amount),
  };
}
