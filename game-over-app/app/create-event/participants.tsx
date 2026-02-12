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
import { OptionBlock, OptionBlockGroup } from '@/components/ui/OptionBlock';
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

  const vibes = groupVibe || [];

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
          <OptionBlockGroup testID="g1-options">
            {AGE_RANGES.map(age => (
              <OptionBlock
                key={age.value}
                label={age.label}
                selected={averageAge === age.value}
                onPress={() => setAverageAge(age.value as any)}
                testID={`g1-${age.value}`}
              />
            ))}
          </OptionBlockGroup>
        </GlassPanel>

        {/* G2: Group Cohesion */}
        <GlassPanel icon="heart" title={t.wizard.g2Title} testID="panel-g2">
          <OptionBlockGroup testID="g2-options">
            <OptionBlock label={t.wizard.closeFriends} selected={groupCohesion === 'close_friends'} onPress={() => setGroupCohesion('close_friends')} testID="g2-close-friends" />
            <OptionBlock label={t.wizard.mixed} selected={groupCohesion === 'mixed'} onPress={() => setGroupCohesion('mixed')} testID="g2-mixed" />
            <OptionBlock label={t.wizard.strangers} selected={groupCohesion === 'strangers'} onPress={() => setGroupCohesion('strangers')} testID="g2-strangers" />
          </OptionBlockGroup>
        </GlassPanel>

        {/* G3: Fitness Level */}
        <GlassPanel icon="fitness" title={t.wizard.g3Title} testID="panel-g3">
          <OptionBlockGroup testID="g3-options">
            <OptionBlock label={t.wizard.g3Low} selected={fitnessLevel === 'low'} onPress={() => setFitnessLevel('low')} testID="g3-low" />
            <OptionBlock label={t.wizard.g3Medium} selected={fitnessLevel === 'medium'} onPress={() => setFitnessLevel('medium')} testID="g3-medium" />
            <OptionBlock label={t.wizard.g3High} selected={fitnessLevel === 'high'} onPress={() => setFitnessLevel('high')} testID="g3-high" />
          </OptionBlockGroup>
        </GlassPanel>

        {/* G4: Drinking Culture */}
        <GlassPanel icon="beer" title={t.wizard.g4Title} testID="panel-g4">
          <OptionBlockGroup testID="g4-options">
            <OptionBlock label={t.wizard.g4Low} selected={drinkingCulture === 'low'} onPress={() => setDrinkingCulture('low')} testID="g4-low" />
            <OptionBlock label={t.wizard.g4Social} selected={drinkingCulture === 'social'} onPress={() => setDrinkingCulture('social')} testID="g4-social" />
            <OptionBlock label={t.wizard.g4Central} selected={drinkingCulture === 'central'} onPress={() => setDrinkingCulture('central')} testID="g4-central" />
          </OptionBlockGroup>
        </GlassPanel>

        {/* G5: Group Dynamic */}
        <GlassPanel icon="people" title={t.wizard.g5Title} testID="panel-g5">
          <OptionBlockGroup testID="g5-options">
            <OptionBlock label={t.wizard.g5TeamPlayers} selected={groupDynamic === 'team_players'} onPress={() => setGroupDynamic('team_players')} testID="g5-team-players" />
            <OptionBlock label={t.wizard.g5Competitive} selected={groupDynamic === 'competitive'} onPress={() => setGroupDynamic('competitive')} testID="g5-competitive" />
            <OptionBlock label={t.wizard.g5Relaxed} selected={groupDynamic === 'relaxed'} onPress={() => setGroupDynamic('relaxed')} testID="g5-relaxed" />
          </OptionBlockGroup>
        </GlassPanel>

        {/* G6: Group Vibe (multi-select, max 2) */}
        <GlassPanel icon="sparkles" title={t.wizard.g6Title} testID="panel-g6">
          <Text fontSize="$1" color="$textTertiary" marginBottom="$2">
            {t.wizard.g6MaxTwo}
          </Text>
          <OptionBlockGroup testID="g6-options">
            <OptionBlock label={t.wizard.g6Action} selected={vibes.includes('action')} onPress={() => toggleGroupVibe('action')} testID="g6-action" />
            <OptionBlock label={t.wizard.g6Culture} selected={vibes.includes('culture')} onPress={() => toggleGroupVibe('culture')} testID="g6-culture" />
            <OptionBlock label={t.wizard.g6Nightlife} selected={vibes.includes('nightlife')} onPress={() => toggleGroupVibe('nightlife')} testID="g6-nightlife" />
            <OptionBlock label={t.wizard.g6Food} selected={vibes.includes('food')} onPress={() => toggleGroupVibe('food')} testID="g6-food" />
            <OptionBlock label={t.wizard.g6Wellness} selected={vibes.includes('wellness')} onPress={() => toggleGroupVibe('wellness')} testID="g6-wellness" />
          </OptionBlockGroup>
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
