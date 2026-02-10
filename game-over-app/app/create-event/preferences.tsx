/**
 * Wizard Step 2: Honoree Preferences (Mockup 7.2)
 * Gathering size, social approach, energy level, participation style, entertainment
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

const SOCIAL_APPROACHES = [
  { value: 'wallflower', label: 'Wallflower' },
  { value: 'butterfly', label: 'Butterfly' },
  { value: 'observer', label: 'Observer' },
  { value: 'mingler', label: 'Mingler' },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      fontSize="$1"
      fontWeight="600"
      color="rgba(255, 255, 255, 0.6)"
      textTransform="uppercase"
      letterSpacing={1}
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
    partyType,
    gatheringSize,
    socialApproach,
    energyLevel,
    participationStyle,
    venuePreference,
    publicAttention,
    setGatheringSize,
    setSocialApproach,
    setEnergyLevel,
    setParticipationStyle,
    setVenuePreference,
    setPublicAttention,
    isStepValid,
  } = useWizardStore();

  const canProceed = isStepValid(2);

  const GATHERING_SIZES = [
    { value: 'intimate', label: t.wizard.intimate },
    { value: 'small_group', label: t.wizard.smallGroup },
    { value: 'party', label: t.wizard.party },
  ];

  const ENERGY_LEVELS = [
    { value: 'low_key', label: t.wizard.relaxed },
    { value: 'moderate', label: t.wizard.moderate },
    { value: 'high_energy', label: t.wizard.highEnergy },
    { value: 'extreme', label: t.wizard.extreme },
  ];

  const PARTICIPATION_STYLES = [
    { value: 'active', label: t.wizard.active },
    { value: 'passive', label: t.wizard.passive },
    { value: 'competitive', label: t.wizard.competitive },
    { value: 'cooperative', label: t.wizard.cooperative },
  ];

  const VENUE_PREFERENCES = [
    { value: 'indoors', label: t.wizard.indoors },
    { value: 'outdoors', label: t.wizard.outdoors },
    { value: 'rooftop', label: t.wizard.rooftop },
    { value: 'dive_bar', label: t.wizard.diveBar },
    { value: 'club', label: t.wizard.club },
  ];

  const PUBLIC_ATTENTION_LEVELS = [
    { value: 'low_key', label: t.wizard.lowKey },
    { value: 'moderate', label: t.wizard.moderate },
    { value: 'center_stage', label: t.wizard.centerStage },
  ];

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
        {/* Social Energy Panel */}
        <GlassPanel icon="people" title={t.wizard.gatheringSize} testID="panel-social-energy">
          {/* Gathering Size */}
          <YStack marginBottom="$5">
            <SectionLabel>{t.wizard.gatheringSize}</SectionLabel>
            <ChipGroup testID="gathering-size-chips">
              {GATHERING_SIZES.map(size => (
                <Chip
                  key={size.value}
                  label={size.label}
                  selected={gatheringSize === size.value}
                  onPress={() => setGatheringSize(size.value as any)}
                  testID={`gathering-size-${size.value}`}
                />
              ))}
            </ChipGroup>
          </YStack>

          {/* Social Approach */}
          <YStack>
            <SectionLabel>Social Approach</SectionLabel>
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
        </GlassPanel>

        {/* Activity Panel */}
        <GlassPanel icon="flash" title={t.wizard.energyLevel} testID="panel-activity">
          {/* Energy Level */}
          <YStack marginBottom="$5">
            <SectionLabel>{t.wizard.energyLevel}</SectionLabel>
            <ChipGroup testID="energy-level-chips">
              {ENERGY_LEVELS.map(energy => (
                <Chip
                  key={energy.value}
                  label={energy.label}
                  selected={energyLevel === energy.value}
                  onPress={() => setEnergyLevel(energy.value as any)}
                  testID={`energy-level-${energy.value}`}
                />
              ))}
            </ChipGroup>
          </YStack>

          {/* Participation Style */}
          <YStack>
            <SectionLabel>{t.wizard.participationStyle}</SectionLabel>
            <ChipGroup testID="participation-style-chips">
              {PARTICIPATION_STYLES.map(style => (
                <Chip
                  key={style.value}
                  label={style.label}
                  selected={participationStyle === style.value}
                  onPress={() => setParticipationStyle(style.value as any)}
                  testID={`participation-style-${style.value}`}
                />
              ))}
            </ChipGroup>
          </YStack>
        </GlassPanel>

        {/* Entertainment Panel */}
        <GlassPanel icon="musical-notes" title={t.wizard.venuePreference} testID="panel-entertainment">
          {/* Venue Preference */}
          <YStack marginBottom="$5">
            <SectionLabel>{t.wizard.venuePreference}</SectionLabel>
            <ChipGroup testID="venue-preference-chips">
              {VENUE_PREFERENCES.map(venue => (
                <Chip
                  key={venue.value}
                  label={venue.label}
                  selected={venuePreference === venue.value}
                  onPress={() => setVenuePreference(venue.value as any)}
                  testID={`venue-preference-${venue.value}`}
                />
              ))}
            </ChipGroup>
          </YStack>

          {/* Public Attention */}
          <YStack>
            <SectionLabel>{t.wizard.publicAttention}</SectionLabel>
            <ChipGroup testID="public-attention-chips">
              {PUBLIC_ATTENTION_LEVELS.map(level => (
                <Chip
                  key={level.value}
                  label={level.label}
                  selected={publicAttention === level.value}
                  onPress={() => setPublicAttention(level.value as any)}
                  testID={`public-attention-${level.value}`}
                />
              ))}
            </ChipGroup>
          </YStack>
        </GlassPanel>
      </ScrollView>

      {/* Footer */}
      <WizardFooter
        onBack={handleBack}
        onNext={handleNext}
        nextLabel={`${t.wizard.nextStep} →`}
        nextDisabled={!canProceed}
      />
    </YStack>
  );
}
