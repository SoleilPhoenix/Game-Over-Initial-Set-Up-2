export type PaymentReminderUrgency = 'normal' | 'moderate' | 'urgent' | 'final';

export interface PaymentReminderMilestone {
  daysBefore: number;
  urgency: PaymentReminderUrgency;
  type: PaymentReminderUrgency;
  /** Whether this contractual milestone bypasses email_notifications_enabled. */
  alwaysSend: boolean;
}

// Every milestone must explicitly choose whether the organizer's optional-email
// preference applies. This keeps a newly-added milestone from silently landing
// in the wrong delivery class.
export const PAYMENT_REMINDER_MILESTONES = [
  { daysBefore: 18, urgency: 'moderate', type: 'moderate', alwaysSend: false },
  { daysBefore: 16, urgency: 'urgent', type: 'urgent', alwaysSend: false },
  { daysBefore: 14, urgency: 'final', type: 'final', alwaysSend: true },
  { daysBefore: 12, urgency: 'urgent', type: 'urgent', alwaysSend: false },
  { daysBefore: 10, urgency: 'urgent', type: 'urgent', alwaysSend: false },
  { daysBefore: 9, urgency: 'urgent', type: 'urgent', alwaysSend: true },
  { daysBefore: 8, urgency: 'urgent', type: 'urgent', alwaysSend: true },
  { daysBefore: 7, urgency: 'final', type: 'final', alwaysSend: true },
] as const satisfies readonly PaymentReminderMilestone[];
