/**
 * Package Details Screen
 * Full package information with booking CTA
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner, Image } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePackage } from '@/hooks/queries/usePackages';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function PackageDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: pkg, isLoading } = usePackage(id);

  if (isLoading || !pkg) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    });
  };

  const tierConfig = {
    essential: { label: 'Essential', color: '$textSecondary' },
    classic: { label: 'Classic', color: '$primary' },
    grand: { label: 'Grand', color: '$warning' },
  };

  const tierInfo = tierConfig[pkg.tier as keyof typeof tierConfig] || tierConfig.essential;

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Hero Image */}
      <YStack position="relative">
        <Image
          source={{ uri: pkg.hero_image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800' }}
          width="100%"
          height={280}
        />
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0,0,0,0.2)"
        />
        <XStack
          position="absolute"
          top={insets.top + 8}
          left={16}
          right={16}
          justifyContent="space-between"
        >
          <XStack
            width={40}
            height={40}
            borderRadius="$full"
            backgroundColor="rgba(255,255,255,0.9)"
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => router.back()}
            testID="back-button"
          >
            <Ionicons name="arrow-back" size={24} color="#1A202C" />
          </XStack>
          <XStack
            width={40}
            height={40}
            borderRadius="$full"
            backgroundColor="rgba(255,255,255,0.9)"
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.8 }}
            testID="favorite-button"
          >
            <Ionicons name="heart-outline" size={22} color="#1A202C" />
          </XStack>
        </XStack>
      </YStack>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Title & Rating */}
        <YStack gap="$2" marginBottom="$4">
          <Badge label={tierInfo.label} variant="primary" size="sm" />
          <Text fontSize="$7" fontWeight="800" color="$textPrimary">
            {pkg.name}
          </Text>
          <XStack alignItems="center" gap="$2">
            <XStack alignItems="center" gap="$1">
              <Ionicons name="star" size={18} color="#FFB800" />
              <Text fontSize="$3" fontWeight="700" color="$textPrimary">
                {pkg.rating?.toFixed(1) || '4.5'}
              </Text>
            </XStack>
            <Text color="$textSecondary">
              ({pkg.review_count || 0} reviews)
            </Text>
          </XStack>
        </YStack>

        {/* Price */}
        <Card marginBottom="$4" testID="price-card">
          <XStack justifyContent="space-between" alignItems="flex-end">
            <YStack>
              <Text fontSize="$2" color="$textSecondary">
                Starting from
              </Text>
              <Text fontSize="$8" fontWeight="800" color="$primary">
                {formatPrice(pkg.base_price_cents)}
              </Text>
            </YStack>
            <YStack alignItems="flex-end">
              <Text fontSize="$4" fontWeight="600" color="$textPrimary">
                {formatPrice(pkg.price_per_person_cents)}
              </Text>
              <Text fontSize="$2" color="$textSecondary">
                per person
              </Text>
            </YStack>
          </XStack>
        </Card>

        {/* Features */}
        <YStack marginBottom="$4">
          <Text fontSize="$4" fontWeight="700" color="$textPrimary" marginBottom="$3">
            What's Included
          </Text>
          <YStack gap="$2">
            {(pkg.features || []).map((feature: string, index: number) => (
              <XStack key={index} alignItems="center" gap="$2">
                <Ionicons name="checkmark-circle" size={20} color="#47B881" />
                <Text color="$textPrimary">{feature}</Text>
              </XStack>
            ))}
          </YStack>
        </YStack>

        {/* Premium Highlights */}
        {pkg.premium_highlights && pkg.premium_highlights.length > 0 && (
          <YStack marginBottom="$4">
            <Text fontSize="$4" fontWeight="700" color="$textPrimary" marginBottom="$3">
              Premium Highlights
            </Text>
            <XStack flexWrap="wrap" gap="$2">
              {pkg.premium_highlights.map((highlight: string, index: number) => (
                <Badge key={index} label={highlight} variant="warning" />
              ))}
            </XStack>
          </YStack>
        )}

        {/* Description */}
        {pkg.description && (
          <YStack marginBottom="$4">
            <Text fontSize="$4" fontWeight="700" color="$textPrimary" marginBottom="$2">
              About This Package
            </Text>
            <Text color="$textSecondary" lineHeight={24}>
              {pkg.description}
            </Text>
          </YStack>
        )}

        {/* Ideal For */}
        <Card backgroundColor="rgba(37, 140, 244, 0.05)" borderWidth={0}>
          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="700" color="$primary">
              Ideal For
            </Text>
            <XStack flexWrap="wrap" gap="$2">
              {pkg.ideal_gathering_size && (
                <Badge label={pkg.ideal_gathering_size.replace('_', ' ')} variant="info" />
              )}
              {pkg.ideal_energy_level && (
                <Badge label={pkg.ideal_energy_level.replace('_', ' ')} variant="info" />
              )}
              {(pkg.ideal_vibe || []).slice(0, 3).map((vibe: string, index: number) => (
                <Badge key={index} label={vibe} variant="neutral" />
              ))}
            </XStack>
          </YStack>
        </Card>
      </ScrollView>

      {/* Footer CTA */}
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        padding="$4"
        paddingBottom={insets.bottom + 16}
        backgroundColor="$surface"
        borderTopWidth={1}
        borderTopColor="$borderColor"
        gap="$3"
        alignItems="center"
      >
        <YStack>
          <Text fontSize="$5" fontWeight="800" color="$primary">
            {formatPrice(pkg.base_price_cents)}
          </Text>
          <Text fontSize="$1" color="$textSecondary">
            total package
          </Text>
        </YStack>
        <Button
          flex={1}
          onPress={() => router.back()}
          testID="select-package-button"
        >
          Select Package
        </Button>
      </XStack>
    </YStack>
  );
}
