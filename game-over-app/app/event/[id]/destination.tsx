/**
 * Destination Guide Screen
 * City-specific tips, real links, emergency contacts for Berlin / Hamburg / Hannover
 */

import React from 'react';
import { ScrollView, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent } from '@/hooks/queries/useEvents';
import { useBooking } from '@/hooks/queries/useBookings';
import { DARK_THEME } from '@/constants/theme';
import { getEventImage, resolveImageSource } from '@/constants/packageImages';

// ─── German City Data ─────────────────────────────────────────────────────────
interface CityHighlight {
  label: string;
  url: string;
}

interface EmergencyContact {
  label: string;
  icon: string;
  iconColor: string;
  number: string;
  action: () => void;
}

interface CityData {
  tagline: string;
  highlights: CityHighlight[];
  weatherUrl: string;
  mapSearchQuery: string; // for Open in Maps
}

const CITY_DATA: Record<string, CityData> = {
  berlin: {
    tagline: 'Hauptstadt der Nacht — Capital of the Night',
    highlights: [
      { label: 'Local Attractions', url: 'https://www.visitberlin.de/en/sights-berlin' },
      { label: 'Dining Options', url: 'https://www.visitberlin.de/en/eat-drink-berlin' },
      { label: 'Entertainment Venues', url: 'https://www.visitberlin.de/en/events-berlin' },
    ],
    weatherUrl: 'https://wttr.in/Berlin',
    mapSearchQuery: 'Berlin, Germany',
  },
  hamburg: {
    tagline: 'Gateway to the World — Tor zur Welt',
    highlights: [
      { label: 'Local Attractions', url: 'https://www.hamburg-tourism.de/en/sights-museums/' },
      { label: 'Dining Options', url: 'https://www.hamburg-tourism.de/en/eat-drink/' },
      { label: 'Entertainment Venues', url: 'https://www.hamburg-tourism.de/en/events/' },
    ],
    weatherUrl: 'https://wttr.in/Hamburg',
    mapSearchQuery: 'Hamburg, Germany',
  },
  hannover: {
    tagline: 'Größer als du denkst — Bigger than you think',
    highlights: [
      { label: 'Local Attractions', url: 'https://www.hannover.de/Leben-in-der-Region-Hannover/Tourismus-Freizeit' },
      { label: 'Dining Options', url: 'https://www.hannover.de/Leben-in-der-Region-Hannover/Tourismus-Freizeit/Gastronomie' },
      { label: 'Entertainment Venues', url: 'https://www.hannover.de/Leben-in-der-Region-Hannover/Tourismus-Freizeit/Veranstaltungen' },
    ],
    weatherUrl: 'https://wttr.in/Hannover',
    mapSearchQuery: 'Hannover, Germany',
  },
};

