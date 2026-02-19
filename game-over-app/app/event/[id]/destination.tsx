/**
 * Destination Guide Screen
 * City-specific tips, real links, emergency contacts for Berlin / Hamburg / Hannover
 */

import React, { useState } from 'react';
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
interface LocalPlace {
  name: string;
  type: string;
  description: string;
}

interface CityData {
  tagline: string;
  lat: number;
  lon: number;
  taxi: { label: string; number: string };
  places: {
    attractions: LocalPlace[];
    dining: LocalPlace[];
    entertainment: LocalPlace[];
  };
}

const CITY_DATA: Record<string, CityData> = {
  berlin: {
    tagline: 'Hauptstadt der Nacht — Capital of the Night',
    lat: 52.5200,
    lon: 13.4050,
    taxi: { label: 'Taxi Berlin', number: '030 202020' },
    places: {
      attractions: [
        { name: 'Brandenburg Gate', type: 'Landmark', description: 'Iconic neoclassical monument, symbol of Berlin.' },
        { name: 'Museum Island', type: 'Culture', description: '5 world-class museums on a UNESCO island in the Spree.' },
        { name: 'East Side Gallery', type: 'Street Art', description: '1.3 km of original Berlin Wall murals.' },
        { name: 'Reichstag Building', type: 'Architecture', description: 'Germany\'s parliament with a stunning glass dome.' },
        { name: 'Checkpoint Charlie', type: 'History', description: 'Famous Cold War border crossing with open-air museum.' },
      ],
      dining: [
        { name: 'Rutz Restaurant', type: 'Fine Dining', description: 'Michelin-starred modern German cuisine in Mitte.' },
        { name: 'Markthalle Neun', type: 'Market Hall', description: 'Historic market hall with street food & local products.' },
        { name: 'Curry 36', type: 'Street Food', description: 'Berlin\'s most beloved currywurst stand since 1981.' },
        { name: 'Katz Orange', type: 'Farm-to-Table', description: 'Sustainable German cuisine in a stunning courtyard.' },
        { name: 'Brlo Brwhouse', type: 'Craft Beer & Food', description: 'Craft brewery with BBQ in a unique shipping container setup.' },
      ],
      entertainment: [
        { name: 'Berghain', type: 'Techno Club', description: 'World-famous techno club in a converted power station.' },
        { name: 'Watergate', type: 'Club', description: 'Riverside club with panoramic windows over the Spree.' },
        { name: 'SO36', type: 'Live Music', description: 'Legendary punk and alternative music venue since 1978.' },
        { name: 'KitKatClub', type: 'Club', description: 'Eclectic, inclusive party venue in Mitte.' },
        { name: 'Admiralspalast', type: 'Theater', description: 'Historic entertainment palace with diverse shows.' },
      ],
    },
  },
  hamburg: {
    tagline: 'Gateway to the World — Tor zur Welt',
    lat: 53.5753,
    lon: 10.0153,
    taxi: { label: 'Hansa-Taxi', number: '040 211211' },
    places: {
      attractions: [
        { name: 'Elbphilharmonie', type: 'Concert Hall', description: 'Stunning glass concert hall atop a warehouse — must-see.' },
        { name: 'Miniatur Wunderland', type: 'Museum', description: 'World\'s largest model railway exhibition.' },
        { name: 'Hamburg Speicherstadt', type: 'Historic District', description: 'UNESCO-listed red-brick warehouse district.' },
        { name: 'Reeperbahn', type: 'Entertainment Mile', description: 'Hamburg\'s famous nightlife and entertainment street.' },
        { name: 'Planten un Blomen', type: 'Park', description: 'Beautiful park with botanical gardens and water light concerts.' },
      ],
      dining: [
        { name: 'Die Bank', type: 'Brasserie', description: 'Upscale brasserie in a converted bank building.' },
        { name: 'Fischereihafen Restaurant', type: 'Seafood', description: 'Classic Hamburg seafood with harbor views.' },
        { name: 'Fischmarkt', type: 'Fish Market', description: 'Sunday morning fish market with fresh catches since 1703.' },
        { name: 'Haferbar', type: 'Brunch', description: 'Trendy brunch spot with creative grain bowls.' },
        { name: 'Clouds Heaven\'s Bar & Kitchen', type: 'Sky Bar', description: 'Rooftop dining with panoramic Hamburg views.' },
      ],
      entertainment: [
        { name: 'Reeperbahn Clubs', type: 'Club District', description: 'Hamburg\'s legendary nightlife strip with dozens of venues.' },
        { name: 'Mojo Club', type: 'Jazz & Soul', description: 'Legendary underground club focused on jazz and soul.' },
        { name: 'Docks', type: 'Live Music', description: 'Major live music venue and concert hall.' },
        { name: 'Gruenspan', type: 'Rock Club', description: 'Intimate rock venue where The Beatles once played.' },
        { name: 'Elphi Plaza', type: 'Public Space', description: 'Free public viewing platform with stunning harbor views.' },
      ],
    },
  },
  hannover: {
    tagline: 'Größer als du denkst — Bigger than you think',
    lat: 52.3759,
    lon: 9.7320,
    taxi: { label: 'Funktaxi Hannover', number: '0511 38101' },
    places: {
      attractions: [
        { name: 'Herrenhäuser Gärten', type: 'Royal Gardens', description: 'Stunning baroque royal gardens — among Germany\'s finest.' },
        { name: 'Neues Rathaus', type: 'Architecture', description: 'Magnificent city hall with panoramic dome elevator.' },
        { name: 'Maschsee', type: 'Lake', description: 'Artificial lake perfect for walks, water sports and events.' },
        { name: 'Hannover Zoo', type: 'Zoo', description: 'One of Europe\'s most modern and exciting zoos.' },
        { name: 'Altes Rathaus', type: 'Historic', description: 'Gothic old town hall dating from the 15th century.' },
      ],
      dining: [
        { name: 'Pier 51', type: 'Fine Dining', description: 'Lakeside restaurant at Maschsee with refined German cuisine.' },
        { name: 'Loccumer Hof', type: 'Traditional', description: 'Classic Lower Saxony cuisine in a historic setting.' },
        { name: 'Markthalle Hannover', type: 'Market', description: 'Bustling indoor market with fresh local products.' },
        { name: 'Ernst August Brauerei', type: 'Brewery', description: 'Historic brewery with traditional Hannoversches Bier.' },
        { name: 'Café Kröpcke', type: 'Café', description: 'Iconic café in the heart of the city since 1905.' },
      ],
      entertainment: [
        { name: 'GOP Varieté', type: 'Variety Theater', description: 'World-class variety shows and cabaret performances.' },
        { name: 'Lux Hannover', type: 'Club', description: 'Hannover\'s premier electronic music club.' },
        { name: 'Klagesmarkt', type: 'Night District', description: 'Central area with bars and clubs for every taste.' },
        { name: 'HAZ-Palladium', type: 'Concert Venue', description: 'Major concert hall hosting national and international acts.' },
        { name: 'Staatsoper Hannover', type: 'Opera', description: 'Renowned opera house with a rich classical program.' },
      ],
    },
  },
};

