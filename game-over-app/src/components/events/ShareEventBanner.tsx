/**
 * ShareEventBanner Component
 * Displays a banner prompting users to share/invite others to an event
 */

import React, { useCallback, useState } from 'react';
import { Share, Pressable, StyleSheet, Alert } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { DARK_THEME } from '@/constants/theme';

interface ShareEventBannerProps {
  eventId: string;
  eventTitle: string;
  inviteCode?: string;
  onGenerateInvite?: () => Promise<string>;
  participantCount?: number;
}

export function ShareEventBanner({
  eventId,
  eventTitle,
  inviteCode,
  onGenerateInvite,
  participantCount = 0,
}: ShareEventBannerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const getShareUrl = useCallback(async () => {
    let code = inviteCode;

    if (!code && onGenerateInvite) {
      setIsLoading(true);
      try {
        code = await onGenerateInvite();
      } catch (error) {
        console.error('Failed to generate invite:', error);
        Alert.alert('Error', 'Failed to generate invite link. Please try again.');
        setIsLoading(false);
        return null;
      }
      setIsLoading(false);
    }

    if (!code) {
      Alert.alert('Error', 'Could not create invite link.');
      return null;
    }

    return `gameover://invite/${code}`;
  }, [inviteCode, onGenerateInvite]);

  const handleShare = useCallback(async () => {
    const shareUrl = await getShareUrl();
    if (!shareUrl) return;

    try {
      await Share.share({
        message: `You're invited to ${eventTitle}! Join us using this link: ${shareUrl}`,
        title: `Join ${eventTitle}`,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  }, [eventTitle, getShareUrl]);

  const handleCopyLink = useCallback(async () => {
    const shareUrl = await getShareUrl();
    if (!shareUrl) return;

    try {
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert('Copied!', 'Invite link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      Alert.alert('Error', 'Failed to copy link');
    }
  }, [getShareUrl]);

  return (
    <YStack
      backgroundColor={`${DARK_THEME.primary}15`}
      borderRadius="$lg"
      borderWidth={1}
      borderColor={`${DARK_THEME.primary}30`}
      padding="$4"
      gap="$3"
      testID="share-event-banner"
    >
      {/* Header */}
      <XStack alignItems="center" gap="$3">
        <YStack
          width={48}
          height={48}
          borderRadius="$full"
          backgroundColor={`${DARK_THEME.primary}20`}
          alignItems="center"
          justifyContent="center"
        >
          <Ionicons name="people" size={24} color={DARK_THEME.primary} />
        </YStack>
        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="700" color="$textPrimary">
            Invite Your Group
          </Text>
          <Text fontSize="$2" color="$textSecondary">
            {participantCount > 0
              ? `${participantCount} member${participantCount !== 1 ? 's' : ''} joined`
              : 'Share the invite link to get started'}
          </Text>
        </YStack>
      </XStack>

      {/* Action Buttons */}
      <XStack gap="$2">
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={handleShare}
          disabled={isLoading}
        >
          <Ionicons name="share-social" size={18} color="white" />
          <Text color="white" fontWeight="600">
            Share Invite
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={handleCopyLink}
          disabled={isLoading}
        >
          <Ionicons name="copy-outline" size={18} color={DARK_THEME.primary} />
          <Text color="$primary" fontWeight="600">
            Copy Link
          </Text>
        </Pressable>
      </XStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButton: {
    backgroundColor: DARK_THEME.primary,
  },
  secondaryButton: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderWidth: 1,
    borderColor: DARK_THEME.primary,
  },
});
