/**
 * Wizard Step 2: Honoree Preferences (6 AI-Matching Questions)
 * H1: Energy Level, H2: Spotlight Comfort, H3: Competition Style,
 * H4: Enjoyment Type, H5: Indoor/Outdoor, H6: Evening Style
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { useWizardStore } from '@/stores/wizardStore';
import { OptionBlock, OptionBlockGroup } from '@/components/ui/OptionBlock';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { WizardFooter } from '@/components/ui/WizardFooter';
import { useTranslation } from '@/i18n';

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
          <OptionBlockGroup testID="h1-options">
            <OptionBlock label={t.wizard.h1Relaxed} selected={energyLevel === 'relaxed'} onPress={() => setEnergyLevel('relaxed')} testID="h1-relaxed" />
            <OptionBlock label={t.wizard.h1Active} selected={energyLevel === 'active'} onPress={() => setEnergyLevel('active')} testID="h1-active" />
            <OptionBlock label={t.wizard.h1Action} selected={energyLevel === 'action'} onPress={() => setEnergyLevel('action')} testID="h1-action" />
            <OptionBlock label={t.wizard.h1Party} selected={energyLevel === 'party'} onPress={() => setEnergyLevel('party')} testID="h1-party" />
          </OptionBlockGroup>
        </GlassPanel>

        {/* H2: Spotlight Comfort */}
        <GlassPanel icon="star" title={t.wizard.h2Title.replace('{{name}}', name)} testID="panel-h2">
          <OptionBlockGroup testID="h2-options">
            <OptionBlock label={t.wizard.h2Background} selected={spotlightComfort === 'background'} onPress={() => setSpotlightComfort('background')} testID="h2-background" />
            <OptionBlock label={t.wizard.h2Group} selected={spotlightComfort === 'group'} onPress={() => setSpotlightComfort('group')} testID="h2-group" />
            <OptionBlock label={t.wizard.h2CenterStage} selected={spotlightComfort === 'center_stage'} onPress={() => setSpotlightComfort('center_stage')} testID="h2-center-stage" />
          </OptionBlockGroup>
        </GlassPanel>

        {/* H3: Competition vs Teamwork */}
        <GlassPanel icon="people" title={t.wizard.h3Title.replace('{{name}}', name)} testID="panel-h3">
          <OptionBlockGroup testID="h3-options">
            <OptionBlock label={t.wizard.h3Cooperative} selected={competitionStyle === 'cooperative'} onPress={() => setCompetitionStyle('cooperative')} testID="h3-cooperative" />
            <OptionBlock label={t.wizard.h3Competitive} selected={competitionStyle === 'competitive'} onPress={() => setCompetitionStyle('competitive')} testID="h3-competitive" />
            <OptionBlock label={t.wizard.h3Spectator} selected={competitionStyle === 'spectator'} onPress={() => setCompetitionStyle('spectator')} testID="h3-spectator" />
          </OptionBlockGroup>
        </GlassPanel>

        {/* H4: Enjoyment Type */}
        <GlassPanel icon="restaurant" title={t.wizard.h4Title.replace('{{name}}', name)} testID="panel-h4">
          <OptionBlockGroup testID="h4-options">
            <OptionBlock label={t.wizard.h4Food} selected={enjoymentType === 'food'} onPress={() => setEnjoymentType('food')} testID="h4-food" />
            <OptionBlock label={t.wizard.h4Drinks} selected={enjoymentType === 'drinks'} onPress={() => setEnjoymentType('drinks')} testID="h4-drinks" />
            <OptionBlock label={t.wizard.h4Experience} selected={enjoymentType === 'experience'} onPress={() => setEnjoymentType('experience')} testID="h4-experience" />
          </OptionBlockGroup>
        </GlassPanel>

        {/* H5: Indoor/Outdoor */}
        <GlassPanel icon="sunny" title={t.wizard.h5Title.replace('{{name}}', name)} testID="panel-h5">
          <OptionBlockGroup testID="h5-options">
            <OptionBlock label={t.wizard.h5Indoor} selected={indoorOutdoor === 'indoor'} onPress={() => setIndoorOutdoor('indoor')} testID="h5-indoor" />
            <OptionBlock label={t.wizard.h5Outdoor} selected={indoorOutdoor === 'outdoor'} onPress={() => setIndoorOutdoor('outdoor')} testID="h5-outdoor" />
            <OptionBlock label={t.wizard.h5Mix} selected={indoorOutdoor === 'mix'} onPress={() => setIndoorOutdoor('mix')} testID="h5-mix" />
          </OptionBlockGroup>
        </GlassPanel>

        {/* H6: Evening Style */}
        <GlassPanel icon="moon" title={t.wizard.h6Title.replace('{{name}}', name)} testID="panel-h6">
          <OptionBlockGroup testID="h6-options">
            <OptionBlock label={t.wizard.h6DinnerOnly} selected={eveningStyle === 'dinner_only'} onPress={() => setEveningStyle('dinner_only')} testID="h6-dinner-only" />
            <OptionBlock label={t.wizard.h6DinnerBar} selected={eveningStyle === 'dinner_bar'} onPress={() => setEveningStyle('dinner_bar')} testID="h6-dinner-bar" />
            <OptionBlock label={t.wizard.h6FullNight} selected={eveningStyle === 'full_night'} onPress={() => setEveningStyle('full_night')} testID="h6-full-night" />
          </OptionBlockGroup>
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
