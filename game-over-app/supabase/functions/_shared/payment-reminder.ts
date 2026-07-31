/**
 * Bilingual copy for the payment-reminder ladder.
 *
 * Lives in _shared, like briefing.ts, so a preview script can render the real strings
 * without importing process-payment-reminders and starting its server.
 *
 * Days quoted in the copy are days left until the PAYMENT DEADLINE (day 7 before the
 * event), not days until the event itself. The event is cancelled on day 6, one day after
 * the deadline, so every deadline the copy announces is real.
 */

import { CLAIM, type Language } from './briefing.ts';

export type ReminderType =
  | 'notice_18' | 'request_16' | 'followup_14' | 'followup_12'
  | 'urgent_10' | 'urgent_9' | 'urgent_8' | 'final_7' | 'cancelled_6';

export interface ReminderCopy {
  title: string;
  /** `{{amount}}` is replaced with the formatted outstanding balance. */
  body: string;
}

const DE: Record<ReminderType, ReminderCopy> = {
  notice_18: {
    title: 'Restzahlung steht an',
    body: 'Der Restbetrag von {{amount}} ist in 11 Tagen fällig.',
  },
  request_16: {
    title: 'Bitte Restbetrag zahlen',
    body: 'Bitte gleich den Restbetrag von {{amount}} begleichen - fällig in 9 Tagen.',
  },
  followup_14: {
    title: 'Erinnerung: Restzahlung',
    body: 'Erinnerung: der Restbetrag von {{amount}} ist in 7 Tagen fällig.',
  },
  followup_12: {
    title: 'Erinnerung: Restzahlung',
    body: 'Erinnerung: der Restbetrag von {{amount}} ist in 5 Tagen fällig.',
  },
  urgent_10: {
    title: 'Wichtig: Restzahlung fällig',
    body: 'Wichtig: der Restbetrag von {{amount}} ist in 3 Tagen fällig.',
  },
  urgent_9: {
    title: 'Wichtig: Restzahlung fällig',
    body: 'Wichtig: der Restbetrag von {{amount}} ist in 2 Tagen fällig.',
  },
  urgent_8: {
    title: 'Morgen ist Zahlungsfrist',
    body: 'Morgen läuft die Frist ab: der Restbetrag von {{amount}} muss bis dahin da sein.',
  },
  final_7: {
    title: 'Letzte Frist: heute zahlen',
    body: 'Letzte Frist: zahle heute {{amount}}. Sonst wird das Event morgen storniert und die Anzahlung (25 %) einbehalten.',
  },
  cancelled_6: {
    title: 'Event storniert',
    body: 'Der Restbetrag von {{amount}} ist nicht rechtzeitig eingegangen. Das Event ist storniert, die Anzahlung (25 %) wird einbehalten.',
  },
};

const EN: Record<ReminderType, ReminderCopy> = {
  notice_18: {
    title: 'Payment Due Soon',
    body: 'Your remaining balance of {{amount}} is due in 11 days.',
  },
  request_16: {
    title: 'Please Settle Your Balance',
    body: 'Please settle your remaining balance of {{amount}} - due in 9 days.',
  },
  followup_14: {
    title: 'Payment Reminder',
    body: 'Reminder: your remaining balance of {{amount}} is due in 7 days.',
  },
  followup_12: {
    title: 'Payment Reminder',
    body: 'Reminder: your remaining balance of {{amount}} is due in 5 days.',
  },
  urgent_10: {
    title: 'Urgent: Payment Due',
    body: 'Urgent: your remaining balance of {{amount}} is due in 3 days.',
  },
  urgent_9: {
    title: 'Urgent: Payment Due',
    body: 'Urgent: your remaining balance of {{amount}} is due in 2 days.',
  },
  urgent_8: {
    title: 'Payment Deadline Is Tomorrow',
    body: 'The deadline is tomorrow: your remaining balance of {{amount}} has to be in by then.',
  },
  final_7: {
    title: 'Final Notice: Pay Today',
    body: 'Final notice: pay {{amount}} today. Otherwise the event is cancelled tomorrow and the 25% deposit is retained.',
  },
  cancelled_6: {
    title: 'Event Cancelled',
    body: 'The remaining balance of {{amount}} was not received in time. The event has been cancelled and the 25% deposit is retained.',
  },
};

const COPY: Record<Language, Record<ReminderType, ReminderCopy>> = { de: DE, en: EN };

/** Resolved copy with `{{amount}}` already substituted. */
export function reminderCopy(
  type: ReminderType,
  language: Language,
  amountFormatted: string,
): ReminderCopy {
  const entry = COPY[language][type];
  return { title: entry.title, body: entry.body.replace('{{amount}}', amountFormatted) };
}

/** Subject line. Sender name already reads "Game Over", the suffix keeps it recognisable. */
export function reminderSubject(
  type: ReminderType,
  language: Language,
  amountFormatted: string,
  partyLabel: string,
): string {
  const { title } = reminderCopy(type, language, amountFormatted);
  return `${title} - ${partyLabel} | Game Over`;
}

/** Brand claim, kept verbatim in sync with src/i18n via briefing.ts. */
export function reminderClaim(language: Language) {
  return CLAIM[language];
}
