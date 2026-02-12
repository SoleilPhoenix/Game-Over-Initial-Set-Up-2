/**
 * Wizard Step 5: Review & Create
 * Final review before creating the event
 */

import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWizardStore } from '@/stores/wizardStore';
import { useCreateEvent } from '@/hooks/queries/useEvents';
import { useCities } from '@/hooks/queries/useCities';
import { usePackage } from '@/hooks/queries/usePackages';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DARK_THEME } from '@/constants/theme';

// Standard per-person pricing for fallback packages
const TIER_PRICE_PER_PERSON: Record<string, number> = {
  essential: 99_00,
  classic: 149_00,
  grand: 199_00,
};

// Fallback package lookup for local IDs that don't exist in DB
const FALLBACK_PKG_MAP: Record<string, { name: string; tier: string; price_per_person_cents: number }> = {
  'berlin-classic': { name: 'Classic', tier: 'classic', price_per_person_cents: 149_00 },
  'berlin-essential': { name: 'Essential', tier: 'essential', price_per_person_cents: 99_00 },
  'berlin-grand': { name: 'Grand', tier: 'grand', price_per_person_cents: 199_00 },
  'hamburg-classic': { name: 'Classic', tier: 'classic', price_per_person_cents: 149_00 },
  'hamburg-essential': { name: 'Essential', tier: 'essential', price_per_person_cents: 99_00 },
  'hamburg-grand': { name: 'Grand', tier: 'grand', price_per_person_cents: 199_00 },
  'hannover-classic': { name: 'Classic', tier: 'classic', price_per_person_cents: 149_00 },
  'hannover-essential': { name: 'Essential', tier: 'essential', price_per_person_cents: 99_00 },
  'hannover-grand': { name: 'Grand', tier: 'grand', price_per_person_cents: 199_00 },
};

export default function WizardStep5() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isCreating, setIsCreating] = useState(false);

  const wizardState = useWizardStore();
  const { mutateAsync: createEvent } = useCreateEvent();
  const { data: cities } = useCities();
  const { data: dbPackage } = usePackage(wizardState.selectedPackageId || '');

  // Use DB package or fallback for local IDs
  const fallbackPkg = wizardState.selectedPackageId ? FALLBACK_PKG_MAP[wizardState.selectedPackageId] : null;
  const selectedPackage = dbPackage || fallbackPkg;

  const city = cities?.find(c => c.id === wizardState.cityId);

  // Pricing calculations
  const perPersonCents = selectedPackage
    ? ('price_per_person_cents' in selectedPackage ? selectedPackage.price_per_person_cents : (selectedPackage as any).base_price_cents || 0)
    : 0;
  const participantCount = wizardState.participantCount;
  const packageTotalCents = perPersonCents * participantCount;
  const serviceFeeCents = Math.round(packageTotalCents * 0.10);
  const grandTotalCents = packageTotalCents + serviceFeeCents;
  const perPersonFinalCents = participantCount > 0 ? Math.round(grandTotalCents / participantCount) : 0;

  const formatPrice = (cents: number) =>
    '\u20AC' + (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleBack = () => {
    router.back();
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const eventData = wizardState.getEventData();
      if (!eventData) {
        Alert.alert('Error', 'Please complete all required fields.');
        return;
      }
      // Ensure dates have defaults for the API
      const apiData = {
        ...eventData,
        event: {
          ...eventData.event,
          start_date: eventData.event.start_date || new Date().toISOString(),
          end_date: eventData.event.end_date || new Date().toISOString(),
        },
      };
      const newEvent = await createEvent(apiData as any);
      const packageId = wizardState.selectedPackageId;
      wizardState.clearDraft();
      router.replace(`/booking/${newEvent.id}/summary?packageId=${packageId}`);
    } catch (error) {
      console.error('Failed to create event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const reviewItems = [
    {
      icon: 'people',
      label: 'Party Type',
      value: wizardState.partyType === 'bachelor' ? 'Bachelor Party' : 'Bachelorette Party',
    },
    {
      icon: 'person',
      label: 'Guest of Honor',
      value: wizardState.honoreeName,
    },
    {
      icon: 'location',
      label: 'Destination',
      value: city?.name || 'Not selected',
    },
    {
      icon: 'flash',
      label: 'Energy Level',
      value: wizardState.energyLevel?.replace('_', ' ') || 'Not specified',
    },
  ];

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text fontSize="$6" fontWeight="700" color="$textPrimary" marginBottom="$2">
          Review Your Event
        </Text>
        <Text fontSize="$3" color="$textSecondary" marginBottom="$6">
          Make sure everything looks right before creating
        </Text>

        {/* Event Details Card */}
        <Card marginBottom="$4" testID="review-details-card">
          <YStack gap="$3">
            <Text fontSize="$4" fontWeight="700" color="$textPrimary">
              Event Details
            </Text>

            {reviewItems.map((item, index) => (
              <XStack key={index} alignItems="center" gap="$3">
                <YStack
                  width={36}
                  height={36}
                  borderRadius="$full"
                  backgroundColor="$backgroundHover"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name={item.icon as any} size={18} color="#64748B" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$2" color="$textSecondary">
                    {item.label}
                  </Text>
                  <Text fontSize="$3" fontWeight="600" color="$textPrimary" textTransform="capitalize">
                    {item.value}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </Card>

        {/* Vibes Card */}
        {wizardState.groupVibe.length > 0 && (
          <Card marginBottom="$4" testID="review-vibes-card">
            <YStack gap="$3">
              <Text fontSize="$4" fontWeight="700" color="$textPrimary">
                Selected Vibes
              </Text>
              <XStack flexWrap="wrap" gap="$2">
                {wizardState.groupVibe.map(vibe => (
                  <Badge key={vibe} label={vibe} variant="primary" />
                ))}
              </XStack>
            </YStack>
          </Card>
        )}

        {/* Selected Package Card */}
        {selectedPackage && (
          <Card marginBottom="$4" testID="review-package-card">
            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$4" fontWeight="700" color="$textPrimary">
                  Selected Package
                </Text>
                <Badge label={selectedPackage.tier} variant="primary" />
              </XStack>

              <YStack gap="$1">
                <Text fontSize="$5" fontWeight="700" color="$textPrimary">
                  {selectedPackage.name}
                </Text>
                <Text fontSize="$4" fontWeight="700" color="$primary">
                  {formatPrice(perPersonCents)} per person
                </Text>
                <Text fontSize="$2" color="$textSecondary">
                  {formatPrice(grandTotalCents)} total for {participantCount} people
                </Text>
              </YStack>
            </YStack>
          </Card>
        )}

        {/* Info Banner */}
        <XStack
          padding="$4"
          backgroundColor="rgba(37, 140, 244, 0.1)"
          borderRadius="$lg"
          gap="$3"
          alignItems="flex-start"
        >
          <Ionicons name="information-circle" size={24} color="#5A7EB0" />
          <YStack flex={1}>
            <Text fontSize="$3" color="$primary" fontWeight="600">
              What happens next?
            </Text>
            <Text fontSize="$2" color="$textSecondary" marginTop="$1">
              After creating your event, you can invite guests, finalize your package booking, and start planning the details!
            </Text>
          </YStack>
        </XStack>
      </ScrollView>

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
        <Button flex={1} variant="outline" onPress={handleBack} disabled={isCreating} testID="wizard-back-button">
          Back
        </Button>
        <Button flex={2} onPress={handleCreate} loading={isCreating} testID="create-event-button">
          {isCreating ? 'Creating...' : 'Create Event'}
        </Button>
      </XStack>
    </YStack>
  );
}
