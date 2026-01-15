/**
 * Events Screen
 * Main dashboard showing user's events with pull-to-refresh
 */

import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Image } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/hooks/queries/useEvents';
import { useUser, useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SkeletonEventCard } from '@/components/ui/Skeleton';

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const signOut = useAuthStore((state) => state.signOut);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: events, isLoading, refetch } = useEvents();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleCreateEvent = () => {
    router.push('/create-event');
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; variant: 'neutral' | 'info' | 'success' | 'error' }> = {
      draft: { label: 'Draft', variant: 'neutral' },
      planning: { label: 'Planning', variant: 'info' },
      booked: { label: 'Booked', variant: 'success' },
      completed: { label: 'Completed', variant: 'success' },
      cancelled: { label: 'Cancelled', variant: 'error' },
    };
    return configs[status] || configs.draft;
  };

  const renderEventCard = ({ item }: { item: any }) => {
    const status = getStatusConfig(item.status);
    return (
      <Card
        marginBottom="$3"
        onPress={() => handleEventPress(item.id)}
        testID={`event-card-${item.id}`}
      >
        {item.hero_image_url && (
          <Image
            source={{ uri: item.hero_image_url }}
            width="100%"
            height={160}
            borderRadius="$md"
            marginBottom="$3"
          />
        )}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap="$1">
            <Text fontSize="$5" fontWeight="700" color="$textPrimary">
              {item.title || `${item.honoree_name}'s Party`}
            </Text>
            <Text fontSize="$2" color="$textSecondary">
              Celebrating {item.honoree_name}
            </Text>
          </YStack>
          <Badge label={status.label} variant={status.variant} />
        </XStack>
        <XStack gap="$4" marginTop="$3">
          <XStack gap="$1" alignItems="center">
            <Ionicons name="location-outline" size={14} color="#64748B" />
            <Text fontSize="$2" color="$textSecondary">
              {item.city?.name || 'TBD'}
            </Text>
          </XStack>
          <XStack gap="$1" alignItems="center">
            <Ionicons name="calendar-outline" size={14} color="#64748B" />
            <Text fontSize="$2" color="$textSecondary">
              {item.start_date
                ? new Date(item.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'TBD'}
            </Text>
          </XStack>
        </XStack>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
      <YStack
        width={120}
        height={120}
        borderRadius="$full"
        backgroundColor="rgba(37, 140, 244, 0.1)"
        justifyContent="center"
        alignItems="center"
        marginBottom="$4"
      >
        <Text fontSize={56}>🎊</Text>
      </YStack>
      <Text fontSize="$6" fontWeight="700" color="$textPrimary" marginBottom="$2">
        No Events Yet
      </Text>
      <Text
        fontSize="$3"
        color="$textSecondary"
        textAlign="center"
        marginBottom="$6"
        maxWidth={280}
      >
        Create your first event and start planning an unforgettable party!
      </Text>
      <Button onPress={handleCreateEvent} testID="create-first-event-button">
        Create Event
      </Button>
    </YStack>
  );

  const renderLoadingState = () => (
    <YStack padding="$4" gap="$3">
      {[1, 2, 3].map((i) => (
        <SkeletonEventCard key={i} testID={`skeleton-event-${i}`} />
      ))}
    </YStack>
  );

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$4"
        paddingBottom="$3"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor="$surface"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <YStack>
          <Text fontSize="$2" color="$textSecondary">
            Welcome back,
          </Text>
          <Text fontSize="$5" fontWeight="700" color="$textPrimary">
            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest'}
          </Text>
        </YStack>
        <XStack gap="$2">
          <Pressable
            onPress={handleCreateEvent}
            style={{ padding: 8 }}
            testID="create-event-button"
          >
            <Ionicons name="add-circle" size={28} color="#258CF4" />
          </Pressable>
        </XStack>
      </XStack>

      {/* Content */}
      {isLoading && !events ? (
        renderLoadingState()
      ) : events && events.length > 0 ? (
        <FlatList
          data={events}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#258CF4"
              colors={['#258CF4']}
            />
          }
          showsVerticalScrollIndicator={false}
          testID="events-list"
        />
      ) : (
        renderEmptyState()
      )}
    </YStack>
  );
}
