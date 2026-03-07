/**
 * Payment Screen
 * Stripe Payment Sheet integration for package bookings
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Alert, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { usePaymentSheet } from '@/hooks/usePaymentSheet';
import { useCreateBooking, useUpdatePaymentStatus } from '@/hooks/queries/useBookings';
import { eventKeys } from '@/hooks/queries/useEvents';
import { useWizardStore } from '@/stores/wizardStore';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTranslation, getTranslation } from '@/i18n';
import { setDesiredParticipants, setBudgetInfo } from '@/lib/participantCountCache';

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
const CITY_NAMES: Record<string, string> = {
  berlin: 'Berlin', hamburg: 'Hamburg', hannover: 'Hannover',
  '550e8400-e29b-41d4-a716-446655440101': 'Berlin',
  '550e8400-e29b-41d4-a716-446655440102': 'Hamburg',
  '550e8400-e29b-41d4-a716-446655440103': 'Hannover',
};
const SERVICE_FEE_RATE = 0.10;
const MIN_SERVICE_FEE_CENTS = 5000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In E2E mode, we mock the payment
const IS_E2E = process.env.EXPO_PUBLIC_E2E_MODE === 'true';

type PaymentStep = 'ready' | 'creating_booking' | 'processing_payment' | 'confirming';

export default function PaymentScreen() {
  const { eventId, packageId, cityId: paramCityId, participants: paramParticipants, excludeHonoree: paramExcludeHonoree, payFull: paramPayFull, amountCents: paramAmountCentsStr, totalCents: paramTotalCentsStr } = useLocalSearchParams<{ eventId: string; packageId?: string; cityId?: string; participants?: string; excludeHonoree?: string; payFull?: string; amountCents?: string; totalCents?: string }>();
  const isFullPayment = paramPayFull === '1';
  // When navigating from Budget "Pay Remaining Balance", amountCents = remaining balance to pay
  const paramAmountCents = paramAmountCentsStr ? parseInt(paramAmountCentsStr, 10) : 0;
  const paramTotalCents = paramTotalCentsStr ? parseInt(paramTotalCentsStr, 10) : 0;
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('ready');
  const isDraft = eventId === 'draft';
  const { t } = useTranslation();

  // Wizard store data for draft mode
  const wizardCityId = useWizardStore((s) => s.cityId);
  const wizardParticipantCount = useWizardStore((s) => s.participantCount);
  const wizardHonoreeName = useWizardStore((s) => s.honoreeName);
  const wizardStartDate = useWizardStore((s) => s.startDate);

  // For real events, use the booking flow hook (pass URL participant count as override)
  const urlParticipantCount = paramParticipants ? parseInt(paramParticipants, 10) : undefined;
  const bookingFlow = useBookingFlow(isDraft ? undefined : eventId, packageId, urlParticipantCount);

  // Resolve package
  const draftPkg = packageId ? FALLBACK_PKG[packageId] : null;
  const pkg = isDraft ? draftPkg : (bookingFlow.package || draftPkg);

  // Exclude honoree from URL param (passed from summary screen)
  const honoreeExcluded = paramExcludeHonoree === '0' ? false : true; // default true

  // Sync URL param into bookingFlow so pricing recalculates with the correct value from summary
  useEffect(() => {
    if (!isDraft && paramExcludeHonoree !== undefined) {
      bookingFlow.setExcludeHonoree(honoreeExcluded);
    }
  }, [isDraft, honoreeExcluded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draft pricing
  const draftPricing = useMemo(() => {
    if (!draftPkg) return null;
    const totalParticipants = urlParticipantCount || wizardParticipantCount || 10;
    const honoreeCount = honoreeExcluded ? 1 : 0;
    const payingCount = Math.max(1, totalParticipants - honoreeCount);
    const perPersonPrice = draftPkg.price_per_person_cents;
    // Package Base is ALWAYS price × total participants (fixed amount)
    const packagePrice = perPersonPrice * totalParticipants;
    const serviceFee = Math.max(Math.ceil(packagePrice * SERVICE_FEE_RATE / 100) * 100, MIN_SERVICE_FEE_CENTS);
    // Round total to whole euros — perPerson × payingCount must match displayed Total Group Cost
    const totalEurosRounded = Math.round((packagePrice + serviceFee) / 100);
    const total = totalEurosRounded * 100;
    const perPerson = Math.ceil(total / payingCount);
    return { packagePriceCents: packagePrice, serviceFeeCents: serviceFee, totalCents: total, perPersonCents: perPerson, payingParticipantCount: payingCount };
  }, [draftPkg, urlParticipantCount, wizardParticipantCount, honoreeExcluded]);

  const effectiveCityId = paramCityId || wizardCityId;
  const cityFallback = effectiveCityId ? CITY_NAMES[effectiveCityId] || effectiveCityId : 'Unknown';
  const honoreeNameFallback = wizardHonoreeName || 'Guest';
  // For non-draft events, use DB event data with wizard fallbacks
  const event = isDraft
    ? { city: { name: cityFallback }, honoree_name: honoreeNameFallback }
    : (bookingFlow.event || { city: { name: cityFallback }, honoree_name: honoreeNameFallback });
  // Use bookingFlow pricing when available, fallback to local pricing for instant render
  const pricing = isDraft ? draftPricing : (bookingFlow.pricing || draftPricing);
  const excludeHonoree = isDraft ? honoreeExcluded : bookingFlow.excludeHonoree;
  // Don't show loading if we already have fallback data OR a direct amountCents param
  const isLoading = isDraft ? false : (bookingFlow.isLoading && !draftPricing && !paramAmountCents);

  // When navigating from Budget with amountCents (no package in URL), create synthetic values
  const syntheticPkg = paramAmountCents > 0 && !pkg
    ? { id: packageId || 'balance', name: 'Package', tier: 'classic', price_per_person_cents: 0 }
    : null;
  const syntheticPricing = paramAmountCents > 0 && !pricing
    ? {
        packagePriceCents: paramTotalCents || paramAmountCents,
        serviceFeeCents: 0,
        totalCents: paramTotalCents || paramAmountCents,
        perPersonCents: 0,
        payingParticipantCount: urlParticipantCount || 1,
      }
    : null;
  const activePkg = pkg || syntheticPkg;
  const activePricing = pricing || syntheticPricing;

  const createBookingMutation = useCreateBooking();
  const updatePaymentMutation = useUpdatePaymentStatus();
  const { processPayment, isLoading: isPaymentLoading, showError } = usePaymentSheet();

  if (isLoading || !activePkg || !activePricing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  const formatPrice = (cents: number) => {
    return Math.round(cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // Decimal format for per-person display — must match summary screen
  const formatPriceDecimal = (cents: number) =>
    '\u20AC' + (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
      // Demo mode: draft events, E2E tests, missing Stripe key, or fallback package (non-UUID ID)
      const isFallbackPackage = !!(activePkg?.id && !UUID_REGEX.test(activePkg.id));
      const useSimulatedPayment = isDraft || IS_E2E || !process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || isFallbackPackage;

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
          const { error: updateError } = await supabase
            .from('events')
            .update({ status: 'booked' })
            .eq('id', eventId);
          if (updateError) {
            console.warn('Event status update failed (non-blocking):', updateError.message);
          }
          // Cache desired participant count + budget info for event summary/budget screens
          // Skip when paying remaining balance — count was already stored during first payment
          const totalParticipants = activePricing.payingParticipantCount + (excludeHonoree ? 1 : 0);
          if (totalParticipants > 1 && paramAmountCents === 0) setDesiredParticipants(eventId, totalParticipants).catch(() => {});
          // paidAmountCents: when paying remaining balance, full total is now paid
          const newTotalPaid = paramAmountCents > 0
            ? (paramTotalCents || activePricing.totalCents)  // paying remaining → fully paid
            : amountDue;                                      // initial deposit or full upfront
          setBudgetInfo(eventId, {
            totalCents: paramTotalCents || activePricing.totalCents,
            perPersonCents: activePricing.perPersonCents,
            payingCount: activePricing.payingParticipantCount,
            paidAmountCents: newTotalPaid,
            // Store URL-param slug (e.g. "hamburg-classic"), not activePkg.id which may be a DB UUID
            packageId: packageId || activePkg.id,
            // Store total participants on first payment only (to prevent inflation on remaining payment)
            ...(paramAmountCents === 0 && totalParticipants > 1 ? { totalParticipants } : {}),
          }).catch(() => {});
          // Invalidate events cache so bell dot clears immediately on navigation back
          queryClient.invalidateQueries({ queryKey: eventKeys.all });
        }

        setPaymentStep('confirming');
        await new Promise(resolve => setTimeout(resolve, 600));

        // Navigate to confirmation with package info via URL params
        // Resolve city for hero image — prefer URL param, fall back to event city name
        const resolvedCityId = paramCityId || (event as any)?.city?.name?.toLowerCase();
        const confirmParams = new URLSearchParams();
        if (packageId) confirmParams.set('packageId', packageId);
        if (resolvedCityId) confirmParams.set('cityId', resolvedCityId);
        if (paramParticipants) confirmParams.set('participants', paramParticipants);
        // When paying remaining balance, pass paidNow so confirmation shows the breakdown
        if (paramAmountCents > 0) {
          confirmParams.set('paidNow', String(paramAmountCents));
        }
        // When paying remaining balance, show full cumulative total on confirmation screen
        const confirmTotal = paramAmountCents > 0
          ? (paramTotalCents || activePricing.totalCents)
          : amountDue;
        confirmParams.set('total', String(confirmTotal));
        // Only show "X of Y" when total != full total (i.e. initial deposit only)
        const fullTotalCents = paramTotalCents || activePricing.totalCents;
        if (fullTotalCents !== confirmTotal) {
          confirmParams.set('fullTotal', String(fullTotalCents));
        }
        const qs = confirmParams.toString() ? `?${confirmParams.toString()}` : '';
        router.replace(`/booking/${eventId}/confirmation${qs}`);
        return;
      }

      // Real event: create actual booking record
      setPaymentStep('creating_booking');
      const booking = await createBookingMutation.mutateAsync({
        event_id: eventId,
        package_id: activePkg.id,
        exclude_honoree: excludeHonoree,
        paying_participants: activePricing.payingParticipantCount,
        package_base_cents: activePricing.packagePriceCents,
        service_fee_cents: activePricing.serviceFeeCents,
        total_amount_cents: activePricing.totalCents,
        per_person_cents: activePricing.perPersonCents,
      });

      // Process payment with Stripe
      setPaymentStep('processing_payment');
      const { success, error } = await processPayment({
        bookingId: booking.id,
        amountCents: activePricing.totalCents,
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

      // Pass package info so confirmation shows the correct tier image
      const realConfirmParams = new URLSearchParams();
      if (packageId) realConfirmParams.set('packageId', packageId);
      if (paramCityId) realConfirmParams.set('cityId', paramCityId);
      if (paramParticipants) realConfirmParams.set('participants', paramParticipants);
      const realQs = realConfirmParams.toString() ? `?${realConfirmParams.toString()}` : '';
      router.replace(`/booking/${eventId}/confirmation${realQs}`);
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

  // Deposit (25%) vs full amount vs remaining balance from Budget screen
  const depositCents = Math.ceil(activePricing.totalCents * 0.25);
  // When paramAmountCents is provided (from Budget "Pay Remaining"), that IS the amount due
  const amountDue = paramAmountCents > 0
    ? paramAmountCents
    : (isFullPayment ? activePricing.totalCents : depositCents);

  const isProcessing = paymentStep !== 'ready' || isPaymentLoading;

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        paddingHorizontal="$4"
        paddingBottom="$2"
        alignItems="center"
        backgroundColor="$background"
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
          paddingBottom: isProcessing ? 16 : 100,
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
                  {paramAmountCents > 0 ? 'Remaining Balance' : isFullPayment ? t.booking.totalAmount : t.booking.depositLabel}
                </Text>
                <Text fontSize="$9" fontWeight="800" color="$primary">
                  {formatPrice(amountDue)}
                </Text>
                {activePricing.perPersonCents > 0 && (
                  <YStack alignItems="center" gap="$1">
                    {/* Show total reference only when header doesn't already display it */}
                    {!isFullPayment && paramAmountCents === 0 && (
                      <Text fontSize="$2" color="$textSecondary">
                        {t.booking.totalAmount}: {formatPrice(paramTotalCents || activePricing.totalCents)}
                      </Text>
                    )}
                    <Text fontSize="$2" color="$textSecondary">
                      {paramAmountCents > 0
                        ? `(${formatPrice(paramTotalCents - paramAmountCents)} = 25% Deposit Already Paid)`
                        : t.booking.perPersonGuests.replace('{{price}}', formatPriceDecimal(activePricing.perPersonCents)).replace('{{count}}', String(activePricing.payingParticipantCount))}
                    </Text>
                  </YStack>
                )}
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

                {/* Apple Pay — Coming Soon */}
                <XStack
                  padding="$3"
                  backgroundColor="$backgroundHover"
                  borderRadius="$lg"
                  alignItems="center"
                  gap="$3"
                  opacity={0.45}
                >
                  <Ionicons name="logo-apple" size={22} color="white" />
                  <YStack flex={1}>
                    <Text fontSize="$3" fontWeight="600" color="$textPrimary">Apple Pay</Text>
                    <Text fontSize="$1" color="$textSecondary">Coming Soon</Text>
                  </YStack>
                </XStack>

                {/* Google Pay — Coming Soon */}
                <XStack
                  padding="$3"
                  backgroundColor="$backgroundHover"
                  borderRadius="$lg"
                  alignItems="center"
                  gap="$3"
                  opacity={0.45}
                >
                  <Ionicons name="logo-google" size={22} color="white" />
                  <YStack flex={1}>
                    <Text fontSize="$3" fontWeight="600" color="$textPrimary">Google Pay</Text>
                    <Text fontSize="$1" color="$textSecondary">Coming Soon</Text>
                  </YStack>
                </XStack>

                {/* PayPal — Coming Soon */}
                <XStack
                  padding="$3"
                  backgroundColor="$backgroundHover"
                  borderRadius="$lg"
                  alignItems="center"
                  gap="$3"
                  opacity={0.45}
                >
                  <Ionicons name="logo-paypal" size={22} color="#009CDE" />
                  <YStack flex={1}>
                    <Text fontSize="$3" fontWeight="600" color="$textPrimary">PayPal</Text>
                    <Text fontSize="$1" color="$textSecondary">Coming Soon</Text>
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
                    {(() => {
                      const tierLabels: Record<string, string> = { essential: 'S', classic: 'M', grand: 'L' };
                      const tierNames: Record<string, string> = { essential: 'Essential', classic: 'Classic', grand: 'Grand' };
                      return activePkg.tier ? `${tierNames[activePkg.tier] || activePkg.tier} (${tierLabels[activePkg.tier] || ''})` : activePkg.name;
                    })()}
                  </Text>
                  <Text fontSize="$2" color="$textSecondary">
                    {[
                      event.city?.name,
                      (() => {
                        const dateStr = (event as any).start_date || wizardStartDate;
                        if (!dateStr) return null;
                        const d = new Date(dateStr);
                        return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      })(),
                      `${urlParticipantCount || wizardParticipantCount || activePricing.payingParticipantCount || ''} Guests`,
                    ].filter(Boolean).join(' \u2022 ')}
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
          paddingBottom={insets.bottom + 8}
          backgroundColor="$surface"
          borderTopWidth={1}
          borderTopColor="$borderColor"
        >
          <Button
            flex={1}
            onPress={handlePayment}
            testID="pay-now-button"
          >
            {paramAmountCents > 0
              ? t.booking.payDepositButtonLabel.replace('{{amount}}', formatPrice(amountDue))
              : isFullPayment
                ? ((t.booking as any).payFullButtonLabel?.replace('{{amount}}', formatPrice(amountDue)) || t.booking.payDepositButtonLabel.replace('{{amount}}', formatPrice(amountDue)))
                : t.booking.payDepositButtonLabel.replace('{{amount}}', formatPrice(depositCents))}
          </Button>
        </XStack>
      )}
    </YStack>
  );
}
