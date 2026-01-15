/**
 * Communication Center Screen (Phase 7)
 * Unified screen with tabs for Chat, Voting, and Decisions
 * Matches UI design: stitch_welcome_to_game_over 5.app
 */

import React, { useState, useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, Pressable, StyleSheet, Alert, Share, SectionList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner, Image } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChannels } from '@/hooks/queries/useChat';
import { usePolls, useCreatePoll, useVote } from '@/hooks/queries/usePolls';
import { useEvent } from '@/hooks/queries/useEvents';
import { PollCard, CreatePollModal } from '@/components/polls';
import { colors } from '@/constants/colors';
import type { Database } from '@/lib/supabase/types';

type TabType = 'chat' | 'voting' | 'decisions';
type PollCategory = Database['public']['Tables']['polls']['Row']['category'];

// Category configuration with icons and colors
const CATEGORY_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  general: { icon: 'chatbubbles', color: '#8B5CF6' },
  accommodation: { icon: 'home', color: '#3B82F6' },
  activities: { icon: 'game-controller', color: '#F97316' },
  budget: { icon: 'cash', color: '#22C55E' },
  dining: { icon: 'restaurant', color: '#EC4899' },
};

export default function CommunicationCenterScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);

  // Fetch event data
  const { data: event } = useEvent(eventId);

  // Fetch channels for Chat tab
  const {
    data: channels,
    isLoading: channelsLoading,
    refetch: refetchChannels,
    isRefetching: isRefetchingChannels,
  } = useChannels(eventId);

  // Fetch polls for Voting and Decisions tabs
  const {
    data: polls,
    isLoading: pollsLoading,
    refetch: refetchPolls,
    isRefetching: isRefetchingPolls,
  } = usePolls(eventId);

  // Mutations
  const createPollMutation = useCreatePoll();
  const voteMutation = useVote();

  // Group channels by category
  const groupedChannels = useMemo(() => {
    if (!channels) return [];
    const groups: Record<string, typeof channels> = {};

    channels.forEach(channel => {
      const category = channel.category || 'general';
      if (!groups[category]) groups[category] = [];
      groups[category].push(channel);
    });

    return Object.entries(groups).map(([category, data]) => ({
      title: category.toUpperCase(),
      category,
      data,
    }));
  }, [channels]);

  // Separate active and closed polls, grouped by category
  const { activePolls, closedPolls, groupedActivePolls } = useMemo(() => {
    if (!polls) return { activePolls: [], closedPolls: [], groupedActivePolls: [] };

    const active = polls.filter(p => p.status === 'active' || p.status === 'closing_soon' || p.status === 'draft');
    const closed = polls.filter(p => p.status === 'closed');

    // Group active polls by category
    const groups: Record<string, typeof active> = {};
    active.forEach(poll => {
      const category = poll.category || 'general';
      if (!groups[category]) groups[category] = [];
      groups[category].push(poll);
    });

    const grouped = Object.entries(groups).map(([category, data]) => ({
      title: category.toUpperCase(),
      category,
      data,
    }));

    return { activePolls: active, closedPolls: closed, groupedActivePolls: grouped };
  }, [polls]);

  // Handle channel press
  const handleChannelPress = useCallback((channelId: string) => {
    router.push(`/(tabs)/chat/${channelId}`);
  }, [router]);

  // Handle vote
  const handleVote = useCallback(async (pollId: string, optionId: string) => {
    try {
      await voteMutation.mutateAsync({ pollId, optionId });
    } catch (error) {
      console.error('Failed to vote:', error);
      Alert.alert('Error', 'Failed to submit your vote. Please try again.');
    }
  }, [voteMutation]);

  // Handle create poll
  const handleCreatePoll = useCallback(async (data: {
    question: string;
    category: PollCategory;
    options: string[];
    deadline?: Date;
  }) => {
    if (!eventId) return;

    await createPollMutation.mutateAsync({
      poll: {
        event_id: eventId,
        title: data.question,
        category: data.category,
        ends_at: data.deadline?.toISOString(),
        status: 'active',
      },
      options: data.options,
    });
  }, [eventId, createPollMutation]);

  // Handle share event
  const handleShareEvent = useCallback(async () => {
    try {
      await Share.share({
        message: `You're invited to ${event?.title || event?.honoree_name + "'s Party"}! Join us using this link: gameover://invite/ABC123`,
        title: `Join ${event?.title || event?.honoree_name + "'s Party"}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [event]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (activeTab === 'chat') {
      refetchChannels();
    } else {
      refetchPolls();
    }
  }, [activeTab, refetchChannels, refetchPolls]);

  const isRefreshing = activeTab === 'chat' ? isRefetchingChannels : isRefetchingPolls;
  const isLoading = activeTab === 'chat' ? channelsLoading : pollsLoading;

  // Tab configuration
  const tabs: { key: TabType; label: string }[] = [
    { key: 'chat', label: 'Chat' },
    { key: 'voting', label: 'Voting' },
    { key: 'decisions', label: 'Decisions' },
  ];

  // Render channel item
  type ChannelType = NonNullable<typeof channels>[number];
  const renderChannelItem = ({ item: channel }: { item: ChannelType }) => {
    const config = CATEGORY_CONFIG[channel.category || 'general'] || CATEGORY_CONFIG.general;

    return (
      <Pressable
        style={styles.channelCard}
        onPress={() => handleChannelPress(channel.id)}
      >
        {/* Category Icon */}
        <YStack
          width={48}
          height={48}
          borderRadius="$lg"
          backgroundColor="#1E2329"
          alignItems="center"
          justifyContent="center"
          borderWidth={1}
          borderColor="rgba(255,255,255,0.05)"
        >
          <Ionicons name={config.icon} size={22} color={config.color} />
        </YStack>

        {/* Content */}
        <YStack flex={1} gap={2}>
          <XStack justifyContent="space-between" alignItems="baseline">
            <Text fontSize={15} fontWeight="600" color="white">
              {channel.name}
            </Text>
            <Text fontSize={10} color="#6B7280">
              {channel.last_message_at ? formatTime(channel.last_message_at) : ''}
            </Text>
          </XStack>

          <Text fontSize={13} color="#9CA3AF" numberOfLines={1}>
            {channel.last_message_at ? 'View latest messages' : 'No messages yet'}
          </Text>

          {/* Participant avatars */}
          <XStack alignItems="center" gap="$2" marginTop={4}>
            <XStack>
              {[1, 2, 3].map((i) => (
                <YStack
                  key={i}
                  width={20}
                  height={20}
                  borderRadius="$full"
                  backgroundColor="#4B5563"
                  marginLeft={i > 1 ? -8 : 0}
                  borderWidth={2}
                  borderColor="#23272F"
                />
              ))}
              <YStack
                width={20}
                height={20}
                borderRadius="$full"
                backgroundColor="#374151"
                marginLeft={-8}
                borderWidth={2}
                borderColor="#23272F"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={8} fontWeight="700" color="white">+4</Text>
              </YStack>
            </XStack>
            <Text fontSize={10} color="#6B7280">6 participants</Text>
          </XStack>
        </YStack>

        {/* Unread badge */}
        {channel.unread_count && channel.unread_count > 0 && (
          <YStack
            position="absolute"
            top={16}
            right={16}
            backgroundColor="#4A6FA5"
            paddingHorizontal={6}
            paddingVertical={2}
            borderRadius="$full"
          >
            <Text fontSize={9} fontWeight="700" color="white">
              {channel.unread_count}
            </Text>
          </YStack>
        )}
      </Pressable>
    );
  };

  // Render section header
  const renderSectionHeader = ({ section }: { section: { title: string; category: string } }) => (
    <XStack
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal={4}
      marginBottom={12}
      marginTop={section.category !== 'general' ? 16 : 0}
    >
      <Text fontSize={11} fontWeight="700" color="#6B7280" letterSpacing={1}>
        {section.title}
      </Text>
      {activeTab === 'voting' && (
        <Pressable
          style={styles.newPollButton}
          onPress={() => setShowCreatePollModal(true)}
        >
          <Text fontSize={12} color="#4A6FA5" fontWeight="500">New Poll</Text>
          <Ionicons name="add" size={16} color="#4A6FA5" />
        </Pressable>
      )}
      {activeTab === 'chat' && section.category !== 'general' && (
        <Pressable>
          <Ionicons name="add" size={18} color="#4A6FA5" />
        </Pressable>
      )}
    </XStack>
  );

  // Format time helper
  function formatTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Render Chat content
  const renderChatContent = () => {
    if (channelsLoading) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="#4A6FA5" />
        </YStack>
      );
    }

    if (!channels || channels.length === 0) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
          <YStack
            width={80}
            height={80}
            borderRadius="$full"
            backgroundColor="rgba(74,111,165,0.15)"
            alignItems="center"
            justifyContent="center"
            marginBottom="$4"
          >
            <Ionicons name="chatbubbles-outline" size={40} color="#4A6FA5" />
          </YStack>
          <Text fontSize={16} fontWeight="700" color="white" marginBottom="$2">
            No Channels Yet
          </Text>
          <Text fontSize={14} color="#6B7280" textAlign="center">
            Chat channels will be created when the event is finalized
          </Text>
        </YStack>
      );
    }

    return (
      <SectionList
        sections={groupedChannels}
        keyExtractor={(item) => item.id}
        renderItem={renderChannelItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingChannels}
            onRefresh={handleRefresh}
            tintColor="#4A6FA5"
          />
        }
        contentContainerStyle={styles.listContent}
      />
    );
  };

  // Render Voting content
  const renderVotingContent = () => {
    if (pollsLoading) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="#4A6FA5" />
        </YStack>
      );
    }

    if (groupedActivePolls.length === 0) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
          <YStack
            width={80}
            height={80}
            borderRadius="$full"
            backgroundColor="rgba(74,111,165,0.15)"
            alignItems="center"
            justifyContent="center"
            marginBottom="$4"
          >
            <Ionicons name="bar-chart-outline" size={40} color="#4A6FA5" />
          </YStack>
          <Text fontSize={16} fontWeight="700" color="white" marginBottom="$2">
            No Active Polls
          </Text>
          <Text fontSize={14} color="#6B7280" textAlign="center" marginBottom="$4">
            Create a poll to help your group make decisions together
          </Text>
          <Pressable style={styles.createButton} onPress={() => setShowCreatePollModal(true)}>
            <Ionicons name="add" size={20} color="white" />
            <Text color="white" fontWeight="600">Create Poll</Text>
          </Pressable>
        </YStack>
      );
    }

    return (
      <SectionList
        sections={groupedActivePolls}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <YStack marginBottom={12}>
            <PollCard
              poll={item}
              onVote={(optionId) => handleVote(item.id, optionId)}
              isVoting={voteMutation.isPending}
            />
          </YStack>
        )}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingPolls}
            onRefresh={handleRefresh}
            tintColor="#4A6FA5"
          />
        }
        contentContainerStyle={styles.listContent}
      />
    );
  };

  // Render Decisions content
  const renderDecisionsContent = () => {
    if (pollsLoading) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="#4A6FA5" />
        </YStack>
      );
    }

    if (closedPolls.length === 0) {
      return (
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
          <YStack
            width={80}
            height={80}
            borderRadius="$full"
            backgroundColor="rgba(34,197,94,0.15)"
            alignItems="center"
            justifyContent="center"
            marginBottom="$4"
          >
            <Ionicons name="checkmark-done-circle-outline" size={40} color="#22C55E" />
          </YStack>
          <Text fontSize={16} fontWeight="700" color="white" marginBottom="$2">
            No Decisions Yet
          </Text>
          <Text fontSize={14} color="#6B7280" textAlign="center">
            Finalized poll results will appear here once voting is complete
          </Text>
        </YStack>
      );
    }

    return (
      <FlatList
        data={closedPolls}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <YStack marginBottom={12}>
            <PollCard poll={item} onVote={() => {}} />
          </YStack>
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingPolls}
            onRefresh={handleRefresh}
            tintColor="#4A6FA5"
          />
        }
        contentContainerStyle={styles.listContent}
      />
    );
  };

  // Render tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'chat': return renderChatContent();
      case 'voting': return renderVotingContent();
      case 'decisions': return renderDecisionsContent();
      default: return null;
    }
  };

  return (
    <YStack flex={1} backgroundColor="#15181D" testID="communication-center-screen">
      {/* Header */}
      <YStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$4"
        paddingBottom="$2"
        backgroundColor="rgba(21,24,29,0.95)"
        borderBottomWidth={1}
        borderBottomColor="rgba(255,255,255,0.05)"
      >
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap="$3">
            <Pressable onPress={() => router.back()} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={24} color="#9CA3AF" />
            </Pressable>
            <YStack>
              <Text fontSize={18} fontWeight="700" color="white">
                {event?.title || `${event?.honoree_name}'s Party`}
              </Text>
              <Text fontSize={12} color="#6B7280">
                Communication Center
              </Text>
            </YStack>
          </XStack>

          <XStack alignItems="center" gap="$2">
            <Pressable style={styles.searchButton}>
              <Ionicons name="search" size={22} color="white" />
            </Pressable>
            <YStack
              width={36}
              height={36}
              borderRadius="$full"
              backgroundColor="#374151"
              borderWidth={1}
              borderColor="rgba(255,255,255,0.1)"
            />
          </XStack>
        </XStack>
      </YStack>

      {/* Tab Bar */}
      <YStack paddingHorizontal="$4" paddingVertical="$4" backgroundColor="#15181D">
        <XStack
          height={48}
          backgroundColor="#1E2329"
          borderRadius="$xl"
          padding={4}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  fontSize={14}
                  fontWeight={isActive ? '600' : '500'}
                  color={isActive ? 'white' : '#6B7280'}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </XStack>
      </YStack>

      {/* Share Event Banner */}
      {activeTab === 'chat' && (
        <YStack paddingHorizontal="$4" marginBottom="$4">
          <Pressable style={styles.shareEventBanner} onPress={handleShareEvent}>
            <YStack style={styles.bannerGlow} />
            <YStack style={styles.bannerGlowBottom} />
            <XStack justifyContent="space-between" alignItems="center" zIndex={10}>
              <YStack gap={2}>
                <Text fontSize={17} fontWeight="700" color="white">
                  Share Event
                </Text>
                <Text fontSize={12} color="rgba(191,219,254,0.9)">
                  Invite friends to join the party planning
                </Text>
              </YStack>
              <Pressable style={styles.inviteButton} onPress={handleShareEvent}>
                <Text fontSize={12} fontWeight="700" color="white">Invite</Text>
                <Ionicons name="share-outline" size={16} color="white" />
              </Pressable>
            </XStack>
          </Pressable>
        </YStack>
      )}

      {/* Content */}
      <YStack flex={1}>
        {renderContent()}
      </YStack>

      {/* Create Poll Modal */}
      <CreatePollModal
        visible={showCreatePollModal}
        onClose={() => setShowCreatePollModal(false)}
        onSubmit={handleCreatePoll}
        eventId={eventId || ''}
      />
    </YStack>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: 4,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#23272F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#4A6FA5',
  },
  shareEventBanner: {
    backgroundColor: '#4A6FA5',
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerGlow: {
    position: 'absolute',
    top: -24,
    right: -24,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bannerGlowBottom: {
    position: 'absolute',
    bottom: -24,
    left: -24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: '#23272F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
  },
  newPollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4A6FA5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
