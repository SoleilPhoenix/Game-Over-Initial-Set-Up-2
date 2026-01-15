/**
 * Wizard Step 1: Key Details
 * Party type, honoree name, city selection
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWizardStore } from '@/stores/wizardStore';
import { useCities } from '@/hooks/queries/useCities';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip, ChipGroup } from '@/components/ui/Chip';

export default function WizardStep1() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: cities, isLoading: citiesLoading } = useCities();
  const {
    partyType,
    honoreeName,
    cityId,
    setPartyType,
    setHonoreeName,
    setCityId,
    isStepValid,
  } = useWizardStore();

  const canProceed = isStepValid(1);

  const handleNext = () => {
    if (canProceed) {
      router.push('/create-event/preferences');
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Party Type Selection */}
        <YStack gap="$4" marginBottom="$6">
          <Text fontSize="$5" fontWeight="700" color="$textPrimary">
            What are you planning?
          </Text>

          <XStack gap="$3">
            <YStack
              flex={1}
              padding="$4"
              borderRadius="$lg"
              backgroundColor={partyType === 'bachelor' ? '$primary' : '$surface'}
              borderWidth={2}
              borderColor={partyType === 'bachelor' ? '$primary' : '$borderColor'}
              alignItems="center"
              gap="$2"
              pressStyle={{ scale: 0.98 }}
              onPress={() => setPartyType('bachelor')}
              testID="party-type-bachelor"
            >
              <YStack
                width={60}
                height={60}
                borderRadius="$full"
                backgroundColor={partyType === 'bachelor' ? 'rgba(255,255,255,0.2)' : '$backgroundHover'}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={28}>🤵</Text>
              </YStack>
              <Text
                fontWeight="600"
                color={partyType === 'bachelor' ? 'white' : '$textPrimary'}
              >
                Bachelor
              </Text>
            </YStack>

            <YStack
              flex={1}
              padding="$4"
              borderRadius="$lg"
              backgroundColor={partyType === 'bachelorette' ? '$primary' : '$surface'}
              borderWidth={2}
              borderColor={partyType === 'bachelorette' ? '$primary' : '$borderColor'}
              alignItems="center"
              gap="$2"
              pressStyle={{ scale: 0.98 }}
              onPress={() => setPartyType('bachelorette')}
              testID="party-type-bachelorette"
            >
              <YStack
                width={60}
                height={60}
                borderRadius="$full"
                backgroundColor={partyType === 'bachelorette' ? 'rgba(255,255,255,0.2)' : '$backgroundHover'}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={28}>👰</Text>
              </YStack>
              <Text
                fontWeight="600"
                color={partyType === 'bachelorette' ? 'white' : '$textPrimary'}
              >
                Bachelorette
              </Text>
            </YStack>
          </XStack>
        </YStack>

        {/* Honoree Name */}
        <YStack gap="$2" marginBottom="$6">
          <Text fontSize="$5" fontWeight="700" color="$textPrimary">
            Who's the guest of honor?
          </Text>
          <Input
            placeholder={partyType === 'bachelor' ? "Groom's name" : "Bride's name"}
            value={honoreeName}
            onChangeText={setHonoreeName}
            testID="honoree-name-input"
            leftIcon={<Ionicons name="person-outline" size={20} color="#64748B" />}
          />
        </YStack>

        {/* City Selection */}
        <YStack gap="$3">
          <Text fontSize="$5" fontWeight="700" color="$textPrimary">
            Where's the party?
          </Text>
          <Text fontSize="$2" color="$textSecondary">
            Select a destination for your celebration
          </Text>

          {citiesLoading ? (
            <Text color="$textSecondary">Loading cities...</Text>
          ) : (
            <ChipGroup testID="city-chips">
              {cities?.map(city => (
                <Chip
                  key={city.id}
                  label={city.name}
                  selected={cityId === city.id}
                  onPress={() => setCityId(city.id)}
                  testID={`city-chip-${city.name.toLowerCase().replace(/\s/g, '-')}`}
                />
              ))}
            </ChipGroup>
          )}
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
      >
        <Button
          flex={1}
          onPress={handleNext}
          disabled={!canProceed}
          testID="wizard-next-button"
        >
          Continue
        </Button>
      </XStack>
    </YStack>
  );
}
