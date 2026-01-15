/**
 * Event Summary Screen (Phase 5)
 * Event details with planning tools grid
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner, Image } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent } from '@/hooks/queries/useEvents';
import { useParticipants } from '@/hooks/queries/useParticipants';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShareEventBanner } from '@/components/events';

const PLANNING_TOOLS = [
  { key: 'invitations', icon: 'people', label: 'Invitations', route: 'participants' },
  { key: 'communication', icon: 'chatbubbles', label: 'Communication', route: 'communication' },
  { key: 'budget', icon: 'wallet', label: 'Budget', route: 'budget' },
  { key: 'packages', icon: 'gift', label: 'Packages', route: 'packages' },
];

export default function EventSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: event, isLoading: eventLoading } = useEvent(id);
  const { data: participants } = useParticipants(id);

  if (eventLoading || !event) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  const statusConfig = {
    draft: { label: 'Draft', variant: 'neutral' as const },
    planning: { label: 'Planning', variant: 'info' as const },
    booked: { label: 'Booked', variant: 'success' as const },
    completed: { label: 'Completed', variant: 'success' as const },
    cancelled: { label: 'Cancelled', variant: 'error' as const },
  };

  const status = statusConfig[event.status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <YStack flex={1} backgroundColor="$background" testID="event-summary-screen">
      {/* Header */}
      <YStack position="relative">
        <Image
          source={{ uri: event.hero_image_url || 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800' }}
          width="100%"
          height={200}
        />
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0,0,0,0.3)"
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
            onPress={() => router.push(`/event/${id}/edit`)}
            testID="edit-button"
          >
            <Ionicons name="create-outline" size={22} color="#1A202C" />
          </XStack>
        </XStack>
      </YStack>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Event Title & Info */}
        <YStack gap="$2" marginBottom="$4">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize="$7" fontWeight="800" color="$textPrimary" flex={1}>
              {event.title || `${event.honoree_name}'s Party`}
            </Text>
            <Badge label={status.label} variant={status.variant} />
          </XStack>

          <XStack gap="$4" alignItems="center">
            <XStack gap="$1" alignItems="center">
              <Ionicons name="location" size={16} color="#64748B" />
              <Text color="$textSecondary">{event.city?.name || 'Unknown'}</Text>
            </XStack>
            <XStack gap="$1" alignItems="center">
              <Ionicons name="calendar" size={16} color="#64748B" />
              <Text color="$textSecondary">
                {new Date(event.start_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </XStack>
          </XStack>

          {event.vibe && (
            <Text color="$textSecondary" fontStyle="italic">
              "{event.vibe}"
            </Text>
          )}
        </YStack>

        {/* Share Event Banner */}
        <YStack marginBottom="$4">
          <ShareEventBanner
            eventId={id!}
            eventTitle={event.title || `${event.honoree_name}'s Party`}
            participantCount={participants?.length || 0}
          />
        </YStack>

        {/* Planning Tools Grid */}
        <Text fontSize="$4" fontWeight="700" color="$textPrimary" marginBottom="$3">
          Planning Tools
        </Text>
        <XStack flexWrap="wrap" gap="$3" marginBottom="$6">
          {PLANNING_TOOLS.map(tool => (
            <Card
              key={tool.key}
              width="47%"
              padding="$4"
              onPress={() => router.push(`/event/${id}/${tool.route}`)}
              testID={`planning-tool-${tool.key}`}
            >
              <YStack alignItems="center" gap="$2">
                <YStack
                  width={48}
                  height={48}
                  borderRadius="$full"
                  backgroundColor="$backgroundHover"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name={tool.icon as any} size={24} color="#258CF4" />
                </YStack>
                <Text fontWeight="600" color="$textPrimary">
                  {tool.label}
                </Text>
                {tool.key === 'invitations' && participants && (
                  <Badge label={`${participants.length} guests`} variant="neutral" size="sm" />
                )}
              </YStack>
            </Card>
          ))}
        </XStack>

        {/* Destination Guide */}
        <Card
          onPress={() => router.push(`/event/${id}/destination`)}
          testID="destination-guide-card"
        >
          <XStack gap="$3" alignItems="center">
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=200' }}
              width={80}
              height={80}
              borderRadius="$md"
            />
            <YStack flex={1} gap="$1">
              <Text fontSize="$2" color="$textSecondary" textTransform="uppercase">
                Destination Guide
              </Text>
              <Text fontSize="$4" fontWeight="700" color="$textPrimary">
                {event.city?.name || 'Unknown'}
              </Text>
              <Text fontSize="$2" color="$primary">
                View local tips & recommendations →
              </Text>
            </YStack>
          </XStack>
        </Card>
      </ScrollView>

      {/* Book Package CTA */}
      {event.status === 'planning' && (
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
        >
          <Button
            flex={1}
            onPress={() => router.push(`/booking/${id}/summary`)}
            testID="book-package-button"
          >
            Book Package
          </Button>
        </XStack>
      )}
    </YStack>
  );
}
