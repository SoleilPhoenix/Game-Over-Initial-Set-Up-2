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

export default function WizardStep5() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isCreating, setIsCreating] = useState(false);

  const wizardState = useWizardStore();
  const { mutateAsync: createEvent } = useCreateEvent();
  const { data: cities } = useCities();
  const { data: selectedPackage } = usePackage(wizardState.selectedPackageId || '');

  const city = cities?.find(c => c.id === wizardState.cityId);

  const handleBack = () => {
    router.back();
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const eventData = wizardState.getEventData();
      const newEvent = await createEvent(eventData);
      wizardState.clearDraft();
      router.replace(`/event/${newEvent.id}`);
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
      icon: 'people-circle',
      label: 'Gathering Size',
      value: wizardState.gatheringSize?.replace('_', ' ') || 'Not specified',
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
        {wizardState.vibePreferences.length > 0 && (
          <Card marginBottom="$4" testID="review-vibes-card">
            <YStack gap="$3">
              <Text fontSize="$4" fontWeight="700" color="$textPrimary">
                Selected Vibes
              </Text>
              <XStack flexWrap="wrap" gap="$2">
                {wizardState.vibePreferences.map(vibe => (
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
                  €{(selectedPackage.base_price_cents / 100).toFixed(0)}
                </Text>
                <Text fontSize="$2" color="$textSecondary">
                  Starting price • Final price depends on group size
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
          <Ionicons name="information-circle" size={24} color="#258CF4" />
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
