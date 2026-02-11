/**
 * Wizard Step 3: Participants Preferences (Mockup 7.3)
 * Group dynamics, shared interests, organization
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

export default function WizardStep3() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    averageAge,
    groupCohesion,
    vibePreferences,
    activityLevel,
    travelDistance,
    eventDuration,
    setAverageAge,
    setGroupCohesion,
    toggleVibePreference,
    setActivityLevel,
    setTravelDistance,
    setEventDuration,
    isStepValid,
  } = useWizardStore();

  const GROUP_COHESIONS = [
    { value: 'close_friends', label: t.wizard.closeFriends },
    { value: 'mixed_group', label: t.wizard.mixedGroup },
    { value: 'strangers', label: t.wizard.strangers },
  ];

  const VIBE_OPTIONS = [
    { value: 'Sports & Action', label: t.wizard.sportsAction },
    { value: 'Culture', label: t.wizard.culture },
    { value: 'Nightlife', label: t.wizard.nightlife },
    { value: 'Chill', label: t.wizard.chill },
  ];

  const ACTIVITY_LEVELS = [
    { value: 'relaxed', label: t.wizard.relaxed },
    { value: 'moderate', label: t.wizard.moderate },
    { value: 'high_paced', label: t.wizard.highPaced },
  ];

  const TRAVEL_DISTANCES = [
    { value: 'local', label: t.wizard.local },
    { value: 'domestic', label: t.wizard.domestic },
    { value: 'international', label: t.wizard.international },
  ];

  const EVENT_DURATIONS = [
    { value: '1_day', label: t.wizard.oneNight, disabled: false },
    { value: '2_days', label: t.wizard.twoDays, disabled: true },
    { value: '3_plus_days', label: t.wizard.threePlusDays, disabled: true },
  ];

  const handleNext = () => {
    router.push('/create-event/packages');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Group Dynamics Panel */}
        <GlassPanel icon="people-circle" title={t.wizard.groupCohesion} testID="panel-group-dynamics">
          {/* Average Age */}
          <YStack marginBottom="$5">
            <SectionLabel>{t.wizard.averageAge}</SectionLabel>
            <ChipGroup testID="age-range-chips">
              {AGE_RANGES.map(age => (
                <Chip
                  key={age.value}
                  label={age.label}
                  selected={averageAge === age.value}
                  onPress={() => setAverageAge(age.value as any)}
                  testID={`age-range-${age.value}`}
                />
              ))}
            </ChipGroup>
          </YStack>

          {/* Group Cohesion */}
          <YStack>
            <SectionLabel>{t.wizard.groupCohesion}</SectionLabel>
            <ChipGroup testID="group-cohesion-chips">
              {GROUP_COHESIONS.map(cohesion => (
                <Chip
                  key={cohesion.value}
                  label={cohesion.label}
                  selected={groupCohesion === cohesion.value}
                  onPress={() => setGroupCohesion(cohesion.value as any)}
                  testID={`group-cohesion-${cohesion.value}`}
                />
              ))}
            </ChipGroup>
          </YStack>
        </GlassPanel>

        {/* Shared Interests Panel */}
        <GlassPanel icon="heart" title={t.wizard.vibePreference} testID="panel-shared-interests">
          {/* Vibe Preference */}
          <YStack marginBottom="$5">
            <SectionLabel>{t.wizard.vibePreference}</SectionLabel>
            <Text fontSize="$1" color="$textTertiary" marginBottom="$2">
              {t.wizard.selectMultiple}
            </Text>
            <ChipGroup testID="vibe-preferences-chips">
              {VIBE_OPTIONS.map(vibe => (
                <Chip
                  key={vibe.value}
                  label={vibe.label}
                  selected={vibePreferences.includes(vibe.value)}
                  onPress={() => toggleVibePreference(vibe.value)}
                  testID={`vibe-${vibe.value.toLowerCase().replace(/\s+/g, '-')}`}
                />
              ))}
            </ChipGroup>
          </YStack>

          {/* Activity Level */}
          <YStack>
            <SectionLabel>{t.wizard.activityLevel}</SectionLabel>
            <ChipGroup testID="activity-level-chips">
              {ACTIVITY_LEVELS.map(level => (
                <Chip
                  key={level.value}
                  label={level.label}
                  selected={activityLevel === level.value}
                  onPress={() => setActivityLevel(level.value as any)}
                  testID={`activity-level-${level.value}`}
                />
              ))}
            </ChipGroup>
          </YStack>
        </GlassPanel>

        {/* Organization Panel */}
        <GlassPanel icon="compass" title={t.wizard.travelDistance} testID="panel-organization">
          {/* Travel Distance */}
          <YStack marginBottom="$5">
            <SectionLabel>{t.wizard.travelDistance}</SectionLabel>
            <ChipGroup testID="travel-distance-chips">
              {TRAVEL_DISTANCES.map(dist => (
                <Chip
                  key={dist.value}
                  label={dist.label}
                  selected={travelDistance === dist.value}
                  onPress={() => setTravelDistance(dist.value as any)}
                  testID={`travel-distance-${dist.value}`}
                />
              ))}
            </ChipGroup>
          </YStack>

          {/* Event Duration */}
          <YStack>
            <SectionLabel>{t.wizard.eventDuration}</SectionLabel>
            <ChipGroup testID="event-duration-chips">
              {EVENT_DURATIONS.map(dur => (
                <Chip
                  key={dur.value}
                  label={dur.disabled ? `${dur.label} (${t.wizard.comingSoonBadge})` : dur.label}
                  selected={eventDuration === dur.value}
                  disabled={dur.disabled}
                  onPress={() => setEventDuration(dur.value as any)}
                  showCheckmark={!dur.disabled}
                  testID={`event-duration-${dur.value}`}
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
        nextDisabled={!isStepValid(3)}
      />
    </YStack>
  );
}
