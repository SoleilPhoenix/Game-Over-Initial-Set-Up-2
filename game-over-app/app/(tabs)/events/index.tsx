/**
 * Events Screen
 * Main dashboard showing user's events with pull-to-refresh
 * Dark glassmorphic design matching UI specifications
 */

import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Image } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvents } from '@/hooks/queries/useEvents';
import { useUser, useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/Badge';
import { SkeletonEventCard } from '@/components/ui/Skeleton';
import { DARK_THEME } from '@/constants/theme';

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
      <Pressable
        onPress={() => handleEventPress(item.id)}
        style={({ pressed }) => [
          styles.eventCard,
          pressed && styles.eventCardPressed,
        ]}
        testID={`event-card-${item.id}`}
      >
        <BlurView intensity={10} tint="dark" style={styles.cardBlur}>
          <View style={styles.cardInner}>
            {item.hero_image_url && (
              <Image
                source={{ uri: item.hero_image_url }}
                width="100%"
                height={140}
                borderRadius={12}
                marginBottom={12}
              />
            )}
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack flex={1} gap={4}>
                <Text fontSize={18} fontWeight="700" color={DARK_THEME.textPrimary}>
                  {item.title || `${item.honoree_name}'s Party`}
                </Text>
                <Text fontSize={14} color={DARK_THEME.textSecondary}>
                  Celebrating {item.honoree_name}
                </Text>
              </YStack>
              <Badge label={status.label} variant={status.variant} />
            </XStack>
            <XStack gap={16} marginTop={12}>
              <XStack gap={6} alignItems="center">
                <Ionicons name="location-outline" size={14} color={DARK_THEME.textTertiary} />
                <Text fontSize={13} color={DARK_THEME.textSecondary}>
                  {item.city?.name || 'TBD'}
                </Text>
              </XStack>
              <XStack gap={6} alignItems="center">
                <Ionicons name="calendar-outline" size={14} color={DARK_THEME.textTertiary} />
                <Text fontSize={13} color={DARK_THEME.textSecondary}>
                  {item.start_date
                    ? new Date(item.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'TBD'}
                </Text>
              </XStack>
            </XStack>
          </View>
        </BlurView>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <YStack flex={1} justifyContent="center" alignItems="center" padding={24}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={[`${DARK_THEME.primary}30`, `${DARK_THEME.primary}10`]}
          style={styles.emptyIconGradient}
        >
          <Text fontSize={56}>🎊</Text>
        </LinearGradient>
      </View>
      <Text fontSize={24} fontWeight="800" color={DARK_THEME.textPrimary} marginBottom={8}>
        No Events Yet
      </Text>
      <Text
        fontSize={16}
        color={DARK_THEME.textSecondary}
        textAlign="center"
        marginBottom={24}
        maxWidth={280}
        lineHeight={24}
      >
        Create your first event and start planning an unforgettable party!
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
        ]}
        onPress={handleCreateEvent}
        testID="create-first-event-button"
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.primaryButtonText}>Create Event</Text>
      </Pressable>
    </YStack>
  );

  const renderLoadingState = () => (
    <YStack padding={16} gap={12}>
      {[1, 2, 3].map((i) => (
        <SkeletonEventCard key={i} testID={`skeleton-event-${i}`} />
      ))}
    </YStack>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background gradient */}
      <LinearGradient
        colors={[DARK_THEME.deepNavy, DARK_THEME.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blur circle */}
      <View style={styles.decorCircle} />

      {/* Header */}
      <BlurView intensity={15} tint="dark" style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          <YStack>
            <Text fontSize={14} color={DARK_THEME.textSecondary}>
              Welcome back,
            </Text>
            <Text fontSize={20} fontWeight="700" color={DARK_THEME.textPrimary}>
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest'}
            </Text>
          </YStack>
          <Pressable
            onPress={handleCreateEvent}
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.createButtonPressed,
            ]}
            testID="create-event-button"
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </BlurView>

      {/* Content */}
      {isLoading && !events ? (
        renderLoadingState()
      ) : events && events.length > 0 ? (
        <FlatList
          data={events}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={DARK_THEME.primary}
              colors={[DARK_THEME.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          testID="events-list"
        />
      ) : (
        renderEmptyState()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  decorCircle: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: `${DARK_THEME.primary}15`,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.glassBorder,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: DARK_THEME.glass,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DARK_THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DARK_THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  eventCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  eventCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardBlur: {
    overflow: 'hidden',
  },
  cardInner: {
    padding: 16,
    backgroundColor: DARK_THEME.glass,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DARK_THEME.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: DARK_THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
