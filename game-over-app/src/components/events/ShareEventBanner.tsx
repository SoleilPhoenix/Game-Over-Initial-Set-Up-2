/**
 * ShareEventBanner Component
 * Compact single-line invite banner matching the Chat share card style
 */

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DARK_THEME } from '@/constants/theme';
import { useTranslation } from '@/i18n';

interface ShareEventBannerProps {
  eventId: string;
  eventTitle: string;
  inviteCode?: string;
  onGenerateInvite?: () => Promise<string>;
  participantCount?: number;
}

export function ShareEventBanner({ eventId }: ShareEventBannerProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/event/${eventId}/share`)}
      testID="share-event-banner"
    >
      <XStack alignItems="center" gap={10}>
        <XStack style={styles.iconCircle} alignItems="center" justifyContent="center">
          <Ionicons name="share-social-outline" size={18} color="#5A7EB0" />
        </XStack>
        <Text style={styles.title} numberOfLines={1} flex={1}>
          {(t.chat as any).shareInvite || 'Share Invite'} — {(t.chat as any).inviteFriendsToJoin || 'Invite Friends to Join'}
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
