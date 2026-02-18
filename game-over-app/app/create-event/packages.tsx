/**
 * Wizard Step 4: Package Selection (Mockups 7.4/7.5)
 * Full-height cards with pricing toggle, best match highlight
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { ScrollView, ImageBackground, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useWizardStore } from '@/stores/wizardStore';
import { useMatchedPackages } from '@/hooks/queries/usePackages';
import { useCreateEvent } from '@/hooks/queries/useEvents';
import { Button } from '@/components/ui/Button';
import { WizardFooter } from '@/components/ui/WizardFooter';
import { DARK_THEME } from '@/constants/theme';
import { getPackageImage, resolveImageSource } from '@/constants/packageImages';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase/client';
import { setDesiredParticipants } from '@/lib/participantCountCache';

// Standard per-person pricing: S=€99, M=€149, L=€199
const TIER_PRICE_PER_PERSON: Record<string, number> = {
  essential: 99_00,
  classic: 149_00,
  grand: 199_00,
};

// Feature counts by tier: S=3, M=4, L=5
// Fallback packages when DB returns empty (for Berlin, Hamburg, Hannover)
// UUIDs must match supabase/migrations/20260211000000_add_german_cities.sql
const CITY_UUID_TO_SLUG: Record<string, string> = {
  '550e8400-e29b-41d4-a716-446655440101': 'berlin',
  '550e8400-e29b-41d4-a716-446655440102': 'hamburg',
  '550e8400-e29b-41d4-a716-446655440103': 'hannover',
};
const FALLBACK_PACKAGES: Record<string, any[]> = {
  berlin: [
    {
      id: 'berlin-classic',
      name: 'Berlin Classic',
      tier: 'classic',
      price_per_person_cents: TIER_PRICE_PER_PERSON.classic,
      hero_image_url: getPackageImage('berlin', 'classic'),
      rating: 4.8,
      review_count: 127,
      features: ['VIP nightlife access', 'Private party bus', 'Professional photographer', 'Welcome drinks package'],
      description: 'The ideal balance of nightlife, culture, and unforgettable moments in Berlin.',
      bestMatch: true,
    },
    {
      id: 'berlin-essential',
      name: 'Berlin Essential',
      tier: 'essential',
      price_per_person_cents: TIER_PRICE_PER_PERSON.essential,
      hero_image_url: getPackageImage('berlin', 'essential'),
      rating: 4.5,
      review_count: 89,
      features: ['Bar hopping tour', 'Welcome drinks', 'Group coordination'],
      description: 'A solid party plan with all the essentials covered.',
    },
    {
      id: 'berlin-grand',
      name: 'Berlin Grand',
      tier: 'grand',
      price_per_person_cents: TIER_PRICE_PER_PERSON.grand,
      hero_image_url: getPackageImage('berlin', 'grand'),
      rating: 4.9,
      review_count: 42,
      features: ['Luxury suite', 'Private chef dinner', 'Spa & wellness package', 'VIP club access', 'Private chauffeur'],
      description: 'The ultimate premium experience with luxury at every turn.',
    },
  ],
  hamburg: [
    {
      id: 'hamburg-classic',
      name: 'Hamburg Classic',
      tier: 'classic',
      price_per_person_cents: TIER_PRICE_PER_PERSON.classic,
      hero_image_url: getPackageImage('hamburg', 'classic'),
      rating: 4.7,
      review_count: 98,
      features: ['Reeperbahn nightlife tour', 'Harbor cruise', 'Professional photographer', 'Reserved bar area'],
      description: 'Experience Hamburg\'s legendary nightlife and harbor in style.',
      bestMatch: true,
    },
    {
      id: 'hamburg-essential',
      name: 'Hamburg Essential',
      tier: 'essential',
      price_per_person_cents: TIER_PRICE_PER_PERSON.essential,
      hero_image_url: getPackageImage('hamburg', 'essential'),
      rating: 4.4,
      review_count: 64,
      features: ['Guided bar tour', 'Welcome cocktails', 'Group planning'],
      description: 'A fun, well-organized Hamburg party experience.',
    },
    {
      id: 'hamburg-grand',
      name: 'Hamburg Grand',
      tier: 'grand',
      price_per_person_cents: TIER_PRICE_PER_PERSON.grand,
      hero_image_url: getPackageImage('hamburg', 'grand'),
      rating: 4.9,
      review_count: 31,
      features: ['Elbphilharmonie VIP event', 'Private yacht dinner', 'Luxury hotel suite', 'Spa & wellness day', 'Premium bottle service'],
      description: 'Premium Hamburg experience with exclusive venues and luxury service.',
    },
  ],
  hannover: [
    {
      id: 'hannover-classic',
      name: 'Hannover Classic',
      tier: 'classic',
      price_per_person_cents: TIER_PRICE_PER_PERSON.classic,
      hero_image_url: getPackageImage('hannover', 'classic'),
      rating: 4.6,
      review_count: 73,
      features: ['Craft beer experience', 'Go-kart racing', 'Professional photographer', 'Welcome dinner'],
      description: 'An action-packed celebration in the heart of Hannover.',
      bestMatch: true,
    },
    {
      id: 'hannover-essential',
      name: 'Hannover Essential',
      tier: 'essential',
      price_per_person_cents: TIER_PRICE_PER_PERSON.essential,
      hero_image_url: getPackageImage('hannover', 'essential'),
      rating: 4.3,
      review_count: 51,
      features: ['City adventure tour', 'Welcome drinks', 'Group coordination'],
      description: 'A great time in Hannover without breaking the bank.',
    },
    {
      id: 'hannover-grand',
      name: 'Hannover Grand',
      tier: 'grand',
      price_per_person_cents: TIER_PRICE_PER_PERSON.grand,
      hero_image_url: getPackageImage('hannover', 'grand'),
      rating: 4.8,
      review_count: 28,
      features: ['Herrenhausen Gardens gala', 'Private chef dinner', 'Spa & wellness day', 'VIP nightlife access', 'Luxury hotel suite'],
      description: 'Exclusive Hannover experience with private gala and luxury wellness.',
    },
  ],
};

function formatPrice(cents: number): string {
  return '\u20AC' + (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface PackageSelectionCardProps {
  pkg: any;
  index: number;
  isBestMatch: boolean;
  isSelected: boolean;
  pricingMode: 'per_person' | 'total_group';
  participantCount: number;
  onSelect: (id: string) => void;
  onViewDetails: (id: string) => void;
}

function PackageSelectionCard({
  pkg,
  index,
  isBestMatch,
  isSelected,
  pricingMode,
  participantCount,
  onSelect,
  onViewDetails,
}: PackageSelectionCardProps) {
  const tierLabels: Record<string, string> = {
    essential: 'S',
    classic: 'M',
    grand: 'L',
  };
  const tierNames: Record<string, string> = {
    essential: 'Essential',
    classic: 'Classic',
    grand: 'Grand',
  };
  const tierLabel = tierLabels[pkg.tier] || '';
  const tierName = tierNames[pkg.tier] || pkg.name;
  const displayName = `${tierName} (${tierLabel})`;

  const perPersonCents = pkg.price_per_person_cents || pkg.base_price_cents;
  const totalGroupCents = perPersonCents * participantCount;
  const displayPrice = pricingMode === 'per_person'
    ? formatPrice(perPersonCents)
    : formatPrice(totalGroupCents);
  const priceLabel = pricingMode === 'per_person' ? 'Per Person' : `Total (${participantCount} people)`;

  // Feature count by tier: S=3, M=4, L=5
  const featureLimit = pkg.tier === 'grand' ? 5 : pkg.tier === 'classic' ? 4 : 3;
  const features = Array.isArray(pkg.features)
    ? pkg.features.filter((f: any): f is string => typeof f === 'string').slice(0, featureLimit)
    : [];

  const imageSource = resolveImageSource(pkg.hero_image_url || getPackageImage('berlin', 'essential'));
  const cardHeight = isBestMatch ? 480 : 420;

  return (
    <YStack
      marginBottom="$5"
      borderRadius={16}
      overflow="hidden"
      borderWidth={(isBestMatch || isSelected) ? 2 : 0}
      borderColor={isSelected ? '#47B881' : isBestMatch ? DARK_THEME.primary : 'transparent'}
      pressStyle={{ scale: 0.99 }}
      onPress={() => onSelect(pkg.id)}
      testID={`package-card-${index}`}
    >
      <ImageBackground
        source={imageSource}
        style={{ height: cardHeight }}
        imageStyle={{ borderRadius: 16 }}
        fadeDuration={0}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.4, 1]}
          style={{
            flex: 1,
            borderRadius: 16,
            justifyContent: 'flex-end',
            padding: 20,
          }}
        >
          {/* Badges: show both Recommendation + Selected when applicable */}
          {(isBestMatch || isSelected) && (
            <YStack position="absolute" top={16} left={16} gap="$1.5">
              {isBestMatch && (
                <XStack
                  backgroundColor={DARK_THEME.primary}
                  paddingHorizontal={12}
                  paddingVertical={6}
                  borderRadius={20}
                  gap="$1.5"
                  alignItems="center"
                  alignSelf="flex-start"
                >
                  <Ionicons name="sparkles" size={12} color="white" />
                  <Text color="white" fontSize={11} fontWeight="600">
                    Recommendation based on preferences
                  </Text>
                </XStack>
              )}
              {isSelected && (
                <XStack
                  backgroundColor="rgba(71, 184, 129, 0.9)"
                  paddingHorizontal={12}
                  paddingVertical={6}
                  borderRadius={20}
                  gap="$1.5"
                  alignItems="center"
                  alignSelf="flex-start"
                >
                  <Ionicons name="checkmark-circle" size={12} color="white" />
                  <Text color="white" fontSize={11} fontWeight="600">
                    Selected
                  </Text>
                </XStack>
              )}
            </YStack>
          )}

          {/* Card Content */}
          <YStack gap="$3">
            {/* Title + Price */}
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack flex={1}>
                <Text fontSize={22} fontWeight="800" color="white">
                  {displayName}
                </Text>
                <XStack alignItems="center" gap="$1" marginTop="$1">
                  <Ionicons name="star" size={14} color="#FFB800" />
                  <Text fontSize={13} fontWeight="600" color="white">
                    {(pkg.rating || 4.5).toFixed(1)}
                  </Text>
                  <Text fontSize={13} color="rgba(255,255,255,0.7)">
                    ({pkg.review_count || 0} reviews)
                  </Text>
                </XStack>
              </YStack>
              <YStack alignItems="flex-end">
                <Text fontSize={24} fontWeight="800" color="white">
                  {displayPrice}
                </Text>
                <Text fontSize={12} color="rgba(255,255,255,0.7)">
                  {priceLabel}
                </Text>
              </YStack>
            </XStack>

            {/* Features */}
            <YStack gap="$2">
              {features.map((feature: string, i: number) => (
                <XStack key={i} alignItems="center" gap="$2">
                  <Ionicons name="checkmark-circle" size={16} color={DARK_THEME.primary} />
                  <Text fontSize={14} color="rgba(255,255,255,0.9)">{feature}</Text>
                </XStack>
              ))}
            </YStack>

            {/* Actions */}
            <XStack gap="$2" alignItems="center">
              <Button
                flex={1}
                onPress={() => onSelect(pkg.id)}
                variant={isSelected ? 'primary' : isBestMatch ? 'primary' : 'outline'}
                testID={`select-package-${index}`}
              >
                {isSelected && isBestMatch
                  ? 'Recommendation Selected'
                  : isSelected
                  ? 'Currently Selected'
                  : isBestMatch
                  ? 'Select Recommended'
                  : 'Select Package'}
              </Button>
              <XStack
                width={44}
                height={44}
                borderRadius="$full"
                backgroundColor="rgba(255,255,255,0.15)"
                alignItems="center"
                justifyContent="center"
                pressStyle={{ opacity: 0.7, backgroundColor: 'rgba(255,255,255,0.25)' }}
                onPress={() => onViewDetails(pkg.id)}
                testID={`details-package-${index}`}
              >
                <Ionicons name="information-circle-outline" size={22} color="white" />
              </XStack>
            </XStack>

          </YStack>
        </LinearGradient>
      </ImageBackground>
    </YStack>
  );
}

