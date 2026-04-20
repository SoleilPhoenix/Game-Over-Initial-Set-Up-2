/**
 * Wizard Step 1: Key Details — Editorial re-skin (content-preserving).
 * Party type, honoree name, city, participants, date with calendar picker.
 * Uses useTheme() tokens; GlassPanel/OptionBlock retain their own styling
 * (they'll receive their own editorial pass in Phase C).
 */

import React, { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Pressable, TextInput, Image, View, StyleSheet } from 'react-native';
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
import { useTheme } from '@/hooks/useTheme';
import { getPackageImage } from '@/constants/packageImages';

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
  const [isFocusedFirst, setIsFocusedFirst] = useState(false);
  const [isFocusedLast, setIsFocusedLast] = useState(false);
  const { t } = useTranslation();
  const { theme, resolvedMode } = useTheme();
  const {
    partyType,
    honoreeName,
    honoreeLastName,
    cityId,
    participantCount,
    startDate,
    setPartyType,
    setHonoreeName,
    setHonoreeLastName,
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

  // Input field styling — reused across first name, last name, and date picker.
  const inputFieldStyle = {
    height: 48,
    borderRadius: 999,
    backgroundColor: theme.surfaceHigh,
    paddingHorizontal: 16,
  } as const;

  return (
    <YStack flex={1} backgroundColor={theme.background}>
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
            <XStack gap={10}>
              {/* First Name */}
              <XStack
                flex={1}
                {...inputFieldStyle}
                borderWidth={isFocusedFirst ? 2 : 1}
                borderColor={isFocusedFirst ? theme.accentGold : theme.ghostBorder}
                alignItems="center"
              >
                <TextInput
                  placeholder={t.wizard.honoreeNamePlaceholder}
                  placeholderTextColor={theme.textTertiary}
                  value={honoreeName}
                  onChangeText={setHonoreeName}
                  onFocus={() => setIsFocusedFirst(true)}
                  onBlur={() => setIsFocusedFirst(false)}
                  style={{ flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: '600', height: '100%' }}
                  testID="honoree-name-input"
                />
              </XStack>
              {/* Last Name */}
              <XStack
                flex={1}
                {...inputFieldStyle}
                borderWidth={isFocusedLast ? 2 : 1}
                borderColor={isFocusedLast ? theme.accentGold : theme.ghostBorder}
                alignItems="center"
              >
                <TextInput
                  placeholder={t.wizard.honoreeLastNamePlaceholder}
                  placeholderTextColor={theme.textTertiary}
                  value={honoreeLastName}
                  onChangeText={setHonoreeLastName}
                  onFocus={() => setIsFocusedLast(true)}
                  onBlur={() => setIsFocusedLast(false)}
                  style={{ flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: '600', height: '100%' }}
                  testID="honoree-last-name-input"
                />
              </XStack>
            </XStack>
          </GlassPanel>

          {/* City Selection */}
          <GlassPanel icon="location" title={t.wizard.city} testID="panel-city">
            <View style={{ gap: 10 }} testID="city-options">
              {AVAILABLE_CITIES.map(city => {
                const isSelected = cityId === city.id;
                return (
                  <Pressable
                    key={city.id}
                    testID={`city-chip-${city.name.toLowerCase()}`}
                    onPress={() => setCityId(city.id)}
                    style={{
                      borderRadius: 14,
                      overflow: 'hidden',
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? theme.accentGold : theme.ghostBorder,
                    }}
                  >
                    <View style={{ height: 88, overflow: 'hidden' }}>
                      <Image
                        source={getPackageImage(city.slug, 'classic')}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                      />
                      <View style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: 'rgba(13,27,42,0.42)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.4 }}>
                          {city.name}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={{ position: 'absolute', top: 8, right: 10 }}>
                          <Ionicons name="checkmark-circle" size={20} color={theme.accentGold} />
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </GlassPanel>

          {/* Participants */}
          <GlassPanel
            icon="people"
            title={t.wizard.participantCount}
            rightElement={
              <YStack
                backgroundColor={theme.accentGold}
                paddingHorizontal="$3"
                paddingVertical="$1"
                borderRadius="$full"
              >
                <Text color={theme.textOnPrimary} fontWeight="700" fontSize="$3">
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
              minimumTrackTintColor={theme.accentGold}
              maximumTrackTintColor={theme.ghostBorder}
              thumbTintColor={theme.accentGold}
              testID="participant-slider"
            />
            <XStack justifyContent="space-between" marginTop="$1">
              <Text fontSize="$1" color={theme.textTertiary}>1</Text>
              <Text fontSize="$1" color={theme.textTertiary}>30</Text>
            </XStack>
            <Text fontSize={12} color={theme.textTertiary} textAlign="center" marginTop="$2">
              {partyType === 'bachelorette' ? t.wizard.inclBachelorette : t.wizard.inclBachelor}
            </Text>
          </GlassPanel>

          {/* Date */}
          <GlassPanel icon="calendar" title={t.wizard.dateLabel} testID="panel-date">
            <Pressable onPress={() => setShowDatePicker(true)}>
              <XStack
                {...inputFieldStyle}
                borderWidth={1}
                borderColor={theme.ghostBorder}
                alignItems="center"
              >
                <Text
                  flex={1}
                  fontSize={15}
                  fontWeight="600"
                  color={startDate ? theme.textPrimary : theme.textTertiary}
                >
                  {startDate ? formatDateDisplay(new Date(startDate)) : t.wizard.datePlaceholder}
                </Text>
                <Ionicons name="calendar-outline" size={22} color={theme.accentGold} />
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
                  themeVariant={resolvedMode}
                  testID="date-picker"
                />
                {Platform.OS === 'ios' && (
                  <XStack justifyContent="flex-end" marginTop="$2">
                    <XStack
                      paddingHorizontal="$4"
                      paddingVertical="$2"
                      borderRadius="$full"
                      backgroundColor={theme.accentGold}
                      pressStyle={{ opacity: 0.8 }}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text color={theme.textOnPrimary} fontWeight="600" fontSize={14}>{t.common.done}</Text>
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
