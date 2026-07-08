/**
 * Create Payment Intent Edge Function
 * Creates a Stripe PaymentIntent for booking payments
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.1.0?target=deno';
import { corsHeaders as buildCors, checkRateLimit } from '../_shared/http.ts';

interface CreatePaymentIntentRequest {
  booking_id: string;
  payment_type?: 'deposit' | 'remaining' | 'full'; // client hints what they're paying
  currency?: string;
  // NOTE: amount_cents is intentionally NOT accepted from the client.
  // The server computes the correct amount from the package price (never the
  // client-supplied booking total).
}

serve(async (req: Request) => {
  const corsHeaders = buildCors(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
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

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    // Rate limit per user: cap payment-intent creation to blunt card-testing
    // and repeated-intent abuse.
    const allowed = await checkRateLimit(supabase, 'create-payment-intent', user.id, 20, 60);
    if (!allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many payment attempts. Please wait a moment and try again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body — amount_cents is NOT accepted from the client
    const { booking_id, payment_type = 'full', currency }: CreatePaymentIntentRequest = await req.json();

    // Validate required fields
    if (!booking_id) {
      throw new Error('booking_id is required');
    }

    // Currency allowlist
    const ALLOWED_CURRENCIES = ['eur', 'usd', 'gbp', 'chf'];
    const normalizedCurrency = (currency ?? 'eur').toLowerCase();
    if (!ALLOWED_CURRENCIES.includes(normalizedCurrency)) {
      return new Response(JSON.stringify({
        success: false,
        error: `Unsupported currency. Allowed: ${ALLOWED_CURRENCIES.join(', ')}`,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch booking to verify it exists and belongs to user's event.
    // We pull paying_participants / exclude_honoree / package price so the amount
    // can be recomputed from authoritative data rather than the stored total.
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id, total_amount_cents, deposit_amount_cents, deposit_paid_at, payment_status,
        stripe_payment_intent_id, audit_log, paying_participants, exclude_honoree,
        package:packages!inner(price_per_person_cents, base_price_cents),
        event:events!inner(id, created_by, title, honoree_name)
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // Verify user owns the event
    if (booking.event.created_by !== user.id) {
      throw new Error('Unauthorized: You do not have access to this booking');
    }

    // --- SERVER-SIDE AMOUNT CALCULATION ---
    // NEVER trust the stored total: recompute from the package price. This is
    // defence-in-depth alongside the DB trigger (enforce_booking_financial_integrity)
    // that already rewrites booking money columns on insert.
    const pkgPerPersonCents: number = booking.package?.price_per_person_cents ?? 0;
    const pkgBaseCents: number = booking.package?.base_price_cents ?? 0;
    const payingParticipants: number = booking.paying_participants ?? 0;
    if (pkgPerPersonCents <= 0 || payingParticipants < 1) {
      throw new Error('Booking is missing package pricing data');
    }
    // Package base is priced across ALL participants (honoree included).
    const totalParticipants = booking.exclude_honoree ? payingParticipants + 1 : payingParticipants;
    const bookingTotalCents: number = pkgPerPersonCents * totalParticipants + pkgBaseCents;

    // Flag (do not trust) any drift between the stored total and the recomputed one.
    if ((booking.total_amount_cents ?? 0) !== bookingTotalCents) {
      console.warn(
        `[create-payment-intent] stored total ${booking.total_amount_cents} != recomputed ${bookingTotalCents} for booking ${booking_id} — using recomputed value`
      );
    }

    const depositPaidCents: number = booking.deposit_amount_cents ?? 0;

    let serverAmountCents: number;
    if (payment_type === 'deposit') {
      // 25% deposit — must match the client-side depositCents calculation in payment.tsx
      serverAmountCents = Math.ceil(bookingTotalCents * 0.25);
    } else if (payment_type === 'remaining') {
      // Guard against race: deposit webhook must have fired before remaining balance is payable
      if (!booking.deposit_paid_at) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Deposit has not been confirmed yet. Please wait a moment and try again.',
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Remaining balance after deposit
      serverAmountCents = bookingTotalCents - depositPaidCents;
    } else {
      // Full payment
      serverAmountCents = bookingTotalCents;
    }

    if (serverAmountCents <= 0) {
      return new Response(JSON.stringify({ success: false, error: 'Nothing to pay — booking may already be settled.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const MAX_AMOUNT_CENTS = 10_000_000; // €100,000 hard cap
    if (serverAmountCents > MAX_AMOUNT_CENTS) {
      return new Response(JSON.stringify({ success: false, error: 'Amount exceeds maximum allowed.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if booking already has a valid payment intent
    if (booking.stripe_payment_intent_id) {
      // Retrieve the existing intent. Only the *retrieve* call is inside try/catch
      // (it can 404 if the intent was deleted); business-logic decisions on the
      // retrieved status must NOT be swallowed by that catch — otherwise an
      // already-succeeded booking would fall through and be charged again.
      let existingIntent: Stripe.PaymentIntent | null = null;
      try {
        existingIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
      } catch (_stripeError) {
        // Intent no longer exists in Stripe — safe to create a fresh one below.
        console.log('Existing payment intent not found, creating a new one');
      }

      if (existingIntent) {
        // Already paid — refuse rather than create a second charge.
        if (existingIntent.status === 'succeeded') {
          return new Response(
            JSON.stringify({ success: false, error: 'Payment has already been completed for this booking' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
          );
        }

        // Still payable — return the existing client secret (idempotent retry).
        if (existingIntent.status === 'requires_payment_method' || existingIntent.status === 'requires_confirmation') {
          return new Response(
            JSON.stringify({
              success: true,
              client_secret: existingIntent.client_secret,
              payment_intent_id: existingIntent.id,
              status: existingIntent.status,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
        // Any other status (canceled, processing, etc.) falls through to create a new intent.
      }
    }

    // Get user's profile for customer metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Create Stripe PaymentIntent using server-computed amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: serverAmountCents,
      currency: normalizedCurrency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        booking_id: booking_id,
        event_id: booking.event.id,
        event_title: booking.event.title,
        honoree_name: booking.event.honoree_name,
        user_id: user.id,
        user_email: profile?.email || user.email || '',
        payment_type: payment_type,
      },
      description: `Game-Over: ${booking.event.title} - ${booking.event.honoree_name}'s party`,
      receipt_email: profile?.email || user.email,
    });

    // Update booking with payment intent ID
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'processing',
        audit_log: [
          ...(Array.isArray(booking.audit_log) ? booking.audit_log : []),
          {
            action: 'payment_intent_created',
            payment_intent_id: paymentIntent.id,
            amount_cents: serverAmountCents,
            payment_type: payment_type,
            currency: normalizedCurrency,
            timestamp: new Date().toISOString(),
          },
        ],
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Failed to update booking:', updateError);
      // Don't throw here - payment intent was created successfully
      // The webhook will handle updating the booking status
    }

    // Return client secret for Stripe Payment Sheet
    return new Response(
      JSON.stringify({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating payment intent:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const statusCode = errorMessage.includes('Unauthorized') ? 403 :
                       errorMessage.includes('not found') ? 404 :
                       errorMessage.includes('required') ? 400 : 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});
