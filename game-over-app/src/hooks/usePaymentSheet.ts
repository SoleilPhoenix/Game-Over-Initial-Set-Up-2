/**
 * usePaymentSheet Hook
 * Handles Stripe Payment Sheet integration with Supabase Edge Functions
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useStripe, PaymentSheetError } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase/client';

interface PaymentSheetParams {
  bookingId: string;
  amountCents: number;
  currency?: string;
}

interface PaymentIntentResponse {
  success: boolean;
  client_secret?: string;
  payment_intent_id?: string;
  status?: string;
  error?: string;
}

export function usePaymentSheet() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize and present payment sheet
   */
  const processPayment = useCallback(
    async ({ bookingId, amountCents, currency = 'eur' }: PaymentSheetParams): Promise<{
      success: boolean;
      error?: string;
    }> => {
      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Get payment intent from edge function
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.access_token) {
          throw new Error('Not authenticated');
        }

        const response = await supabase.functions.invoke<PaymentIntentResponse>(
          'create-payment-intent',
          {
            body: {
              booking_id: bookingId,
              amount_cents: amountCents,
              currency,
            },
          }
        );

        if (response.error || !response.data?.success) {
          throw new Error(response.data?.error || response.error?.message || 'Failed to create payment intent');
        }

        const { client_secret } = response.data;

        if (!client_secret) {
          throw new Error('No client secret received');
        }

        // Step 2: Initialize payment sheet
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: client_secret,
          merchantDisplayName: 'Game Over',
          style: 'automatic',
          googlePay: {
            merchantCountryCode: 'DE',
            testEnv: __DEV__,
          },
          applePay: {
            merchantCountryCode: 'DE',
          },
          defaultBillingDetails: {
            address: {
              country: 'DE',
            },
          },
          returnURL: 'gameover://payment-return',
          allowsDelayedPaymentMethods: false,
        });

        if (initError) {
          throw new Error(initError.message);
        }

        // Step 3: Present payment sheet
        const { error: presentError } = await presentPaymentSheet();

        if (presentError) {
          if (presentError.code === PaymentSheetError.Canceled) {
            // User canceled - not an error
            return { success: false, error: 'Payment cancelled' };
          }
          throw new Error(presentError.message);
        }

        // Payment successful!
        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Payment failed';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [initPaymentSheet, presentPaymentSheet]
  );

  /**
   * Show payment error alert
   */
  const showError = useCallback((message: string) => {
    Alert.alert(
      'Payment Error',
      message,
      [{ text: 'OK' }]
    );
  }, []);

  return {
    processPayment,
    isLoading,
    error,
    showError,
  };
}
