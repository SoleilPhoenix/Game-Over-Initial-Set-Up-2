/**
 * Participants Screen (Phase 5)
 * Manage event participants and invite via link
 */

import React, { useState } from 'react';
import { ScrollView, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner, Avatar } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEvent } from '@/hooks/queries/useEvents';
import { useParticipants, useRemoveParticipant } from '@/hooks/queries/useParticipants';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ParticipantWithProfile } from '@/repositories';

type ParticipantRole = 'organizer' | 'guest' | 'honoree';

export default function ParticipantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [inviteLoading, setInviteLoading] = useState(false);

  const { data: event, isLoading: eventLoading } = useEvent(id);
  const { data: participants, isLoading: participantsLoading } = useParticipants(id);
  const removeParticipant = useRemoveParticipant();

  const isLoading = eventLoading || participantsLoading;

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  const generateInviteLink = async () => {
    setInviteLoading(true);
    try {
      // In production, this would call an API to generate a unique invite code
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

  const getRoleConfig = (role: ParticipantRole) => {
    const configs = {
      organizer: { label: 'Organizer', variant: 'primary' as const },
      honoree: { label: 'Honoree', variant: 'warning' as const },
      guest: { label: 'Guest', variant: 'neutral' as const },
    };
    return configs[role] || configs.guest;
  };

  const getConfirmationStatus = (participant: ParticipantWithProfile) => {
    if (participant.confirmed_at) {
      return { label: 'Confirmed', variant: 'success' as const };
    }
    return { label: 'Pending', variant: 'warning' as const };
  };

  const sortedParticipants = [...(participants || [])].sort((a, b) => {
    const roleOrder = { organizer: 0, honoree: 1, guest: 2 };
    return (roleOrder[a.role as ParticipantRole] || 2) - (roleOrder[b.role as ParticipantRole] || 2);
  });

  const confirmedCount = participants?.filter(p => p.confirmed_at).length || 0;
  const pendingCount = participants?.filter(p => !p.confirmed_at).length || 0;

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$4"
        paddingBottom="$3"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor="$surface"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <XStack
          width={40}
          height={40}
          borderRadius="$full"
          alignItems="center"
          justifyContent="center"
          pressStyle={{ opacity: 0.8 }}
          onPress={() => router.back()}
          testID="back-button"
        >
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </XStack>
        <Text fontSize="$5" fontWeight="700" color="$textPrimary">
          Participants
        </Text>
        <XStack width={40} />
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {/* Stats Summary */}
        <XStack gap="$3" marginBottom="$4">
          <Card flex={1} size="sm" variant="filled">
            <YStack alignItems="center">
              <Text fontSize="$6" fontWeight="800" color="$primary">
                {confirmedCount}
              </Text>
              <Text fontSize="$2" color="$textSecondary">
                Confirmed
              </Text>
            </YStack>
          </Card>
          <Card flex={1} size="sm" variant="filled">
            <YStack alignItems="center">
              <Text fontSize="$6" fontWeight="800" color="$warning">
                {pendingCount}
              </Text>
              <Text fontSize="$2" color="$textSecondary">
                Pending
              </Text>
            </YStack>
          </Card>
          <Card flex={1} size="sm" variant="filled">
            <YStack alignItems="center">
              <Text fontSize="$6" fontWeight="800" color="$textPrimary">
                {participants?.length || 0}
              </Text>
              <Text fontSize="$2" color="$textSecondary">
                Total
              </Text>
            </YStack>
          </Card>
        </XStack>

        {/* Participants List */}
        <Text fontSize="$4" fontWeight="700" color="$textPrimary" marginBottom="$3">
          Guest List
        </Text>

        {sortedParticipants.length === 0 ? (
          <Card variant="filled">
            <YStack alignItems="center" padding="$4" gap="$2">
              <Ionicons name="people-outline" size={48} color="#64748B" />
              <Text color="$textSecondary" textAlign="center">
                No participants yet. Share the invite link to get started!
              </Text>
            </YStack>
          </Card>
        ) : (
          <YStack gap="$2">
            {sortedParticipants.map((participant) => {
              const roleConfig = getRoleConfig(participant.role as ParticipantRole);
              const confirmationStatus = getConfirmationStatus(participant);
              const isRemovable = participant.role === 'guest';

              return (
                <Card key={participant.id} testID={`participant-${participant.id}`}>
                  <XStack alignItems="center" gap="$3">
                    <Avatar circular size="$4">
                      {participant.profile?.avatar_url ? (
                        <Avatar.Image source={{ uri: participant.profile.avatar_url }} />
                      ) : (
                        <Avatar.Fallback backgroundColor="$backgroundHover">
                          <Text color="$textPrimary" fontWeight="600">
                            {participant.profile?.full_name?.[0]?.toUpperCase() || '?'}
                          </Text>
                        </Avatar.Fallback>
                      )}
                    </Avatar>

                    <YStack flex={1} gap="$1">
                      <Text fontWeight="600" color="$textPrimary">
                        {participant.profile?.full_name || 'Unknown'}
                      </Text>
                      <XStack gap="$2">
                        <Badge label={roleConfig.label} variant={roleConfig.variant} size="sm" />
                        <Badge label={confirmationStatus.label} variant={confirmationStatus.variant} size="sm" />
                      </XStack>
                    </YStack>

                    {isRemovable && (
                      <XStack
                        width={36}
                        height={36}
                        borderRadius="$full"
                        backgroundColor="$backgroundHover"
                        alignItems="center"
                        justifyContent="center"
                        pressStyle={{ opacity: 0.8 }}
                        onPress={() => handleRemoveParticipant(participant.user_id)}
                        testID={`remove-participant-${participant.id}`}
                      >
                        <Ionicons name="close" size={18} color="#E12D39" />
                      </XStack>
                    )}
                  </XStack>
                </Card>
              );
            })}
          </YStack>
        )}
      </ScrollView>

      {/* Invite Button */}
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        padding="$4"
        paddingBottom={insets.bottom + 16}
        backgroundColor="$surface"
        borderTopWidth={1}
        borderTopColor="$borderColor"
      >
        <Button
          flex={1}
          onPress={generateInviteLink}
          loading={inviteLoading}
          icon={<Ionicons name="share-outline" size={20} color="white" />}
          testID="invite-button"
        >
          Share Invite Link
        </Button>
      </XStack>
    </YStack>
  );
}
