/**
 * Booking Summary Screen (Mockup 8.1)
 * Payment summary matching the design specification
 * Supports both real events and draft mode (when event creation is skipped)
 */

import React, { useState, useMemo } from 'react';
import { Alert, ScrollView, Image, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner, Switch } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { useWizardStore } from '@/stores/wizardStore';
import { Button } from '@/components/ui/Button';
import { getPackageImage, resolveImageSource } from '@/constants/packageImages';
import { useTranslation } from '@/i18n';

const TIER_LABELS: Record<string, string> = {
  essential: 'Essential (S)',
  classic: 'Classic (M)',
  grand: 'Grand (L)',
};

const styles = StyleSheet.create({
  payOption: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(230,220,200,0.15)',
    backgroundColor: '#0D1B2A',
    marginBottom: 8,
  },
  payOptionLast: {
    marginBottom: 0,
  },
  payOptionActive: {
    borderColor: 'rgba(249,115,22,0.45)',
    backgroundColor: 'rgba(249,115,22,0.08)',
  },
  payOptionActiveFull: {
    borderColor: 'rgba(249,115,22,0.45)',
    backgroundColor: 'rgba(249,115,22,0.08)',
  },
});

// Fallback package data for draft mode
const FALLBACK_PKG: Record<string, { id: string; name: string; tier: string; price_per_person_cents: number; hero_image_url: any }> = {
  'berlin-classic': { id: 'berlin-classic', name: 'Berlin Classic', tier: 'classic', price_per_person_cents: 149_00, hero_image_url: getPackageImage('berlin', 'classic') },
  'berlin-essential': { id: 'berlin-essential', name: 'Berlin Essential', tier: 'essential', price_per_person_cents: 99_00, hero_image_url: getPackageImage('berlin', 'essential') },
  'berlin-grand': { id: 'berlin-grand', name: 'Berlin Grand', tier: 'grand', price_per_person_cents: 199_00, hero_image_url: getPackageImage('berlin', 'grand') },
  'hamburg-classic': { id: 'hamburg-classic', name: 'Hamburg Classic', tier: 'classic', price_per_person_cents: 149_00, hero_image_url: getPackageImage('hamburg', 'classic') },
  'hamburg-essential': { id: 'hamburg-essential', name: 'Hamburg Essential', tier: 'essential', price_per_person_cents: 99_00, hero_image_url: getPackageImage('hamburg', 'essential') },
  'hamburg-grand': { id: 'hamburg-grand', name: 'Hamburg Grand', tier: 'grand', price_per_person_cents: 199_00, hero_image_url: getPackageImage('hamburg', 'grand') },
  'hannover-classic': { id: 'hannover-classic', name: 'Hannover Classic', tier: 'classic', price_per_person_cents: 149_00, hero_image_url: getPackageImage('hannover', 'classic') },
  'hannover-essential': { id: 'hannover-essential', name: 'Hannover Essential', tier: 'essential', price_per_person_cents: 99_00, hero_image_url: getPackageImage('hannover', 'essential') },
  'hannover-grand': { id: 'hannover-grand', name: 'Hannover Grand', tier: 'grand', price_per_person_cents: 199_00, hero_image_url: getPackageImage('hannover', 'grand') },
};

const CITY_NAMES: Record<string, string> = {
  berlin: 'Berlin',
  hamburg: 'Hamburg',
  hannover: 'Hannover',
  // UUID keys for wizard-generated city IDs
  '550e8400-e29b-41d4-a716-446655440101': 'Berlin',
  '550e8400-e29b-41d4-a716-446655440102': 'Hamburg',
  '550e8400-e29b-41d4-a716-446655440103': 'Hannover',
};

const SERVICE_FEE_RATE = 0.10;
const MIN_SERVICE_FEE_CENTS = 5000;

