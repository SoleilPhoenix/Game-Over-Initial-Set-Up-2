/**
 * PollCard Component
 * Displays a poll with voting options and results
 * Matches the dark theme design from UI specifications
 */

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import type { PollWithOptions } from '@/repositories/polls';

// Dark theme colors
const DARK_THEME = {
  backgroundDark: '#15181D',
  surfaceDark: '#1E2329',
  surfaceCard: '#23272F',
  primary: '#4A6FA5',
  border: 'rgba(255, 255, 255, 0.05)',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
};

// Category configuration
const CATEGORY_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }> = {
  accommodation: { icon: 'home', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  activities: { icon: 'game-controller', color: '#F97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
  dining: { icon: 'restaurant', color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.1)' },
  budget: { icon: 'cash', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.1)' },
  general: { icon: 'chatbubbles', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' },
};

// Status badge configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  active: {
    label: 'Active',
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  closing_soon: {
    label: 'Closing Soon',
    color: '#EAB308',
    bgColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  closed: {
    label: 'Closed',
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    borderColor: 'rgba(107, 114, 128, 0.2)',
  },
  draft: {
    label: 'Draft',
    color: '#9CA3AF',
    bgColor: DARK_THEME.surfaceDark,
    borderColor: DARK_THEME.border,
  },
};

interface PollCardProps {
  poll: PollWithOptions;
  onVote: (optionId: string) => void;
  isVoting?: boolean;
  testID?: string;
}

export function PollCard({ poll, onVote, isVoting = false, testID }: PollCardProps) {
  const hasVoted = !!poll.user_vote;
  const isClosed = poll.status === 'closed';
  const isClosingSoon = poll.status === 'closing_soon';
  const isDraft = poll.status === 'draft';
  const canVote = poll.status === 'active' && !hasVoted;

  const categoryConfig = CATEGORY_CONFIG[poll.category || 'general'] || CATEGORY_CONFIG.general;
  const statusConfig = STATUS_CONFIG[poll.status] || STATUS_CONFIG.draft;

  const formatDeadline = () => {
    if (!poll.ends_at) return null;
    const deadline = new Date(poll.ends_at);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return 'Ended';
    if (diffHours < 1) return 'Less than 1h';
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  // Get winning option
  const winningOption = useMemo(() => {
    if (!isClosed || poll.options.length === 0) return null;
    return poll.options.reduce((max, opt) =>
      opt.vote_count > max.vote_count ? opt : max
    );
  }, [isClosed, poll.options]);

  return (
    <YStack
      backgroundColor={DARK_THEME.surfaceCard}
      borderRadius={16}
      padding="$5"
      gap="$3"
      style={styles.card}
      testID={testID}
    >
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="flex-start">
        <XStack gap="$3" alignItems="center">
          <YStack
            width={40}
            height={40}
            borderRadius={12}
            backgroundColor={categoryConfig.bgColor}
            alignItems="center"
            justifyContent="center"
            style={{ borderWidth: 1, borderColor: `${categoryConfig.color}33` }}
          >
            <Ionicons name={categoryConfig.icon} size={20} color={categoryConfig.color} />
          </YStack>
          <YStack flex={1}>
            <Text fontSize={16} fontWeight="600" color={DARK_THEME.textPrimary} testID="poll-title">
              {poll.title}
            </Text>
            {poll.description && (
              <Text fontSize={11} color={DARK_THEME.textTertiary}>
                {poll.description}
              </Text>
            )}
          </YStack>
        </XStack>

        {/* Status Badge */}
        <View style={[styles.badge, { backgroundColor: statusConfig.bgColor, borderColor: statusConfig.borderColor }]} testID="poll-status-badge">
          <Text style={{ fontSize: 10, fontWeight: '700', color: statusConfig.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {statusConfig.label}
          </Text>
        </View>
      </XStack>

      {/* Draft State */}
      {isDraft ? (
        <YStack
          marginTop="$2"
          paddingVertical="$4"
          borderWidth={2}
          borderStyle="dashed"
          borderColor="rgba(255, 255, 255, 0.1)"
          borderRadius={12}
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={12} color={DARK_THEME.textTertiary} textAlign="center" maxWidth={200}>
            This poll is currently in draft mode. Options are being finalized.
          </Text>
          <Text fontSize={12} color={DARK_THEME.primary} fontWeight="700" marginTop="$2">
            Add Suggestion
          </Text>
        </YStack>
      ) : (
        <>
          {/* Options */}
          <YStack gap="$2" marginTop="$1">
            {poll.options.map((option) => {
              const percentage = poll.total_votes > 0
                ? Math.round((option.vote_count / poll.total_votes) * 100)
                : 0;
              const isUserVote = option.id === poll.user_vote;
              const isWinner = isClosed && winningOption?.id === option.id;
              const showResults = hasVoted || isClosed;

              return (
                <Pressable
                  key={option.id}
                  onPress={() => canVote && onVote(option.id)}
                  disabled={!canVote || isVoting}
                  style={({ pressed }) => [
                    styles.optionContainer,
                    isUserVote && styles.optionSelected,
                    pressed && canVote && styles.optionPressed,
                  ]}
                  testID={`poll-option-${option.id}`}
                >
                  {/* Progress bar background */}
                  {showResults && (
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${percentage}%`,
                          backgroundColor: isUserVote
                            ? 'rgba(74, 111, 165, 0.2)'
                            : 'rgba(107, 114, 128, 0.3)',
                        },
                      ]}
                    />
                  )}

                  <XStack alignItems="center" justifyContent="space-between" width="100%" style={{ zIndex: 1 }}>
                    <XStack gap="$3" alignItems="center" flex={1}>
                      {/* Radio/Check indicator */}
                      {!showResults ? (
                        <View style={[styles.radioOuter, isUserVote && styles.radioSelected]}>
                          {isUserVote && (
                            <Ionicons name="checkmark" size={12} color="white" />
                          )}
                        </View>
                      ) : isUserVote ? (
                        <View style={[styles.radioOuter, styles.radioSelected]}>
                          <Ionicons name="checkmark" size={12} color="white" />
                        </View>
                      ) : null}

                      <Text
                        fontSize={14}
                        fontWeight={isUserVote || isWinner ? '500' : '400'}
                        color={isUserVote ? DARK_THEME.textPrimary : showResults ? 'rgba(209, 213, 219, 1)' : DARK_THEME.textPrimary}
                      >
                        {option.label}
                      </Text>
                    </XStack>

                    <XStack gap="$2" alignItems="center">
                      {/* Voter avatars */}
                      {showResults && option.vote_count > 0 && (
                        <XStack style={styles.avatarStack}>
                          {/* Show up to 2 avatar placeholders */}
                          <View style={[styles.avatar, { backgroundColor: '#6B7280' }]}>
                            <Text style={styles.avatarText}>
                              {option.vote_count > 2 ? '+' : ''}
                            </Text>
                          </View>
                          {option.vote_count > 1 && (
                            <View style={[styles.avatar, { backgroundColor: '#4B5563', marginLeft: -6 }]}>
                              <Text style={styles.avatarText}>
                                {option.vote_count > 2 ? `${option.vote_count - 1}` : ''}
                              </Text>
                            </View>
                          )}
                        </XStack>
                      )}

                      {/* Percentage or vote count */}
                      {showResults && (
                        <Text
                          fontSize={12}
                          fontWeight="700"
                          color={isUserVote ? DARK_THEME.primary : DARK_THEME.textTertiary}
                          testID={isUserVote ? `poll-vote-count-${option.id}` : `poll-percentage-${option.id}`}
                        >
                          {isUserVote ? `${option.vote_count} votes` : `${percentage}%`}
                        </Text>
                      )}
                    </XStack>
                  </XStack>
                </Pressable>
              );
            })}
          </YStack>

          {/* Footer */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            marginTop="$1"
            paddingTop="$2"
            borderTopWidth={1}
            borderTopColor={DARK_THEME.border}
          >
            <Text fontSize={10} color={DARK_THEME.textTertiary} fontWeight="500" testID="poll-vote-count">
              {poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''} cast
              {poll.ends_at && ` • Ends in ${formatDeadline()}`}
            </Text>

            {hasVoted && !isClosed ? (
              <XStack gap="$1" alignItems="center" testID="poll-voted-indicator">
                <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                <Text fontSize={10} color="#22C55E" fontWeight="500">
                  You voted
                </Text>
              </XStack>
            ) : canVote ? (
              <Text fontSize={10} color={DARK_THEME.primary} fontWeight="500">
                Tap option to vote
              </Text>
            ) : null}
          </XStack>
        </>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  optionContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#1E2329',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionSelected: {
    borderColor: DARK_THEME.primary,
    borderWidth: 1,
  },
  optionPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: DARK_THEME.primary,
    borderColor: DARK_THEME.primary,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#23272F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 8,
    fontWeight: '700',
    color: 'white',
  },
});
