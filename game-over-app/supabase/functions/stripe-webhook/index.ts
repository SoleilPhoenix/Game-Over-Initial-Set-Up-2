/**
 * Stripe Webhook Edge Function
 * Handles Stripe webhook events for payment processing
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.1.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    if (!stripeWebhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase configuration is missing');
    }

    // Initialize Stripe client
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize Supabase client with service role for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      throw new Error('Missing Stripe signature');
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', errorMessage);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`Processing webhook event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(supabase, paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(supabase, paymentIntent);
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentCanceled(supabase, paymentIntent);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(supabase, charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({ received: true, type: event.type }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(
  supabase: ReturnType<typeof createClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const bookingId = paymentIntent.metadata?.booking_id;
  const eventId = paymentIntent.metadata?.event_id;
  const userId = paymentIntent.metadata?.user_id;

  if (!bookingId) {
    console.error('No booking_id in payment intent metadata');
    return;
  }

  console.log(`Payment succeeded for booking: ${bookingId}`);

  // Update booking status
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('audit_log')
    .eq('id', bookingId)
    .single();

  if (fetchError) {
    console.error('Failed to fetch booking:', fetchError);
    return;
  }

  const auditLog = Array.isArray(booking?.audit_log) ? booking.audit_log : [];
  auditLog.push({
    action: 'payment_succeeded',
    payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    timestamp: new Date().toISOString(),
  });

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      payment_status: 'completed',
      audit_log: auditLog,
    })
    .eq('id', bookingId);

  if (updateError) {
    console.error('Failed to update booking:', updateError);
    return;
  }

  // Update event status to 'booked'
  if (eventId) {
    const { error: eventError } = await supabase
      .from('events')
      .update({ status: 'booked' })
      .eq('id', eventId);

    if (eventError) {
      console.error('Failed to update event status:', eventError);
    }
  }

  // Create notification for user
  if (userId && eventId) {
    const { data: event } = await supabase
      .from('events')
      .select('title, honoree_name')
      .eq('id', eventId)
      .single();

    await supabase.from('notifications').insert({
      user_id: userId,
      event_id: eventId,
      type: 'payment_success',
      title: 'Payment Successful!',
      body: event
        ? `Your booking for ${event.honoree_name}'s ${event.title} has been confirmed.`
        : 'Your payment has been processed successfully.',
      action_url: `/event/${eventId}`,
    });
  }

  console.log(`Successfully processed payment for booking: ${bookingId}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(
  supabase: ReturnType<typeof createClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const bookingId = paymentIntent.metadata?.booking_id;
  const userId = paymentIntent.metadata?.user_id;
  const eventId = paymentIntent.metadata?.event_id;

  if (!bookingId) {
    console.error('No booking_id in payment intent metadata');
    return;
  }

  console.log(`Payment failed for booking: ${bookingId}`);

  // Fetch booking audit log
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('audit_log')
    .eq('id', bookingId)
    .single();

  if (fetchError) {
    console.error('Failed to fetch booking:', fetchError);
    return;
  }

  const auditLog = Array.isArray(booking?.audit_log) ? booking.audit_log : [];
  const lastError = paymentIntent.last_payment_error;

  auditLog.push({
    action: 'payment_failed',
    payment_intent_id: paymentIntent.id,
    error_code: lastError?.code,
    error_message: lastError?.message,
    timestamp: new Date().toISOString(),
  });

  // Update booking status
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      payment_status: 'failed',
      audit_log: auditLog,
    })
    .eq('id', bookingId);

  if (updateError) {
    console.error('Failed to update booking:', updateError);
    return;
  }

  // Create notification for user
  if (userId) {
    await supabase.from('notifications').insert({
      user_id: userId,
      event_id: eventId || null,
      type: 'payment_failed',
      title: 'Payment Failed',
      body: 'Your payment could not be processed. Please try again or use a different payment method.',
      action_url: eventId ? `/booking/${eventId}/payment` : null,
    });
  }

  console.log(`Successfully recorded payment failure for booking: ${bookingId}`);
}

/**
 * Handle canceled payment
 */
async function handlePaymentCanceled(
  supabase: ReturnType<typeof createClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const bookingId = paymentIntent.metadata?.booking_id;

  if (!bookingId) {
    console.error('No booking_id in payment intent metadata');
    return;
  }

  console.log(`Payment canceled for booking: ${bookingId}`);

  // Fetch booking audit log
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('audit_log')
    .eq('id', bookingId)
    .single();

  if (fetchError) {
    console.error('Failed to fetch booking:', fetchError);
    return;
  }

  const auditLog = Array.isArray(booking?.audit_log) ? booking.audit_log : [];
  auditLog.push({
    action: 'payment_canceled',
    payment_intent_id: paymentIntent.id,
    cancellation_reason: paymentIntent.cancellation_reason,
    timestamp: new Date().toISOString(),
  });

  // Update booking status back to pending
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      payment_status: 'pending',
      audit_log: auditLog,
    })
    .eq('id', bookingId);

  if (updateError) {
    console.error('Failed to update booking:', updateError);
  }
}

/**
 * Handle refund
 */
async function handleRefund(
  supabase: ReturnType<typeof createClient>,
  charge: Stripe.Charge
) {
  const paymentIntentId = charge.payment_intent;

  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    console.error('No payment_intent in charge');
    return;
  }

  console.log(`Processing refund for payment intent: ${paymentIntentId}`);

  // Find booking by payment intent ID
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, audit_log, event_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single();

  if (fetchError || !booking) {
    console.error('Booking not found for payment intent:', paymentIntentId);
    return;
  }

  const auditLog = Array.isArray(booking.audit_log) ? booking.audit_log : [];
  auditLog.push({
    action: 'refund_processed',
    charge_id: charge.id,
    amount_refunded: charge.amount_refunded,
    timestamp: new Date().toISOString(),
  });

  // Update booking status
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      payment_status: 'refunded',
      audit_log: auditLog,
    })
    .eq('id', booking.id);

  if (updateError) {
    console.error('Failed to update booking:', updateError);
    return;
  }

  // Update event status if needed
  if (booking.event_id) {
    const { error: eventError } = await supabase
      .from('events')
      .update({ status: 'planning' })
      .eq('id', booking.event_id);

    if (eventError) {
      console.error('Failed to update event status:', eventError);
    }
  }

  console.log(`Successfully processed refund for booking: ${booking.id}`);
}