export default function BookingSummaryScreen() {
  const { eventId, packageId, cityId: paramCityId, participants: paramParticipants } = useLocalSearchParams<{ eventId: string; packageId?: string; cityId?: string; participants?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDraft = eventId === 'draft';
  const { t } = useTranslation();

  // For real events, use the booking flow hook (pass URL participant count as override)
  const urlParticipantCount = paramParticipants ? parseInt(paramParticipants, 10) : undefined;
  const bookingFlow = useBookingFlow(isDraft ? undefined : eventId, packageId, urlParticipantCount);

  // For draft mode, get data from wizard store
  const wizardCityId = useWizardStore((s) => s.cityId);
  const wizardParticipantCount = useWizardStore((s) => s.participantCount);
  const wizardStartDate = useWizardStore((s) => s.startDate);

  // Resolve package data
  const draftPkg = packageId ? FALLBACK_PKG[packageId] : null;
  const pkg = isDraft ? draftPkg : (bookingFlow.package || draftPkg);

  // Payment option: 'deposit' = pay 25% now, 'full' = pay entire amount now
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full'>('deposit');

  // Local exclude honoree state
  const [draftExcludeHonoree, setDraftExcludeHonoree] = useState(true);
  const excludeHonoree = isDraft ? draftExcludeHonoree : bookingFlow.excludeHonoree;
  const setExcludeHonoree = isDraft ? setDraftExcludeHonoree : bookingFlow.setExcludeHonoree;

  // Calculate pricing for draft mode
  const draftPricing = useMemo(() => {
    if (!draftPkg) return null;
    const totalParticipants = urlParticipantCount || wizardParticipantCount || 10;
    const honoreeCount = draftExcludeHonoree ? 1 : 0;
    const payingCount = Math.max(1, totalParticipants - honoreeCount);
    const perPersonPrice = draftPkg.price_per_person_cents;
    // Package Base is ALWAYS price × total participants (fixed amount)
    const packagePrice = perPersonPrice * totalParticipants;
    const serviceFee = Math.max(Math.ceil(packagePrice * SERVICE_FEE_RATE / 100) * 100, MIN_SERVICE_FEE_CENTS);
    // Round total to whole euros so perPerson × payingCount matches displayed Total Group Cost
    const totalEurosRounded = Math.round((packagePrice + serviceFee) / 100);
    const total = totalEurosRounded * 100;
    // Per-person derived from rounded total so the math adds up on screen
    const perPerson = Math.ceil(total / payingCount);
    return {
      packagePriceCents: packagePrice,
      serviceFeeCents: serviceFee,
      totalCents: total,
      perPersonCents: perPerson,
      payingParticipantCount: payingCount,
    };
  }, [draftPkg, urlParticipantCount, wizardParticipantCount, draftExcludeHonoree]);

  // Use bookingFlow pricing when available, fallback to local pricing for instant render
  const pricing = isDraft ? draftPricing : (bookingFlow.pricing || draftPricing);
  // Don't show loading if we already have fallback data to render
  const isLoading = isDraft ? false : (bookingFlow.isLoading && !draftPricing);

  // For draft mode, we don't need event data — just package + pricing
  if (isLoading || !pkg || !pricing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="#0D1B2A">
        <Spinner size="large" color="#C6A75E" />
      </YStack>
    );
  }

  const formatPrice = (cents: number) => {
    return '\u20AC' + (cents / 100).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Whole-euro format (no decimals) — same rounding logic as budget page:
  // deposit = Math.round (standard), remaining = total - deposit so they always sum correctly
  const formatPriceWhole = (euros: number) =>
    '\u20AC' + euros.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const handleProceedToPayment = () => {
    const params = new URLSearchParams();
    if (packageId) params.set('packageId', packageId);
    if (paramCityId) params.set('cityId', paramCityId);
    if (paramParticipants) params.set('participants', paramParticipants);
    params.set('excludeHonoree', excludeHonoree ? '1' : '0');
    if (paymentOption === 'full') params.set('payFull', '1');
    const qs = params.toString() ? `?${params.toString()}` : '';
    router.push(`/booking/${eventId}/payment${qs}`);
  };

  const tierLabel = TIER_LABELS[pkg.tier] || pkg.name;
  const heroImage = pkg.hero_image_url || null;

  // City name: event data > URL params > wizard store
  const effectiveCityId = paramCityId || wizardCityId;
  const cityFallback = effectiveCityId ? CITY_NAMES[effectiveCityId] || effectiveCityId : 'Unknown';
  const cityName = isDraft
    ? cityFallback
    : (bookingFlow.event?.city?.name || cityFallback);

  // Event date: event data > wizard store
  const eventDateStr = (() => {
    const raw = isDraft ? wizardStartDate : ((bookingFlow.event as any)?.start_date || wizardStartDate);
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  })();

  // Guest count: URL params always take precedence (wizard passes intended group size)
  const guestCount = urlParticipantCount || wizardParticipantCount || pricing.payingParticipantCount;

  const honoreePaysCents = excludeHonoree ? 0 : pricing.perPersonCents;

  // Deposit calculation — whole euros, no decimals
  // Standard rounding: < 0.5 rounds down, ≥ 0.5 rounds up (JS Math.round)
  // Remaining is derived (total - deposit) so the two always sum exactly to the total
  const totalEuros = Math.round(pricing.totalCents / 100);
  const depositEuros = Math.round((pricing.totalCents * 0.25) / 100);
  const remainingEuros = totalEuros - depositEuros;
  // Keep cent values for payment flow (payment.tsx recalculates independently)
  const depositCents = depositEuros * 100;

  return (
    <YStack flex={1} backgroundColor={'#0D1B2A'}>
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        paddingHorizontal="$4"
        paddingBottom="$2"
        alignItems="center"
        backgroundColor={'#0D1B2A'}
      >
        <XStack
          width={40}
          height={40}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
          pressStyle={{ opacity: 0.7 }}
          onPress={() => router.back()}
          testID="back-button"
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </XStack>
        <Text flex={1} fontSize={18} fontWeight="700" color="white" textAlign="center" fontFamily="Inter_600SemiBold">
          {t.booking.paymentSummary}
        </Text>
        <YStack width={40} />
      </XStack>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Selected Package Card */}
        <YStack
          backgroundColor={'#1A2F47'}
          borderRadius={16}
          padding="$4"
          marginBottom="$5"
          borderWidth={1}
          borderColor={'rgba(230,220,200,0.15)'}
          testID="package-summary-card"
        >
          <XStack gap="$3" alignItems="center">
            <YStack flex={1}>
              <Text fontSize={11} fontWeight="700" color={'#C6A75E'} textTransform="uppercase" letterSpacing={1} marginBottom={4}>
                {t.booking.selectedPackageLabel}
              </Text>
              <Text fontSize={20} fontWeight="800" color="white">
                {tierLabel}
              </Text>
              <Text fontSize={13} color={'rgba(255,255,255,0.72)'} marginTop={4}>
                {[cityName, eventDateStr, t.booking.guests.replace('{{count}}', String(guestCount))].filter(Boolean).join(' \u2022 ')}
              </Text>
            </YStack>
            {heroImage && (
              <Image
                source={resolveImageSource(heroImage)}
                style={{ width: 80, height: 80, borderRadius: 12 }}
                resizeMode="cover"
              />
            )}
          </XStack>
        </YStack>

        {/* Cost Breakdown */}
        <Text fontSize={11} fontWeight="700" color={'rgba(255,255,255,0.72)'} textTransform="uppercase" letterSpacing={1} marginBottom="$2" marginLeft="$1">
          Cost Breakdown
        </Text>
        <YStack
          backgroundColor={'#1A2F47'}
          borderRadius={16}
          padding="$4"
          marginBottom="$5"
          borderWidth={1}
          borderColor={'rgba(230,220,200,0.15)'}
          testID="cost-breakdown-card"
        >
          <XStack justifyContent="space-between" marginBottom="$3">
            <Text fontSize={14} color={'rgba(255,255,255,0.72)'}>Package Base</Text>
            <Text fontSize={14} fontWeight="600" color="white">
              {formatPriceWhole(Math.round(pricing.packagePriceCents / 100))}
            </Text>
          </XStack>

          <XStack justifyContent="space-between" marginBottom="$3">
            <XStack gap="$1" alignItems="center">
              <Text fontSize={14} color={'rgba(255,255,255,0.72)'}>{t.booking.serviceFee}</Text>
              <Pressable
                onPress={() => Alert.alert(t.booking.serviceFee, '10% of the package base price, minimum €50.')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="information-circle-outline" size={14} color={'rgba(255,255,255,0.48)'} />
              </Pressable>
            </XStack>
            <Text fontSize={14} fontWeight="600" color="white">
              {formatPriceWhole(Math.round(pricing.serviceFeeCents / 100))}
            </Text>
          </XStack>

          <YStack height={1} backgroundColor={'rgba(230,220,200,0.15)'} marginVertical="$2" />

          <XStack justifyContent="space-between">
            <Text fontSize={15} fontWeight="600" color="white">{t.booking.totalGroupCost}</Text>
            <Text fontSize={16} fontWeight="800" color={'#C6A75E'}>
              {formatPriceWhole(totalEuros)}
            </Text>
          </XStack>

          <YStack height={1} backgroundColor={'rgba(230,220,200,0.15)'} marginVertical="$3" />

          {/* Payment Option Selector */}
          <Text fontSize={11} fontWeight="700" color="white" textTransform="uppercase" letterSpacing={0.8} marginBottom="$3">
            {(t.booking as any).payOptionTitle}
          </Text>

          {/* Option A: Deposit only */}
          <Pressable
            style={[styles.payOption, paymentOption === 'deposit' && styles.payOptionActive]}
            onPress={() => setPaymentOption('deposit')}
          >
            <XStack alignItems="flex-start" gap={12}>
              <YStack
                width={20} height={20} borderRadius={10} marginTop={3}
                borderWidth={2}
                borderColor={paymentOption === 'deposit' ? '#F97316' : 'rgba(230,220,200,0.15)'}
                backgroundColor={paymentOption === 'deposit' ? '#F97316' : 'transparent'}
                alignItems="center" justifyContent="center"
              >
                {paymentOption === 'deposit' && (
                  <YStack width={8} height={8} borderRadius={4} backgroundColor="white" />
                )}
              </YStack>
              <YStack flex={1} gap={4}>
                {/* Title row: label left, amount right */}
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={15} fontWeight="700" color={paymentOption === 'deposit' ? '#F97316' : '#FFFFFF'}>
                    {(t.booking as any).payOptionDeposit}
                  </Text>
                  <Text fontSize={15} fontWeight="700" color={paymentOption === 'deposit' ? '#F97316' : '#FFFFFF'}>
                    {formatPriceWhole(depositEuros)}
                  </Text>
                </XStack>
                {/* Secondary: remaining due date */}
                <Text fontSize={12} color={'rgba(255,255,255,0.48)'}>
                  {formatPriceWhole(remainingEuros)} due 14 days before event
                </Text>
              </YStack>
            </XStack>
          </Pressable>

          {/* Option B: Pay in full */}
          <Pressable
            style={[styles.payOption, styles.payOptionLast, paymentOption === 'full' && styles.payOptionActiveFull]}
            onPress={() => setPaymentOption('full')}
          >
            <XStack alignItems="flex-start" gap={12}>
              <YStack
                width={20} height={20} borderRadius={10} marginTop={3}
                borderWidth={2}
                borderColor={paymentOption === 'full' ? '#F97316' : 'rgba(230,220,200,0.15)'}
                backgroundColor={paymentOption === 'full' ? '#F97316' : 'transparent'}
                alignItems="center" justifyContent="center"
              >
                {paymentOption === 'full' && (
                  <YStack width={8} height={8} borderRadius={4} backgroundColor="white" />
                )}
              </YStack>
              <YStack flex={1} gap={4}>
                {/* Title row: label left, amount right */}
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={15} fontWeight="700" color={paymentOption === 'full' ? '#F97316' : '#FFFFFF'}>
                    {(t.booking as any).payOptionFull}
                  </Text>
                  <Text fontSize={15} fontWeight="700" color={paymentOption === 'full' ? '#F97316' : '#FFFFFF'}>
                    {formatPriceWhole(totalEuros)}
                  </Text>
                </XStack>
                {/* Secondary: one combined sentence */}
                <Text fontSize={12} color={'rgba(255,255,255,0.48)'}>
                  No further payments and reminders
                </Text>
              </YStack>
            </XStack>
          </Pressable>
        </YStack>

        {/* Exclude Honoree */}
        <YStack
          backgroundColor={'#1A2F47'}
          borderRadius={16}
          padding="$4"
          marginBottom="$5"
          borderWidth={1}
          borderColor={'rgba(230,220,200,0.15)'}
          testID="exclude-honoree-card"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <YStack flex={1}>
              <Text fontSize={15} fontWeight="600" color="white">
                {t.booking.excludeHonoreeLabel}
              </Text>
              <Text fontSize={13} color={'rgba(255,255,255,0.72)'}>
                {t.booking.honoreePays.replace('{{amount}}', formatPrice(honoreePaysCents))}
              </Text>
            </YStack>
            <Switch
              checked={excludeHonoree}
              onCheckedChange={setExcludeHonoree}
              backgroundColor={excludeHonoree ? '#C6A75E' : 'rgba(230,220,200,0.15)'}
              testID="exclude-honoree-toggle"
            >
              <Switch.Thumb animation="quick" backgroundColor="white" />
            </Switch>
          </XStack>
        </YStack>

        {/* Cost Per Person Highlight */}
        <YStack
          backgroundColor={'#1A2F47'}
          borderRadius={16}
          padding="$4"
          marginBottom="$5"
          borderWidth={1}
          borderColor={'rgba(230,220,200,0.15)'}
          testID="per-person-card"
        >
          <YStack>
            <Text fontSize={11} fontWeight="700" color="white" textTransform="uppercase" letterSpacing={1}>
              {t.booking.costPerPersonLabel.replace('{{count}}', String(pricing.payingParticipantCount))}
            </Text>
            <XStack alignItems="baseline" gap="$2" marginTop="$2">
              <Text fontSize={36} fontWeight="800" color={'#C6A75E'}>
                {formatPrice(pricing.perPersonCents)}
              </Text>
              <Text fontSize={14} color={'rgba(255,255,255,0.72)'}>{t.booking.slashPerson}</Text>
            </XStack>
            <XStack alignItems="center" gap="$1" marginTop="$1">
              <Ionicons name="checkmark-circle" size={14} color="rgba(255,255,255,0.55)" />
              <Text fontSize={12} fontWeight="600" color="rgba(255,255,255,0.72)">
                {t.booking.includesTaxes}
              </Text>
            </XStack>
          </YStack>
        </YStack>

        {/* Stripe Security */}
        <XStack
          padding="$3"
          backgroundColor={'#1A2F47'}
          borderRadius={12}
          gap="$2"
          alignItems="center"
          justifyContent="center"
          marginBottom="$4"
          borderWidth={1}
          borderColor={'rgba(230,220,200,0.15)'}
        >
          <Ionicons name="lock-closed" size={16} color={'rgba(255,255,255,0.72)'} />
          <Text fontSize={13} color="white">
            {t.booking.securePaymentStripe}
          </Text>
        </XStack>

        {/* Cancellation Policy */}
        <Text fontSize={12} color={'rgba(255,255,255,0.48)'} textAlign="center" lineHeight={18} paddingHorizontal="$2">
          {t.booking.cancellationSummary.replace('{{deposit}}', formatPriceWhole(depositEuros))}
        </Text>
      </ScrollView>

      {/* Footer */}
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        padding="$4"
        paddingBottom={insets.bottom + 8}
        backgroundColor="#12253A"
        borderTopWidth={1}
        borderTopColor={'rgba(230,220,200,0.15)'}
      >
        <Button
          flex={1}
          onPress={handleProceedToPayment}
          testID="proceed-to-payment-button"
        >
          <XStack alignItems="center" gap="$2">
            <Text fontSize={16} fontWeight="700" color="#0D1B2A">
              {paymentOption === 'full'
                ? (t.booking as any).payFullButtonLabel.replace('{{amount}}', formatPriceWhole(totalEuros))
                : t.booking.proceedToPaymentDeposit.replace('{{deposit}}', formatPriceWhole(depositEuros))}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#0D1B2A" />
          </XStack>
        </Button>
      </XStack>
    </YStack>
  );
}
