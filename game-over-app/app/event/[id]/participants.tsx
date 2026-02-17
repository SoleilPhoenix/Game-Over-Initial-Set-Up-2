/**
 * Manage Invitations Screen
 * Shows participant list with details: name, email, phone, confirmation status
 * Honoree gets a special note about being included in planning
 */

import React, { useState } from 'react';
import { ScrollView, Share, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent } from '@/hooks/queries/useEvents';
import { useParticipants, useRemoveParticipant } from '@/hooks/queries/useParticipants';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import type { ParticipantWithProfile } from '@/repositories';

type ParticipantRole = 'organizer' | 'guest' | 'honoree';

export default function ManageInvitationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [inviteLoading, setInviteLoading] = useState(false);

  const { data: event, isLoading: eventLoading } = useEvent(id);
  const { data: participants, isLoading: participantsLoading } = useParticipants(id);
  const removeParticipant = useRemoveParticipant();

  const isLoading = eventLoading || participantsLoading;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color={DARK_THEME.primary} />
        </YStack>
      </View>
    );
  }

  const generateInviteLink = async () => {
    setInviteLoading(true);
    try {
      const inviteCode = `${id}-${Date.now().toString(36)}`;
      const inviteLink = `gameoverapp://invite/${inviteCode}`;
      await Share.share({
        message: `You're invited to ${event?.honoree_name}'s party! Join here: ${inviteLink}`,
        title: 'Party Invitation',
      });
    } catch (error) {
      console.error('Failed to share invite:', error);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!id) return;
    try {
      await removeParticipant.mutateAsync({ eventId: id, userId });
    } catch (error) {
      console.error('Failed to remove participant:', error);
    }
  };

  const sortedParticipants = [...(participants || [])].sort((a, b) => {
    const roleOrder = { organizer: 0, honoree: 1, guest: 2 };
    return (roleOrder[a.role as ParticipantRole] || 2) - (roleOrder[b.role as ParticipantRole] || 2);
  });

  const confirmedCount = participants?.filter(p => p.confirmed_at).length || 0;
  const pendingCount = participants?.filter(p => !p.confirmed_at).length || 0;
  const totalCount = participants?.length || 0;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'organizer':
        return { label: t.events.organizer, bg: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' };
      case 'honoree':
        return { label: 'HONOREE', bg: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' };
      default:
        return { label: t.events.guest, bg: 'rgba(107, 114, 128, 0.2)', color: DARK_THEME.textSecondary };
    }
  };

  const renderParticipantCard = (participant: ParticipantWithProfile) => {
    const roleBadge = getRoleBadge(participant.role);
    const isConfirmed = !!participant.confirmed_at;
    const isHonoree = participant.role === 'honoree';
    const isRemovable = participant.role === 'guest';
    const name = participant.profile?.full_name || 'Unknown';
    const email = participant.profile?.email || (participant as any).email || '—';
    const phone = (participant.profile as any)?.phone || '—';
    const initial = name.charAt(0).toUpperCase();

    return (
      <View key={participant.id} style={styles.participantCard}>
        <XStack alignItems="center" gap={12}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          {/* Details */}
          <YStack flex={1} gap={4}>
            <XStack alignItems="center" gap={8}>
              <Text style={styles.participantName} numberOfLines={1}>{name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
                <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
              </View>
            </XStack>

            {/* Email */}
            <XStack alignItems="center" gap={6}>
              <Ionicons name="mail-outline" size={13} color={DARK_THEME.textTertiary} />
              <Text style={styles.detailText} numberOfLines={1}>{email}</Text>
            </XStack>

            {/* Phone */}
            <XStack alignItems="center" gap={6}>
              <Ionicons name="call-outline" size={13} color={DARK_THEME.textTertiary} />
              <Text style={styles.detailText} numberOfLines={1}>{phone}</Text>
            </XStack>

            {/* Confirmation status */}
            <XStack alignItems="center" gap={6} marginTop={2}>
              <Ionicons
                name={isConfirmed ? 'checkmark-circle' : 'time-outline'}
                size={14}
                color={isConfirmed ? '#10B981' : '#F59E0B'}
              />
              <Text style={[styles.statusText, { color: isConfirmed ? '#10B981' : '#F59E0B' }]}>
                {isConfirmed ? 'Event Confirmed' : 'Pending Confirmation'}
              </Text>
            </XStack>

            {/* Honoree note */}
            {isHonoree && (
              <View style={styles.honoreeNote}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.honoreeNoteText}>
                  Will be invited and included in planning
                </Text>
              </View>
            )}
          </YStack>

          {/* Remove button for guests */}
          {isRemovable && (
            <Pressable
              onPress={() => handleRemoveParticipant(participant.user_id)}
              style={styles.removeButton}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={22} color="rgba(239, 68, 68, 0.6)" />
            </Pressable>
          )}
        </XStack>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={16}>
          <Pressable onPress={() => router.back()} hitSlop={8} testID="back-button">
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{t.eventDetail.manageInvitations}</Text>
          <View style={{ width: 24 }} />
        </XStack>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <XStack gap={12} marginBottom={20}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{confirmedCount}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={[styles.statNumber, { color: DARK_THEME.textPrimary }]}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </XStack>

        {/* Participant List */}
        <Text style={styles.sectionTitle}>Guest List</Text>

        {sortedParticipants.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={DARK_THEME.textTertiary} />
            <Text style={styles.emptyText}>
              No participants yet. Share the invite link to get started!
            </Text>
          </View>
        ) : (
          sortedParticipants.map(renderParticipantCard)
        )}
      </ScrollView>

      {/* Invite Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          flex={1}
          onPress={generateInviteLink}
          loading={inviteLoading}
          icon={<Ionicons name="share-outline" size={20} color="white" />}
          testID="invite-button"
        >
          Share Invite Link
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.glassBorder,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  statCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: DARK_THEME.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
    marginBottom: 12,
  },
  participantCard: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DARK_THEME.deepNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_THEME.textPrimary,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 13,
    color: DARK_THEME.textSecondary,
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  honoreeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  honoreeNoteText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#F59E0B',
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: DARK_THEME.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: DARK_THEME.surface,
    borderTopWidth: 1,
    borderTopColor: DARK_THEME.glassBorder,
    flexDirection: 'row',
  },
});
