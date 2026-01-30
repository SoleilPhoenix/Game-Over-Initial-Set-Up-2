/**
 * Chat Screen
 * Communication Center with Chat, Voting, and Decisions tabs
 * Dark glassmorphic design matching mockup v4.1
 */

import React, { useState, useMemo } from 'react';
import { ScrollView, RefreshControl, Pressable, StyleSheet, View, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Image } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useEvents } from '@/hooks/queries/useEvents';
import { useChannels } from '@/hooks/queries/useChat';
import { useUser } from '@/stores/authStore';
import { DARK_THEME } from '@/constants/theme';
import type { Database } from '@/lib/supabase/types';

type Event = Database['public']['Tables']['events']['Row'] & {
  city?: { name: string } | null;
};

type TabType = 'chat' | 'voting' | 'decisions';

// Channel category configuration
const CHANNEL_CATEGORIES = {
  general: { label: 'GENERAL', icon: 'chatbubbles', color: '#A78BFA' },
  accommodation: { label: 'ACCOMMODATION', icon: 'home', color: '#22D3EE' },
  activities: { label: 'ACTIVITIES', icon: 'game-controller', color: '#FB923C' },
  budget: { label: 'BUDGET', icon: 'cash', color: '#34D399' },
} as const;

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get user avatar
  const avatarUrl = user?.user_metadata?.avatar_url;
  const userInitials = useMemo(() => {
    const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  }, [user]);

  // Fetch user's events
  const {
    data: events,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useEvents();

  // Fetch channels for selected event
  const {
    data: channels,
    isLoading: channelsLoading,
    refetch: refetchChannels,
  } = useChannels(selectedEventId || undefined);

  // Filter to only show events with status that would have chat
  const activeEvents = useMemo(() => {
    return (events || []).filter(
      (e: Event) => e.status !== 'draft' && e.status !== 'cancelled'
    );
  }, [events]);

  // Auto-select first event if none selected
  React.useEffect(() => {
    if (!selectedEventId && activeEvents.length > 0) {
      setSelectedEventId(activeEvents[0].id);
    }
  }, [activeEvents, selectedEventId]);

  const selectedEvent = activeEvents.find((e: Event) => e.id === selectedEventId);

  // Group channels by category
  const groupedChannels = useMemo(() => {
    if (!channels) return {};
    const groups: Record<string, typeof channels> = {
      general: [],
      accommodation: [],
      activities: [],
      budget: [],
    };
    channels.forEach((channel: any) => {
      const category = channel.category || 'general';
      if (groups[category]) {
        groups[category].push(channel);
      } else {
        groups.general.push(channel);
      }
    });
    return groups;
  }, [channels]);

  const handleChannelPress = (channelId: string) => {
    router.push(`/(tabs)/chat/${channelId}`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchEvents(), refetchChannels()]);
    setIsRefreshing(false);
  };

  // Check if we're in empty state (no events)
  // Show empty state while loading to avoid flash (better to show empty than wrong content)
  const hasNoEvents = eventsLoading || activeEvents.length === 0;

  // Empty state content configuration per tab
  const emptyStateConfig = {
    chat: {
      emoji: '💬',
      title: 'No Chats Yet',
      subtitleLine1: 'Create your first event and',
      subtitleLine2: 'start chatting with your group!',
    },
    voting: {
      emoji: '🗳️',
      title: 'No Votings Yet',
      subtitleLine1: 'Create your first event and',
      subtitleLine2: 'start voting with your group!',
    },
    decisions: {
      emoji: '✅',
      title: 'No Decisions Yet',
      subtitleLine1: 'Create your first event and',
      subtitleLine2: 'start deciding with your group!',
    },
  };

  // Render empty state content - matches Events screen exactly
  const renderEmptyState = () => {
    const config = emptyStateConfig[activeTab];
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding={24}>
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={[`${DARK_THEME.primary}30`, `${DARK_THEME.primary}10`]}
            style={styles.emptyIconGradient}
          >
            <Text fontSize={56}>{config.emoji}</Text>
          </LinearGradient>
        </View>
        <Text fontSize={24} fontWeight="800" color={DARK_THEME.textPrimary} marginBottom={8}>
          {config.title}
        </Text>
        <Text
          fontSize={16}
          color={DARK_THEME.textSecondary}
          textAlign="center"
          marginBottom={24}
          maxWidth={280}
          lineHeight={24}
        >
          {config.subtitleLine1}{'\n'}{config.subtitleLine2}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={() => router.push('/create-event')}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Create Event</Text>
        </Pressable>
      </YStack>
    );
  };

  return (
    <View style={styles.container} testID="chat-screen">
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[DARK_THEME.deepNavy, DARK_THEME.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header - Matching Events screen structure exactly */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          {/* Left: Avatar (navigates to profile) + Title */}
          <XStack alignItems="center" gap={12}>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              style={({ pressed }) => [
                styles.avatarContainer,
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
              ]}
              testID="avatar-profile-button"
            >
              <LinearGradient
                colors={[DARK_THEME.primary, '#60A5FA']}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarInner}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      width={36}
                      height={36}
                      borderRadius={18}
                    />
                  ) : (
                    <Text fontSize={14} fontWeight="700" color={DARK_THEME.textPrimary}>
                      {userInitials}
                    </Text>
                  )}
                </View>
              </LinearGradient>
              <View style={styles.onlineIndicator} />
            </Pressable>
            <Text fontSize={20} fontWeight="700" color={DARK_THEME.textPrimary}>
              Kommunikation
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

        {/* Tab Filters: Chat / Voting / Decisions - INSIDE header like Events */}
        <View style={styles.tabFiltersContainer}>
          <BlurView intensity={10} tint="dark" style={styles.tabFiltersBlur}>
            <View style={styles.tabFiltersInner}>
              {(['chat', 'voting', 'decisions'] as TabType[]).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tabFilter,
                    activeTab === tab && styles.tabFilterActive,
                  ]}
                  testID={`filter-tab-${tab}`}
                >
                  <Text
                    fontSize={13}
                    fontWeight="600"
                    color={activeTab === tab ? DARK_THEME.textPrimary : DARK_THEME.textSecondary}
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
      {hasNoEvents ? (
        <ScrollView
          contentContainerStyle={styles.emptyScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={DARK_THEME.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={DARK_THEME.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <>
            {/* Share Event Banner */}
            <LinearGradient
              colors={[DARK_THEME.primary, '#3B5984']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inviteBanner}
            >
              <YStack flex={1}>
                <Text style={styles.inviteTitle}>Share Event</Text>
                <Text style={styles.inviteSubtitle}>Invite friends to join the party planning</Text>
              </YStack>
              <Pressable style={styles.inviteButton}>
                <Text style={styles.inviteButtonText}>Invite</Text>
                <Ionicons name="share-outline" size={16} color={DARK_THEME.textPrimary} />
              </Pressable>
            </LinearGradient>

            {/* Chat Content */}
            {activeTab === 'chat' && (
          <>
            {Object.entries(CHANNEL_CATEGORIES).map(([key, config]) => {
              const categoryChannels = groupedChannels[key] || [];
              return (
                <View key={key} style={styles.categorySection}>
                  <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
                    <Text style={styles.categoryTitle}>{config.label}</Text>
                    <Pressable style={styles.addButton}>
                      <Ionicons name="add" size={20} color={DARK_THEME.primary} />
                    </Pressable>
                  </XStack>

                  {categoryChannels.length > 0 ? (
                    categoryChannels.map((channel: any) => (
                      <Pressable
                        key={channel.id}
                        style={styles.channelItem}
                        onPress={() => handleChannelPress(channel.id)}
                      >
                        <View style={[styles.channelIcon, { backgroundColor: `${config.color}20` }]}>
                          <Ionicons name={config.icon as any} size={20} color={config.color} />
                        </View>
                        <YStack flex={1} gap={2}>
                          <XStack justifyContent="space-between" alignItems="center">
                            <Text style={styles.channelName}>{channel.name}</Text>
                            <Text style={styles.channelTime}>
                              {channel.last_message_at
                                ? formatTimestamp(channel.last_message_at)
                                : ''}
                            </Text>
                          </XStack>
                          <XStack justifyContent="space-between" alignItems="center">
                            <Text style={styles.channelPreview} numberOfLines={1}>
                              {channel.last_message || 'No messages yet'}
                            </Text>
                            {channel.unread_count > 0 && (
                              <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{channel.unread_count}</Text>
                              </View>
                            )}
                          </XStack>
                        </YStack>
                      </Pressable>
                    ))
                  ) : (
                    <View style={styles.emptyCategory}>
                      <Text style={styles.emptyCategoryText}>No channels yet</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

            {/* Voting Content */}
            {activeTab === 'voting' && (
              <View style={styles.placeholderContent}>
                <Ionicons name="checkbox-outline" size={48} color={DARK_THEME.textTertiary} />
                <Text style={styles.placeholderText}>Voting features coming soon</Text>
              </View>
            )}

            {/* Decisions Content */}
            {activeTab === 'decisions' && (
              <View style={styles.placeholderContent}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color={DARK_THEME.textTertiary} />
                <Text style={styles.placeholderText}>Decisions features coming soon</Text>
              </View>
            )}
          </>
        </ScrollView>
      )}
    </View>
  );
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
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
    overflow: 'hidden',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  inviteSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: DARK_THEME.textTertiary,
    letterSpacing: 1,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DARK_THEME.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DARK_THEME.surfaceCard,
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  channelIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelName: {
    fontSize: 15,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  channelTime: {
    fontSize: 12,
    color: DARK_THEME.textTertiary,
  },
  channelPreview: {
    fontSize: 13,
    color: DARK_THEME.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DARK_THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  emptyCategory: {
    backgroundColor: DARK_THEME.surfaceCard,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    borderStyle: 'dashed',
  },
  emptyCategoryText: {
    fontSize: 13,
    color: DARK_THEME.textTertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
  placeholderContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  placeholderText: {
    fontSize: 16,
    color: DARK_THEME.textTertiary,
    marginTop: 16,
  },
});
