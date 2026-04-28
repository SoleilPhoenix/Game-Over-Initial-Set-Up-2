/**
 * Wizard Step 1 — Key Details (editorial redesign)
 * Matches mockup: numbered sections, party-type cards, underline name input,
 * full-width city photo cards. All existing logic is preserved.
 */

import React, { useState } from 'react';
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  Image,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useWizardStore } from '@/stores/wizardStore';
import { WizardFooter } from '@/components/ui/WizardFooter';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { getPackageImage } from '@/constants/packageImages';

// ─── City data ─────────────────────────────────────────────────────────────
// UUIDs must match supabase/migrations/20260211000000_add_german_cities.sql
const AVAILABLE_CITIES = [
  { id: '550e8400-e29b-41d4-a716-446655440101', name: 'Berlin',   slug: 'berlin' },
  { id: '550e8400-e29b-41d4-a716-446655440102', name: 'Hamburg',  slug: 'hamburg' },
  { id: '550e8400-e29b-41d4-a716-446655440103', name: 'Hannover', slug: 'hannover' },
];

// City emblem images — landmark panoramics, one per city
const CITY_EMBLEMS: Record<string, any> = {
  berlin:   require('../../src/constants/City_Emblems/Berlin.jpeg'),
  hamburg:  require('../../src/constants/City_Emblems/Hamburg.jpeg'),
  hannover: require('../../src/constants/City_Emblems/Hannover.jpeg'),
};

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Section header ────────────────────────────────────────────────────────
function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionNumber}>{number}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function WizardStep1() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, resolvedMode } = useTheme();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate]     = useState<Date>(new Date());
  const [nameFocused, setNameFocused]       = useState(false);
  const [lastFocused, setLastFocused]       = useState(false);

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
    if (canProceed) router.push('/create-event/preferences');
  };

  const handleDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      const iso = formatDateISO(date);
      setDates(iso, iso);
    }
  };

  const today   = new Date();
  const maxDate = new Date(2035, 11, 31);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 160 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── 01 Party Type ──────────────────────── */}
          <SectionHeader number="01" title={t.wizard.partyType} />
          <View style={styles.partyGrid}>
            {(['bachelor', 'bachelorette'] as const).map(type => {
              const selected = partyType === type;
              return (
                <Pressable
                  key={type}
                  testID={`party-type-${type}`}
                  onPress={() => setPartyType(type)}
                  style={({ pressed }) => [
                    styles.partyCard,
                    selected && styles.partyCardSelected,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  {/* Checkmark badge */}
                  {selected && (
                    <View style={styles.partyCheckBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#C6A75E" />
                    </View>
                  )}
                  {/* Icon */}
                  <Ionicons
                    name={type === 'bachelor' ? 'man' : 'woman'}
                    size={36}
                    color={selected ? '#C6A75E' : 'rgba(255,255,255,0.38)'}
                    style={{ marginBottom: 10 }}
                  />
                  {/* Label */}
                  <Text style={[styles.partyLabel, selected && styles.partyLabelSelected]}>
                    {type === 'bachelor' ? t.wizard.bachelor : t.wizard.bachelorette}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── 02 Honoree's Name ──────────────────── */}
          <SectionHeader number="02" title={t.wizard.honoreeName} />
          <View style={styles.nameRow}>
            {/* First name */}
            <View style={styles.nameCol}>
              <TextInput
                placeholder={t.wizard.honoreeNamePlaceholder}
                placeholderTextColor="rgba(255,255,255,0.32)"
                value={honoreeName}
                onChangeText={setHonoreeName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                style={styles.nameInput}
                testID="honoree-name-input"
              />
              <View style={[styles.nameUnderline, nameFocused && styles.nameUnderlineFocused]} />
            </View>
            {/* Last name */}
            <View style={styles.nameCol}>
              <TextInput
                placeholder={t.wizard.honoreeLastNamePlaceholder}
                placeholderTextColor="rgba(255,255,255,0.32)"
                value={honoreeLastName}
                onChangeText={setHonoreeLastName}
                onFocus={() => setLastFocused(true)}
                onBlur={() => setLastFocused(false)}
                style={styles.nameInput}
                testID="honoree-last-name-input"
              />
              <View style={[styles.nameUnderline, lastFocused && styles.nameUnderlineFocused]} />
            </View>
          </View>

          {/* ── 03 City ────────────────────────────── */}
          <SectionHeader number="03" title={t.wizard.city} />
          <View testID="city-options" style={{ gap: 16 }}>
            {AVAILABLE_CITIES.map(city => {
              const selected = cityId === city.id;
              return (
                <Pressable
                  key={city.id}
                  testID={`city-chip-${city.name.toLowerCase()}`}
                  onPress={() => setCityId(city.id)}
                  style={({ pressed }) => [
                    styles.cityCard,
                    selected && styles.cityCardSelected,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  {/* City emblem — full panoramic landmark image, cover-fills the card */}
                  <Image
                    source={CITY_EMBLEMS[city.slug]}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                  {/* Overlay */}
                  <View style={[
                    styles.cityOverlay,
                    selected && styles.cityOverlaySelected,
                  ]} />
                  {/* City name — centred */}
                  <Text style={styles.cityName}>{city.name}</Text>
                  {/* Star badge for selected */}
                  {selected && (
                    <View style={styles.cityStarBadge}>
                      <Ionicons name="star" size={14} color="#C6A75E" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* ── 04 Participants ────────────────────── */}
          <SectionHeader number="04" title={t.wizard.participantCount} />
          <View style={styles.sliderCard}>
            <View style={styles.sliderCountRow}>
              <Text style={styles.sliderCountLabel}>
                {partyType === 'bachelorette' ? t.wizard.inclBachelorette : t.wizard.inclBachelor}
              </Text>
              <View style={styles.sliderBadge}>
                <Text style={styles.sliderBadgeText}>{participantCount}</Text>
              </View>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={1}
              maximumValue={30}
              step={1}
              value={participantCount}
              onValueChange={v => setParticipantCount(Math.round(v))}
              minimumTrackTintColor="#C6A75E"
              maximumTrackTintColor="rgba(230,220,200,0.15)"
              thumbTintColor="#C6A75E"
              testID="participant-slider"
            />
            <View style={styles.sliderRange}>
              <Text style={styles.sliderRangeText}>1</Text>
              <Text style={styles.sliderRangeText}>30</Text>
            </View>
          </View>

          {/* ── 05 Date ────────────────────────────── */}
          <SectionHeader number="05" title={t.wizard.dateLabel} />
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.dateTrigger}
            testID="panel-date"
          >
            <Text style={[styles.dateTriggerText, !startDate && { color: 'rgba(255,255,255,0.32)' }]}>
              {startDate ? formatDateDisplay(new Date(startDate)) : t.wizard.datePlaceholder}
            </Text>
            <Ionicons name="calendar-outline" size={22} color="#C6A75E" />
          </Pressable>
          <View style={styles.nameUnderline} />

          {showDatePicker && (
            <View style={styles.datePickerWrap}>
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
                <Pressable onPress={() => setShowDatePicker(false)} style={styles.dateDoneBtn}>
                  <Text style={styles.dateDoneBtnText}>{t.common.done}</Text>
                </Pressable>
              )}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <WizardFooter
        showBack={false}
        onNext={handleNext}
        nextLabel={`${t.wizard.nextStep} →`}
        nextDisabled={!canProceed}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 28,
    marginBottom: 14,
  },
  sectionNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C6A75E',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Fraunces_600SemiBold',
  },

  // Party type
  partyGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  partyCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#1A2F47',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(230,220,200,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 20,
  },
  partyCardSelected: {
    backgroundColor: '#22385A',
    borderWidth: 2,
    borderColor: '#C6A75E',
  },
  partyCheckBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  partyLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
  },
  partyLabelSelected: {
    color: '#FFFFFF',
  },

  // Honoree name — side-by-side row
  nameRow: {
    flexDirection: 'row',
    gap: 16,
  },
  nameCol: {
    flex: 1,
  },
  nameInput: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  nameUnderline: {
    height: 1,
    backgroundColor: 'rgba(230,220,200,0.22)',
  },
  nameUnderlineFocused: {
    height: 2,
    backgroundColor: '#C6A75E',
  },

  // City cards
  cityCard: {
    height: 110,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(230,220,200,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityCardSelected: {
    borderWidth: 2,
    borderColor: '#C6A75E',
  },
  cityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,27,42,0.48)',
  },
  cityOverlaySelected: {
    backgroundColor: 'rgba(13,27,42,0.35)',
  },
  cityName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: 'Fraunces_600SemiBold',
    textAlign: 'center',
  },
  cityStarBadge: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(198,167,94,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Participants
  sliderCard: {
    backgroundColor: '#1A2F47',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(230,220,200,0.15)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  sliderCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sliderCountLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'Inter_400Regular',
  },
  sliderBadge: {
    backgroundColor: '#C6A75E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sliderBadgeText: {
    color: '#0D1B2A',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sliderRangeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.38)',
    fontFamily: 'Inter_400Regular',
  },

  // Date
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  dateTriggerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  datePickerWrap: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A2F47',
    padding: 4,
  },
  dateDoneBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#C6A75E',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    margin: 8,
  },
  dateDoneBtnText: {
    color: '#0D1B2A',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
