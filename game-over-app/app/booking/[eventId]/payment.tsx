/**
 * Payment Screen
 * Stripe Payment Sheet integration for package bookings
 */

import React, { useState, useMemo } from 'react';
import { Alert, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { usePaymentSheet } from '@/hooks/usePaymentSheet';
import { useCreateBooking, useUpdatePaymentStatus } from '@/hooks/queries/useBookings';
import { useWizardStore } from '@/stores/wizardStore';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTranslation, getTranslation } from '@/i18n';

// Fallback packages for draft mode
const FALLBACK_PKG: Record<string, { id: string; name: string; tier: string; price_per_person_cents: number }> = {
  'berlin-classic': { id: 'berlin-classic', name: 'Berlin Classic', tier: 'classic', price_per_person_cents: 149_00 },
  'berlin-essential': { id: 'berlin-essential', name: 'Berlin Essential', tier: 'essential', price_per_person_cents: 99_00 },
  'berlin-grand': { id: 'berlin-grand', name: 'Berlin Grand', tier: 'grand', price_per_person_cents: 199_00 },
  'hamburg-classic': { id: 'hamburg-classic', name: 'Hamburg Classic', tier: 'classic', price_per_person_cents: 149_00 },
  'hamburg-essential': { id: 'hamburg-essential', name: 'Hamburg Essential', tier: 'essential', price_per_person_cents: 99_00 },
  'hamburg-grand': { id: 'hamburg-grand', name: 'Hamburg Grand', tier: 'grand', price_per_person_cents: 199_00 },
  'hannover-classic': { id: 'hannover-classic', name: 'Hannover Classic', tier: 'classic', price_per_person_cents: 149_00 },
  'hannover-essential': { id: 'hannover-essential', name: 'Hannover Essential', tier: 'essential', price_per_person_cents: 99_00 },
  'hannover-grand': { id: 'hannover-grand', name: 'Hannover Grand', tier: 'grand', price_per_person_cents: 199_00 },
};
const CITY_NAMES: Record<string, string> = { berlin: 'Berlin', hamburg: 'Hamburg', hannover: 'Hannover' };
const SERVICE_FEE_RATE = 0.10;
const MIN_SERVICE_FEE_CENTS = 5000;

// In E2E mode, we mock the payment
const IS_E2E = process.env.EXPO_PUBLIC_E2E_MODE === 'true';

type PaymentStep = 'ready' | 'creating_booking' | 'processing_payment' | 'confirming';

