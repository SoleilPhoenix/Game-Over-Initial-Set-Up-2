/**
 * Wizard Step 3: Participant/Group Preferences
 * Age range, group cohesion, vibe preferences
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWizardStore } from '@/stores/wizardStore';
import { Button } from '@/components/ui/Button';
import { Chip, ChipGroup } from '@/components/ui/Chip';

const AGE_RANGES = [
  { value: '21-25', label: '21-25' },
  { value: '26-30', label: '26-30' },
  { value: '31-35', label: '31-35' },
  { value: '35+', label: '35+' },
];

const GROUP_COHESIONS = [
  { value: 'close_friends', label: 'Close Friends', desc: 'Known each other for years' },
  { value: 'mixed_group', label: 'Mixed Group', desc: 'Some know each other well' },
  { value: 'strangers', label: 'New Connections', desc: 'Many meeting for first time' },
];

const VIBE_OPTIONS = [
  'Adventure', 'Relaxation', 'Nightlife', 'Fine Dining', 'Outdoor Activities',
  'Spa & Wellness', 'Sports', 'Cultural', 'Beach', 'Urban Exploration',
];

export default function WizardStep3() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    averageAge,
    groupCohesion,
    vibePreferences,
    setAverageAge,
    setGroupCohesion,
    toggleVibePreference,
    isStepValid,
  } = useWizardStore();

  const canProceed = isStepValid(3);

  const handleNext = () => {
    if (canProceed) {
      router.push('/create-event/packages');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleSkip = () => {
    router.push('/create-event/packages');
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text fontSize="$6" fontWeight="700" color="$textPrimary" marginBottom="$6">
          Group Preferences
        </Text>

        {/* Age Range */}
        <YStack gap="$3" marginBottom="$6">
          <Text fontSize="$4" fontWeight="600" color="$textSecondary" textTransform="uppercase">
            Average Age Range
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {AGE_RANGES.map(age => (
              <Chip
                key={age.value}
                label={age.label}
                selected={averageAge === age.value}
                onPress={() => setAverageAge(age.value as any)}
                testID={`age-range-${age.value}`}
              />
            ))}
          </XStack>
        </YStack>

        {/* Group Cohesion */}
        <YStack gap="$3" marginBottom="$6">
          <Text fontSize="$4" fontWeight="600" color="$textSecondary" textTransform="uppercase">
            Group Cohesion
          </Text>
          <YStack gap="$2">
            {GROUP_COHESIONS.map(cohesion => (
              <XStack
                key={cohesion.value}
                padding="$4"
                borderRadius="$lg"
                backgroundColor={groupCohesion === cohesion.value ? '$primary' : '$surface'}
                borderWidth={2}
                borderColor={groupCohesion === cohesion.value ? '$primary' : '$borderColor'}
                alignItems="center"
                justifyContent="space-between"
                pressStyle={{ scale: 0.98 }}
                onPress={() => setGroupCohesion(cohesion.value as any)}
                testID={`group-cohesion-${cohesion.value}`}
              >
                <YStack>
                  <Text
                    fontWeight="600"
                    color={groupCohesion === cohesion.value ? 'white' : '$textPrimary'}
                  >
                    {cohesion.label}
                  </Text>
                  <Text
                    fontSize="$2"
                    color={groupCohesion === cohesion.value ? 'rgba(255,255,255,0.8)' : '$textSecondary'}
                  >
                    {cohesion.desc}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </YStack>

        {/* Vibe Preferences */}
        <YStack gap="$3">
          <Text fontSize="$4" fontWeight="600" color="$textSecondary" textTransform="uppercase">
            Vibe Preferences (Optional)
          </Text>
          <Text fontSize="$2" color="$textMuted" marginBottom="$2">
            Select all that apply
          </Text>
          <ChipGroup testID="vibe-preferences-chips">
            {VIBE_OPTIONS.map(vibe => (
              <Chip
                key={vibe}
                label={vibe}
                selected={vibePreferences.includes(vibe)}
                onPress={() => toggleVibePreference(vibe)}
                testID={`vibe-${vibe.toLowerCase().replace(/\s/g, '-')}`}
              />
            ))}
          </ChipGroup>
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
        <Button flex={1} variant="ghost" onPress={handleSkip} testID="wizard-skip-button">
          Skip
        </Button>
        <Button flex={1} onPress={handleNext} disabled={!canProceed} testID="wizard-next-button">
          Continue
        </Button>
      </XStack>
    </YStack>
  );
}
