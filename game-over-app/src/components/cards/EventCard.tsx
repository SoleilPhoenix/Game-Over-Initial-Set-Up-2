/**
 * EventCard Component
 * Card displaying event with image, title, date, status, and progress
 */

import React from 'react';
import { styled, YStack, XStack, Text, Image } from 'tamagui';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { Card } from '../ui/Card';

const EventImage = styled(Image, {
  width: '100%',
  height: 140,
  borderRadius: '$md',
});

const RoleBadge = styled(XStack, {
  position: 'absolute',
  top: '$2',
  left: '$2',
  backgroundColor: 'rgba(0,0,0,0.7)',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$sm',
});

export interface EventCardProps {
  id: string;
  title: string;
  honoreeName: string;
  cityName: string;
  startDate: string;
  endDate?: string;
  heroImageUrl?: string;
  status: 'draft' | 'planning' | 'booked' | 'completed' | 'cancelled';
  role: 'organizer' | 'guest' | 'honoree';
  progress: number;
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  onPress?: () => void;
  testID?: string;
}

const statusConfig = {
  draft: { label: 'Draft', variant: 'neutral' as const },
  planning: { label: 'Planning', variant: 'info' as const },
  booked: { label: 'Booked', variant: 'success' as const },
  completed: { label: 'Completed', variant: 'success' as const },
  cancelled: { label: 'Cancelled', variant: 'error' as const },
};

const paymentConfig = {
  pending: { label: 'Payment Pending', variant: 'warning' as const },
  paid: { label: 'Paid', variant: 'success' as const },
  refunded: { label: 'Refunded', variant: 'info' as const },
};

export function EventCard({
  title,
  honoreeName,
  cityName,
  startDate,
  heroImageUrl,
  status,
  role,
  progress,
  paymentStatus,
  onPress,
  testID,
}: EventCardProps) {
  const statusInfo = statusConfig[status];
  const formattedDate = new Date(startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card onPress={onPress} testID={testID} padding="$3" gap="$3">
      <YStack position="relative">
        <EventImage
          source={{ uri: heroImageUrl || 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400' }}
          resizeMode="cover"
        />
        <RoleBadge>
          <Text color="white" fontSize={10} fontWeight="700" textTransform="uppercase">
            {role}
          </Text>
        </RoleBadge>
      </YStack>

      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap="$1">
            <Text fontSize="$4" fontWeight="700" color="$textPrimary" numberOfLines={1}>
              {title || `${honoreeName}'s Party`}
            </Text>
            <Text fontSize="$2" color="$textSecondary">
              {cityName} • {formattedDate}
            </Text>
          </YStack>
          <Badge label={statusInfo.label} variant={statusInfo.variant} size="sm" />
        </XStack>

        <ProgressBar value={progress} showPercentage size="sm" />

        {role === 'guest' && paymentStatus && (
          <Badge
            label={paymentConfig[paymentStatus].label}
            variant={paymentConfig[paymentStatus].variant}
            size="sm"
          />
        )}
      </YStack>
    </Card>
  );
}

export default EventCard;
