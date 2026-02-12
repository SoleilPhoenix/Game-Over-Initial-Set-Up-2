/**
 * Wizard Step 2: Honoree Preferences (6 AI-Matching Questions)
 * H1: Energy Level, H2: Spotlight Comfort, H3: Competition Style,
 * H4: Enjoyment Type, H5: Indoor/Outdoor, H6: Evening Style
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

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      fontSize="$2"
      fontWeight="600"
      color="rgba(255, 255, 255, 0.85)"
      marginBottom="$3"
    >
      {children}
    </Text>
  );
}

export default function WizardStep2() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    honoreeName,
    energyLevel,
    spotlightComfort,
    competitionStyle,
    enjoymentType,
    indoorOutdoor,
    eveningStyle,
    setEnergyLevel,
    setSpotlightComfort,
    setCompetitionStyle,
    setEnjoymentType,
    setIndoorOutdoor,
    setEveningStyle,
    isStepValid,
  } = useWizardStore();

  const name = honoreeName || 'the honoree';
  const canProceed = isStepValid(2);

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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* H1: Energy Level */}
        <GlassPanel icon="flash" title={t.wizard.h1Title.replace('{{name}}', name)} testID="panel-h1">
          <ChipGroup testID="h1-chips">
            <Chip label={t.wizard.h1Relaxed} selected={energyLevel === 'relaxed'} onPress={() => setEnergyLevel('relaxed')} testID="h1-relaxed" />
            <Chip label={t.wizard.h1Active} selected={energyLevel === 'active'} onPress={() => setEnergyLevel('active')} testID="h1-active" />
            <Chip label={t.wizard.h1Action} selected={energyLevel === 'action'} onPress={() => setEnergyLevel('action')} testID="h1-action" />
            <Chip label={t.wizard.h1Party} selected={energyLevel === 'party'} onPress={() => setEnergyLevel('party')} testID="h1-party" />
          </ChipGroup>
        </GlassPanel>

        {/* H2: Spotlight Comfort */}
        <GlassPanel icon="star" title={t.wizard.h2Title.replace('{{name}}', name)} testID="panel-h2">
          <ChipGroup testID="h2-chips">
            <Chip label={t.wizard.h2Background} selected={spotlightComfort === 'background'} onPress={() => setSpotlightComfort('background')} testID="h2-background" />
            <Chip label={t.wizard.h2Group} selected={spotlightComfort === 'group'} onPress={() => setSpotlightComfort('group')} testID="h2-group" />
            <Chip label={t.wizard.h2CenterStage} selected={spotlightComfort === 'center_stage'} onPress={() => setSpotlightComfort('center_stage')} testID="h2-center-stage" />
          </ChipGroup>
        </GlassPanel>

        {/* H3: Competition vs Teamwork */}
        <GlassPanel icon="people" title={t.wizard.h3Title.replace('{{name}}', name)} testID="panel-h3">
          <ChipGroup testID="h3-chips">
            <Chip label={t.wizard.h3Cooperative} selected={competitionStyle === 'cooperative'} onPress={() => setCompetitionStyle('cooperative')} testID="h3-cooperative" />
            <Chip label={t.wizard.h3Competitive} selected={competitionStyle === 'competitive'} onPress={() => setCompetitionStyle('competitive')} testID="h3-competitive" />
            <Chip label={t.wizard.h3Spectator} selected={competitionStyle === 'spectator'} onPress={() => setCompetitionStyle('spectator')} testID="h3-spectator" />
          </ChipGroup>
        </GlassPanel>

        {/* H4: Enjoyment Type */}
        <GlassPanel icon="restaurant" title={t.wizard.h4Title.replace('{{name}}', name)} testID="panel-h4">
          <ChipGroup testID="h4-chips">
            <Chip label={t.wizard.h4Food} selected={enjoymentType === 'food'} onPress={() => setEnjoymentType('food')} testID="h4-food" />
            <Chip label={t.wizard.h4Drinks} selected={enjoymentType === 'drinks'} onPress={() => setEnjoymentType('drinks')} testID="h4-drinks" />
            <Chip label={t.wizard.h4Experience} selected={enjoymentType === 'experience'} onPress={() => setEnjoymentType('experience')} testID="h4-experience" />
          </ChipGroup>
        </GlassPanel>

        {/* H5: Indoor/Outdoor */}
        <GlassPanel icon="sunny" title={t.wizard.h5Title.replace('{{name}}', name)} testID="panel-h5">
          <ChipGroup testID="h5-chips">
            <Chip label={t.wizard.h5Indoor} selected={indoorOutdoor === 'indoor'} onPress={() => setIndoorOutdoor('indoor')} testID="h5-indoor" />
            <Chip label={t.wizard.h5Outdoor} selected={indoorOutdoor === 'outdoor'} onPress={() => setIndoorOutdoor('outdoor')} testID="h5-outdoor" />
            <Chip label={t.wizard.h5Mix} selected={indoorOutdoor === 'mix'} onPress={() => setIndoorOutdoor('mix')} testID="h5-mix" />
          </ChipGroup>
        </GlassPanel>

        {/* H6: Evening Style */}
        <GlassPanel icon="moon" title={t.wizard.h6Title.replace('{{name}}', name)} testID="panel-h6">
          <ChipGroup testID="h6-chips">
            <Chip label={t.wizard.h6DinnerOnly} selected={eveningStyle === 'dinner_only'} onPress={() => setEveningStyle('dinner_only')} testID="h6-dinner-only" />
            <Chip label={t.wizard.h6DinnerBar} selected={eveningStyle === 'dinner_bar'} onPress={() => setEveningStyle('dinner_bar')} testID="h6-dinner-bar" />
            <Chip label={t.wizard.h6FullNight} selected={eveningStyle === 'full_night'} onPress={() => setEveningStyle('full_night')} testID="h6-full-night" />
          </ChipGroup>
        </GlassPanel>
      </ScrollView>

      {/* Footer */}
      <WizardFooter
        onBack={handleBack}
        onNext={handleNext}
        nextLabel={`${t.wizard.nextStep} \u2192`}
        nextDisabled={!canProceed}
      />
    </YStack>
  );
}