const FALLBACK_CITY: CityData = {
  tagline: 'Explore your destination',
  lat: 52.5200,
  lon: 13.4050,
  taxi: { label: 'Local Taxi', number: '110' },
  places: {
    attractions: [],
    dining: [],
    entertainment: [],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Open city location using coordinates to avoid wrong-country results */
function openMapsForCity(lat: number, lon: number, label: string) {
  const encoded = encodeURIComponent(label);
  if (Platform.OS === 'ios') {
    // Use ll= (lat,lon) + q= for Apple Maps to pin exact location
    Linking.openURL(`maps://?ll=${lat},${lon}&q=${encoded}`);
  } else {
    Linking.openURL(`https://maps.google.com/?q=${lat},${lon}`);
  }
}

/** Open native Weather app for iOS 16+, otherwise web fallback */
function openWeather(lat: number, lon: number, cityName: string) {
  if (Platform.OS === 'ios') {
    // iOS 16+ Weather app deep link via apple maps query (triggers Siri weather handoff)
    Linking.canOpenURL('weather://').then(supported => {
      if (supported) {
        Linking.openURL(`weather://?lat=${lat}&lon=${lon}`);
      } else {
        // Fallback: open Safari with weather.com for the city
        Linking.openURL(`https://weather.com/weather/today/l/${lat},${lon}`);
      }
    });
  } else {
    Linking.openURL(`https://weather.com/weather/today/l/${lat},${lon}`);
  }
}

function openTransportation(lat: number, lon: number, cityName: string) {
  const query = encodeURIComponent(`${cityName} public transport`);
  if (Platform.OS === 'ios') {
    Linking.openURL(`maps://?ll=${lat},${lon}&q=${query}&dirflg=r`);
  } else {
    Linking.openURL(`https://maps.google.com/?q=${query}&travelmode=transit`);
  }
}

function openHospitalSearch(lat: number, lon: number, cityName: string) {
  const query = encodeURIComponent(`hospital`);
  if (Platform.OS === 'ios') {
    Linking.openURL(`maps://?ll=${lat},${lon}&q=${query}`);
  } else {
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  }
}

type PopupCategory = 'attractions' | 'dining' | 'entertainment' | null;

const CATEGORY_CONFIG: Record<NonNullable<PopupCategory>, { label: string; icon: string; color: string }> = {
  attractions: { label: 'Local Attractions', icon: 'telescope-outline', color: '#F59E0B' },
  dining: { label: 'Dining Options', icon: 'restaurant-outline', color: '#10B981' },
  entertainment: { label: 'Entertainment', icon: 'musical-notes-outline', color: '#8B5CF6' },
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [popupCategory, setPopupCategory] = useState<PopupCategory>(null);

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
      label: 'Taxi — ' + city.taxi.label,
      icon: 'car',
      iconColor: '#F59E0B',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      number: city.taxi.number,
      onPress: () => Linking.openURL(`tel:${city.taxi.number.replace(/\s/g, '')}`),
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
      iconColor: '#9CA3AF',
      iconBg: 'rgba(156, 163, 175, 0.15)',
      number: 'In Maps',
      onPress: () => openHospitalSearch(city.lat, city.lon, cityName),
    },
  ];

  // Use the same package-tier image as the rest of the app for consistency
  const bookingPkgId = (booking as any)?.selected_package_id || event?.hero_image_url;
  const heroImage = getEventImage(citySlug, bookingPkgId);

  // Popup places list
  const popupConfig = popupCategory ? CATEGORY_CONFIG[popupCategory] : null;
  const popupPlaces = popupCategory ? city.places[popupCategory] : [];

  return (
    <View style={styles.container}>
      {/* ─── Hero Header ─────────────────────────── */}
      <View style={styles.heroContainer}>
        <Image
          source={resolveImageSource(heroImage)}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay} />
        <Pressable
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => router.back()}
          hitSlop={8}
          testID="back-button"
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
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
        {/* ─── Highlights (in-app popup) ────────────── */}
        <Text style={styles.sectionTitle}>Highlights</Text>
        <View style={styles.highlightRow}>
          {(Object.keys(CATEGORY_CONFIG) as NonNullable<PopupCategory>[]).map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <Pressable
                key={cat}
                style={({ pressed }) => [styles.highlightChip, pressed && { opacity: 0.75 }]}
                onPress={() => setPopupCategory(cat)}
              >
                <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                <Text style={styles.highlightText}>{cfg.label}</Text>
                <Ionicons name="chevron-forward" size={12} color={DARK_THEME.textTertiary} />
              </Pressable>
            );
          })}
        </View>

        {/* ─── Local Tips ──────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Local Tips</Text>
        <View style={styles.tipsCard}>
          {/* Check Weather */}
          <Pressable
            style={({ pressed }) => [styles.tipRow, pressed && { opacity: 0.7 }]}
            onPress={() => openWeather(city.lat, city.lon, cityName)}
          >
            <XStack alignItems="center" gap={10} flex={1}>
              <View style={[styles.tipIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="partly-sunny" size={16} color="#F59E0B" />
              </View>
              <YStack flex={1}>
                <Text style={styles.tipLabel}>Check local weather</Text>
                <Text style={styles.tipUrl}>
                  {Platform.OS === 'ios' ? 'Open in Weather App' : 'weather.com'}
                </Text>
              </YStack>
              <Ionicons name="open-outline" size={15} color={DARK_THEME.textTertiary} />
            </XStack>
          </Pressable>

          <View style={styles.tipDivider} />

          {/* Transportation */}
          <Pressable
            style={({ pressed }) => [styles.tipRow, pressed && { opacity: 0.7 }]}
            onPress={() => openTransportation(city.lat, city.lon, cityName)}
          >
            <XStack alignItems="center" gap={10} flex={1}>
              <View style={[styles.tipIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="train" size={16} color="#3B82F6" />
              </View>
              <YStack flex={1}>
                <Text style={styles.tipLabel}>Public transportation</Text>
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
          onPress={() => openMapsForCity(city.lat, city.lon, cityName)}
          testID="open-maps-button"
        >
          <Ionicons name="map" size={20} color="#5A7EB0" />
          <Text style={styles.mapsButtonText}>Open in Maps</Text>
        </Pressable>
      </ScrollView>

      {/* ─── In-App Places Popup ──────────────────── */}
      {popupCategory && popupConfig && (
        <Pressable style={styles.popupOverlay} onPress={() => setPopupCategory(null)}>
          <Pressable style={[styles.popupSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            {/* Handle */}
            <View style={styles.popupHandle} />
            {/* Header */}
            <XStack alignItems="center" gap={10} marginBottom={16}>
              <View style={[styles.popupIconCircle, { backgroundColor: `${popupConfig.color}22` }]}>
                <Ionicons name={popupConfig.icon as any} size={20} color={popupConfig.color} />
              </View>
              <YStack flex={1}>
                <Text style={styles.popupTitle}>{popupConfig.label}</Text>
                <Text style={styles.popupSubtitle}>{cityName} — Top picks</Text>
              </YStack>
              <Pressable onPress={() => setPopupCategory(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={24} color={DARK_THEME.textTertiary} />
              </Pressable>
            </XStack>
            {/* Places list */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {popupPlaces.map((place, i) => (
                <View key={i} style={styles.placeRow}>
                  <XStack alignItems="flex-start" gap={12}>
                    <View style={[styles.placeNumber, { backgroundColor: `${popupConfig.color}22` }]}>
                      <Text style={[styles.placeNumberText, { color: popupConfig.color }]}>{i + 1}</Text>
                    </View>
                    <YStack flex={1} gap={2}>
                      <XStack alignItems="center" gap={6}>
                        <Text style={styles.placeName}>{place.name}</Text>
                      </XStack>
                      <Text style={styles.placeType}>{place.type}</Text>
                      <Text style={styles.placeDescription}>{place.description}</Text>
                    </YStack>
                  </XStack>
                  {i < popupPlaces.length - 1 && <View style={styles.placeDivider} />}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      )}
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
  // ─── Popup styles ────────────────────────────
  popupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  popupSheet: {
    backgroundColor: '#1E2329',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  popupHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  popupIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  popupSubtitle: {
    fontSize: 12,
    color: DARK_THEME.textTertiary,
    marginTop: 1,
  },
  placeRow: {
    paddingVertical: 12,
  },
  placeNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  placeNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  placeName: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  placeType: {
    fontSize: 11,
    fontWeight: '600',
    color: DARK_THEME.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  placeDescription: {
    fontSize: 13,
    color: DARK_THEME.textSecondary,
    lineHeight: 18,
    marginTop: 3,
  },
  placeDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 12,
  },
});
