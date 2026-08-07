import { describe, expect, it } from 'vitest';
import { getPaymentReminderEmailHtml } from '../../supabase/functions/_shared/email-templates';
import {
  canIncludeExtraCostSection,
  extraCostReminderSection,
  formatReminderCents,
  reminderCopy,
} from '../../supabase/functions/_shared/payment-reminder';

describe('payment reminder extra-cost ledger', () => {
  it('renders the booking and open extra costs as separate push and email sections', () => {
    const bookingAmount = formatReminderCents(75_000);
    const openExtraCostShares = [{ amount_cents: 5_000 }, { amount_cents: 7_500 }];
    const extraCostAmount = formatReminderCents(
      openExtraCostShares.reduce((sum, share) => sum + share.amount_cents, 0),
    );
    const extraCosts = extraCostReminderSection(
      'en',
      extraCostAmount,
      openExtraCostShares.length,
    );

    const pushCopy = reminderCopy('followup_14', 'en', bookingAmount, extraCosts);
    const emailHtml = getPaymentReminderEmailHtml({
      honoreeName: 'Alex',
      eventTitle: 'Party',
      amountDue: bookingAmount,
      daysRemaining: 7,
      urgency: 'normal',
      language: 'en',
      extraCosts,
    });

    expect(pushCopy.body).toContain(`remaining balance of ${bookingAmount}`);
    expect(pushCopy.body).toContain(`Extra costs\nAmount due: ${extraCostAmount}\n2 items`);
    expect(emailHtml).toContain(`>${bookingAmount}</p>`);
    expect(emailHtml).toContain('>Extra costs</p>');
    expect(emailHtml).toContain(`>${extraCostAmount}</p>`);
    expect(emailHtml).toContain('>2 items</p>');
  });

  it('keeps the existing reminder exactly unchanged when there are no open extra costs', () => {
    expect(reminderCopy('followup_14', 'en', '€750.00')).toEqual({
      title: 'Payment Reminder',
      body: 'Reminder: your remaining balance of €750.00 is due in 7 days.',
    });
    expect(reminderCopy('followup_14', 'de', '€750.00')).toEqual({
      title: 'Erinnerung: Restzahlung',
      body: 'Erinnerung: der Restbetrag von €750.00 ist in 7 Tagen fällig.',
    });

    const emailHtml = getPaymentReminderEmailHtml({
      honoreeName: 'Alex',
      eventTitle: 'Party',
      amountDue: '€750.00',
      daysRemaining: 7,
      urgency: 'normal',
      language: 'en',
    });
    expect(emailHtml).not.toContain('Extra costs');
    expect(emailHtml).not.toContain('Separate extra-cost ledger');
    expect(emailHtml.match(/€750\.00/g)).toHaveLength(1);
  });

  it('never adds the package amount and extra-cost amount together', () => {
    const bookingAmount = formatReminderCents(75_000);
    const extraCostAmount = formatReminderCents(12_500);
    const combinedAmountThatMustNotAppear = formatReminderCents(87_500);
    const extraCosts = extraCostReminderSection('de', extraCostAmount, 2);

    const pushBody = reminderCopy('urgent_10', 'de', bookingAmount, extraCosts).body;
    const emailHtml = getPaymentReminderEmailHtml({
      honoreeName: 'Alex',
      eventTitle: 'Party',
      amountDue: bookingAmount,
      daysRemaining: 3,
      urgency: 'urgent',
      language: 'de',
      extraCosts,
    });

    for (const renderedReminder of [pushBody, emailHtml]) {
      expect(renderedReminder).toContain(bookingAmount);
      expect(renderedReminder).toContain(extraCostAmount);
      expect(renderedReminder).not.toContain(combinedAmountThatMustNotAppear);
    }
    expect(pushBody).toContain(`Weitere Kosten\nOffener Betrag: ${extraCostAmount}\n2 Posten`);
  });

  it('does not permit an extra-cost section for the honoree', () => {
    expect(canIncludeExtraCostSection('honoree')).toBe(false);
    expect(canIncludeExtraCostSection('guest')).toBe(true);
    expect(canIncludeExtraCostSection('organizer')).toBe(true);
  });
});
