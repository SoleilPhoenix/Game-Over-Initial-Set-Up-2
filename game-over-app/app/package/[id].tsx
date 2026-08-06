/**
 * Package Details Screen (Mockups 7.6/7.7/7.8)
 * Glass card overlay, premium highlights, reviews, fixed bottom bar
 */

import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, ImageBackground } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { usePackage } from '@/hooks/queries/usePackages';
import { useEventSchedule, scheduleKeys } from '@/hooks/queries/useSchedule';
import { useEvent } from '@/hooks/queries/useEvents';
import { isReadOnlyEvent } from '@/utils/eventLifecycle';
import { resolveEventCapabilities } from '@/utils/permissions';
import { getTierName } from '@/constants/packageTiers';
import { useWizardStore } from '@/stores/wizardStore';
import { useAuthStore } from '@/stores/authStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { Button } from '@/components/ui/Button';
import { getPackageImage, isImageUrl, resolvePackageImage } from '@/constants/packageImages';
import { CITY_UUID_TO_SLUG } from '@/constants/citySlugMap';
import { useTranslation, getCurrentLanguage, getTranslation } from '@/i18n';
import { getCanonicalFeatureName, translateFeature, translatePackageDescription } from '@/i18n/packageContent';
import { assemblePackages, resolvePackageFeatures } from '@/utils/packageAssembly';
import { loadBudgetInfo, type BudgetInfo } from '@/lib/participantCountCache';
import { scheduleRepository } from '@/repositories';
import { formatScheduleTime, generateDefaultSchedule, tierFromPackageSlug } from '@/utils/scheduleGenerator';

const TIER_PRICE_PER_PERSON: Record<string, number> = {
  essential: 129_00,
  classic: 179_00,
  grand: 229_00,
};

// Fallback package data for local IDs that don't exist in DB (S=3, M=4, L=5 features)
function getFallbackPackageMap(): Record<string, any> {
  const { fallbackFeatures: f, fallbackDescriptions: d } = getTranslation().packageContent;
  return {
    'berlin-classic': { id: 'berlin-classic', name: 'Berlin Rausch', tier: 'classic', base_price_cents: 179_00, price_per_person_cents: 179_00, rating: 4.8, review_count: 127, features: [f.vipNightlifeAccess, f.privatePartyBus, f.professionalPhotographer, f.welcomeDrinksPackage], description: d.berlinClassic, hero_image_url: getPackageImage('berlin', 'classic') },
    'berlin-essential': { id: 'berlin-essential', name: 'Berlin Feier', tier: 'essential', base_price_cents: 129_00, price_per_person_cents: 129_00, rating: 4.5, review_count: 89, features: [f.barHoppingTour, f.welcomeDrinks, f.groupCoordination], description: d.berlinEssential, hero_image_url: getPackageImage('berlin', 'essential') },
    'berlin-grand': { id: 'berlin-grand', name: 'Berlin Legende', tier: 'grand', base_price_cents: 229_00, price_per_person_cents: 229_00, rating: 4.9, review_count: 42, features: [f.luxurySuite, f.privateChefDinner, f.spaAndWellnessPackage, f.vipClubAccess, f.privateChauffeur], description: d.berlinGrand, hero_image_url: getPackageImage('berlin', 'grand') },
    'hamburg-classic': { id: 'hamburg-classic', name: 'Hamburg Rausch', tier: 'classic', base_price_cents: 179_00, price_per_person_cents: 179_00, rating: 4.7, review_count: 98, features: [f.reeperbahnNightlifeTour, f.harborCruise, f.professionalPhotographer, f.reservedBarArea], description: d.hamburgClassic, hero_image_url: getPackageImage('hamburg', 'classic') },
    'hamburg-essential': { id: 'hamburg-essential', name: 'Hamburg Feier', tier: 'essential', base_price_cents: 129_00, price_per_person_cents: 129_00, rating: 4.4, review_count: 64, features: [f.guidedBarTour, f.welcomeCocktails, f.groupPlanning], description: d.hamburgEssential, hero_image_url: getPackageImage('hamburg', 'essential') },
    'hamburg-grand': { id: 'hamburg-grand', name: 'Hamburg Legende', tier: 'grand', base_price_cents: 229_00, price_per_person_cents: 229_00, rating: 4.9, review_count: 31, features: [f.elbphilharmonieVipEvent, f.privateYachtDinner, f.luxuryHotelSuite, f.spaAndWellnessDay, f.premiumBottleService], description: d.hamburgGrand, hero_image_url: getPackageImage('hamburg', 'grand') },
    'hannover-classic': { id: 'hannover-classic', name: 'Hannover Rausch', tier: 'classic', base_price_cents: 179_00, price_per_person_cents: 179_00, rating: 4.6, review_count: 73, features: [f.craftBeerExperience, f.goKartRacing, f.professionalPhotographer, f.welcomeDinner], description: d.hannoverClassic, hero_image_url: getPackageImage('hannover', 'classic') },
    'hannover-essential': { id: 'hannover-essential', name: 'Hannover Feier', tier: 'essential', base_price_cents: 129_00, price_per_person_cents: 129_00, rating: 4.3, review_count: 51, features: [f.cityAdventureTour, f.welcomeDrinks, f.groupCoordination], description: d.hannoverEssential, hero_image_url: getPackageImage('hannover', 'essential') },
    'hannover-grand': { id: 'hannover-grand', name: 'Hannover Legende', tier: 'grand', base_price_cents: 229_00, price_per_person_cents: 229_00, rating: 4.8, review_count: 28, features: [f.herrenhausenGardensGala, f.privateChefDinner, f.spaAndWellnessDay, f.vipNightlifeAccess, f.luxuryHotelSuite], description: d.hannoverGrand, hero_image_url: getPackageImage('hannover', 'grand') },
  };
}

