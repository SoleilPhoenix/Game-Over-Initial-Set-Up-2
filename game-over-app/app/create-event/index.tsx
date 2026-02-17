/**
 * Wizard Step 1: Key Details (Mockup 7.1)
 * Party type, honoree name, city, participants, date with calendar picker
 */

import React, { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useWizardStore } from '@/stores/wizardStore';
import { OptionBlock, OptionBlockGroup } from '@/components/ui/OptionBlock';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { WizardFooter } from '@/components/ui/WizardFooter';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';

// PRD-defined cities: Berlin, Hamburg, Hannover
// UUIDs must match supabase/migrations/20260211000000_add_german_cities.sql
const AVAILABLE_CITIES = [
  { id: '550e8400-e29b-41d4-a716-446655440101', name: 'Berlin', slug: 'berlin' },
  { id: '550e8400-e29b-41d4-a716-446655440102', name: 'Hamburg', slug: 'hamburg' },
  { id: '550e8400-e29b-41d4-a716-446655440103', name: 'Hannover', slug: 'hannover' },
];

/** Returns ISO date string for storage (universally parseable across JS engines) */
function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]; // "2026-02-28"
}

/** Returns human-readable date string for display */
function formatDateDisplay(date: Date): string {
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
  const [isFocused, setIsFocused] = useState(false);
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
      const iso = formatDateISO(date);
      setDates(iso, iso);
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
          {/* Party Type Selection */}
          <GlassPanel icon="sparkles" title={t.wizard.partyType} testID="panel-party-type">
            <OptionBlockGroup>
              <OptionBlock
                label={t.wizard.bachelor}
                selected={partyType === 'bachelor'}
                onPress={() => setPartyType('bachelor')}
                testID="party-type-bachelor"
              />
              <OptionBlock
                label={t.wizard.bachelorette}
                selected={partyType === 'bachelorette'}
                onPress={() => setPartyType('bachelorette')}
                testID="party-type-bachelorette"
              />
            </OptionBlockGroup>
          </GlassPanel>

          {/* Honoree's Name */}
          <GlassPanel icon="person" title={t.wizard.honoreeName} testID="panel-honoree">
            <XStack
              height={48}
              borderRadius="$full"
              backgroundColor="rgba(45, 55, 72, 0.6)"
              borderWidth={isFocused ? 2 : 1}
              borderColor={isFocused ? DARK_THEME.primary : 'rgba(255, 255, 255, 0.08)'}
              alignItems="center"
              paddingHorizontal="$4"
            >
              <TextInput
                placeholder={t.wizard.honoreeNamePlaceholder}
                placeholderTextColor="#9CA3AF"
                value={honoreeName}
                onChangeText={setHonoreeName}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                  flex: 1,
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: '600',
                  height: '100%',
                }}
                testID="honoree-name-input"
              />
            </XStack>
          </GlassPanel>

          {/* City Selection */}
          <GlassPanel icon="location" title={t.wizard.city} testID="panel-city">
            <OptionBlockGroup testID="city-options">
              {AVAILABLE_CITIES.map(city => (
                <OptionBlock
                  key={city.id}
                  label={city.name}
                  selected={cityId === city.id}
                  onPress={() => setCityId(city.id)}
                  testID={`city-chip-${city.name.toLowerCase()}`}
                />
              ))}
            </OptionBlockGroup>
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
            <Pressable onPress={() => setShowDatePicker(true)}>
              <XStack
                height={48}
                borderRadius="$full"
                backgroundColor="rgba(45, 55, 72, 0.6)"
                borderWidth={1}
                borderColor="rgba(255, 255, 255, 0.08)"
                alignItems="center"
                paddingHorizontal="$4"
              >
                <Text
                  flex={1}
                  fontSize={15}
                  fontWeight="600"
                  color={startDate ? '#FFFFFF' : '#9CA3AF'}
                >
                  {startDate ? formatDateDisplay(new Date(startDate)) : t.wizard.datePlaceholder}
                </Text>
                <Ionicons name="calendar-outline" size={22} color={DARK_THEME.primary} />
              </XStack>
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
        nextLabel={`${t.wizard.nextStep} \u2192`}
        nextDisabled={!canProceed}
      />
    </YStack>
  );
}
