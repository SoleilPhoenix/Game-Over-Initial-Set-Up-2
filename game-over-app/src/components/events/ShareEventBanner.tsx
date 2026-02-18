/**
 * ShareEventBanner Component
 * Compact single-line invite banner matching the Chat share card style
 */

import React, { useCallback, useState } from 'react';
import { Share, Pressable, StyleSheet, Alert, View } from 'react-native';
import { XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { DARK_THEME } from '@/constants/theme';
import { useTranslation } from '@/i18n';

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
  const { t } = useTranslation();

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

  const subtext = participantCount > 0
    ? `${participantCount} member${participantCount !== 1 ? 's' : ''} joined`
    : (t.eventDetail as any).shareSubtext || 'Share invite link to get started';

  return (
    <Pressable
      style={styles.card}
      onPress={handleShare}
      disabled={isLoading}
      testID="share-event-banner"
    >
      <XStack alignItems="center" gap={10}>
        <View style={styles.iconCircle}>
          <Ionicons name="people-outline" size={18} color="#5A7EB0" />
        </View>
        <Text style={styles.title} numberOfLines={1} flex={1}>
          {(t.eventDetail as any).inviteYourGroup || 'Invite Your Group'} — {subtext}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={DARK_THEME.textTertiary} />
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(45, 55, 72, 0.5)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(90, 126, 176, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
});