const CITY_SLUGS = ['berlin', 'hamburg', 'hannover'];
const TIER_SLUGS = ['essential', 'classic', 'grand'];
function isAssembledPackageId(id: string): boolean {
  const parts = id.split('-');
  if (parts.length < 2) return false;
  const city = parts[0];
  const tier = parts[parts.length - 1];
  return CITY_SLUGS.includes(city) && TIER_SLUGS.includes(tier);
}

const formatPrice = (cents: number) => {
  return '\u20AC' + (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// Icon mapping for assembled package features
const FEATURE_ICON: Record<string, string> = {
  // Activities
  'Poker Night': 'card', 'Darts Tournament': 'radio-button-on', 'Table Football': 'football',
  'Go-Karting': 'car-sport', 'VR Arcade': 'game-controller', 'Axe Throwing': 'hammer',
  'Escape Room': 'lock-closed', 'Trampoline Park': 'body', 'Cooking Class': 'restaurant',
  'Dance Class': 'musical-notes', 'Creative Workshop': 'brush', 'Sports Viewing': 'tv',
  'Laser Tag': 'flash', 'Bowling': 'disc', 'Indoor Climbing': 'trending-up',
  'Mini Golf': 'golf', 'Bubble Football': 'football', 'Paintball': 'color-wand',
  'Billiards': 'ellipse', 'Harbor Cruise': 'boat', 'Boat Rental': 'boat',
  'Scavenger Hunt': 'map', 'Photo Challenge': 'camera', 'City Walking Tour': 'walk',
  'Street Art Tour': 'brush', 'Beach Day': 'sunny', 'Theater Show': 'ticket',
  'Comedy Show': 'happy', 'Spa Day': 'flower', 'Massage Session': 'hand-left',
  'Beer Tasting': 'beer', 'Whisky Tasting': 'wine', 'Gin Tasting': 'wine',
  'Cocktail Workshop': 'wine', 'BBQ & Grill': 'flame', 'Guided Bike Tour': 'bicycle',
  'Kayak & SUP': 'boat', 'Food Tour': 'restaurant', 'Wine Tasting': 'wine',
  // Dining
  'Casual Dinner & Drinks': 'restaurant', 'Tapas Dinner': 'restaurant',
  'BBQ Dinner': 'flame', 'Pizza & Craft Beer Dinner': 'pizza',
  'Private Chef Dinner': 'restaurant', 'Beer Hall Dinner': 'beer',
  'Brunch Buffet': 'cafe', 'Steakhouse Dinner': 'restaurant',
  'Sushi Dinner': 'fish', 'Restaurant Dinner': 'restaurant',
  // Bar / Nightlife
  'Bar Crawl': 'wine', 'Club Night': 'musical-notes', 'Live Music Bar': 'musical-notes',
  'Karaoke Night': 'mic', 'Pub Quiz Night': 'help-circle', 'Bar Night with Drinks': 'wine',
};

const DINING_FEATURES = new Set([
  'Casual Dinner & Drinks', 'Tapas Dinner', 'BBQ Dinner', 'Pizza & Craft Beer Dinner',
  'Private Chef Dinner', 'Beer Hall Dinner', 'Brunch Buffet', 'Steakhouse Dinner',
  'Sushi Dinner', 'Restaurant Dinner',
]);
const BAR_FEATURES = new Set([
  'Bar Crawl', 'Club Night', 'Live Music Bar', 'Karaoke Night',
  'Pub Quiz Night', 'Bar Night with Drinks',
]);

function featureIcon(name: string): string {
  return FEATURE_ICON[getCanonicalFeatureName(name)] ?? 'checkmark-circle';
}

function featureSub(name: string): string {
  const canonicalName = getCanonicalFeatureName(name);
  const subtitles = getTranslation().packageContent.featureSubtitles;
  if (DINING_FEATURES.has(canonicalName)) return subtitles.dining;
  if (BAR_FEATURES.has(canonicalName)) return subtitles.nightlife;
  return subtitles.activity;
}

function buildHighlights(features: string[]): { icon: string; label: string; sub: string }[] {
  if (features.length === 0) return [];
  const top = features[0];
  return [{ icon: featureIcon(top), label: translateFeature(top), sub: '' }];
}

function buildIncludes(features: string[]): { icon: string; title: string; sub: string }[] {
  return features.map(f => ({ icon: featureIcon(f), title: translateFeature(f), sub: featureSub(f) }));
}

// 2-3 demo reviews per tier. Bilingual: `text` is EN, `textDe` is DE — the
// render picks based on the active language.
const MOCK_REVIEWS: Record<string, { initials: string; color: string; name: string; rating: number; text: string; textDe: string }[]> = {
  essential: [
    { initials: 'SJ', color: '#22C55E', name: 'Sarah J.', rating: 4, text: "This was the best bang for our buck. We didn't need the fancy extras, just a solid plan and a ride. The Essential tier delivered exactly that.", textDe: 'Das war das beste Preis-Leistungs-Verhältnis. Wir brauchten keinen Schnickschnack, nur einen soliden Plan und einen Transfer. Genau das hat die Feier-Stufe geliefert.' },
    { initials: 'LC', color: '#3B82F6', name: 'Laura C.', rating: 4, text: "Great for a budget-friendly party. The bar hopping tour was well organized and the concierge helped with last-minute changes. Would recommend!", textDe: 'Super für eine budgetfreundliche Party. Die Bar-Tour war gut organisiert und der Concierge half bei kurzfristigen Änderungen. Sehr empfehlenswert!' },
  ],
  classic: [
    { initials: 'MT', color: '#EF4444', name: 'Mike T.', rating: 5, text: "Honestly, the private wine tasting was the highlight. We didn't have to worry about transport or bookings. The Classic tier was the perfect middle ground.", textDe: 'Ehrlich, die private Weinverkostung war das Highlight. Wir mussten uns um nichts kümmern – weder Transport noch Buchungen. Die Rausch-Stufe war der perfekte Mittelweg.' },
    { initials: 'JD', color: '#14B8A6', name: 'James D.', rating: 5, text: "The party bus alone was worth it. Everyone was together, the photographer captured amazing shots, and VIP access meant zero waiting.", textDe: 'Allein der Party-Bus war es wert. Alle waren zusammen, der Fotograf hat großartige Aufnahmen gemacht und dank VIP-Zugang gab es keine Wartezeiten.' },
    { initials: 'KW', color: '#EC4899', name: 'Kate W.', rating: 4, text: "Planned my best friend's bachelorette. The Classic package took all the stress away. Everyone loved the VIP experience!", textDe: 'Habe den JGA meiner besten Freundin geplant. Das Rausch-Paket hat den ganzen Stress abgenommen. Alle waren vom VIP-Erlebnis begeistert!' },
  ],
  grand: [
    { initials: 'RK', color: '#F59E0B', name: 'Ryan K.', rating: 5, text: "The VIP access was legit. No waiting in lines anywhere, and the penthouse was incredible. Best bachelor weekend hands down.", textDe: 'Der VIP-Zugang war top. Nirgends Schlangestehen und das Penthouse war unglaublich. Ganz klar das beste JGA-Wochenende.' },
    { initials: 'TM', color: '#8B5CF6', name: 'Tyler M.', rating: 5, text: "Everything was handled for us. We just showed up and had a blast. The private chef dinner was a highlight for sure.", textDe: 'Alles wurde für uns organisiert. Wir sind einfach aufgetaucht und hatten eine Riesengaudi. Das private Chefkoch-Dinner war definitiv ein Highlight.' },
    { initials: 'AP', color: '#22C55E', name: 'Alex P.', rating: 5, text: "The spa recovery session the next morning was genius. Whoever thought of that deserves an award. Absolutely premium from start to finish.", textDe: 'Die Spa-Erholung am nächsten Morgen war genial. Wer sich das ausgedacht hat, verdient einen Preis. Von Anfang bis Ende absolut premium.' },
  ],
};

function HighlightCard({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <YStack
      flex={1}
      backgroundColor="rgba(45, 55, 72, 0.5)"
      borderRadius={12}
      borderWidth={1}
      borderColor="rgba(255, 255, 255, 0.08)"
      padding="$3"
      alignItems="center"
      gap="$2"
    >
      <YStack
        width={40}
        height={40}
        borderRadius="$full"
        backgroundColor="rgba(198, 167, 94, 0.15)"
        alignItems="center"
        justifyContent="center"
      >
        <Ionicons name={icon as any} size={20} color={'#C6A75E'} />
      </YStack>
      <Text fontSize={13} fontWeight="600" color="$textPrimary" textAlign="center">
        {label}
      </Text>
      {sub ? (
        <Text fontSize={11} color="$textTertiary" textAlign="center">{sub}</Text>
      ) : null}
    </YStack>
  );
}

function IncludeItem({ icon, title, sub, time, location }: { icon: string; title: string; sub: string; time?: string; location?: string }) {
  return (
    <XStack gap="$3" alignItems="flex-start" paddingVertical="$2">
      <YStack
        width={36}
        height={36}
        borderRadius="$full"
        backgroundColor="rgba(198, 167, 94, 0.15)"
        alignItems="center"
        justifyContent="center"
        marginTop={2}
      >
        <Ionicons name={icon as any} size={18} color={'#C6A75E'} />
      </YStack>
      <YStack flex={1}>
        <Text fontSize={15} fontWeight="600" color="$textPrimary">{title}</Text>
        <Text fontSize={13} color="$textTertiary">{sub}</Text>
        {location ? (
          <XStack alignItems="center" gap={4} marginTop={2}>
            <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.48)" />
            <Text fontSize={11} color="$textTertiary">{location}</Text>
          </XStack>
        ) : null}
      </YStack>
      {time ? (
        <YStack
          backgroundColor="rgba(198, 167, 94, 0.18)"
          paddingHorizontal={10}
          paddingVertical={6}
          borderRadius={8}
          alignItems="center"
          justifyContent="center"
          marginTop={2}
          minWidth={56}
        >
          <Text fontSize={13} fontWeight="700" color="#C6A75E" fontVariant={['tabular-nums']}>
            {time}
          </Text>
        </YStack>
      ) : null}
    </XStack>
  );
}

function ReviewCard({ initials, name, rating, text }: {
  initials: string; color?: string; name: string; rating: number; text: string;
}) {
  return (
    <YStack marginBottom="$5">
      <XStack alignItems="center" gap="$3" marginBottom="$2">
        <YStack
          width={40}
          height={40}
          borderRadius="$full"
          backgroundColor="rgba(198,167,94,0.18)"
          borderWidth={1}
          borderColor="#C6A75E"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={14} fontWeight="700" color="#C6A75E">{initials}</Text>
        </YStack>
        <YStack flex={1}>
          <Text fontSize={14} fontWeight="600" color="$textPrimary">{name}</Text>
          <XStack gap={2}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons key={i} name="star" size={12} color={i < rating ? '#FFB800' : '#4A5568'} />
            ))}
          </XStack>
        </YStack>
      </XStack>
      <YStack
        backgroundColor="rgba(45, 55, 72, 0.4)"
        borderRadius={12}
        padding="$3"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.05)"
      >
        <Text fontSize={13} color="rgba(255, 255, 255, 0.8)" lineHeight={20}>
          "{text}"
        </Text>
      </YStack>
    </YStack>
  );
}

