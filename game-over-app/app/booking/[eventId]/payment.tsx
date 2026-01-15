/**
 * Payment Screen
 * Stripe Payment Sheet integration for package bookings
 */

import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { usePaymentSheet } from '@/hooks/usePaymentSheet';
import { useCreateBooking, useUpdatePaymentStatus } from '@/hooks/queries/useBookings';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// In E2E mode, we mock the payment
const IS_E2E = process.env.EXPO_PUBLIC_E2E_MODE === 'true';

type PaymentStep = 'ready' | 'creating_booking' | 'processing_payment' | 'confirming';

export default function PaymentScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('ready');

  const {
    event,
    package: pkg,
    pricing,
    excludeHonoree,
    isLoading,
  } = useBookingFlow(eventId);

  const createBookingMutation = useCreateBooking();
  const updatePaymentMutation = useUpdatePaymentStatus();
  const { processPayment, isLoading: isPaymentLoading, showError } = usePaymentSheet();

  if (isLoading || !event || !pkg || !pricing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    });
  };

  const getStepMessage = () => {
    switch (paymentStep) {
      case 'creating_booking':
        return 'Creating your booking...';
      case 'processing_payment':
        return 'Processing payment...';
      case 'confirming':
        return 'Confirming your booking...';
      default:
        return 'Preparing...';
    }
  };

  const handlePayment = async () => {
    if (!eventId) return;

    try {
      // Step 1: Create booking record
      setPaymentStep('creating_booking');
      const booking = await createBookingMutation.mutateAsync({
        event_id: eventId,
        package_id: pkg.id,
        exclude_honoree: excludeHonoree,
        paying_participants: pricing.payingParticipantCount,
        package_base_cents: pricing.packagePriceCents,
        service_fee_cents: pricing.serviceFeeCents,
        total_amount_cents: pricing.totalCents,
        per_person_cents: pricing.perPersonCents,
      });

      if (IS_E2E) {
        // In E2E mode, simulate successful payment
        setPaymentStep('processing_payment');
        await new Promise(resolve => setTimeout(resolve, 1500));

        setPaymentStep('confirming');
        await updatePaymentMutation.mutateAsync({
          bookingId: booking.id,
          status: 'completed',
        });

        router.replace(`/booking/${eventId}/confirmation`);
        return;
      }

      // Step 2: Process payment with Stripe
      setPaymentStep('processing_payment');
      const { success, error } = await processPayment({
        bookingId: booking.id,
        amountCents: pricing.totalCents,
        currency: 'eur',
      });

      if (!success) {
        if (error === 'Payment cancelled') {
          // User cancelled - reset to ready state
          setPaymentStep('ready');
          // Keep booking in pending state for retry
          return;
        }
        throw new Error(error || 'Payment failed');
      }

      // Step 3: Confirm booking (webhook will also handle this, but we update locally for UX)
      setPaymentStep('confirming');
      await updatePaymentMutation.mutateAsync({
        bookingId: booking.id,
        status: 'completed',
      });

      // Navigate to confirmation
      router.replace(`/booking/${eventId}/confirmation`);
    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentStep('ready');

      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      Alert.alert(
        'Payment Failed',
        errorMessage === 'Payment cancelled'
          ? 'You cancelled the payment. You can try again when ready.'
          : `There was an error processing your payment: ${errorMessage}. Please try again.`,
        [{ text: 'OK' }]
      );
    }
  };

  const isProcessing = paymentStep !== 'ready' || isPaymentLoading;

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$4"
        paddingBottom="$3"
        alignItems="center"
        backgroundColor="$surface"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <XStack
          width={40}
          height={40}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
          pressStyle={{ opacity: 0.7 }}
          onPress={() => !isProcessing && router.back()}
          opacity={isProcessing ? 0.5 : 1}
          testID="back-button"
        >
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </XStack>
        <Text flex={1} fontSize="$5" fontWeight="700" color="$textPrimary" textAlign="center">
          Payment
        </Text>
        <YStack width={40} />
      </XStack>

      <YStack flex={1} padding="$4" justifyContent="center" alignItems="center">
        {isProcessing ? (
          <YStack alignItems="center" gap="$4">
            <Spinner size="large" color="$primary" />
            <Text fontSize="$4" fontWeight="600" color="$textPrimary">
              {getStepMessage()}
            </Text>
            <Text fontSize="$2" color="$textSecondary" textAlign="center">
              Please wait while we process your payment.{'\n'}Do not close this screen.
            </Text>

            {/* Progress indicator */}
            <XStack gap="$2" marginTop="$4">
              <YStack
                width={8}
                height={8}
                borderRadius="$full"
                backgroundColor={paymentStep !== 'ready' ? '$primary' : '$borderColor'}
              />
              <YStack
                width={8}
                height={8}
                borderRadius="$full"
                backgroundColor={
                  paymentStep === 'processing_payment' || paymentStep === 'confirming'
                    ? '$primary'
                    : '$borderColor'
                }
              />
              <YStack
                width={8}
                height={8}
                borderRadius="$full"
                backgroundColor={paymentStep === 'confirming' ? '$primary' : '$borderColor'}
              />
            </XStack>
          </YStack>
        ) : (
          <YStack width="100%" gap="$4">
            {/* Amount Card */}
            <Card testID="payment-amount-card">
              <YStack alignItems="center" gap="$2">
                <Text fontSize="$2" color="$textSecondary">
                  Total Amount
                </Text>
                <Text fontSize="$9" fontWeight="800" color="$primary">
                  {formatPrice(pricing.totalCents)}
                </Text>
                <Text fontSize="$2" color="$textSecondary">
                  {formatPrice(pricing.perPersonCents)} per person × {pricing.payingParticipantCount} guests
                </Text>
              </YStack>
            </Card>

            {/* Payment Method */}
            <Card testID="payment-method-card">
              <YStack gap="$3">
                <Text fontSize="$4" fontWeight="700" color="$textPrimary">
                  Payment Method
                </Text>

                {/* Card Payment */}
                <XStack
                  padding="$3"
                  borderWidth={2}
                  borderColor="$primary"
                  borderRadius="$lg"
                  alignItems="center"
                  gap="$3"
                >
                  <Ionicons name="card" size={24} color="#258CF4" />
                  <YStack flex={1}>
                    <Text fontWeight="600" color="$textPrimary">
                      Credit or Debit Card
                    </Text>
                    <Text fontSize="$2" color="$textSecondary">
                      Visa, Mastercard, Amex
                    </Text>
                  </YStack>
                  <Ionicons name="checkmark-circle" size={24} color="#258CF4" />
                </XStack>

                {/* Apple Pay / Google Pay info */}
                <XStack
                  padding="$3"
                  backgroundColor="$backgroundHover"
                  borderRadius="$lg"
                  alignItems="center"
                  gap="$3"
                >
                  <XStack gap="$2">
                    <Ionicons name="logo-apple" size={20} color="#1A202C" />
                    <Ionicons name="logo-google" size={20} color="#1A202C" />
                  </XStack>
                  <Text fontSize="$2" color="$textSecondary" flex={1}>
                    Apple Pay and Google Pay also available
                  </Text>
                </XStack>
              </YStack>
            </Card>

            {/* Package Summary */}
            <Card testID="package-summary-card">
              <XStack gap="$3" alignItems="center">
                <YStack
                  width={48}
                  height={48}
                  borderRadius="$md"
                  backgroundColor="rgba(37, 140, 244, 0.1)"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="gift" size={24} color="#258CF4" />
                </YStack>
                <YStack flex={1}>
                  <Text fontWeight="600" color="$textPrimary">
                    {pkg.name}
                  </Text>
                  <Text fontSize="$2" color="$textSecondary">
                    {event.city?.name} • {event.honoree_name}'s Party
                  </Text>
                </YStack>
              </XStack>
            </Card>

            {/* Security Notice */}
            <XStack
              padding="$3"
              backgroundColor="rgba(71, 184, 129, 0.1)"
              borderRadius="$lg"
              gap="$2"
              alignItems="center"
            >
              <Ionicons name="lock-closed" size={18} color="#47B881" />
              <Text fontSize="$2" color="$textSecondary" flex={1}>
                Your payment is secured with 256-bit SSL encryption via Stripe
              </Text>
            </XStack>

            {/* Cancellation Policy */}
            <XStack
              padding="$3"
              backgroundColor="$backgroundHover"
              borderRadius="$lg"
              gap="$2"
              alignItems="flex-start"
            >
              <Ionicons name="information-circle-outline" size={18} color="#64748B" style={{ marginTop: 2 }} />
              <Text fontSize="$2" color="$textSecondary" flex={1}>
                Free cancellation up to 48 hours before the event. After that, a 50% cancellation fee applies.
              </Text>
            </XStack>
          </YStack>
        )}
      </YStack>

      {/* Footer */}
      {!isProcessing && (
        <XStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          padding="$4"
          paddingBottom={insets.bottom + 16}
          backgroundColor="$surface"
          borderTopWidth={1}
          borderTopColor="$borderColor"
        >
          <Button
            flex={1}
            onPress={handlePayment}
            testID="pay-now-button"
          >
            Pay {formatPrice(pricing.totalCents)}
          </Button>
        </XStack>
      )}
    </YStack>
  );
}
