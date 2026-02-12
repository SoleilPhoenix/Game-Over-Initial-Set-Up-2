/**
 * Wizard Step 3: Group Preferences (6 AI-Matching Questions)
 * G1: Average Age, G2: Group Cohesion, G3: Fitness Level,
 * G4: Drinking Culture, G5: Group Dynamic, G6: Group Vibe (multi-select max 2)
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, Text } from 'tamagui';
import { useWizardStore } from '@/stores/wizardStore';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { WizardFooter } from '@/components/ui/WizardFooter';
import { useTranslation } from '@/i18n';

const AGE_RANGES = [
  { value: '21-25', label: '21-25' },
  { value: '26-30', label: '26-30' },
  { value: '31-35', label: '31-35' },
  { value: '35+', label: '35+' },
];

export default function WizardStep3() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    averageAge,
    groupCohesion,
    fitnessLevel,
    drinkingCulture,
    groupDynamic,
    groupVibe,
    setAverageAge,
    setGroupCohesion,
    setFitnessLevel,
    setDrinkingCulture,
    setGroupDynamic,
    toggleGroupVibe,
    isStepValid,
  } = useWizardStore();

  const handleNext = () => {
    router.push('/create-event/packages');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* G1: Average Age */}
        <GlassPanel icon="people-circle" title={t.wizard.g1Title} testID="panel-g1">
          <ChipGroup testID="g1-chips">
            {AGE_RANGES.map(age => (
              <Chip
                key={age.value}
                label={age.label}
                selected={averageAge === age.value}
                onPress={() => setAverageAge(age.value as any)}
                testID={`g1-${age.value}`}
              />
            ))}
          </ChipGroup>
        </GlassPanel>

        {/* G2: Group Cohesion */}
        <GlassPanel icon="heart" title={t.wizard.g2Title} testID="panel-g2">
          <ChipGroup testID="g2-chips">
            <Chip label={t.wizard.closeFriends} selected={groupCohesion === 'close_friends'} onPress={() => setGroupCohesion('close_friends')} testID="g2-close-friends" />
            <Chip label={t.wizard.mixed} selected={groupCohesion === 'mixed'} onPress={() => setGroupCohesion('mixed')} testID="g2-mixed" />
            <Chip label={t.wizard.strangers} selected={groupCohesion === 'strangers'} onPress={() => setGroupCohesion('strangers')} testID="g2-strangers" />
          </ChipGroup>
        </GlassPanel>

        {/* G3: Fitness Level */}
        <GlassPanel icon="fitness" title={t.wizard.g3Title} testID="panel-g3">
          <ChipGroup testID="g3-chips">
            <Chip label={t.wizard.g3Low} selected={fitnessLevel === 'low'} onPress={() => setFitnessLevel('low')} testID="g3-low" />
            <Chip label={t.wizard.g3Medium} selected={fitnessLevel === 'medium'} onPress={() => setFitnessLevel('medium')} testID="g3-medium" />
            <Chip label={t.wizard.g3High} selected={fitnessLevel === 'high'} onPress={() => setFitnessLevel('high')} testID="g3-high" />
          </ChipGroup>
        </GlassPanel>

        {/* G4: Drinking Culture */}
        <GlassPanel icon="beer" title={t.wizard.g4Title} testID="panel-g4">
          <ChipGroup testID="g4-chips">
            <Chip label={t.wizard.g4Low} selected={drinkingCulture === 'low'} onPress={() => setDrinkingCulture('low')} testID="g4-low" />
            <Chip label={t.wizard.g4Social} selected={drinkingCulture === 'social'} onPress={() => setDrinkingCulture('social')} testID="g4-social" />
            <Chip label={t.wizard.g4Central} selected={drinkingCulture === 'central'} onPress={() => setDrinkingCulture('central')} testID="g4-central" />
          </ChipGroup>
        </GlassPanel>

        {/* G5: Group Dynamic */}
        <GlassPanel icon="people" title={t.wizard.g5Title} testID="panel-g5">
          <ChipGroup testID="g5-chips">
            <Chip label={t.wizard.g5TeamPlayers} selected={groupDynamic === 'team_players'} onPress={() => setGroupDynamic('team_players')} testID="g5-team-players" />
            <Chip label={t.wizard.g5Competitive} selected={groupDynamic === 'competitive'} onPress={() => setGroupDynamic('competitive')} testID="g5-competitive" />
            <Chip label={t.wizard.g5Relaxed} selected={groupDynamic === 'relaxed'} onPress={() => setGroupDynamic('relaxed')} testID="g5-relaxed" />
          </ChipGroup>
        </GlassPanel>

        {/* G6: Group Vibe (multi-select, max 2) */}
        <GlassPanel icon="sparkles" title={t.wizard.g6Title} testID="panel-g6">
          <Text fontSize="$1" color="$textTertiary" marginBottom="$2">
            {t.wizard.g6MaxTwo}
          </Text>
          <ChipGroup testID="g6-chips">
            <Chip label={t.wizard.g6Action} selected={groupVibe.includes('action')} onPress={() => toggleGroupVibe('action')} testID="g6-action" />
            <Chip label={t.wizard.g6Culture} selected={groupVibe.includes('culture')} onPress={() => toggleGroupVibe('culture')} testID="g6-culture" />
            <Chip label={t.wizard.g6Nightlife} selected={groupVibe.includes('nightlife')} onPress={() => toggleGroupVibe('nightlife')} testID="g6-nightlife" />
            <Chip label={t.wizard.g6Food} selected={groupVibe.includes('food')} onPress={() => toggleGroupVibe('food')} testID="g6-food" />
            <Chip label={t.wizard.g6Wellness} selected={groupVibe.includes('wellness')} onPress={() => toggleGroupVibe('wellness')} testID="g6-wellness" />
          </ChipGroup>
        </GlassPanel>
      </ScrollView>

      {/* Footer */}
      <WizardFooter
        onBack={handleBack}
        onNext={handleNext}
        nextLabel={`${t.wizard.nextStep} \u2192`}
        nextDisabled={!isStepValid(3)}
      />
    </YStack>
  );
}
