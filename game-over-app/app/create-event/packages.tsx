/**
 * Wizard Step 4: Package Selection
 * AI-matched packages based on preferences
 */

import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWizardStore } from '@/stores/wizardStore';
import { useMatchedPackages } from '@/hooks/queries/usePackages';
import { Button } from '@/components/ui/Button';
import { PackageCard } from '@/components/cards/PackageCard';

export default function WizardStep4() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    cityId,
    gatheringSize,
    energyLevel,
    vibePreferences,
    selectedPackageId,
    setSelectedPackageId,
    isStepValid,
  } = useWizardStore();

  const preferences = {
    gatheringSize,
    energyLevel,
    vibePreferences,
  };

  const { data: packages, isLoading } = useMatchedPackages(cityId || '', preferences);

  const canProceed = isStepValid(4);

  const handleNext = () => {
    if (canProceed) {
      router.push('/create-event/review');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleSelectPackage = useCallback((packageId: string) => {
    setSelectedPackageId(packageId);
  }, [setSelectedPackageId]);

  const renderPackage = useCallback(({ item, index }: { item: any; index: number }) => (
    <YStack marginBottom="$4">
      <PackageCard
        id={item.id}
        name={item.name}
        tier={item.tier}
        basePriceCents={item.base_price_cents}
        pricePerPersonCents={item.price_per_person_cents}
        rating={item.rating}
        reviewCount={item.review_count}
        features={item.features || []}
        heroImageUrl={item.hero_image_url}
        isBestMatch={index === 0}
        onPress={() => handleSelectPackage(item.id)}
        testID={`package-card-${index}`}
      />
      {selectedPackageId === item.id && (
        <XStack
          marginTop="$2"
          padding="$2"
          backgroundColor="rgba(37, 140, 244, 0.1)"
          borderRadius="$md"
          alignItems="center"
          justifyContent="center"
        >
          <Text color="$primary" fontWeight="600" fontSize="$2">
            ✓ Selected
          </Text>
        </XStack>
      )}
    </YStack>
  ), [selectedPackageId, handleSelectPackage]);

  if (isLoading) {
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
      <YStack flex={1} paddingHorizontal="$4" paddingTop="$4">
        <Text fontSize="$6" fontWeight="700" color="$textPrimary" marginBottom="$2">
          Choose Your Package
        </Text>
        <Text fontSize="$3" color="$textSecondary" marginBottom="$4">
          AI-matched based on your preferences
        </Text>

        {packages && packages.length > 0 ? (
          <FlashList
            data={packages}
            renderItem={renderPackage}
            estimatedItemSize={340}
            contentContainerStyle={{ paddingBottom: 120 }}
            testID="packages-list"
          />
        ) : (
          <YStack flex={1} justifyContent="center" alignItems="center">
            <Text color="$textSecondary" textAlign="center">
              No packages available for this destination yet.
            </Text>
          </YStack>
        )}
      </YStack>

      {/* Footer */}
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
        gap="$3"
      >
        <Button flex={1} variant="outline" onPress={handleBack} testID="wizard-back-button">
          Back
        </Button>
        <Button flex={1} onPress={handleNext} disabled={!canProceed} testID="wizard-next-button">
          Review Event
        </Button>
      </XStack>
    </YStack>
  );
}
