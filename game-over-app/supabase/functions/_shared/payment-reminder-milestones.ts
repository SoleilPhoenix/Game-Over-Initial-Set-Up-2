export type PaymentReminderUrgency = 'normal' | 'moderate' | 'urgent' | 'final';

export interface PaymentReminderMilestone {
  daysBefore: number;
  urgency: PaymentReminderUrgency;
  type: string;
  alwaysSend: boolean;
}

// Payment deadline: the balance must be settled by PAYMENT_DEADLINE_DAYS before the event.
// The event is cancelled a full day later, so the deadline the final notice announces
// actually exists. Warning and cancellation in the same daily run would mean the customer
// reads "act now or it is cancelled" about something already executed - and, under German
// consumer law, a deadline without any time to act is no deadline at all.
export const PAYMENT_DEADLINE_DAYS = 7;
export const CANCEL_AT_DAYS = 6;

// Reminder ladder, in days before the event:
//   18      first heads-up
//   16      explicit request to pay
//   14, 12  every other day through the buffer
//   10,9,8  daily as it gets close
//   7       final notice, deadline day
//   6       cancellation (handled separately below, sends no payment reminder)
export const MILESTONES = [
  { daysBefore: 18, urgency: 'normal' as const, type: 'notice_18', alwaysSend: false },
  { daysBefore: 16, urgency: 'moderate' as const, type: 'request_16', alwaysSend: false },
  { daysBefore: 14, urgency: 'moderate' as const, type: 'followup_14', alwaysSend: true },
  { daysBefore: 12, urgency: 'moderate' as const, type: 'followup_12', alwaysSend: false },
  { daysBefore: 10, urgency: 'urgent' as const, type: 'urgent_10', alwaysSend: false },
  { daysBefore: 9, urgency: 'urgent' as const, type: 'urgent_9', alwaysSend: true },
  { daysBefore: 8, urgency: 'urgent' as const, type: 'urgent_8', alwaysSend: true },
  { daysBefore: PAYMENT_DEADLINE_DAYS, urgency: 'final' as const, type: 'final_7', alwaysSend: true },
  // Cancellation pass. Kept in the same list so it reuses the booking query and the
  // idempotent payment_reminders insert; the loop branches on daysBefore below.
  { daysBefore: CANCEL_AT_DAYS, urgency: 'final' as const, type: 'cancelled_6', alwaysSend: true },
] as const satisfies readonly PaymentReminderMilestone[];
