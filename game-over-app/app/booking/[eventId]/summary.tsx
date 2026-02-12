/**
 * Booking Summary Screen (Mockup 8.1)
 * Payment summary matching the design specification
 * Supports both real events and draft mode (when event creation is skipped)
 */

import React, { useState, useMemo } from 'react';
import { ScrollView, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner, Switch } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { useWizardStore } from '@/stores/wizardStore';
import { Button } from '@/components/ui/Button';
import { DARK_THEME } from '@/constants/theme';
import { useTranslation } from '@/i18n';

const TIER_LABELS: Record<string, string> = {
  essential: 'Essential (S)',
  classic: 'Classic (M)',
  grand: 'Grand (L)',
};

// Fallback package data for draft mode
const FALLBACK_PKG: Record<string, { id: string; name: string; tier: string; price_per_person_cents: number; hero_image_url: string }> = {
  'berlin-classic': { id: 'berlin-classic', name: 'Berlin Classic', tier: 'classic', price_per_person_cents: 149_00, hero_image_url: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400' },
  'berlin-essential': { id: 'berlin-essential', name: 'Berlin Essential', tier: 'essential', price_per_person_cents: 99_00, hero_image_url: 'https://images.unsplash.com/photo-1587330979470-3595ac045ab0?w=400' },
  'berlin-grand': { id: 'berlin-grand', name: 'Berlin Grand', tier: 'grand', price_per_person_cents: 199_00, hero_image_url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400' },
  'hamburg-classic': { id: 'hamburg-classic', name: 'Hamburg Classic', tier: 'classic', price_per_person_cents: 149_00, hero_image_url: 'https://images.unsplash.com/photo-1567359781514-3b964e2b04d6?w=400' },
  'hamburg-essential': { id: 'hamburg-essential', name: 'Hamburg Essential', tier: 'essential', price_per_person_cents: 99_00, hero_image_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400' },
  'hamburg-grand': { id: 'hamburg-grand', name: 'Hamburg Grand', tier: 'grand', price_per_person_cents: 199_00, hero_image_url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400' },
  'hannover-classic': { id: 'hannover-classic', name: 'Hannover Classic', tier: 'classic', price_per_person_cents: 149_00, hero_image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400' },
  'hannover-essential': { id: 'hannover-essential', name: 'Hannover Essential', tier: 'essential', price_per_person_cents: 99_00, hero_image_url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=400' },
  'hannover-grand': { id: 'hannover-grand', name: 'Hannover Grand', tier: 'grand', price_per_person_cents: 199_00, hero_image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400' },
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

  // Resolve package data
  const draftPkg = packageId ? FALLBACK_PKG[packageId] : null;
  const pkg = isDraft ? draftPkg : (bookingFlow.package || draftPkg);

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
    const serviceFee = Math.max(Math.round(packagePrice * SERVICE_FEE_RATE), MIN_SERVICE_FEE_CENTS);
    const total = packagePrice + serviceFee;
    // Only per-person cost changes based on exclude honoree toggle
    const perPerson = Math.ceil(total / payingCount);
    return {
      packagePriceCents: packagePrice,
      serviceFeeCents: serviceFee,
      totalCents: total,
      perPersonCents: perPerson,
      payingParticipantCount: payingCount,
    };
  }, [draftPkg, urlParticipantCount, wizardParticipantCount, draftExcludeHonoree]);

  const pricing = isDraft ? draftPricing : bookingFlow.pricing;
  const isLoading = isDraft ? false : bookingFlow.isLoading;

  // For draft mode, we don't need event data — just package + pricing
  if (isLoading || !pkg || !pricing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  const formatPrice = (cents: number) => {
    return '\u20AC' + (cents / 100).toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleProceedToPayment = () => {
    const params = new URLSearchParams();
    if (packageId) params.set('packageId', packageId);
    if (paramCityId) params.set('cityId', paramCityId);
    if (paramParticipants) params.set('participants', paramParticipants);
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

  // Guest count: URL params always take precedence (wizard passes intended group size)
  const guestCount = urlParticipantCount || wizardParticipantCount || pricing.payingParticipantCount;

  const honoreePaysCents = excludeHonoree ? 0 : pricing.perPersonCents;

  return (
    <YStack flex={1} backgroundColor={DARK_THEME.background}>
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        paddingHorizontal="$4"
        paddingBottom="$2"
        alignItems="center"
        backgroundColor={DARK_THEME.background}
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
        <Text flex={1} fontSize={17} fontWeight="700" color="white" textAlign="center">
          {t.booking.paymentSummary}
        </Text>
        <YStack width={40} />
      </XStack>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
        {/* Selected Package Card */}
        <YStack
          backgroundColor={DARK_THEME.surfaceCard}
          borderRadius={16}
          padding="$4"
          marginBottom="$5"
          borderWidth={1}
          borderColor={DARK_THEME.glassBorder}
          testID="package-summary-card"
        >
          <XStack gap="$3" alignItems="center">
            <YStack flex={1}>
              <Text fontSize={11} fontWeight="700" color={DARK_THEME.primary} textTransform="uppercase" letterSpacing={1} marginBottom={4}>
                {t.booking.selectedPackageLabel}
              </Text>
              <Text fontSize={20} fontWeight="800" color="white">
                The {tierLabel}
              </Text>
              <Text fontSize={13} color={DARK_THEME.textSecondary} marginTop={4}>
                {cityName} {'\u2022'} {t.booking.nights.replace('{{count}}', '2')} {'\u2022'} {t.booking.guests.replace('{{count}}', String(guestCount))}
              </Text>
            </YStack>
            {heroImage && (
              <Image
                source={{ uri: heroImage }}
                style={{ width: 80, height: 80, borderRadius: 12 }}
                resizeMode="cover"
              />
            )}
          </XStack>
        </YStack>

        {/* Cost Breakdown */}
        <Text fontSize={11} fontWeight="700" color={DARK_THEME.textSecondary} textTransform="uppercase" letterSpacing={1} marginBottom="$2" marginLeft="$1">
          Cost Breakdown
        </Text>
        <YStack
          backgroundColor={DARK_THEME.surfaceCard}
          borderRadius={16}
          padding="$4"
          marginBottom="$5"
          borderWidth={1}
          borderColor={DARK_THEME.glassBorder}
          testID="cost-breakdown-card"
        >
          <XStack justifyContent="space-between" marginBottom="$3">
            <Text fontSize={14} color={DARK_THEME.textSecondary}>Package Base</Text>
            <Text fontSize={14} fontWeight="600" color="white">
              {formatPrice(pricing.packagePriceCents)}
            </Text>
          </XStack>

          <XStack justifyContent="space-between" marginBottom="$3">
            <XStack gap="$1" alignItems="center">
              <Text fontSize={14} color={DARK_THEME.textSecondary}>{t.booking.serviceFee}</Text>
              <Ionicons name="information-circle-outline" size={14} color={DARK_THEME.textTertiary} />
            </XStack>
            <Text fontSize={14} fontWeight="600" color="white">
              {formatPrice(pricing.serviceFeeCents)}
            </Text>
          </XStack>

          <YStack height={1} backgroundColor={DARK_THEME.glassBorder} marginVertical="$2" />

          <XStack justifyContent="space-between">
            <Text fontSize={15} fontWeight="600" color={DARK_THEME.textSecondary}>{t.booking.totalGroupCost}</Text>
            <Text fontSize={16} fontWeight="800" color={DARK_THEME.primary}>
              {formatPrice(pricing.totalCents)}
            </Text>
          </XStack>
        </YStack>

        {/* Exclude Honoree */}
        <YStack
          backgroundColor={DARK_THEME.surfaceCard}
          borderRadius={16}
          padding="$4"
          marginBottom="$5"
          borderWidth={1}
          borderColor={DARK_THEME.glassBorder}
          testID="exclude-honoree-card"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <YStack flex={1}>
              <Text fontSize={15} fontWeight="600" color="white">
                {t.booking.excludeHonoreeLabel}
              </Text>
              <Text fontSize={13} color={DARK_THEME.textSecondary}>
                {t.booking.honoreePays.replace('{{amount}}', formatPrice(honoreePaysCents))}
              </Text>
            </YStack>
            <Switch
              checked={excludeHonoree}
              onCheckedChange={setExcludeHonoree}
              backgroundColor={excludeHonoree ? DARK_THEME.primary : DARK_THEME.glassBorder}
              testID="exclude-honoree-toggle"
            >
              <Switch.Thumb animation="quick" backgroundColor="white" />
            </Switch>
          </XStack>
        </YStack>

        {/* Cost Per Person Highlight */}
        <YStack
          backgroundColor={DARK_THEME.surfaceCard}
          borderRadius={16}
          padding="$4"
          marginBottom="$5"
          borderWidth={1}
          borderColor={DARK_THEME.glassBorder}
          testID="per-person-card"
        >
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack>
              <Text fontSize={11} fontWeight="700" color={DARK_THEME.textSecondary} textTransform="uppercase" letterSpacing={1}>
                {t.booking.costPerPersonLabel.replace('{{count}}', String(pricing.payingParticipantCount))}
              </Text>
              <XStack alignItems="baseline" gap="$2" marginTop="$2">
                <Text fontSize={36} fontWeight="800" color={DARK_THEME.primary}>
                  {formatPrice(pricing.perPersonCents)}
                </Text>
                <Text fontSize={14} color={DARK_THEME.textSecondary}>{t.booking.slashPerson}</Text>
              </XStack>
              <XStack alignItems="center" gap="$1" marginTop="$1">
                <Ionicons name="checkmark-circle" size={14} color="#47B881" />
                <Text fontSize={12} fontWeight="600" color="#47B881">
                  {t.booking.includesTaxes}
                </Text>
              </XStack>
            </YStack>
            <Ionicons name="camera-outline" size={28} color={DARK_THEME.textTertiary} />
          </XStack>
        </YStack>

        {/* Stripe Security */}
        <XStack
          padding="$3"
          backgroundColor={DARK_THEME.surfaceCard}
          borderRadius={12}
          gap="$2"
          alignItems="center"
          justifyContent="center"
          marginBottom="$4"
          borderWidth={1}
          borderColor={DARK_THEME.glassBorder}
        >
          <Ionicons name="lock-closed" size={16} color={DARK_THEME.textTertiary} />
          <Text fontSize={13} color={DARK_THEME.textSecondary}>
            {t.booking.securePaymentStripe}
          </Text>
        </XStack>

        {/* Cancellation Policy */}
        <Text fontSize={12} color={DARK_THEME.textTertiary} textAlign="center" lineHeight={18} paddingHorizontal="$2">
          {t.booking.cancellationSummary}
        </Text>
      </ScrollView>

      {/* Footer */}
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        padding="$4"
        paddingBottom={insets.bottom + 16}
        backgroundColor={DARK_THEME.surface}
        borderTopWidth={1}
        borderTopColor={DARK_THEME.glassBorder}
      >
        <Button
          flex={1}
          onPress={handleProceedToPayment}
          testID="proceed-to-payment-button"
        >
          <XStack alignItems="center" gap="$2">
            <Text fontSize={16} fontWeight="700" color="white">{t.booking.proceedToPayment}</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </XStack>
        </Button>
      </XStack>
    </YStack>
  );
}
