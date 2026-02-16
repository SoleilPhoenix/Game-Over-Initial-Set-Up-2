/**
 * Send Email Edge Function
 * Generic email sender that supports all template types.
 *
 * Called by:
 * - Supabase Auth webhook (welcome email on signup)
 * - Stripe webhook (booking confirmation after payment)
 * - process-payment-reminders (payment reminder emails)
 * - Other edge functions or client-side via supabase.functions.invoke()
 *
 * Payload:
 * {
 *   template: 'welcome' | 'booking_confirmation' | 'payment_reminder',
 *   to: 'user@example.com',
 *   data: { ... template-specific params }
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { sendEmail } from '../_shared/email.ts';
import {
  getWelcomeEmailHtml,
  getBookingConfirmationEmailHtml,
  getPaymentReminderEmailHtml,
} from '../_shared/email-templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TemplateName = 'welcome' | 'booking_confirmation' | 'payment_reminder';

interface SendEmailPayload {
  template: TemplateName;
  to: string;
  data: Record<string, unknown>;
}

const SUBJECT_MAP: Record<TemplateName, (data: Record<string, unknown>) => string> = {
  welcome: () => 'Welcome to Game Over!',
  booking_confirmation: (data) =>
    `Booking Confirmed — ${data.honoreeName}'s ${data.eventTitle}`,
  payment_reminder: (data) => {
    const labels: Record<string, string> = {
      normal: 'Payment Due Soon',
      moderate: 'Payment Reminder',
      urgent: 'Urgent: Payment Due',
      final: 'Final Notice: Payment Due Today',
    };
    const urgency = (data.urgency as string) ?? 'normal';
    return `${labels[urgency] ?? 'Payment Due'} — ${data.honoreeName}'s ${data.eventTitle}`;
  },
};

function renderTemplate(template: TemplateName, data: Record<string, unknown>): string {
  switch (template) {
    case 'welcome':
      return getWelcomeEmailHtml({
        userName: data.userName as string | undefined,
      });

    case 'booking_confirmation':
      return getBookingConfirmationEmailHtml({
        userName: data.userName as string | undefined,
        honoreeName: data.honoreeName as string,
        eventTitle: data.eventTitle as string,
        packageName: data.packageName as string,
        city: data.city as string,
        eventDate: data.eventDate as string | undefined,
        participants: data.participants as number,
        totalAmount: data.totalAmount as string,
        depositAmount: data.depositAmount as string,
        bookingReference: data.bookingReference as string,
        eventUrl: data.eventUrl as string | undefined,
      });

    case 'payment_reminder':
      return getPaymentReminderEmailHtml({
        honoreeName: data.honoreeName as string,
        eventTitle: data.eventTitle as string,
        amountDue: data.amountDue as string,
        daysRemaining: data.daysRemaining as number,
        urgency: data.urgency as 'normal' | 'moderate' | 'urgent' | 'final',
        paymentUrl: data.paymentUrl as string | undefined,
      });

    default:
      throw new Error(`Unknown template: ${template}`);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: SendEmailPayload = await req.json();

    if (!payload.template || !payload.to) {
      throw new Error('template and to are required');
    }

    // Check if user has email notifications enabled
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseServiceRoleKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

      const { data: profile } = await supabase
        .from('profiles')
        .select('email_notifications_enabled')
        .eq('email', payload.to)
        .single();

      // Skip welcome emails from this check (user just signed up)
      if (payload.template !== 'welcome' && profile?.email_notifications_enabled === false) {
        console.log(`Email notifications disabled for ${payload.to} — skipping`);
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'notifications_disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    const html = renderTemplate(payload.template, payload.data ?? {});
    const subject = SUBJECT_MAP[payload.template](payload.data ?? {});

    const result = await sendEmail({
      to: payload.to,
      subject,
      html,
    });

    console.log(`Email sent: template=${payload.template}, to=${payload.to}, success=${result.success}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: result.success ? 200 : 500 }
    );
  } catch (error) {
    console.error('Send email error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
