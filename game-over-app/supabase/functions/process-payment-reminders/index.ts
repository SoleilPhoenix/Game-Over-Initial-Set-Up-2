/**
 * Process Payment Reminders Edge Function
 * Runs daily (via pg_cron or GitHub Actions) to send payment reminders.
 *
 * For each milestone (21, 18, 16, 14 days before event):
 * 1. Query bookings with deposit paid but not fully paid
 * 2. Skip if reminder already sent (idempotent via UNIQUE constraint)
 * 3. Send push notification + email + in-app notification
 * 4. At 14 days: auto-cancel unpaid events
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendEmail } from '../_shared/email.ts';
import { getPaymentReminderEmailHtml } from '../_shared/email-templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Milestone configuration
const MILESTONES = [
  { daysBefore: 21, urgency: 'normal' as const, type: 'normal' },
  { daysBefore: 18, urgency: 'moderate' as const, type: 'moderate' },
  { daysBefore: 16, urgency: 'urgent' as const, type: 'urgent' },
  { daysBefore: 14, urgency: 'final' as const, type: 'final' },
] as const;

// Notification messages per urgency level
const MESSAGES: Record<string, { title: string; bodyTemplate: string }> = {
  normal: {
    title: 'Payment Due Soon',
    bodyTemplate: 'Your final payment of {{amount}} is due within 7 days.',
  },
  moderate: {
    title: 'Payment Reminder',
    bodyTemplate: 'Reminder: Your final payment of {{amount}} is due in 4 days.',
  },
  urgent: {
    title: 'Urgent: Payment Due',
    bodyTemplate: 'Urgent: Your final payment of {{amount}} is due in 2 days.',
  },
  final: {
    title: 'Final Notice: Payment Due Today',
    bodyTemplate: 'Final notice: Pay {{amount}} today or event is cancelled. Only 25% deposit retained.',
  },
};

function formatCents(cents: number): string {
  return `\u20AC${(cents / 100).toFixed(2)}`;
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase configuration is missing');
    }

    // Service role bypasses RLS — needed for cross-user queries
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const today = new Date();
    const results: Array<{ milestone: number; processed: number; errors: number }> = [];

    for (const milestone of MILESTONES) {
      const targetDate = addDays(today, milestone.daysBefore);
      let processed = 0;
      let errors = 0;

      console.log(`Processing ${milestone.daysBefore}-day milestone (target date: ${targetDate})`);

      // Find bookings where deposit is paid but not fully paid,
      // and the event start_date matches the target date
      const { data: bookings, error: queryError } = await supabase
        .from('bookings')
        .select(`
          id,
          remaining_amount_cents,
          total_amount_cents,
          deposit_amount_cents,
          event_id,
          event:events!inner(
            id,
            title,
            honoree_name,
            start_date,
            status,
            created_by
          )
        `)
        .not('deposit_paid_at', 'is', null)
        .is('fully_paid_at', null)
        .eq('event.start_date', targetDate)
        .in('event.status', ['booked', 'planning']);

      if (queryError) {
        console.error(`Query error for ${milestone.daysBefore}-day milestone:`, queryError);
        errors++;
        results.push({ milestone: milestone.daysBefore, processed, errors });
        continue;
      }

      if (!bookings?.length) {
        console.log(`No bookings found for ${milestone.daysBefore}-day milestone`);
        results.push({ milestone: milestone.daysBefore, processed: 0, errors: 0 });
        continue;
      }

      for (const booking of bookings) {
        try {
          const event = booking.event as any;
          const userId = event.created_by;
          const remainingCents = booking.remaining_amount_cents ??
            (booking.total_amount_cents - (booking.deposit_amount_cents ?? 0));
          const amountStr = formatCents(remainingCents);

          // Attempt idempotent insert — UNIQUE(booking_id, days_before_event) prevents duplicates
          const { error: insertError } = await supabase
            .from('payment_reminders')
            .insert({
              booking_id: booking.id,
              event_id: event.id,
              user_id: userId,
              days_before_event: milestone.daysBefore,
              reminder_type: milestone.type,
            });

          if (insertError) {
            // Unique constraint violation means reminder already sent — skip
            if (insertError.code === '23505') {
              console.log(`Reminder already sent: booking=${booking.id}, days=${milestone.daysBefore}`);
              continue;
            }
            console.error('Insert error:', insertError);
            errors++;
            continue;
          }

          // Build notification message
          const messageConfig = MESSAGES[milestone.type];
          const body = messageConfig.bodyTemplate.replace('{{amount}}', amountStr);

          // 1. Create in-app notification
          const { data: notification } = await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              event_id: event.id,
              type: `payment_reminder_${milestone.type}`,
              title: messageConfig.title,
              body,
              action_url: `/booking/${event.id}/payment`,
            })
            .select('id')
            .single();

          // Update payment_reminders with notification_id
          if (notification) {
            await supabase
              .from('payment_reminders')
              .update({ notification_id: notification.id })
              .eq('booking_id', booking.id)
              .eq('days_before_event', milestone.daysBefore);
          }

          // 2. Send push notification
          let pushSent = false;
          try {
            const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userIds: [userId],
                notification: {
                  title: messageConfig.title,
                  body,
                  data: {
                    action_url: `/booking/${event.id}/payment`,
                    event_id: event.id,
                    type: `payment_reminder_${milestone.type}`,
                  },
                },
              }),
            });

            if (pushResponse.ok) {
              pushSent = true;
            } else {
              console.error('Push notification failed:', await pushResponse.text());
            }
          } catch (pushError) {
            console.error('Push notification error:', pushError);
          }

          // 3. Send email
          let emailSent = false;
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, email_notifications_enabled')
              .eq('id', userId)
              .single();

            if (profile?.email && profile.email_notifications_enabled !== false) {
              const html = getPaymentReminderEmailHtml({
                honoreeName: event.honoree_name,
                eventTitle: event.title,
                amountDue: amountStr,
                daysRemaining: milestone.daysBefore === 14 ? 0 : milestone.daysBefore - 14,
                urgency: milestone.urgency,
                paymentUrl: `https://game-over.app/booking/${event.id}/payment`,
              });

              const emailResult = await sendEmail({
                to: profile.email,
                subject: `${messageConfig.title} — ${event.honoree_name}'s Party`,
                html,
              });

              emailSent = emailResult.success;
            }
          } catch (emailError) {
            console.error('Email send error:', emailError);
          }

          // Update reminder record with send status
          await supabase
            .from('payment_reminders')
            .update({ push_sent: pushSent, email_sent: emailSent })
            .eq('booking_id', booking.id)
            .eq('days_before_event', milestone.daysBefore);

          // 4. At 14-day milestone: auto-cancel unpaid events
          if (milestone.daysBefore === 14) {
            console.log(`Auto-cancelling unpaid event: ${event.id}`);

            const { error: cancelError } = await supabase
              .from('events')
              .update({ status: 'cancelled' })
              .eq('id', event.id);

            if (cancelError) {
              console.error('Failed to cancel event:', cancelError);
            } else {
              // Create cancellation notification
              await supabase.from('notifications').insert({
                user_id: userId,
                event_id: event.id,
                type: 'event_cancelled_nonpayment',
                title: 'Event Cancelled',
                body: `${event.honoree_name}'s ${event.title} has been cancelled due to non-payment. Your 25% deposit has been retained.`,
                action_url: `/event/${event.id}`,
              });
            }
          }

          processed++;
        } catch (bookingError) {
          console.error(`Error processing booking ${booking.id}:`, bookingError);
          errors++;
        }
      }

      results.push({ milestone: milestone.daysBefore, processed, errors });
    }

    console.log('Payment reminders processing complete:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Payment reminders error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
