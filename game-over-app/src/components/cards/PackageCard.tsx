/**
 * PackageCard Component
 * Card displaying package with price, rating, features, and match badge
 * Memoized for performance in lists
 */

import React, { memo } from 'react';
import { ImageSourcePropType } from 'react-native';
import { styled, YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { OptimizedImage } from '../ui/OptimizedImage';
import { getPackageImage, resolveImageSource } from '@/constants/packageImages';

const BestMatchBadge = styled(XStack, {
  position: 'absolute',
  top: '$2',
  right: '$2',
  backgroundColor: '$primary',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$sm',
  gap: '$1',
  alignItems: 'center',
});

export interface PackageCardProps {
  id: string;
  name: string;
  tier: 'essential' | 'classic' | 'grand';
  basePriceCents: number;
  pricePerPersonCents: number;
  rating: number;
  reviewCount: number;
  features: string[];
  heroImageUrl?: string | number | ImageSourcePropType;
  isBestMatch?: boolean;
  matchScore?: number;
  onPress?: () => void;
  testID?: string;
}

const tierConfig = {
  essential: { label: 'Essential', color: '$textSecondary' },
  classic: { label: 'Classic', color: '$primary' },
  grand: { label: 'Grand', color: '$warning' },
};

export const PackageCard = memo(function PackageCard({
  name,
  tier,
  basePriceCents,
  pricePerPersonCents,
  rating,
  reviewCount,
  features,
  heroImageUrl,
  isBestMatch,
  onPress,
  testID,
}: PackageCardProps) {
  const tierInfo = tierConfig[tier];
  const formattedPrice = (basePriceCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  });
  const formattedPerPerson = (pricePerPersonCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  });

  return (
    <Card onPress={onPress} testID={testID} padding="$3" gap="$3">
      <YStack position="relative">
        <OptimizedImage
          source={resolveImageSource(heroImageUrl || getPackageImage('berlin', 'essential'))}
          height={160}
          borderRadius={8}
        />
        {isBestMatch && (
          <BestMatchBadge>
            <Text fontSize={10}>🤖</Text>
            <Text color="white" fontSize={10} fontWeight="700">
              BEST MATCH
            </Text>
          </BestMatchBadge>
        )}
      </YStack>

      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap="$0.5">
            <Text fontSize={12} fontWeight="600" color={tierInfo.color} textTransform="uppercase">
              {tierInfo.label}
            </Text>
            <Text fontSize="$4" fontWeight="700" color="$textPrimary" numberOfLines={1}>
              {name}
            </Text>
          </YStack>
        </XStack>

        <XStack alignItems="center" gap="$1">
          <Ionicons name="star" size={14} color="#FFB800" />
          <Text fontSize="$2" fontWeight="600" color="$textPrimary">
            {rating.toFixed(1)}
          </Text>
          <Text fontSize="$2" color="$textSecondary">
            ({reviewCount} reviews)
          </Text>
        </XStack>

        <XStack flexWrap="wrap" gap="$1">
          {features.slice(0, 3).map((feature, index) => (
            <Badge key={index} label={feature} variant="neutral" size="sm" />
          ))}
          {features.length > 3 && (
            <Badge label={`+${features.length - 3} more`} variant="primary" size="sm" />
          )}
        </XStack>

        <XStack justifyContent="space-between" alignItems="baseline" marginTop="$2">
          <YStack>
            <Text fontSize="$5" fontWeight="800" color="$primary">
              {formattedPrice}
            </Text>
            <Text fontSize="$1" color="$textSecondary">
              total package
            </Text>
          </YStack>
          <YStack alignItems="flex-end">
            <Text fontSize="$3" fontWeight="600" color="$textPrimary">
              {formattedPerPerson}
            </Text>
            <Text fontSize="$1" color="$textSecondary">
              per person
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </Card>
  );
});

export default PackageCard;
