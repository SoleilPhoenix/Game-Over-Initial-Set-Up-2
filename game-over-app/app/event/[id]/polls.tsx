/**
 * Polls Screen
 * Displays polls for an event with voting functionality
 */

import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl, Pressable, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePolls, useCreatePoll, useVote } from '@/hooks/queries/usePolls';
import { PollCard, CreatePollModal } from '@/components/polls';
import { colors } from '@/constants/colors';
import type { Database } from '@/lib/supabase/types';

type PollCategory = Database['public']['Tables']['polls']['Row']['category'];

export default function PollsScreen() {
  const { id: eventId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');

  // Fetch polls
  const {
    data: polls,
    isLoading,
    refetch,
    isRefetching,
  } = usePolls(eventId);

  // Mutations
  const createPollMutation = useCreatePoll();
  const voteMutation = useVote();

  // Filter polls based on status
  const filteredPolls = React.useMemo(() => {
    if (!polls) return [];
    if (filter === 'all') return polls;
    if (filter === 'active') return polls.filter(p => p.status === 'active' || p.status === 'closing_soon');
    return polls.filter(p => p.status === 'closed');
  }, [polls, filter]);

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

  type PollType = NonNullable<typeof polls>[number];
  const renderPollItem = useCallback(({ item }: { item: PollType }) => (
    <YStack paddingHorizontal="$4" marginBottom="$3">
      <PollCard
        poll={item}
        onVote={(optionId) => handleVote(item.id, optionId)}
        isVoting={voteMutation.isPending}
        testID={`poll-${item.id}`}
      />
    </YStack>
  ), [handleVote, voteMutation.isPending]);

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" testID="polls-screen">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$4"
        paddingBottom="$3"
        alignItems="center"
        backgroundColor="$surface"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        gap="$3"
      >
        <XStack
          width={40}
          height={40}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
          pressStyle={{ opacity: 0.7 }}
          onPress={() => router.back()}
          testID="back-button"
        >
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </XStack>

        <YStack flex={1}>
          <Text fontSize="$5" fontWeight="700" color="$textPrimary">
            Polls
          </Text>
          <Text fontSize="$2" color="$textSecondary">
            Vote on group decisions
          </Text>
        </YStack>

        <Pressable
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
          testID="create-poll-button"
        >
          <Ionicons name="add" size={24} color="white" />
        </Pressable>
      </XStack>

      {/* Filter Tabs */}
      <XStack
        padding="$3"
        backgroundColor="$surface"
        gap="$2"
      >
        {(['all', 'active', 'closed'] as const).map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterChip,
              filter === f && styles.filterChipSelected,
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              fontSize="$2"
              fontWeight={filter === f ? '600' : '400'}
              color={filter === f ? 'white' : '$textSecondary'}
              textTransform="capitalize"
            >
              {f}
            </Text>
          </Pressable>
        ))}
        <YStack flex={1} />
        <Text fontSize="$2" color="$textTertiary">
          {filteredPolls.length} poll{filteredPolls.length !== 1 ? 's' : ''}
        </Text>
      </XStack>

      {/* Polls List */}
      <FlatList
        data={filteredPolls}
        keyExtractor={(item) => item.id}
        renderItem={renderPollItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.light.primary]}
            tintColor={colors.light.primary}
          />
        }
        ListEmptyComponent={
          <YStack flex={1} justifyContent="center" alignItems="center" padding="$8">
            <YStack
              width={80}
              height={80}
              borderRadius="$full"
              backgroundColor={`${colors.light.primary}15`}
              alignItems="center"
              justifyContent="center"
              marginBottom="$4"
            >
              <Ionicons
                name={filter === 'closed' ? 'checkmark-done' : 'bar-chart-outline'}
                size={40}
                color={colors.light.primary}
              />
            </YStack>
            <Text fontSize="$4" fontWeight="700" color="$textPrimary" marginBottom="$2">
              {filter === 'closed' ? 'No Closed Polls' : 'No Polls Yet'}
            </Text>
            <Text fontSize="$3" color="$textSecondary" textAlign="center" marginBottom="$4">
              {filter === 'closed'
                ? 'Completed polls will appear here'
                : 'Create a poll to get group opinions on activities, destinations, and more!'}
            </Text>
            {filter !== 'closed' && (
              <Pressable
                style={styles.createButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text color="white" fontWeight="600">
                  Create Poll
                </Text>
              </Pressable>
            )}
          </YStack>
        }
      />

      {/* Create Poll Modal */}
      <CreatePollModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePoll}
        eventId={eventId || ''}
      />
    </YStack>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  filterChipSelected: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
