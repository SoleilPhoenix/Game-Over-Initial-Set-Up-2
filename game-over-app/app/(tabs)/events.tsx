/**
 * Events Dashboard Screen (Phase 3)
 * Main events list with filtering, FAB for creation
 */

import React, { useState, useCallback } from 'react';
import { RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/hooks/queries/useEvents';
import { useAuthStore } from '@/stores/authStore';
import { EventCard } from '@/components/cards/EventCard';
import { Button } from '@/components/ui/Button';

type FilterTab = 'all' | 'organizing' | 'attending';

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { data: events, isLoading, refetch, isRefetching } = useEvents();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const filteredEvents = React.useMemo(() => {
    if (!events) return [];
    switch (activeFilter) {
      case 'organizing':
        return events.filter(e => e.created_by === user?.id);
      case 'attending':
        return events.filter(e => e.created_by !== user?.id);
      default:
        return events;
    }
  }, [events, activeFilter, user?.id]);

  const handleEventPress = useCallback((eventId: string) => {
    router.push(`/event/${eventId}`);
  }, [router]);

  const handleCreateEvent = useCallback(() => {
    router.push('/create-event');
  }, [router]);

  const renderEvent = useCallback(({ item }: { item: any }) => (
    <EventCard
      id={item.id}
      title={item.title}
      honoreeName={item.honoree_name}
      cityName={item.city?.name || 'Unknown'}
      startDate={item.start_date}
      heroImageUrl={item.hero_image_url}
      status={item.status}
      role={item.created_by === user?.id ? 'organizer' : 'guest'}
      progress={item.progress || 0}
      onPress={() => handleEventPress(item.id)}
      testID={`event-card-${item.id}`}
    />
  ), [user?.id, handleEventPress]);

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
      {/* Header */}
      <XStack paddingHorizontal="$4" paddingVertical="$3" alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$3">
          <YStack
            width={40}
            height={40}
            borderRadius="$full"
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <Text color="white" fontWeight="700">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </YStack>
          <Text fontSize="$6" fontWeight="700" color="$textPrimary">
            My Events
          </Text>
        </XStack>
        <XStack
          width={40}
          height={40}
          borderRadius="$full"
          backgroundColor="$surface"
          alignItems="center"
          justifyContent="center"
          pressStyle={{ opacity: 0.7 }}
          testID="notifications-button"
        >
          <Ionicons name="notifications-outline" size={22} color="#64748B" />
        </XStack>
      </XStack>

      {/* Filter Tabs */}
      <XStack paddingHorizontal="$4" gap="$2" marginBottom="$3">
        {(['all', 'organizing', 'attending'] as FilterTab[]).map(tab => (
          <XStack
            key={tab}
            paddingHorizontal="$4"
            paddingVertical="$2"
            borderRadius="$full"
            backgroundColor={activeFilter === tab ? '$primary' : '$surface'}
            pressStyle={{ opacity: 0.8 }}
            onPress={() => setActiveFilter(tab)}
            testID={`filter-${tab}`}
          >
            <Text
              color={activeFilter === tab ? 'white' : '$textSecondary'}
              fontWeight="600"
              fontSize="$2"
              textTransform="capitalize"
            >
              {tab}
            </Text>
          </XStack>
        ))}
      </XStack>

      {/* Events List */}
      <YStack flex={1} paddingHorizontal="$4">
        {filteredEvents.length === 0 ? (
          <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
            <YStack
              width={120}
              height={120}
              borderRadius="$full"
              backgroundColor="$backgroundHover"
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons name="calendar-outline" size={48} color="#64748B" />
            </YStack>
            <Text fontSize="$5" fontWeight="600" color="$textPrimary">
              No events yet
            </Text>
            <Text fontSize="$3" color="$textSecondary" textAlign="center">
              Start planning your first bachelor or bachelorette party!
            </Text>
            <Button onPress={handleCreateEvent} testID="create-first-event-button">
              Create Your First Event
            </Button>
          </YStack>
        ) : (
          <FlashList
            data={filteredEvents}
            renderItem={renderEvent}
            estimatedItemSize={260}
            contentContainerStyle={{ paddingBottom: 100 }}
            ItemSeparatorComponent={() => <YStack height={16} />}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            testID="events-list"
          />
        )}
      </YStack>

      {/* FAB */}
      <XStack
        position="absolute"
        bottom={insets.bottom + 90}
        right={20}
        width={56}
        height={56}
        borderRadius="$full"
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
        shadowColor="$shadowColor"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.3}
        shadowRadius={8}
        elevation={8}
        pressStyle={{ scale: 0.95 }}
        onPress={handleCreateEvent}
        testID="fab-create-event"
      >
        <Ionicons name="add" size={28} color="white" />
      </XStack>
    </YStack>
  );
}