export default function WizardStep4() {
  const router = useRouter();
  const [pricingMode, setPricingMode] = useState<'per_person' | 'total_group'>('per_person');
  const [isCreating, setIsCreating] = useState(false);
  const wizardState = useWizardStore();
  const {
    cityId,
    energyLevel,
    groupVibe,
    participantCount,
    selectedPackageId,
    setSelectedPackageId,
    isStepValid,
  } = wizardState;

  const { mutateAsync: createEvent } = useCreateEvent();

  // Pass new questionnaire fields for package matching
  const preferences = {
    honoree_energy: energyLevel,
    vibe_preferences: groupVibe,
  };

  const { data: dbPackages, isLoading } = useMatchedPackages(cityId || '', preferences);

  // Use fallback packages when DB returns empty (for German cities)
  // Resolve UUID to slug for fallback lookup
  // Sort order: S (essential) → M (classic/recommended) → L (grand)
  const TIER_ORDER: Record<string, number> = { essential: 0, classic: 1, grand: 2 };
  const citySlug = cityId ? (CITY_UUID_TO_SLUG[cityId] || cityId) : null;
  const rawPackages = (dbPackages && dbPackages.length > 0)
    ? dbPackages
    : (citySlug ? FALLBACK_PACKAGES[citySlug] || [] : []);
  const packages = [...rawPackages].sort(
    (a: any, b: any) => (TIER_ORDER[a.tier] ?? 1) - (TIER_ORDER[b.tier] ?? 1)
  );

  // Auto-select best match (classic/M tier) when packages load and nothing is selected
  const didAutoSelect = useRef(false);
  useEffect(() => {
    if (didAutoSelect.current || selectedPackageId || packages.length === 0) return;
    const bestMatch = packages.find((p: any) => p.bestMatch === true) ||
                      packages.find((p: any) => p.tier === 'classic');
    if (bestMatch) {
      setSelectedPackageId(bestMatch.id);
      didAutoSelect.current = true;
    }
  }, [packages, selectedPackageId, setSelectedPackageId]);

  const canProceed = isStepValid(4);

  const handleNext = async () => {
    if (!canProceed || isCreating) return;
    setIsCreating(true);
    try {
      const packageId = wizardState.selectedPackageId;
      const wizCityId = wizardState.cityId;
      const wizParticipants = wizardState.participantCount;

      // Reuse previously created event to prevent duplicates on back-navigation
      const existingEventId = wizardState.createdEventId;
      if (existingEventId) {
        router.push(`/booking/${existingEventId}/summary?packageId=${packageId}&cityId=${wizCityId}&participants=${wizParticipants}`);
        return;
      }

      const eventData = wizardState.getEventData();
      if (!eventData) {
        Alert.alert('Error', 'Please complete all required fields.');
        return;
      }
      // Store hero image reference: remote URL string or local package slug (e.g. "hamburg-classic")
      const selectedPkg = packages.find((p: any) => p.id === wizardState.selectedPackageId);
      const heroUrl = typeof selectedPkg?.hero_image_url === 'string'
        ? selectedPkg.hero_image_url
        : (typeof selectedPkg?.id === 'string' ? selectedPkg.id : null);

      const apiData = {
        ...eventData,
        event: {
          ...eventData.event,
          start_date: eventData.event.start_date || new Date().toISOString(),
          end_date: eventData.event.end_date || new Date().toISOString(),
          ...(heroUrl ? { hero_image_url: heroUrl } : {}),
        },
      };

      let eventId: string | null = null;
      try {
        const newEvent = await createEvent(apiData as any);
        eventId = newEvent.id;
        // Store created event ID to prevent duplicates on back-navigation
        useWizardStore.getState().setCreatedEventId(eventId);
        // Cache desired participant count for event summary / manage invitations screens
        setDesiredParticipants(eventId, wizParticipants).catch(() => {});
      } catch (createError: any) {
        // RLS recursion or network error — skip event creation, proceed with draft booking
        const isRlsRecursion = createError?.code === '42P17' || createError?.message?.includes('infinite recursion');
        const isNetwork = createError?.message?.includes('Network request failed') || createError?.message?.includes('fetch');
        if (!isRlsRecursion && !isNetwork) throw createError;
        console.warn('Event creation failed (network/RLS) — proceeding with draft booking flow');
      }

      // Don't clearDraft() here — it will be cleared on booking confirmation
      // Navigate to summary: use real event ID or 'draft' as fallback
      // Pass cityId and participants via URL params so summary doesn't depend on wizard store
      router.push(`/booking/${eventId || 'draft'}/summary?packageId=${packageId}&cityId=${wizCityId}&participants=${wizParticipants}`);
    } catch (error) {
      console.error('Failed to create event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    router.replace('/create-event/participants' as any);
  };

  const handleSelectPackage = useCallback((packageId: string) => {
    setSelectedPackageId(packageId);
  }, [setSelectedPackageId]);

  const handleViewDetails = useCallback((packageId: string) => {
    router.push(`/package/${packageId}`);
  }, [router]);

  // Skip loading spinner for fallback cities — we have local data immediately
  const hasFallbackData = !!(citySlug && FALLBACK_PACKAGES[citySlug]);
  if (isLoading && !hasFallbackData) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$4" color="$textSecondary">
          Finding perfect packages for you...
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Title */}
        <Text fontSize="$6" fontWeight="800" color="$textPrimary" marginBottom="$1">
          Choose Your Experience
        </Text>
        <Text fontSize="$2" color="rgba(255, 255, 255, 0.7)" marginBottom="$5">
          Select a tier that fits your group's vibe.
        </Text>

        {/* Pricing Toggle */}
        <XStack
          backgroundColor="rgba(45, 55, 72, 0.6)"
          borderRadius="$full"
          padding={4}
          marginBottom="$5"
        >
          <XStack
            flex={1}
            height={40}
            borderRadius="$full"
            backgroundColor={pricingMode === 'per_person' ? DARK_THEME.primary : 'transparent'}
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => setPricingMode('per_person')}
            testID="pricing-per-person"
          >
            <Text
              fontWeight="600"
              fontSize={14}
              color={pricingMode === 'per_person' ? 'white' : '$textSecondary'}
            >
              Per Person
            </Text>
          </XStack>
          <XStack
            flex={1}
            height={40}
            borderRadius="$full"
            backgroundColor={pricingMode === 'total_group' ? DARK_THEME.primary : 'transparent'}
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => setPricingMode('total_group')}
            testID="pricing-total-group"
          >
            <Text
              fontWeight="600"
              fontSize={14}
              color={pricingMode === 'total_group' ? 'white' : '$textSecondary'}
            >
              Total Group
            </Text>
          </XStack>
        </XStack>

        {/* Package Cards */}
        {packages && packages.length > 0 ? (
          packages.map((pkg: any, index: number) => (
            <PackageSelectionCard
              key={pkg.id}
              pkg={pkg}
              index={index}
              isBestMatch={pkg.bestMatch === true || (!rawPackages.some((p: any) => p.bestMatch) && pkg.tier === 'classic')}
              isSelected={selectedPackageId === pkg.id}
              pricingMode={pricingMode}
              participantCount={participantCount}
              onSelect={handleSelectPackage}
              onViewDetails={handleViewDetails}
            />
          ))
        ) : (
          <YStack flex={1} justifyContent="center" alignItems="center" paddingVertical="$10">
            <Text color="$textSecondary" textAlign="center">
              No packages available for this destination yet.
            </Text>
          </YStack>
        )}
      </ScrollView>

      {/* Footer */}
      <WizardFooter
        onBack={handleBack}
        onNext={handleNext}
        nextLabel={isCreating ? 'Creating...' : 'Proceed to Booking'}
        nextDisabled={!canProceed || isCreating}
      />
    </YStack>
  );
}