export default function PackageDetailsScreen() {
  const { id, eventId, viewOnly } = useLocalSearchParams<{ id: string; eventId?: string; viewOnly?: string }>();
  const isViewOnly = viewOnly === '1';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { t, language } = useTranslation();
  const { data: dbPkg, isLoading } = usePackage(id);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { data: scheduleData } = useEventSchedule(isViewOnly ? eventId : undefined);
  const { data: eventData } = useEvent(isViewOnly ? eventId : undefined);
  const capabilities = resolveEventCapabilities({ event: eventData, userId: user?.id });

  // Load event budget cache when opened from Event Summary (viewOnly mode)
  const [eventBudget, setEventBudget] = useState<BudgetInfo | null>(null);
  useEffect(() => {
    if (eventId && capabilities.canViewPackages) {
      loadBudgetInfo(eventId).then(info => setEventBudget(info ?? null));
    } else {
      setEventBudget(null);
    }
  }, [eventId, capabilities.canViewPackages]);
  useEffect(() => {
    if (isViewOnly && eventData && !capabilities.canViewPackages) router.back();
  }, [capabilities.canViewPackages, eventData, isViewOnly, router]);

  // Schedule data — only relevant in viewOnly mode (event context)
  // Show archived badge when viewing a past event's package
  const isArchivedView = isViewOnly && eventData ? isReadOnlyEvent(eventData) : false;

  // Auto-generate schedule when missing (mirrors the previous day.tsx logic)
  const genAttempted = useRef(false);
  useEffect(() => {
    if (!isViewOnly || !eventId) return;
    if (!scheduleData || scheduleData.length > 0) return;
    if (!capabilities.canManagePackages) return;
    if (genAttempted.current) return;
    const tier = tierFromPackageSlug(id) ?? tierFromPackageSlug(eventBudget?.packageId ?? null);
    if (!tier) return;
    genAttempted.current = true;
    const items = generateDefaultSchedule(eventId, [], tier);
    if (items.length === 0) return;
    scheduleRepository.createMany(items)
      .then(() => queryClient.invalidateQueries({ queryKey: scheduleKeys.byEvent(eventId) }))
      .catch(() => { genAttempted.current = false; });
  }, [isViewOnly, eventId, scheduleData, capabilities.canManagePackages, id, eventBudget?.packageId, queryClient]);

  // Read wizard answers to assemble dynamic package when needed (creation flow only)
  const wizardState = useWizardStore();
  const {
    cityId,
    energyLevel, spotlightComfort, competitionStyle, enjoymentType, indoorOutdoor, eveningStyle,
    averageAge, groupCohesion, fitnessLevel, drinkingCulture, groupDynamic, groupVibe,
  } = wizardState;
  const wizardParticipantCount = useWizardStore((s) => s.participantCount);
  const setSelectedPackageId = useWizardStore((s) => s.setSelectedPackageId);

  // If DB returned nothing and the ID matches a city-tier pattern, assemble dynamically
  let assembledPkg: ReturnType<typeof assemblePackages>[number] | undefined;
  if (!dbPkg && id && isAssembledPackageId(id)) {
    const parts = id.split('-');
    const citySlug = parts[0];
    const tierSlug = parts[parts.length - 1];
    const resolvedCitySlug = citySlug || (cityId ? cityId : 'berlin');

    if (isViewOnly && eventBudget?.packageFeatures) {
      // In viewOnly mode with cached features, build a synthetic assembled pkg shell
      assembledPkg = {
        id,
        name: id,
        tier: tierSlug as 'essential' | 'classic' | 'grand',
        price_per_person_cents: TIER_PRICE_PER_PERSON[tierSlug] || 179_00,
        hero_image_url: getPackageImage(citySlug, tierSlug),
        rating: 4.8,
        review_count: tierSlug === 'classic' ? 127 : tierSlug === 'grand' ? 42 : 89,
        features: eventBudget.packageFeatures,
        description: '',
      };
    } else if (isViewOnly && eventBudget?.wizardAnswers) {
      // viewOnly with stored wizard answers but no features: re-assemble from saved answers.
      // This handles events where features were not cached separately.
      const wa = eventBudget.wizardAnswers;
      const assembled = assemblePackages(
        {
          h1: (wa.h1 as any) || null, h2: (wa.h2 as any) || null,
          h3: (wa.h3 as any) || null, h4: (wa.h4 as any) || null,
          h5: (wa.h5 as any) || null, h6: (wa.h6 as any) || null,
          g1: (wa.g1 as any) || null, g2: (wa.g2 as any) || null,
          g3: (wa.g3 as any) || null, g4: (wa.g4 as any) || null,
          g5: (wa.g5 as any) || null, g6: Array.isArray(wa.g6) ? wa.g6 as string[] : [],
        },
        resolvedCitySlug,
      );
      assembledPkg = assembled.find(p => p.tier === tierSlug);
    } else if (isViewOnly) {
      // viewOnly with no cached data at all: assemble with null answers (default features).
      // This is expected for events created before the feature-caching fix.
      const assembled = assemblePackages(
        { h1: null, h2: null, h3: null, h4: null, h5: null, h6: null, g1: null, g2: null, g3: null, g4: null, g5: null, g6: [] },
        resolvedCitySlug,
      );
      assembledPkg = assembled.find(p => p.tier === tierSlug);
    } else {
      // Creation flow: assemble from current wizard answers
      const assembled = assemblePackages({
        h1: energyLevel, h2: spotlightComfort, h3: competitionStyle,
        h4: enjoymentType, h5: indoorOutdoor, h6: eveningStyle,
        g1: averageAge, g2: groupCohesion, g3: fitnessLevel,
        g4: drinkingCulture, g5: groupDynamic, g6: groupVibe,
      }, resolvedCitySlug);
      assembledPkg = assembled.find(p => p.tier === tierSlug);
    }
  }

  // Use DB package if available, then dynamically assembled package, then static fallback
  const pkg = dbPkg || assembledPkg || getFallbackPackageMap()[id];

  if (isViewOnly && eventData && !capabilities.canViewPackages) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  if (isLoading && !pkg) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  if (!pkg) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background" padding="$6">
        <Ionicons name="alert-circle-outline" size={48} color={'#C6A75E'} />
        <Text fontSize="$4" fontWeight="600" color="$textPrimary" marginTop="$3">
          {t.packageDetail.packageNotFound}
        </Text>
        <Button variant="outline" onPress={() => router.back()} marginTop="$4">
          {t.packageDetail.goBack}
        </Button>
      </YStack>
    );
  }

  const tier = (pkg.tier as 'essential' | 'classic' | 'grand') || 'essential';
  // In viewOnly mode (opened from Event Summary), never show the recommendation badge or select button
  const isRecommended = !isViewOnly && tier === 'classic';

  const packageCitySlug = (pkg.city_id ? CITY_UUID_TO_SLUG[pkg.city_id] : undefined)
    || (isAssembledPackageId(pkg.id) ? pkg.id.split('-')[0] : undefined);
  let featureFallbackPackages: ReturnType<typeof assemblePackages> = [];
  if (packageCitySlug) {
    const cachedAnswers = isViewOnly ? eventBudget?.wizardAnswers : undefined;
    featureFallbackPackages = assemblePackages({
      h1: isViewOnly ? (cachedAnswers?.h1 as any) || null : energyLevel,
      h2: isViewOnly ? (cachedAnswers?.h2 as any) || null : spotlightComfort,
      h3: isViewOnly ? (cachedAnswers?.h3 as any) || null : competitionStyle,
      h4: isViewOnly ? (cachedAnswers?.h4 as any) || null : enjoymentType,
      h5: isViewOnly ? (cachedAnswers?.h5 as any) || null : indoorOutdoor,
      h6: isViewOnly ? (cachedAnswers?.h6 as any) || null : eveningStyle,
      g1: isViewOnly ? (cachedAnswers?.g1 as any) || null : averageAge,
      g2: isViewOnly ? (cachedAnswers?.g2 as any) || null : groupCohesion,
      g3: isViewOnly ? (cachedAnswers?.g3 as any) || null : fitnessLevel,
      g4: isViewOnly ? (cachedAnswers?.g4 as any) || null : drinkingCulture,
      g5: isViewOnly ? (cachedAnswers?.g5 as any) || null : groupDynamic,
      g6: isViewOnly
        ? (Array.isArray(cachedAnswers?.g6) ? cachedAnswers.g6 as string[] : [])
        : groupVibe,
    }, packageCitySlug);
  }

  // Prefer event-cached contents, then DB contents, then the matching assembled city/tier.
  const features = (isViewOnly && eventBudget?.packageFeatures?.length)
    ? eventBudget.packageFeatures
    : resolvePackageFeatures(pkg.features, tier, featureFallbackPackages);
  const highlights = buildHighlights(features);
  const includes = buildIncludes(features);
  const reviews = MOCK_REVIEWS[tier] || [];
  const reviewCount = pkg.review_count ?? 0;
  const hasRating = reviewCount > 0 && typeof pkg.rating === 'number';

  // Participant count: viewOnly uses cached event total, creation flow uses wizard store
  const participantCount = (isViewOnly && eventBudget?.totalParticipants)
    ? eventBudget.totalParticipants
    : wizardParticipantCount;

  const perPersonCents = pkg.price_per_person_cents || pkg.base_price_cents || TIER_PRICE_PER_PERSON[tier] || 179_00;
  // In viewOnly mode, show the actual total paid (from cache) if available
  const totalGroupCents = (isViewOnly && eventBudget?.totalCents)
    ? eventBudget.totalCents
    : perPersonCents * participantCount;

  // Display name without city prefix (language-aware)
  const displayName = getTierName(tier, language) || tier;

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 160 }}>
        {/* Hero Image */}
        <ImageBackground
          source={resolvePackageImage({
            heroImageUrl: pkg.hero_image_url,
            cityId: pkg.city_id,
            citySlug: packageCitySlug,
            tier,
            packageId: pkg.id,
          })}
          style={{ height: 350 }}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(21,24,29,0.9)', '#0D1B2A']}
            locations={[0, 0.3, 0.7, 1]}
            style={{ flex: 1 }}
          >
            {/* Sticky Header */}
            <XStack
              paddingTop={insets.top + 8}
              paddingHorizontal="$4"
              justifyContent="space-between"
              alignItems="center"
            >
              <XStack
                width={40}
                height={40}
                borderRadius="$full"
                backgroundColor="rgba(0,0,0,0.3)"
                alignItems="center"
                justifyContent="center"
                pressStyle={{ opacity: 0.8 }}
                onPress={() => router.back()}
                testID="back-button"
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </XStack>
              <YStack alignItems="center">
                <Text fontSize="$4" fontWeight="700" color="#FFFFFF">{t.packageDetail.title}</Text>
                {isArchivedView && (
                  <XStack
                    alignItems="center"
                    gap={4}
                    marginTop={2}
                    paddingHorizontal={8}
                    paddingVertical={2}
                    borderRadius={10}
                    backgroundColor="rgba(255,255,255,0.12)"
                    testID="package-archived-badge"
                  >
                    <Ionicons name="lock-closed-outline" size={10} color="rgba(255,255,255,0.8)" />
                    <Text fontSize={10} fontWeight="700" color="rgba(255,255,255,0.8)" letterSpacing={0.8}>
                      {(t.packageDetail as any).archived || 'ARCHIVED'}
                    </Text>
                  </XStack>
                )}
              </YStack>
              <XStack
                width={40}
                height={40}
                borderRadius="$full"
                backgroundColor="rgba(0,0,0,0.3)"
                alignItems="center"
                justifyContent="center"
                pressStyle={{ opacity: 0.8 }}
                onPress={() => {
                  // Extract city from package ID (e.g. 'berlin-classic' → 'berlin')
                  const cityId = pkg.city_id || pkg.id.split('-')[0] || '';
                  const CITY_LABELS: Record<string, string> = { berlin: 'Berlin', hamburg: 'Hamburg', hannover: 'Hannover' };
                  toggleFavorite({
                    id: pkg.id,
                    name: pkg.name,
                    tier: tier,
                    cityId,
                    cityName: CITY_LABELS[cityId] || cityId,
                    pricePerPersonCents: perPersonCents,
                    // Only store heroImageUrl if it's a real URL string (not a require() number)
                    heroImageUrl: typeof pkg.hero_image_url === 'string' && isImageUrl(pkg.hero_image_url)
                      ? pkg.hero_image_url
                      : undefined,
                    savedAt: new Date().toISOString(),
                  });
                }}
                testID="favorite-button"
              >
                <Ionicons
                  name={isFavorite(pkg.id) ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorite(pkg.id) ? '#EF4444' : 'white'}
                />
              </XStack>
            </XStack>

            {/* Recommendation Badge */}
            {isRecommended && (
              <XStack
                position="absolute"
                bottom={100}
                left={20}
                backgroundColor="rgba(232,220,200,0.90)"
                paddingHorizontal={14}
                paddingVertical={6}
                borderRadius={20}
                gap="$1.5"
                alignItems="center"
              >
                <Ionicons name="sparkles" size={14} color="#0D1B2A" />
                <Text color="#0D1B2A" fontSize={12} fontWeight="700">{t.packageDetail.recommendationBadge}</Text>
              </XStack>
            )}
          </LinearGradient>
        </ImageBackground>

        {/* Glass Card Overlay */}
        <YStack
          marginTop={-80}
          marginHorizontal="$4"
          backgroundColor="rgba(35, 39, 47, 0.95)"
          borderRadius={20}
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.1)"
          padding="$5"
          zIndex={10}
        >
          {/* Package Name + Price */}
          <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$2">
            <YStack flex={1}>
              <Text fontSize={24} fontWeight="800" color="$textPrimary">
                {displayName}
              </Text>
              {hasRating && (
                <XStack alignItems="center" gap="$1" marginTop="$1">
                  <Ionicons name="star" size={14} color="#FFB800" />
                  <Text fontSize={14} fontWeight="600" color="$textPrimary">
                    {pkg.rating.toFixed(1)}
                  </Text>
                  <Text fontSize={14} color="$textTertiary">
                    {(t.packageDetail as any).reviewsCount.replace('{{count}}', String(reviewCount))}
                  </Text>
                </XStack>
              )}
            </YStack>
            <YStack alignItems="flex-end">
              <Text fontSize={22} fontWeight="800" color={'#C6A75E'}>
                {formatPrice(totalGroupCents)}
              </Text>
              <Text fontSize={12} color="$textTertiary">{t.packageDetail.totalPeople.replace('{{count}}', String(participantCount))}</Text>
            </YStack>
          </XStack>

          {/* Description */}
          {pkg.description && (
            <Text fontSize={14} color="$textSecondary" lineHeight={22} marginBottom="$4">
              {translatePackageDescription(pkg.description)}
            </Text>
          )}

          {/* Premium Highlights */}
          {highlights.length > 0 && (
            <YStack marginBottom="$4">
              <XStack alignItems="center" gap="$2" marginBottom="$3">
                <Ionicons name="diamond" size={16} color={'#C6A75E'} />
                <Text fontSize={13} fontWeight="700" color="$textPrimary" textTransform="uppercase" letterSpacing={1}>
                  {t.packageDetail.premiumHighlights}
                </Text>
              </XStack>
              <XStack gap="$3">
                {highlights.map((h, i) => (
                  <HighlightCard key={i} icon={h.icon} label={h.label} sub={h.sub} />
                ))}
              </XStack>
            </YStack>
          )}

          {/* Total Price + Book Now — in creation flow only */}
          {!isViewOnly && (
            <YStack
              borderTopWidth={1}
              borderTopColor="rgba(255, 255, 255, 0.08)"
              paddingTop="$4"
              gap="$3"
            >
              <YStack>
                <Text fontSize={12} color="$textTertiary" textTransform="uppercase">{t.packageDetail.totalPrice}</Text>
                <XStack alignItems="baseline" gap="$2">
                  <Text fontSize={24} fontWeight="800" color="$textPrimary">
                    {formatPrice(totalGroupCents)}
                  </Text>
                  <Text fontSize={13} color="$textTertiary">
                    ({formatPrice(perPersonCents)}/person)
                  </Text>
                </XStack>
              </YStack>
              <Button
                fullWidth
                size="lg"
                onPress={() => {
                  setSelectedPackageId(pkg.id);
                  router.back();
                }}
                testID="book-now-button"
              >
                <Text color="#0D1B2A" fontWeight="700" fontSize="$4">{t.packageDetail.selectThisPackage}</Text>
              </Button>
            </YStack>
          )}
        </YStack>


        {/* Package Includes (with schedule times when in event context) */}
        {includes.length > 0 && (
          <YStack paddingHorizontal="$5" marginTop="$5">
            <Text
              fontSize={15}
              fontWeight="700"
              color="$textPrimary"
              textTransform="uppercase"
              letterSpacing={1}
              marginBottom="$3"
            >
              {t.packageDetail.packageIncludes}
            </Text>
            {includes.map((item, i) => {
              const sched = scheduleData?.[i];
              return (
                <IncludeItem
                  key={i}
                  icon={item.icon}
                  title={item.title}
                  sub={item.sub}
                  time={sched ? formatScheduleTime(sched.start_time) : undefined}
                  location={sched?.location ?? undefined}
                />
              );
            })}
          </YStack>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <YStack paddingHorizontal="$5" marginTop="$6">
            {reviews.map((review, i) => (
              <ReviewCard
                key={i}
                initials={review.initials}
                color={review.color}
                name={review.name}
                rating={review.rating}
                text={getCurrentLanguage() === 'de' ? review.textDe : review.text}
              />
            ))}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}
