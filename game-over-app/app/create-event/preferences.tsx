/**
 * Wizard Step 2: Honoree Preferences
 * Gathering size, social approach, energy level
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWizardStore } from '@/stores/wizardStore';
import { Button } from '@/components/ui/Button';
import { Chip, ChipGroup } from '@/components/ui/Chip';

const GATHERING_SIZES = [
  { value: 'intimate', label: 'Intimate (2-6)', emoji: '👥' },
  { value: 'small_group', label: 'Small Group (7-12)', emoji: '👨‍👩‍👧‍👦' },
  { value: 'party', label: 'Big Party (13+)', emoji: '🎉' },
];

const SOCIAL_APPROACHES = [
  { value: 'wallflower', label: 'Wallflower', desc: 'Prefers observing' },
  { value: 'mingler', label: 'Mingler', desc: 'Enjoys small talk' },
  { value: 'butterfly', label: 'Social Butterfly', desc: 'Life of the party' },
  { value: 'observer', label: 'Observer', desc: 'Selective socializer' },
];

const ENERGY_LEVELS = [
  { value: 'low_key', label: 'Low Key', emoji: '😌' },
  { value: 'moderate', label: 'Moderate', emoji: '😊' },
  { value: 'high_energy', label: 'High Energy', emoji: '🔥' },
];

export default function WizardStep2() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    partyType,
    gatheringSize,
    socialApproach,
    energyLevel,
    setGatheringSize,
    setSocialApproach,
    setEnergyLevel,
    isStepValid,
  } = useWizardStore();

  const canProceed = isStepValid(2);
  const honoreeTitle = partyType === 'bachelor' ? "Groom's" : "Bride's";

  const handleNext = () => {
    if (canProceed) {
      router.push('/create-event/participants');
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text fontSize="$6" fontWeight="700" color="$textPrimary" marginBottom="$6">
          {honoreeTitle} Preferences
        </Text>

        {/* Gathering Size */}
        <YStack gap="$3" marginBottom="$6">
          <Text fontSize="$4" fontWeight="600" color="$textSecondary" textTransform="uppercase">
            Gathering Size
          </Text>
          <YStack gap="$2">
            {GATHERING_SIZES.map(size => (
              <XStack
                key={size.value}
                padding="$4"
                borderRadius="$lg"
                backgroundColor={gatheringSize === size.value ? '$primary' : '$surface'}
                borderWidth={2}
                borderColor={gatheringSize === size.value ? '$primary' : '$borderColor'}
                alignItems="center"
                gap="$3"
                pressStyle={{ scale: 0.98 }}
                onPress={() => setGatheringSize(size.value as any)}
                testID={`gathering-size-${size.value}`}
              >
                <Text fontSize={24}>{size.emoji}</Text>
                <Text
                  fontWeight="600"
                  color={gatheringSize === size.value ? 'white' : '$textPrimary'}
                >
                  {size.label}
                </Text>
              </XStack>
            ))}
          </YStack>
        </YStack>

        {/* Social Approach */}
        <YStack gap="$3" marginBottom="$6">
          <Text fontSize="$4" fontWeight="600" color="$textSecondary" textTransform="uppercase">
            Social Approach
          </Text>
          <ChipGroup testID="social-approach-chips">
            {SOCIAL_APPROACHES.map(approach => (
              <Chip
                key={approach.value}
                label={approach.label}
                selected={socialApproach === approach.value}
                onPress={() => setSocialApproach(approach.value as any)}
                testID={`social-approach-${approach.value}`}
              />
            ))}
          </ChipGroup>
        </YStack>

        {/* Energy Level */}
        <YStack gap="$3">
          <Text fontSize="$4" fontWeight="600" color="$textSecondary" textTransform="uppercase">
            Energy Level
          </Text>
          <XStack gap="$2">
            {ENERGY_LEVELS.map(energy => (
              <YStack
                key={energy.value}
                flex={1}
                padding="$3"
                borderRadius="$lg"
                backgroundColor={energyLevel === energy.value ? '$primary' : '$surface'}
                borderWidth={2}
                borderColor={energyLevel === energy.value ? '$primary' : '$borderColor'}
                alignItems="center"
                gap="$1"
                pressStyle={{ scale: 0.98 }}
                onPress={() => setEnergyLevel(energy.value as any)}
                testID={`energy-level-${energy.value}`}
              >
                <Text fontSize={24}>{energy.emoji}</Text>
                <Text
                  fontSize="$2"
                  fontWeight="600"
                  color={energyLevel === energy.value ? 'white' : '$textPrimary'}
                  textAlign="center"
                >
                  {energy.label}
                </Text>
              </YStack>
            ))}
          </XStack>
        </YStack>
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
        <Button flex={1} variant="outline" onPress={handleBack} testID="wizard-back-button">
          Back
        </Button>
        <Button flex={1} onPress={handleNext} disabled={!canProceed} testID="wizard-next-button">
          Continue
        </Button>
      </XStack>
    </YStack>
  );
}
