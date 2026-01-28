/**
 * Events Screen
 * Main dashboard showing user's events with pull-to-refresh
 * Dark glassmorphic design matching UI specifications
 * Updated to match mockup v3: Avatar + "My Events" + Bell, tab filters, progress cards
 */

import React, { useCallback, useState, useMemo } from 'react';
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

type FilterTab = 'all' | 'organizing' | 'attending';

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const signOut = useAuthStore((state) => state.signOut);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const { data: events, isLoading, refetch } = useEvents();

  // Get user initials for avatar
  const userInitials = useMemo(() => {
    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'U';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [user]);

  // Filter events based on active tab
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (activeFilter === 'all') return events;
    if (activeFilter === 'organizing') {
      return events.filter((e: any) => e.organizer_id === user?.id);
    }
    return events.filter((e: any) => e.organizer_id !== user?.id);
  }, [events, activeFilter, user?.id]);

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
    const configs: Record<string, { label: string; variant: 'neutral' | 'info' | 'success' | 'error'; color: string }> = {
      draft: { label: 'Draft', variant: 'neutral', color: '#6B7280' },
      planning: { label: 'Planning Phase', variant: 'info', color: '#F59E0B' },
      booked: { label: 'All Set & Ready', variant: 'success', color: '#10B981' },
      completed: { label: 'Completed', variant: 'success', color: '#10B981' },
      cancelled: { label: 'Cancelled', variant: 'error', color: '#EF4444' },
    };
    return configs[status] || configs.draft;
  };

  const getRoleBadge = (event: any) => {
    const isOrganizer = event.organizer_id === user?.id;
    return {
      label: isOrganizer ? 'ORGANIZER' : 'GUEST',
      color: isOrganizer ? DARK_THEME.primary : '#6B7280',
    };
  };

  const getProgressPercentage = (event: any) => {
    // Calculate progress based on event status and planning stage
    const statusProgress: Record<string, number> = {
      draft: 15,
      planning: 45,
      booked: 100,
      completed: 100,
      cancelled: 0,
    };
    return statusProgress[event.status] || 0;
  };

  const renderEventCard = ({ item }: { item: any }) => {
    const status = getStatusConfig(item.status);
    const role = getRoleBadge(item);
    const progress = getProgressPercentage(item);
    const daysLeft = item.start_date
      ? Math.max(0, Math.ceil((new Date(item.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

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
            {/* Top row: Thumbnail + Event Info */}
            <XStack gap={12}>
              {/* Thumbnail */}
              <Image
                source={{
                  uri: item.hero_image_url || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&q=80',
                }}
                width={100}
                height={80}
                borderRadius={12}
              />

              {/* Event Info */}
              <YStack flex={1} gap={4}>
                <XStack justifyContent="space-between" alignItems="flex-start">
                  <Text
                    fontSize={16}
                    fontWeight="700"
                    color={DARK_THEME.textPrimary}
                    numberOfLines={1}
                    flex={1}
                  >
                    {item.title || `${item.honoree_name}'s Bachelor...`}
                  </Text>
                  <Pressable style={styles.moreButton} testID={`event-more-${item.id}`}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={DARK_THEME.textSecondary} />
                  </Pressable>
                </XStack>

                {/* Date */}
                <XStack gap={6} alignItems="center">
                  <Ionicons name="calendar-outline" size={14} color={DARK_THEME.textTertiary} />
                  <Text fontSize={13} color={DARK_THEME.textSecondary}>
                    {item.start_date && item.end_date
                      ? `${new Date(item.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(item.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : item.start_date
                      ? new Date(item.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'TBD'}
                  </Text>
                </XStack>

                {/* Role badge + days left */}
                <XStack gap={8} alignItems="center">
                  <View style={[styles.roleBadge, { backgroundColor: `${role.color}20` }]}>
                    <Text fontSize={10} fontWeight="700" color={role.color}>
                      {role.label}
                    </Text>
                  </View>
                  {daysLeft !== null && daysLeft > 0 && (
                    <Text fontSize={12} color={DARK_THEME.textTertiary}>
                      • {daysLeft} days left
                    </Text>
                  )}
                  {status.label === 'All Set & Ready' && (
                    <Text fontSize={12} color={DARK_THEME.textTertiary}>
                      • Paid
                    </Text>
                  )}
                </XStack>
              </YStack>
            </XStack>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <XStack justifyContent="space-between" alignItems="center" marginBottom={6}>
                <XStack gap={6} alignItems="center">
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text fontSize={12} color={status.color}>
                    {status.label}
                  </Text>
                </XStack>
                <Text fontSize={12} fontWeight="600" color={status.color}>
                  {progress}%
                </Text>
              </XStack>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress}%`, backgroundColor: status.color },
                  ]}
                />
              </View>
            </View>
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

      {/* Header - Matching mockup v3: Avatar + "My Events" + Bell */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          {/* Left: Avatar with online indicator */}
          <XStack alignItems="center" gap={12}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[DARK_THEME.primary, '#60A5FA']}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarInner}>
                  <Text fontSize={14} fontWeight="700" color={DARK_THEME.textPrimary}>
                    {userInitials}
                  </Text>
                </View>
              </LinearGradient>
              <View style={styles.onlineIndicator} />
            </View>
            <Text fontSize={20} fontWeight="700" color={DARK_THEME.textPrimary}>
              My Events
            </Text>
          </XStack>

          {/* Right: Notification bell */}
          <Pressable
            onPress={() => router.push('/notifications')}
            style={({ pressed }) => [
              styles.bellButton,
              pressed && styles.bellButtonPressed,
            ]}
            testID="notifications-button"
          >
            <Ionicons name="notifications-outline" size={24} color={DARK_THEME.textPrimary} />
            {/* Notification dot */}
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        {/* Tab Filters: All / Organizing / Attending */}
        <View style={styles.tabFiltersContainer}>
          <BlurView intensity={10} tint="dark" style={styles.tabFiltersBlur}>
            <View style={styles.tabFiltersInner}>
              {(['all', 'organizing', 'attending'] as FilterTab[]).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveFilter(tab)}
                  style={[
                    styles.tabFilter,
                    activeFilter === tab && styles.tabFilterActive,
                  ]}
                  testID={`filter-tab-${tab}`}
                >
                  <Text
                    fontSize={13}
                    fontWeight="600"
                    color={activeFilter === tab ? DARK_THEME.textPrimary : DARK_THEME.textSecondary}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </BlurView>
        </View>
      </View>

      {/* Content */}
      {isLoading && !events ? (
        renderLoadingState()
      ) : filteredEvents && filteredEvents.length > 0 ? (
        <FlatList
          data={filteredEvents}
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
          ListFooterComponent={
            <Pressable
              style={({ pressed }) => [
                styles.startNewPlanButton,
                pressed && styles.startNewPlanButtonPressed,
              ]}
              onPress={handleCreateEvent}
              testID="start-new-plan-button"
            >
              <View style={styles.startNewPlanIcon}>
                <Ionicons name="add" size={20} color={DARK_THEME.textTertiary} />
              </View>
              <Text fontSize={14} fontWeight="500" color={DARK_THEME.textTertiary}>
                Start New Plan
              </Text>
            </Pressable>
          }
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
    paddingBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: DARK_THEME.background,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DARK_THEME.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    position: 'relative',
  },
  bellButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  tabFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabFiltersBlur: {
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  tabFiltersInner: {
    flexDirection: 'row',
    backgroundColor: DARK_THEME.glass,
    padding: 4,
  },
  tabFilter: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  tabFilterActive: {
    backgroundColor: DARK_THEME.primary,
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
  moreButton: {
    padding: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  progressContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DARK_THEME.glassBorder,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  startNewPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: DARK_THEME.glassBorder,
  },
  startNewPlanButtonPressed: {
    opacity: 0.7,
    backgroundColor: DARK_THEME.glass,
  },
  startNewPlanIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DARK_THEME.glass,
    alignItems: 'center',
    justifyContent: 'center',
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
