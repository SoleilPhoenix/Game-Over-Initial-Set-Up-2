/**
 * Wizard Step 1 — Key Details (editorial redesign)
 * Matches mockup: numbered sections, party-type cards, underline name input,
 * full-width city photo cards. All existing logic is preserved.
 */

import React, { useRef, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { ValidationToast } from '@/components/ui/ValidationToast';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useWizardStore } from '@/stores/wizardStore';
import { WizardFooter } from '@/components/ui/WizardFooter';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';

// ─── City data ─────────────────────────────────────────────────────────────
// UUIDs must match supabase/migrations/20260211000000_add_german_cities.sql
const AVAILABLE_CITIES = [
  { id: '550e8400-e29b-41d4-a716-446655440101', name: 'Berlin',   slug: 'berlin' },
  { id: '550e8400-e29b-41d4-a716-446655440102', name: 'Hamburg',  slug: 'hamburg' },
  { id: '550e8400-e29b-41d4-a716-446655440103', name: 'Hannover', slug: 'hannover' },
];

// City images — remote URLs from the editorial mockup (Google AIDA public CDN)
const CITY_IMAGES: Record<string, { uri: string }> = {
  berlin:   { uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgxrBdU89o7tvs4bDaRAoZ-O17Q3OVFE4farMy0fH5SlaYIsEJhYLARABvDAp5v5bj1yDeHe-hDLsRWO-hyzn3jnGhsKHUFI3Dnmv0inwIM-q0SE_ByxNrBpFYFN-gGoaqJFVpDKHKtw96uXscYZSIuWWt6sT0C6YUB1a5T_DmDmIff-xRRwEE6jYi6nn9L5I5ENWJ-lBC5oF6rsDHEAWyZ9NFea_XXSMkKS7y0sYPMfwV-Kwp63wBOGPltOvhfNkxfzCeJMefVGM' },
  hamburg:  { uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvMThvPgYuPWon4r9vgnmTIK70E3Uza34T9HJ9dJEppKCScHbP5LS19cNDIUEVs1qyxt-AVndCAGqyXiH9nhM5f1hajnS5ZP6o-PHW6YWFIt6K7R7ShsEXXrIQRGzZepxdUxRT5HS4vOoCheuZzP_QYRx_uDwhKDsNF3F7CCa8OEfczhig4RFDNeGsyZUXRjnl8OnxudOux-Uzgb3LnFPK0U_k-v81zQqb9QlqzTpVekslV6xdqgy8vqQxupWkQWil1R1OHSpOKaI' },
  hannover: { uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzEdsj_W_mR7eoyIne9RZKZrGjMdPUGDe_McnhQpCn-fGFjoQKr54W4jaaupyB9t1pC4rIlftsEJybzPbdLfM6rqq8Keflsza4VJcwy2QWufu1icps4vEKMaCj2sCIrdPsnr1ZEUxdloElO77CsFfxjOCze_cjKj2yuuJXSostuYnru0-9ZQ1hr3B4l_MBZyfGJMoynwcOKL7WrVPQ4EuEFn0YfhkAzqh6p6_ZQDJYpCntO0Apr3vdPuHfml5zLLi_vykTllgY4Yc' },
};

// Focal-point offsets so each city photo shows its most interesting area
const CITY_CONTENT_POSITION: Record<string, { left: string; top: string }> = {
  berlin:   { left: '75%', top: '25%' },  // right + up
  hamburg:  { left: '50%', top: '20%' },  // centre + up
  hannover: { left: '70%', top: '65%' },  // right + down
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
  const { t, language } = useTranslation();
  const { resolvedMode } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  // 2-col grid: screen minus container padding (20×2) minus gap between columns (10)
  const cityCardWidth = (screenWidth - 40 - 10) / 2;

  const scrollRef = useRef<ScrollView>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate]     = useState<Date>(new Date());
  const [nameFocused, setNameFocused]       = useState(false);
  const [lastFocused, setLastFocused]       = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);

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

  const handleNextDisabled = () => {
    const missing: string[] = [];
    if (!partyType) missing.push('Party type (01)');
    if (!honoreeName.trim()) missing.push("Honoree's name (02)");
    if (!cityId) missing.push('City (03)');
    if (!startDate) missing.push('Date (05)');
    if (missing.length > 0) setValidationErrors(missing);
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
          ref={scrollRef}
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
          <View testID="city-options" style={styles.cityGrid}>
            {AVAILABLE_CITIES.map(city => {
              const selected = cityId === city.id;
              return (
                <Pressable
                  key={city.id}
                  testID={`city-chip-${city.name.toLowerCase()}`}
                  onPress={() => setCityId(city.id)}
                  style={({ pressed }) => [
                    styles.cityCard,
                    { width: cityCardWidth },
                    selected && styles.cityCardSelected,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  {/* City photo */}
                  <ExpoImage
                    source={CITY_IMAGES[city.slug]}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                    contentPosition={CITY_CONTENT_POSITION[city.slug] ?? { left: '50%', top: '50%' }}
                    cachePolicy="memory-disk"
                  />
                  {/* Desaturating overlay — heavy for unselected, light for selected */}
                  <View style={[
                    StyleSheet.absoluteFillObject,
                    selected ? styles.cityOverlaySelected : styles.cityOverlayUnselected,
                  ]} />
                  {/* Bottom gradient for name legibility */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.70)']}
                    locations={[0.25, 1]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  {/* City name — bottom-left */}
                  <Text style={styles.cityName}>{city.name}</Text>
                  {/* Checkmark when selected */}
                  {selected && (
                    <View style={styles.cityCheckBadge}>
                      <Ionicons name="checkmark-circle" size={22} color="#C6A75E" />
                    </View>
                  )}
                </Pressable>
              );
            })}

            {/* 4th card — Coming Soon placeholder */}
            <View style={[styles.cityCard, styles.cityCardComingSoon, { width: cityCardWidth }]}>
              <LinearGradient
                colors={['#12253A', '#0D1B2A']}
                style={StyleSheet.absoluteFillObject}
              />
              <Ionicons name="location-outline" size={28} color="rgba(198,167,94,0.35)" />
              <Text style={styles.comingSoonTitle}>{t.wizard.moreCities}</Text>
              <Text style={styles.comingSoonSub}>{t.profile.comingSoon}</Text>
            </View>
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
            onPress={() => {
              Keyboard.dismiss();
              setShowDatePicker(true);
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
            }}
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
                locale={language === 'de' ? 'de-DE' : 'en-US'}
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

      {validationErrors && (
        <ValidationToast fields={validationErrors} onDismiss={() => setValidationErrors(null)} />
      )}
      {/* Footer */}
      <WizardFooter
        showBack={false}
        onNext={handleNext}
        onNextDisabledPress={handleNextDisabled}
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
    fontFamily: 'Inter_600SemiBold',
  },

  // Party type
  partyGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  partyCard: {
    flex: 1,
    height: 100,
    backgroundColor: '#1A2F47',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(230,220,200,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 12,
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

  // City grid (2-column)
  cityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cityCard: {
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(230,220,200,0.12)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  cityCardSelected: {
    borderWidth: 2,
    borderColor: '#C6A75E',
  },
  cityCardComingSoon: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderStyle: 'dashed',
    borderColor: 'rgba(198,167,94,0.25)',
  },
  cityOverlaySelected: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cityOverlayUnselected: {
    backgroundColor: 'rgba(13,27,42,0.65)',
  },
  cityName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cityCheckBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  comingSoonTitle: {
    color: 'rgba(198,167,94,0.55)',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginTop: 4,
  },
  comingSoonSub: {
    color: 'rgba(255,255,255,0.28)',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
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
