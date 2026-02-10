/**
 * Package Details Screen (Mockups 7.6/7.7/7.8)
 * Glass card overlay, premium highlights, reviews, fixed bottom bar
 */

import React from 'react';
import { ScrollView, ImageBackground } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { usePackage } from '@/hooks/queries/usePackages';
import { useWizardStore } from '@/stores/wizardStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { Button } from '@/components/ui/Button';
import { DARK_THEME } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import type { Json } from '@/lib/supabase/types';

const TIER_PRICE_PER_PERSON: Record<string, number> = {
  essential: 99_00,
  classic: 149_00,
  grand: 199_00,
};

// Fallback package data for local IDs that don't exist in DB (S=3, M=4, L=5 features)
const FALLBACK_PACKAGE_MAP: Record<string, any> = {
  'berlin-classic': { id: 'berlin-classic', name: 'Berlin Classic', tier: 'classic', base_price_cents: 149_00, price_per_person_cents: 149_00, rating: 4.8, review_count: 127, features: ['VIP nightlife access', 'Private party bus', 'Professional photographer', 'Welcome drinks package'], description: 'The ideal balance of nightlife, culture, and unforgettable moments in Berlin.', hero_image_url: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800' },
  'berlin-essential': { id: 'berlin-essential', name: 'Berlin Essential', tier: 'essential', base_price_cents: 99_00, price_per_person_cents: 99_00, rating: 4.5, review_count: 89, features: ['Bar hopping tour', 'Welcome drinks', 'Group coordination'], description: 'A solid party plan with all the essentials covered.', hero_image_url: 'https://images.unsplash.com/photo-1587330979470-3595ac045ab0?w=800' },
  'berlin-grand': { id: 'berlin-grand', name: 'Berlin Grand', tier: 'grand', base_price_cents: 199_00, price_per_person_cents: 199_00, rating: 4.9, review_count: 42, features: ['Luxury suite', 'Private chef dinner', 'Spa & wellness package', 'VIP club access', 'Private chauffeur'], description: 'The ultimate premium experience with luxury at every turn.', hero_image_url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800' },
  'hamburg-classic': { id: 'hamburg-classic', name: 'Hamburg Classic', tier: 'classic', base_price_cents: 149_00, price_per_person_cents: 149_00, rating: 4.7, review_count: 98, features: ['Reeperbahn nightlife tour', 'Harbor cruise', 'Professional photographer', 'Reserved bar area'], description: "Experience Hamburg's legendary nightlife and harbor in style.", hero_image_url: 'https://images.unsplash.com/photo-1567359781514-3b964e2b04d6?w=800' },
  'hamburg-essential': { id: 'hamburg-essential', name: 'Hamburg Essential', tier: 'essential', base_price_cents: 99_00, price_per_person_cents: 99_00, rating: 4.4, review_count: 64, features: ['Guided bar tour', 'Welcome cocktails', 'Group planning'], description: 'A fun, well-organized Hamburg party experience.', hero_image_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800' },
  'hamburg-grand': { id: 'hamburg-grand', name: 'Hamburg Grand', tier: 'grand', base_price_cents: 199_00, price_per_person_cents: 199_00, rating: 4.9, review_count: 31, features: ['Elbphilharmonie VIP event', 'Private yacht dinner', 'Luxury hotel suite', 'Spa & wellness day', 'Premium bottle service'], description: 'Premium Hamburg experience with exclusive venues and luxury service.', hero_image_url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800' },
  'hannover-classic': { id: 'hannover-classic', name: 'Hannover Classic', tier: 'classic', base_price_cents: 149_00, price_per_person_cents: 149_00, rating: 4.6, review_count: 73, features: ['Craft beer experience', 'Go-kart racing', 'Professional photographer', 'Welcome dinner'], description: 'An action-packed celebration in the heart of Hannover.', hero_image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800' },
  'hannover-essential': { id: 'hannover-essential', name: 'Hannover Essential', tier: 'essential', base_price_cents: 99_00, price_per_person_cents: 99_00, rating: 4.3, review_count: 51, features: ['City adventure tour', 'Welcome drinks', 'Group coordination'], description: 'A great time in Hannover without breaking the bank.', hero_image_url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800' },
  'hannover-grand': { id: 'hannover-grand', name: 'Hannover Grand', tier: 'grand', base_price_cents: 199_00, price_per_person_cents: 199_00, rating: 4.8, review_count: 28, features: ['Herrenhausen Gardens gala', 'Private chef dinner', 'Spa & wellness day', 'VIP nightlife access', 'Luxury hotel suite'], description: 'Exclusive Hannover experience with private gala and luxury wellness.', hero_image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800' },
};

const toStringArray = (value: Json | null | undefined): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
};

const formatPrice = (cents: number) => {
  return '\u20AC' + (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// 1 premium highlight per tier
const HIGHLIGHT_ICONS: Record<string, { icon: string; label: string; sub: string }[]> = {
  essential: [
    { icon: 'wine', label: 'Reserved Bar Area', sub: '' },
  ],
  classic: [
    { icon: 'wine', label: 'Private Wine Tasting', sub: '' },
  ],
  grand: [
    { icon: 'boat', label: 'Private Yacht Charter', sub: '' },
  ],
};

// Package includes: S=3, M=4, L=5
const PACKAGE_INCLUDES: Record<string, { icon: string; title: string; sub: string }[]> = {
  essential: [
    { icon: 'beer', title: 'Bar Hopping Tour', sub: 'Curated selection of top local bars' },
    { icon: 'people', title: 'Group Coordination', sub: 'Dedicated event planner support' },
    { icon: 'headset', title: '24/7 Digital Concierge', sub: 'Instant AI support via app' },
  ],
  classic: [
    { icon: 'shield-checkmark', title: 'VIP Club Access', sub: 'Skip the line + Reserved table' },
    { icon: 'bus', title: 'Private Party Bus', sub: 'Luxury transport between venues' },
    { icon: 'camera', title: 'Professional Photographer', sub: 'Capture every memorable moment' },
    { icon: 'headset', title: '24/7 Digital Concierge', sub: 'AI itinerary adjustments on the fly' },
  ],
  grand: [
    { icon: 'car-sport', title: 'Private Luxury Limo', sub: 'Chauffeur service all weekend' },
    { icon: 'shield-checkmark', title: 'All-Access VIP Pass', sub: 'Instant entry to top 5 clubs' },
    { icon: 'headset', title: '24/7 Digital Concierge', sub: 'Priority support & booking' },
    { icon: 'wine', title: 'Premium Bottle Service', sub: 'Comped bottles at main event' },
    { icon: 'fitness', title: 'Recovery Spa Session', sub: 'Post-party massage & sauna' },
  ],
};

// 2-3 reviews per tier
const MOCK_REVIEWS: Record<string, { initials: string; color: string; name: string; rating: number; text: string }[]> = {
  essential: [
    { initials: 'SJ', color: '#22C55E', name: 'Sarah J.', rating: 4, text: "This was the best bang for our buck. We didn't need the fancy extras, just a solid plan and a ride. The Essential tier delivered exactly that." },
    { initials: 'LC', color: '#3B82F6', name: 'Laura C.', rating: 4, text: "Great for a budget-friendly party. The bar hopping tour was well organized and the concierge helped with last-minute changes. Would recommend!" },
  ],
  classic: [
    { initials: 'MT', color: '#EF4444', name: 'Mike T.', rating: 5, text: "Honestly, the private wine tasting was the highlight. We didn't have to worry about transport or bookings. The Classic tier was the perfect middle ground." },
    { initials: 'JD', color: '#14B8A6', name: 'James D.', rating: 5, text: "The party bus alone was worth it. Everyone was together, the photographer captured amazing shots, and VIP access meant zero waiting." },
    { initials: 'KW', color: '#EC4899', name: 'Kate W.', rating: 4, text: "Planned my best friend's bachelorette. The Classic package took all the stress away. Everyone loved the VIP experience!" },
  ],
  grand: [
    { initials: 'RK', color: '#F59E0B', name: 'Ryan K.', rating: 5, text: "The VIP access was legit. No waiting in lines anywhere, and the penthouse was incredible. Best bachelor weekend hands down." },
    { initials: 'TM', color: '#8B5CF6', name: 'Tyler M.', rating: 5, text: "Everything was handled for us. We just showed up and had a blast. The private chef dinner was a highlight for sure." },
    { initials: 'AP', color: '#22C55E', name: 'Alex P.', rating: 5, text: "The spa recovery session the next morning was genius. Whoever thought of that deserves an award. Absolutely premium from start to finish." },
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
        backgroundColor="rgba(37, 140, 244, 0.15)"
        alignItems="center"
        justifyContent="center"
      >
        <Ionicons name={icon as any} size={20} color={DARK_THEME.primary} />
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

function IncludeItem({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <XStack gap="$3" alignItems="flex-start" paddingVertical="$2">
      <YStack
        width={36}
        height={36}
        borderRadius="$full"
        backgroundColor="rgba(37, 140, 244, 0.15)"
        alignItems="center"
        justifyContent="center"
        marginTop={2}
      >
        <Ionicons name={icon as any} size={18} color={DARK_THEME.primary} />
      </YStack>
      <YStack flex={1}>
        <Text fontSize={15} fontWeight="600" color="$textPrimary">{title}</Text>
        <Text fontSize={13} color="$textTertiary">{sub}</Text>
      </YStack>
    </XStack>
  );
}

function ReviewCard({ initials, color, name, rating, text }: {
  initials: string; color: string; name: string; rating: number; text: string;
}) {
  return (
    <YStack marginBottom="$5">
      <XStack alignItems="center" gap="$3" marginBottom="$2">
        <YStack
          width={40}
          height={40}
          borderRadius="$full"
          backgroundColor={color}
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={14} fontWeight="700" color="white">{initials}</Text>
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const { t } = useTranslation();
  const { data: dbPkg, isLoading } = usePackage(id);

  // Use DB package if available, otherwise check fallback data
  const pkg = dbPkg || FALLBACK_PACKAGE_MAP[id];

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
        <Ionicons name="alert-circle-outline" size={48} color={DARK_THEME.primary} />
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
  const isRecommended = tier === 'classic';
  const highlights = HIGHLIGHT_ICONS[tier] || [];
  const includes = PACKAGE_INCLUDES[tier] || [];
  const reviews = MOCK_REVIEWS[tier] || [];
  const features = toStringArray(pkg.features);

  // Get participant count from wizard for total group price
  const participantCount = useWizardStore((s) => s.participantCount);
  const setSelectedPackageId = useWizardStore((s) => s.setSelectedPackageId);
  const perPersonCents = pkg.price_per_person_cents || pkg.base_price_cents || TIER_PRICE_PER_PERSON[tier] || 149_00;
  const totalGroupCents = perPersonCents * participantCount;

  // Display name without city prefix
  const tierNames: Record<string, string> = { essential: 'Essential', classic: 'Classic', grand: 'Grand' };
  const displayName = `${tierNames[tier] || tier} (${tier === 'essential' ? 'S' : tier === 'classic' ? 'M' : 'L'})`;

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 160 }}>
        {/* Hero Image */}
        <ImageBackground
          source={{ uri: pkg.hero_image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800' }}
          style={{ height: 350 }}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(21,24,29,0.9)', DARK_THEME.background]}
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
              <Text fontSize="$4" fontWeight="600" color="white">{t.packageDetail.title}</Text>
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
                    heroImageUrl: pkg.hero_image_url,
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
                backgroundColor="rgba(34, 197, 94, 0.9)"
                paddingHorizontal={14}
                paddingVertical={6}
                borderRadius={20}
                gap="$1.5"
                alignItems="center"
              >
                <Ionicons name="sparkles" size={14} color="white" />
                <Text color="white" fontSize={12} fontWeight="600">{t.packageDetail.recommendationBadge}</Text>
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
              <XStack alignItems="center" gap="$1" marginTop="$1">
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text fontSize={14} fontWeight="600" color="$textPrimary">
                  {(pkg.rating || 4.5).toFixed(1)}
                </Text>
                <Text fontSize={14} color="$textTertiary">
                  ({pkg.review_count || 0} reviews)
                </Text>
              </XStack>
            </YStack>
            <YStack alignItems="flex-end">
              <Text fontSize={22} fontWeight="800" color={DARK_THEME.primary}>
                {formatPrice(totalGroupCents)}
              </Text>
              <Text fontSize={12} color="$textTertiary">{t.packageDetail.totalPeople.replace('{{count}}', String(participantCount))}</Text>
            </YStack>
          </XStack>

          {/* Description */}
          {pkg.description && (
            <Text fontSize={14} color="$textSecondary" lineHeight={22} marginBottom="$4">
              {pkg.description}
            </Text>
          )}

          {/* Premium Highlights */}
          {highlights.length > 0 && (
            <YStack marginBottom="$4">
              <XStack alignItems="center" gap="$2" marginBottom="$3">
                <Ionicons name="diamond" size={16} color={DARK_THEME.primary} />
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

          {/* Total Price + Book Now */}
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
                // Select this package and go back to package selection
                setSelectedPackageId(pkg.id);
                router.back();
              }}
              testID="book-now-button"
            >
              {t.packageDetail.selectThisPackage}
            </Button>
          </YStack>
        </YStack>

        {/* Package Includes */}
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
            {includes.map((item, i) => (
              <IncludeItem key={i} icon={item.icon} title={item.title} sub={item.sub} />
            ))}
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
                text={review.text}
              />
            ))}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}