const FALLBACK_CITY: CityData = {
  tagline: 'Explore your destination',
  highlights: [
    { label: 'Local Attractions', url: 'https://www.google.com/search?q=local+attractions' },
    { label: 'Dining Options', url: 'https://www.google.com/search?q=restaurants+nearby' },
    { label: 'Entertainment Venues', url: 'https://www.google.com/search?q=entertainment+venues' },
  ],
  weatherUrl: 'https://wttr.in',
  mapSearchQuery: 'Germany',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function openMapsForCity(query: string) {
  const encoded = encodeURIComponent(query);
  if (Platform.OS === 'ios') {
    Linking.openURL(`maps://?q=${encoded}`);
  } else {
    Linking.openURL(`https://maps.google.com/?q=${encoded}`);
  }
}

function openTransportation(cityName: string) {
  const query = encodeURIComponent(`public transport ${cityName}`);
  if (Platform.OS === 'ios') {
    Linking.openURL(`maps://?q=${query}`);
  } else {
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  }
}

function openHospitalSearch(cityName: string) {
  const query = encodeURIComponent(`hospitals near ${cityName}`);
  if (Platform.OS === 'ios') {
    Linking.openURL(`maps://?q=${query}`);
  } else {
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: event, isLoading } = useEvent(id);
  const { data: booking } = useBooking(id);

  if (isLoading || !event) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DARK_THEME.background }}>
        <Spinner size="large" color={DARK_THEME.primary} />
      </View>
    );
  }

  const cityName = event.city?.name || 'Berlin';
  const citySlug = cityName.toLowerCase() as keyof typeof CITY_DATA;
  const city = CITY_DATA[citySlug] || FALLBACK_CITY;

  // German emergency contacts — same for all cities
  const emergencyContacts = [
    {
      label: 'Notruf (Emergency)',
      icon: 'shield',
      iconColor: '#EF4444',
      iconBg: 'rgba(239, 68, 68, 0.15)',
      number: '112',
      onPress: () => Linking.openURL('tel:112'),
    },
    {
      label: 'Polizei (Police)',
      icon: 'shield-checkmark',
      iconColor: '#3B82F6',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      number: '110',
      onPress: () => Linking.openURL('tel:110'),
    },
    {
      label: 'Ärztlicher Bereitschaftsdienst',
      icon: 'medkit',
      iconColor: '#10B981',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      number: '116 117',
      onPress: () => Linking.openURL('tel:116117'),
    },
    {
      label: 'Nächstes Krankenhaus',
      icon: 'add-circle',
      iconColor: '#F59E0B',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      number: 'In Maps',
      onPress: () => openHospitalSearch(cityName),
    },
  ];

  // Use the same package-tier image as the rest of the app for consistency
  const bookingPkgId = (booking as any)?.selected_package_id || event?.hero_image_url;
  const heroImage = getEventImage(citySlug, bookingPkgId);

  return (
    <View style={styles.container}>
      {/* ─── Hero Header ─────────────────────────── */}
      <View style={styles.heroContainer}>
        <Image
          source={resolveImageSource(heroImage)}
          style={styles.heroImage}
          resizeMode="cover"
        />
        {/* Dark overlay */}
        <View style={styles.heroOverlay} />
        {/* Back button */}
        <Pressable
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => router.back()}
          hitSlop={8}
          testID="back-button"
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        {/* Title */}
        <View style={styles.heroContent}>
          <Text style={styles.heroSupertitle}>DESTINATION GUIDE</Text>
          <Text style={styles.heroTitle}>{cityName}</Text>
          <Text style={styles.heroSubtitle}>{city.tagline}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Highlights ──────────────────────────── */}
        <Text style={styles.sectionTitle}>Highlights</Text>
        <View style={styles.highlightRow}>
          {city.highlights.map((h, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [styles.highlightChip, pressed && { opacity: 0.75 }]}
              onPress={() => Linking.openURL(h.url)}
            >
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.highlightText}>{h.label}</Text>
              <Ionicons name="open-outline" size={11} color={DARK_THEME.textTertiary} />
            </Pressable>
          ))}
        </View>

        {/* ─── Local Tips ──────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Local Tips</Text>
        <View style={styles.tipsCard}>
          {/* Check Weather */}
          <Pressable
            style={({ pressed }) => [styles.tipRow, pressed && { opacity: 0.7 }]}
            onPress={() => Linking.openURL(city.weatherUrl)}
          >
            <XStack alignItems="center" gap={10} flex={1}>
              <View style={[styles.tipIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="partly-sunny" size={16} color="#F59E0B" />
              </View>
              <YStack flex={1}>
                <Text style={styles.tipLabel}>Check local weather</Text>
                <Text style={styles.tipUrl}>wttr.in/{cityName}</Text>
              </YStack>
              <Ionicons name="open-outline" size={15} color={DARK_THEME.textTertiary} />
            </XStack>
          </Pressable>

          <View style={styles.tipDivider} />

          {/* Transportation */}
          <Pressable
            style={({ pressed }) => [styles.tipRow, pressed && { opacity: 0.7 }]}
            onPress={() => openTransportation(cityName)}
          >
            <XStack alignItems="center" gap={10} flex={1}>
              <View style={[styles.tipIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="train" size={16} color="#3B82F6" />
              </View>
              <YStack flex={1}>
                <Text style={styles.tipLabel}>Research transportation options</Text>
                <Text style={styles.tipUrl}>Open in {Platform.OS === 'ios' ? 'Apple Maps' : 'Google Maps'}</Text>
              </YStack>
              <Ionicons name="map-outline" size={15} color={DARK_THEME.textTertiary} />
            </XStack>
          </Pressable>
        </View>

        {/* ─── Emergency Contacts ───────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Emergency Contacts</Text>
        <View style={styles.emergencyCard}>
          {emergencyContacts.map((contact, i) => (
            <React.Fragment key={contact.label}>
              {i > 0 && <View style={styles.tipDivider} />}
              <Pressable
                style={({ pressed }) => [styles.emergencyRow, pressed && { opacity: 0.7 }]}
                onPress={contact.onPress}
              >
                <View style={[styles.emergencyIcon, { backgroundColor: contact.iconBg }]}>
                  <Ionicons name={contact.icon as any} size={16} color={contact.iconColor} />
                </View>
                <Text style={styles.emergencyLabel} flex={1}>{contact.label}</Text>
                <Text style={[styles.emergencyNumber, { color: contact.iconColor }]}>{contact.number}</Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        {/* ─── Open in Maps ────────────────────────── */}
        <Pressable
          style={({ pressed }) => [styles.mapsButton, pressed && { opacity: 0.8 }]}
          onPress={() => openMapsForCity(city.mapSearchQuery)}
          testID="open-maps-button"
        >
          <Ionicons name="map" size={20} color="#5A7EB0" />
          <Text style={styles.mapsButtonText}>Open in Maps</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  heroContainer: {
    height: 240,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  heroSupertitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
    marginBottom: 12,
  },
  highlightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  tipsCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    overflow: 'hidden',
  },
  tipRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  tipUrl: {
    fontSize: 12,
    color: DARK_THEME.textTertiary,
    marginTop: 1,
  },
  tipDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 14,
  },
  emergencyCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    overflow: 'hidden',
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  emergencyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyLabel: {
    fontSize: 13,
    color: DARK_THEME.textSecondary,
  },
  emergencyNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    paddingVertical: 16,
  },
  mapsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5A7EB0',
  },
});
