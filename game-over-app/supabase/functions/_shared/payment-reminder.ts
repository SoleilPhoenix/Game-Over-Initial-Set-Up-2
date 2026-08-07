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

export interface ExtraCostReminderSection {
  heading: string;
  amountLabel: string;
  amountFormatted: string;
  itemCountLabel: string;
}

/** Existing reminder currency format, shared by both reminder entry points. */
export function formatReminderCents(cents: number): string {
  return `\u20AC${(cents / 100).toFixed(2)}`;
}

/** Money visibility rule shared by both service-role reminder entry points. */
export function canIncludeExtraCostSection(role: string | null | undefined): boolean {
  return role !== 'honoree';
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

const EXTRA_COST_COPY: Record<Language, {
  heading: string;
  amountLabel: string;
  itemCount: (count: number) => string;
}> = {
  de: {
    heading: 'Weitere Kosten',
    amountLabel: 'Offener Betrag',
    // "Posten" ist im Plural gleich - hier steht bewusst keine Fallunterscheidung.
    itemCount: (count) => `${count} Posten`,
  },
  en: {
    heading: 'Extra costs',
    amountLabel: 'Amount due',
    itemCount: (count) => `${count} ${count === 1 ? 'item' : 'items'}`,
  },
};

/** Copy for the separate extra-cost ledger. It never changes the booking amount. */
export function extraCostReminderSection(
  language: Language,
  amountFormatted: string,
  itemCount: number,
): ExtraCostReminderSection {
  const copy = EXTRA_COST_COPY[language];
  return {
    heading: copy.heading,
    amountLabel: copy.amountLabel,
    amountFormatted,
    itemCountLabel: copy.itemCount(itemCount),
  };
}

/** Add the extra-cost ledger to plain-text channels while preserving the original body. */
export function appendExtraCostReminderSection(
  body: string,
  extraCosts?: ExtraCostReminderSection,
): string {
  if (!extraCosts) return body;

  return `${body}\n\n${extraCosts.heading}\n${extraCosts.amountLabel}: ${extraCosts.amountFormatted}\n${extraCosts.itemCountLabel}`;
}

/** Resolved copy with `{{amount}}` already substituted. */
export function reminderCopy(
  type: ReminderType,
  language: Language,
  amountFormatted: string,
  extraCosts?: ExtraCostReminderSection,
): ReminderCopy {
  const entry = COPY[language][type];
  const body = entry.body.replace('{{amount}}', amountFormatted);
  return { title: entry.title, body: appendExtraCostReminderSection(body, extraCosts) };
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
