/**
 * Create Payment Intent Edge Function
 * Creates a Stripe PaymentIntent for booking payments
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.1.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaymentIntentRequest {
  booking_id: string;
  amount_cents: number;
  currency?: string;
}

serve(async (req: Request) => {
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

    // Parse request body
    const { booking_id, amount_cents, currency = 'eur' }: CreatePaymentIntentRequest = await req.json();

    // Validate required fields
    if (!booking_id) {
      throw new Error('booking_id is required');
    }

    if (!amount_cents || amount_cents <= 0) {
      throw new Error('amount_cents must be a positive number');
    }

    // Maximum amount validation (100,000 EUR = 10,000,000 cents)
    const MAX_AMOUNT_CENTS = 10000000;
    if (amount_cents > MAX_AMOUNT_CENTS) {
      throw new Error(`Amount exceeds maximum allowed: ${MAX_AMOUNT_CENTS} cents`);
    }

    // Fetch booking to verify it exists and belongs to user's event
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
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

    // Check if booking already has a valid payment intent
    if (booking.stripe_payment_intent_id) {
      // Retrieve existing payment intent to check its status
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);

        // If the existing intent is still valid (not succeeded, canceled, or requires_payment_method)
        if (existingIntent.status === 'requires_payment_method' || existingIntent.status === 'requires_confirmation') {
          // Return the existing client secret
          return new Response(
            JSON.stringify({
              success: true,
              client_secret: existingIntent.client_secret,
              payment_intent_id: existingIntent.id,
              status: existingIntent.status,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }

        // If payment already succeeded
        if (existingIntent.status === 'succeeded') {
          throw new Error('Payment has already been completed for this booking');
        }
      } catch (stripeError) {
        // Payment intent might not exist anymore, create a new one
        console.log('Existing payment intent not found or invalid, creating new one');
      }
    }

    // Get user's profile for customer metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: currency.toLowerCase(),
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
            amount_cents: amount_cents,
            currency: currency,
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
