/**
 * Wizard Step 4: Package Selection (Mockups 7.4/7.5)
 * Full-height cards with pricing toggle, best match highlight
 */

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { ScrollView, Alert, Image, View, StyleSheet } from 'react-native';
import { KenBurnsImage } from '@/components/ui/KenBurnsImage';
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
import { setDesiredParticipants } from '@/lib/participantCountCache';
import { assemblePackages } from '@/utils/packageAssembly';

// Feature counts by tier: S=3, M=4, L=5
// Fallback packages when DB returns empty (for Berlin, Hamburg, Hannover)
// UUIDs must match supabase/migrations/20260211000000_add_german_cities.sql
const CITY_UUID_TO_SLUG: Record<string, string> = {
  '550e8400-e29b-41d4-a716-446655440101': 'berlin',
  '550e8400-e29b-41d4-a716-446655440102': 'hamburg',
  '550e8400-e29b-41d4-a716-446655440103': 'hannover',
};

function formatPrice(cents: number): string {
  return '\u20AC' + (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Minimal shape required by PackageSelectionCard — covers both AssembledPackage and DB rows */
interface DisplayPackage {
  id: string;
  name: string;
  tier: string;
  price_per_person_cents?: number;
  base_price_cents?: number;
  hero_image_url?: unknown;
  rating?: number;
  review_count?: number;
  features?: unknown[];
  bestMatch?: boolean;
}

interface PackageSelectionCardProps {
  pkg: DisplayPackage;
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

  const perPersonCents = pkg.price_per_person_cents || pkg.base_price_cents || 0;
  const totalGroupCents = perPersonCents * participantCount;
  const displayPrice = pricingMode === 'per_person'
    ? formatPrice(perPersonCents)
    : formatPrice(totalGroupCents);
  const priceLabel = pricingMode === 'per_person' ? 'Per Person' : `Total (${participantCount} people)`;

  // Feature count by tier: S=3, M=4, L=5
  const featureLimit = pkg.tier === 'grand' ? 5 : pkg.tier === 'classic' ? 4 : 3;
  const features = Array.isArray(pkg.features)
    ? (pkg.features as unknown[]).filter((f): f is string => typeof f === 'string').slice(0, featureLimit)
    : [];

  const imageSource = resolveImageSource(pkg.hero_image_url || getPackageImage('berlin', 'essential'));
  const cardHeight = isBestMatch ? 480 : 420;

  // Shared inner content — identical between selected (KenBurns) and unselected (static image) branches
  const cardContent = (
    <>
      {/* Badges */}
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
    </>
  );

  const gradientColors = ['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)'] as const;
  const gradientLocations = [0, 0.4, 1] as const;

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
      {isSelected ? (
        <KenBurnsImage source={imageSource} style={{ height: cardHeight, borderRadius: 16 }}>
          <LinearGradient
            colors={gradientColors}
            locations={gradientLocations}
            style={{ flex: 1, borderRadius: 16, justifyContent: 'flex-end', padding: 20 }}
          >
            {cardContent}
          </LinearGradient>
        </KenBurnsImage>
      ) : (
        <View style={{ height: cardHeight, borderRadius: 16, overflow: 'hidden' }}>
          <Image source={imageSource} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <LinearGradient
            colors={gradientColors}
            locations={gradientLocations}
            style={{ ...StyleSheet.absoluteFillObject, borderRadius: 16, justifyContent: 'flex-end', padding: 20 }}
          >
            {cardContent}
          </LinearGradient>
        </View>
      )}
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
    energyLevel, spotlightComfort, competitionStyle, enjoymentType, indoorOutdoor, eveningStyle,
    averageAge, groupCohesion, fitnessLevel, drinkingCulture, groupDynamic, groupVibe,
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
  const citySlug = cityId ? (CITY_UUID_TO_SLUG[cityId] || 'berlin') : 'berlin';
  const assembledPackages = useMemo(() => assemblePackages({
    h1: energyLevel, h2: spotlightComfort, h3: competitionStyle,
    h4: enjoymentType, h5: indoorOutdoor, h6: eveningStyle,
    g1: averageAge, g2: groupCohesion, g3: fitnessLevel,
    g4: drinkingCulture, g5: groupDynamic, g6: groupVibe,
  }, citySlug), [
    citySlug,
    energyLevel, spotlightComfort, competitionStyle,
    enjoymentType, indoorOutdoor, eveningStyle,
    averageAge, groupCohesion, fitnessLevel,
    drinkingCulture, groupDynamic, groupVibe,
  ]);
  const rawPackages = (dbPackages && dbPackages.length > 0)
    ? dbPackages
    : assembledPackages;
  const packages = [...rawPackages].sort(
    (a, b) => (TIER_ORDER[a.tier] ?? 1) - (TIER_ORDER[b.tier] ?? 1)
  );

  // Auto-select best match (classic/M tier) when packages load and nothing is selected
  const didAutoSelect = useRef(false);
  useEffect(() => {
    if (didAutoSelect.current || selectedPackageId || packages.length === 0) return;
    const bestMatch = packages.find((p) => (p as DisplayPackage).bestMatch === true) ||
                      packages.find((p) => p.tier === 'classic');
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
      const selectedPkg = packages.find((p) => p.id === wizardState.selectedPackageId);
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

  // Skip loading spinner when city is in our known set (we have local fallback data immediately)
  const hasFallbackData = !!(dbPackages && dbPackages.length > 0) || CITY_UUID_TO_SLUG[cityId ?? ''] !== undefined;
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
          packages.map((pkg, index) => (
            <PackageSelectionCard
              key={pkg.id}
              pkg={pkg as DisplayPackage}
              index={index}
              isBestMatch={(pkg as DisplayPackage).bestMatch === true || (!rawPackages.some((p) => (p as DisplayPackage).bestMatch) && pkg.tier === 'classic')}
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