export default function PaymentScreen() {
  const { eventId, packageId, cityId: paramCityId, participants: paramParticipants } = useLocalSearchParams<{ eventId: string; packageId?: string; cityId?: string; participants?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('ready');
  const isDraft = eventId === 'draft';
  const { t } = useTranslation();

  // For real events, use the booking flow hook
  const bookingFlow = useBookingFlow(isDraft ? undefined : eventId, packageId);

  // Wizard store data for draft mode
  const wizardCityId = useWizardStore((s) => s.cityId);
  const wizardParticipantCount = useWizardStore((s) => s.participantCount);
  const wizardHonoreeName = useWizardStore((s) => s.honoreeName);

  // Resolve package
  const draftPkg = packageId ? FALLBACK_PKG[packageId] : null;
  const pkg = isDraft ? draftPkg : (bookingFlow.package || draftPkg);

  // Draft pricing
  const urlParticipantCount = paramParticipants ? parseInt(paramParticipants, 10) : null;
  const draftPricing = useMemo(() => {
    if (!draftPkg) return null;
    const totalParticipants = urlParticipantCount || wizardParticipantCount || 10;
    const payingCount = Math.max(1, totalParticipants - 1);
    const perPersonPrice = draftPkg.price_per_person_cents;
    // Package Base is ALWAYS price × total participants (fixed amount)
    const packagePrice = perPersonPrice * totalParticipants;
    const serviceFee = Math.max(Math.round(packagePrice * SERVICE_FEE_RATE), MIN_SERVICE_FEE_CENTS);
    const total = packagePrice + serviceFee;
    // Only per-person cost changes based on exclude honoree toggle
    const perPerson = Math.ceil(total / payingCount);
    return { packagePriceCents: packagePrice, serviceFeeCents: serviceFee, totalCents: total, perPersonCents: perPerson, payingParticipantCount: payingCount };
  }, [draftPkg, urlParticipantCount, wizardParticipantCount]);

  const effectiveCityId = paramCityId || wizardCityId;
  const event = isDraft ? { city: { name: effectiveCityId ? CITY_NAMES[effectiveCityId] || effectiveCityId : 'Unknown' }, honoree_name: wizardHonoreeName || 'Guest' } : bookingFlow.event;
  const pricing = isDraft ? draftPricing : bookingFlow.pricing;
  const excludeHonoree = isDraft ? true : bookingFlow.excludeHonoree;
  const isLoading = isDraft ? false : bookingFlow.isLoading;

  const createBookingMutation = useCreateBooking();
  const updatePaymentMutation = useUpdatePaymentStatus();
  const { processPayment, isLoading: isPaymentLoading, showError } = usePaymentSheet();

  if (isLoading || !pkg || !pricing) {
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
        return t.booking.creatingBooking;
      case 'processing_payment':
        return t.booking.processingPayment;
      case 'confirming':
        return t.booking.confirmingBooking;
      default:
        return t.booking.preparing;
    }
  };

  const handlePayment = async () => {
    if (!eventId) return;

    try {
      // Demo mode: draft events, E2E tests, or missing Stripe key
      const useSimulatedPayment = isDraft || IS_E2E || !process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      if (useSimulatedPayment) {
        const tr = getTranslation();
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Demo Mode',
            'In production, Stripe\'s payment sheet would open here for card details. Continue with simulated payment?',
            [
              { text: tr.wizard.cancel, style: 'cancel', onPress: () => resolve(false) },
              { text: 'Continue', onPress: () => resolve(true) },
            ]
          );
        });
        if (!confirmed) return;

        setPaymentStep('creating_booking');
        await new Promise(resolve => setTimeout(resolve, 800));

        setPaymentStep('processing_payment');
        await new Promise(resolve => setTimeout(resolve, 1200));

        // If we have a real event in DB, update its status to 'booked'
        if (!isDraft) {
          await supabase
            .from('events')
            .update({ status: 'booked' })
            .eq('id', eventId);
        }

        setPaymentStep('confirming');
        await new Promise(resolve => setTimeout(resolve, 600));

        // Navigate to confirmation with package info via URL params
        const confirmParams = new URLSearchParams();
        if (packageId) confirmParams.set('packageId', packageId);
        if (paramCityId) confirmParams.set('cityId', paramCityId);
        if (paramParticipants) confirmParams.set('participants', paramParticipants);
        confirmParams.set('total', String(pricing.totalCents));
        const qs = confirmParams.toString() ? `?${confirmParams.toString()}` : '';
        router.replace(`/booking/${eventId}/confirmation${qs}`);
        return;
      }

      // Real event: create actual booking record
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

      // Process payment with Stripe
      setPaymentStep('processing_payment');
      const { success, error } = await processPayment({
        bookingId: booking.id,
        amountCents: pricing.totalCents,
        currency: 'eur',
      });

      if (!success) {
        if (error === 'Payment cancelled') {
          setPaymentStep('ready');
          return;
        }
        throw new Error(error || 'Payment failed');
      }

      // Confirm booking
      setPaymentStep('confirming');
      await updatePaymentMutation.mutateAsync({
        bookingId: booking.id,
        status: 'completed',
      });

      router.replace(`/booking/${eventId}/confirmation`);
    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentStep('ready');

      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      const tr = getTranslation();
      Alert.alert(
        tr.booking.paymentFailed,
        errorMessage === 'Payment cancelled'
          ? tr.booking.paymentCancelled
          : tr.booking.paymentErrorDetail.replace('{{error}}', errorMessage),
        [{ text: tr.common.ok }]
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
          <Ionicons name="arrow-back" size={24} color="white" />
        </XStack>
        <Text flex={1} fontSize="$5" fontWeight="700" color="$textPrimary" textAlign="center">
          {t.booking.paymentTitle}
        </Text>
        <YStack width={40} />
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: isProcessing ? 16 : 120,
          ...(isProcessing ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : {}),
        }}
        showsVerticalScrollIndicator={false}
      >
        {isProcessing ? (
          <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
            <Spinner size="large" color="$primary" />
            <Text fontSize="$4" fontWeight="600" color="$textPrimary">
              {getStepMessage()}
            </Text>
            <Text fontSize="$2" color="$textSecondary" textAlign="center">
              {t.booking.pleaseWait}{'\n'}{t.booking.doNotClose}
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
                  {t.booking.totalAmount}
                </Text>
                <Text fontSize="$9" fontWeight="800" color="$primary">
                  {formatPrice(pricing.totalCents)}
                </Text>
                <Text fontSize="$2" color="$textSecondary">
                  {t.booking.perPersonGuests.replace('{{price}}', formatPrice(pricing.perPersonCents)).replace('{{count}}', String(pricing.payingParticipantCount))}
                </Text>
              </YStack>
            </Card>

            {/* Payment Method */}
            <Card testID="payment-method-card">
              <YStack gap="$3">
                <Text fontSize="$4" fontWeight="700" color="$textPrimary">
                  {t.booking.paymentMethod}
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
                      {t.booking.creditOrDebit}
                    </Text>
                    <Text fontSize="$2" color="$textSecondary">
                      {t.booking.visaMastercard}
                    </Text>
                  </YStack>
                  <Ionicons name="checkmark-circle" size={24} color="#258CF4" />
                </XStack>

                {/* Platform-specific Pay — Coming Soon */}
                <XStack
                  padding="$3"
                  backgroundColor="$backgroundHover"
                  borderRadius="$lg"
                  alignItems="center"
                  gap="$3"
                  opacity={0.5}
                >
                  <Ionicons
                    name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google'}
                    size={22}
                    color="white"
                  />
                  <YStack flex={1}>
                    <Text fontSize="$3" fontWeight="600" color="$textPrimary">
                      {Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay'}
                    </Text>
                    <Text fontSize="$1" color="$textSecondary">
                      Coming Soon
                    </Text>
                  </YStack>
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
                {t.booking.secureEncryption}
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
                {t.booking.cancellationPayment}
              </Text>
            </XStack>
          </YStack>
        )}
      </ScrollView>

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
            {t.booking.payButtonLabel.replace('{{amount}}', formatPrice(pricing.totalCents))}
          </Button>
        </XStack>
      )}
    </YStack>
  );
}
