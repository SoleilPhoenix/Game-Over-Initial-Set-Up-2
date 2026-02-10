/**
 * Wizard Step 1: Key Details (Mockup 7.1)
 * Party type, honoree name, city, participants, date with calendar picker
 */

import React, { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useWizardStore } from '@/stores/wizardStore';
import { Input } from '@/components/ui/Input';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { WizardFooter } from '@/components/ui/WizardFooter';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';

// PRD-defined cities: Berlin, Hamburg, Hannover
const AVAILABLE_CITIES = [
  { id: 'berlin', name: 'Berlin' },
  { id: 'hamburg', name: 'Hamburg' },
  { id: 'hannover', name: 'Hannover' },
];

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function WizardStep1() {
  const router = useRouter();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { t } = useTranslation();
  const {
    partyType,
    honoreeName,
    cityId,
    participantCount,
    startDate,
    setPartyType,
    setHonoreeName,
    setCityId,
    setParticipantCount,
    setDates,
    isStepValid,
  } = useWizardStore();

  const canProceed = isStepValid(1);

  const handleNext = () => {
    if (canProceed) {
      router.push('/create-event/preferences');
    }
  };

  const handleDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      const formatted = formatDate(date);
      setDates(formatted, formatted);
    }
  };

  const today = new Date();
  const maxDate = new Date(2035, 11, 31);

  return (
    <YStack flex={1} backgroundColor="$background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 160 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step Description */}
          {/* Party Type Selection */}
          <GlassPanel icon="sparkles" title={t.wizard.partyType} testID="panel-party-type">
            <YStack gap="$3">
              {/* Bachelor */}
              <XStack
                height={48}
                borderRadius="$full"
                backgroundColor={partyType === 'bachelor' ? DARK_THEME.primary : 'rgba(45, 55, 72, 0.6)'}
                borderWidth={1}
                borderColor={partyType === 'bachelor' ? DARK_THEME.primary : 'rgba(255, 255, 255, 0.08)'}
                alignItems="center"
                justifyContent="center"
                gap="$2"
                pressStyle={{ opacity: 0.8, scale: 0.98 }}
                onPress={() => setPartyType('bachelor')}
                testID="party-type-bachelor"
              >
                <Ionicons name="male" size={18} color={partyType === 'bachelor' ? '#FFFFFF' : '#9CA3AF'} />
                <Text fontWeight="600" color={partyType === 'bachelor' ? '#FFFFFF' : '$textPrimary'}>
                  {t.wizard.bachelor}
                </Text>
                {partyType === 'bachelor' && (
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                )}
              </XStack>

              {/* Bachelorette */}
              <XStack
                height={48}
                borderRadius="$full"
                backgroundColor={partyType === 'bachelorette' ? DARK_THEME.primary : 'rgba(45, 55, 72, 0.6)'}
                borderWidth={1}
                borderColor={partyType === 'bachelorette' ? DARK_THEME.primary : 'rgba(255, 255, 255, 0.08)'}
                alignItems="center"
                justifyContent="center"
                gap="$2"
                pressStyle={{ opacity: 0.8, scale: 0.98 }}
                onPress={() => setPartyType('bachelorette')}
                testID="party-type-bachelorette"
              >
                <Ionicons name="female" size={18} color={partyType === 'bachelorette' ? '#FFFFFF' : '#9CA3AF'} />
                <Text fontWeight="600" color={partyType === 'bachelorette' ? '#FFFFFF' : '$textPrimary'}>
                  {t.wizard.bachelorette}
                </Text>
                {partyType === 'bachelorette' && (
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                )}
              </XStack>
            </YStack>
          </GlassPanel>

          {/* Honoree's Name */}
          <GlassPanel icon="person" title={t.wizard.honoreeName} testID="panel-honoree">
            <Input
              placeholder={t.wizard.honoreeNamePlaceholder}
              value={honoreeName}
              onChangeText={setHonoreeName}
              testID="honoree-name-input"
            />
          </GlassPanel>

          {/* City Selection */}
          <GlassPanel icon="location" title={t.wizard.city} testID="panel-city">
            <ChipGroup testID="city-chips">
              {AVAILABLE_CITIES.map(city => (
                <Chip
                  key={city.id}
                  label={city.name}
                  selected={cityId === city.id}
                  onPress={() => setCityId(city.id)}
                  testID={`city-chip-${city.name.toLowerCase()}`}
                />
              ))}
            </ChipGroup>
          </GlassPanel>

          {/* Participants */}
          <GlassPanel
            icon="people"
            title={t.wizard.participantCount}
            rightElement={
              <YStack
                backgroundColor={DARK_THEME.primary}
                paddingHorizontal="$3"
                paddingVertical="$1"
                borderRadius="$full"
              >
                <Text color="#FFFFFF" fontWeight="700" fontSize="$3">
                  {participantCount}
                </Text>
              </YStack>
            }
            testID="panel-participants"
          >
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={1}
              maximumValue={30}
              step={1}
              value={participantCount}
              onValueChange={(value) => setParticipantCount(Math.round(value))}
              minimumTrackTintColor={DARK_THEME.primary}
              maximumTrackTintColor="rgba(255, 255, 255, 0.1)"
              thumbTintColor={DARK_THEME.primary}
              testID="participant-slider"
            />
            <XStack justifyContent="space-between" marginTop="$1">
              <Text fontSize="$1" color="$textTertiary">1</Text>
              <Text fontSize="$1" color="$textTertiary">30</Text>
            </XStack>
          </GlassPanel>

          {/* Date */}
          <GlassPanel icon="calendar" title={t.wizard.dateLabel} testID="panel-date">
            {/* Date input - tapping anywhere opens calendar */}
            <Pressable onPress={() => setShowDatePicker(true)}>
              <Input
                placeholder={t.wizard.datePlaceholder}
                value={startDate || ''}
                editable={false}
                pointerEvents="none"
                testID="date-input"
                rightIcon={
                  <Ionicons name="calendar-outline" size={22} color={DARK_THEME.primary} />
                }
                onRightIconPress={() => setShowDatePicker(true)}
              />
            </Pressable>

            {/* Calendar Picker */}
            {showDatePicker && (
              <YStack marginTop="$3">
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={today}
                  maximumDate={maxDate}
                  onChange={handleDateChange}
                  themeVariant="dark"
                  testID="date-picker"
                />
                {Platform.OS === 'ios' && (
                  <XStack justifyContent="flex-end" marginTop="$2">
                    <XStack
                      paddingHorizontal="$4"
                      paddingVertical="$2"
                      borderRadius="$full"
                      backgroundColor={DARK_THEME.primary}
                      pressStyle={{ opacity: 0.8 }}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text color="white" fontWeight="600" fontSize={14}>{t.common.done}</Text>
                    </XStack>
                  </XStack>
                )}
              </YStack>
            )}
          </GlassPanel>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <WizardFooter
        showBack={false}
        onNext={handleNext}
        nextLabel={`${t.wizard.nextStep} →`}
        nextDisabled={!canProceed}
      />
    </YStack>
  );
}
