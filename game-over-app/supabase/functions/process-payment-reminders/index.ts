/**
 * Process Payment Reminders Edge Function
 * Runs daily at 09:15 UTC via pg_cron to chase the outstanding balance.
 *
 * Ladder, in days before the event:
 *   18       first heads-up
 *   16       explicit request to pay
 *   14, 12   every other day through the buffer
 *   10, 9, 8 daily as it gets close
 *   7        final notice - this is the payment deadline
 *   6        cancellation, 25% deposit retained
 *
 * Cancellation deliberately sits one day AFTER the final notice. Warning and
 * cancellation in the same daily run would announce a deadline that has already
 * passed at the moment of writing, leaving no time to act.
 *
 * Per milestone:
 * 1. Query bookings with deposit paid but not fully paid, event on that exact date
 * 2. Skip if already handled (idempotent via UNIQUE(booking_id, days_before_event))
 * 3. In-app notification + push; email on reminder passes only
 * 4. On the day-6 pass: re-check payment, then cancel
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendEmail } from '../_shared/email.ts';
import {
  getBookingCancelledEmailHtml,
  getPaymentReminderEmailHtml,
} from '../_shared/email-templates.ts';
import { reminderCopy, reminderSubject, type ReminderType } from '../_shared/payment-reminder.ts';
import { partyLabel, type PartyType } from '../_shared/briefing.ts';
import {
  CANCEL_AT_DAYS,
  MILESTONES,
  PAYMENT_DEADLINE_DAYS,
} from '../_shared/payment-reminder-milestones.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Notification copy lives in _shared/payment-reminder.ts, bilingual, so it can be
// rendered for review without starting this module's server. Language comes from the
// organizer's profiles.language.

function formatCents(cents: number): string {
  return `\u20AC${(cents / 100).toFixed(2)}`;
}

function formatCentsForLanguage(cents: number, language: 'de' | 'en'): string {
  return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

function formatEventDate(date: string, language: 'de' | 'en'): string {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(
    language === 'de' ? 'de-DE' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );
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

  // --- AUTH GUARD (fail-closed) ---
  // This function uses the service role key and can auto-cancel events.
  // Require CRON_SECRET bearer token. If the secret is absent (misconfiguration),
  // refuse ALL requests rather than running unguarded.
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    console.error('[process-payment-reminders] CRON_SECRET env var is not set — refusing all requests');
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
          reference_number,
          event:events!inner(
            id,
            title,
            honoree_name,
            start_date,
            status,
            created_by,
            party_type
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

          // The last rung of the ladder is the cancellation pass, not a reminder.
          const isCancellationPass = milestone.daysBefore === CANCEL_AT_DAYS;

          // Organizer profile drives language, greeting and delivery. Fetched here rather
          // than inside the email block, because the in-app notification and push need the
          // language too — they used to be hardcoded English.
          const { data: organizer } = await supabase
            .from('profiles')
            .select('email, full_name, language, email_notifications_enabled')
            .eq('id', userId)
            .maybeSingle();

          const language: 'de' | 'en' = organizer?.language === 'de' ? 'de' : 'en';
          const organizerFirstName =
            ((organizer?.full_name as string | null) ?? '').trim().split(/\s+/)[0] || undefined;
          const label = partyLabel(
            event.honoree_name || 'the honoree',
            event.party_type as PartyType,
            language,
          );

          // Build notification message
          const messageConfig = reminderCopy(milestone.type as ReminderType, language, amountStr);
          const body = messageConfig.body;
          const notificationType = isCancellationPass
            ? 'event_cancelled_nonpayment'
            : `payment_reminder_${milestone.type}`;
          const actionUrl = isCancellationPass
            ? `/event/${event.id}`
            : `/booking/${event.id}/payment`;

          // 1. Create in-app notification
          const { data: notification } = await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              event_id: event.id,
              type: notificationType,
              title: messageConfig.title,
              body,
              action_url: actionUrl,
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
                    action_url: actionUrl,
                    event_id: event.id,
                    type: notificationType,
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

          // 3. Send email — organizer profile was already loaded above.
          let emailSent = false;
          try {
            const organizerEmail = (organizer?.email as string | null)?.trim() || null;

            // The payment-reminder template tells the reader to pay before cancellation.
            // On the cancellation pass that has already happened, so sending it would be
            // actively wrong. The dedicated cancellation email is sent only after the
            // cancellation write succeeds below.
            if (
              organizerEmail &&
              (milestone.alwaysSend || organizer?.email_notifications_enabled !== false) &&
              !isCancellationPass
            ) {
              // Days left until the payment deadline (day 7), not until the event.
              const daysRemaining = Math.max(0, milestone.daysBefore - PAYMENT_DEADLINE_DAYS);

              const html = getPaymentReminderEmailHtml({
                honoreeName: event.honoree_name,
                eventTitle: event.title,
                amountDue: amountStr,
                daysRemaining,
                urgency: milestone.urgency,
                paymentUrl: `https://game-over.app/booking/${event.id}/payment`,
                language,
                partyLabel: label,
                guestFirstName: organizerFirstName,
                bookingReference: (booking.reference_number as string | null) ?? undefined,
              });

              const emailResult = await sendEmail({
                to: organizerEmail,
                subject: reminderSubject(milestone.type as ReminderType, language, amountStr, label),
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

          // 4. Cancellation pass: a full day after the final notice on day 7, so the
          //    deadline that notice announced was real and the customer had time to act.
          if (isCancellationPass) {
            // Guard: only cancel events that are not already cancelled (idempotent)
            if (event.status !== 'cancelled') {
              // Race-condition guard: between the initial query (line ~210) and now,
              // a payment webhook could have fired and marked the booking as fully
              // paid. Re-fetch the booking's current state right before we cancel.
              const { data: currentBooking } = await supabase
                .from('bookings')
                .select('fully_paid_at, payment_status')
                .eq('id', booking.id)
                .maybeSingle();

              if (currentBooking?.fully_paid_at || currentBooking?.payment_status === 'paid') {
                console.log(
                  `Skipping cancellation for event ${event.id} — payment arrived ` +
                  `during the cron window (booking ${booking.id})`
                );
                continue;
              }

              console.log(`Auto-cancelling unpaid event: ${event.id}`);

              const { error: cancelError } = await supabase
                .from('events')
                .update({ status: 'cancelled' })
                .eq('id', event.id);

              if (cancelError) {
                // Cancellation failed — log clearly and count as error.
                // NOTE: payment_reminders row was already inserted above, so the next cron run
                // will skip via UNIQUE constraint. This is intentional: notifications were already
                // sent, and a failed cancellation should be investigated manually, not retried blindly.
                console.error(`[CRITICAL] Failed to cancel event ${event.id} at the ${CANCEL_AT_DAYS}-day cancellation pass:`, cancelError);
                errors++;
                // Don't count as processed — makes monitoring dashboards visible
              } else {
                // Also update booking payment_status to 'cancelled' for data consistency.
                // Non-blocking: event is already cancelled, booking status is secondary.
                supabase
                  .from('bookings')
                  .update({ payment_status: 'cancelled' })
                  .eq('id', booking.id)
                  .then(({ error: bookingCancelError }) => {
                    if (bookingCancelError) {
                      console.warn(`[process-payment-reminders] Failed to update booking ${booking.id} status to cancelled (non-blocking):`, bookingCancelError.message);
                    }
                  });

                // No separate cancellation notification here: step 1 above already wrote one
                // with type 'event_cancelled_nonpayment' on this pass. Inserting a second
                // would show the user the same bad news twice.

                // Send only after the events.status write above succeeded. This is
                // deliberately non-blocking: delivery failure cannot undo or retry
                // a confirmed cancellation.
                // Deliberately ignore email_notifications_enabled here: retaining
                // the deposit makes this a contractual notice, not an optional mail.
                const organizerEmail = (organizer?.email as string | null)?.trim();
                if (organizerEmail) {
                  const retainedDepositCents = booking.deposit_amount_cents ??
                    (booking.total_amount_cents - remainingCents);

                  Promise.resolve()
                    .then(() => sendEmail({
                      to: organizerEmail,
                      subject: language === 'de'
                        ? 'Schade - wir mussten stornieren | Game Over'
                        : 'We’re sorry - we had to cancel | Game Over',
                      html: getBookingCancelledEmailHtml({
                        organizerFirstName,
                        partyLabel: label,
                        dateStr: formatEventDate(event.start_date, language),
                        remainingAmount: formatCentsForLanguage(remainingCents, language),
                        depositAmount: formatCentsForLanguage(retainedDepositCents, language),
                        bookingReference: (booking.reference_number as string | null) ?? undefined,
                        appUrl: 'https://game-over.app',
                        language,
                      }),
                    }))
                    .then((emailResult) => {
                      if (!emailResult.success) {
                        console.warn(
                          `[process-payment-reminders] Cancellation email failed for booking ${booking.id} (non-blocking):`,
                          emailResult.error,
                        );
                      }
                    })
                    .catch((emailError) => {
                      console.warn(
                        `[process-payment-reminders] Cancellation email failed for booking ${booking.id} (non-blocking):`,
                        emailError instanceof Error ? emailError.message : String(emailError),
                      );
                    });
                } else {
                  console.warn(
                    `[process-payment-reminders] Cancellation email skipped for booking ${booking.id}: organizer email unavailable`,
                  );
                }
                processed++;
              }
            } else {
              // Already cancelled on a previous run — count as processed
              processed++;
            }
          } else {
            processed++;
          }
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
