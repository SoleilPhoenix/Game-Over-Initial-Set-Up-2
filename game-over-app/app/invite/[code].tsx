/**
 * Invite Flow Screen
 * Handles deep link invite acceptance
 */

import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner, Image } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useValidateInvite, useAcceptInvite } from '@/hooks/queries/useInvites';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [isAccepting, setIsAccepting] = useState(false);

  const { data: validation, isLoading, error } = useValidateInvite(code);
  const acceptInvite = useAcceptInvite();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      // Store the invite code to redirect back after login
      router.replace(`/(auth)/login?redirect=/invite/${code}`);
    }
  }, [user, code, router]);

  const handleAcceptInvite = async () => {
    if (!code || !user) return;

    setIsAccepting(true);
    try {
      const result = await acceptInvite.mutateAsync(code);

      if (result.success && result.eventId) {
        Alert.alert(
          'Welcome!',
          "You've successfully joined the event.",
          [
            {
              text: 'View Event',
              onPress: () => router.replace(`/event/${result.eventId}`),
            },
          ]
        );
      } else if (result.error) {
        Alert.alert('Already Joined', result.error, [
          {
            text: 'View Event',
            onPress: () => router.replace(`/event/${result.eventId}`),
          },
        ]);
      }
    } catch (err) {
      Alert.alert(
        'Error',
        'Failed to accept invitation. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAccepting(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  // Loading state
  if (isLoading || !user) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$4" color="$textSecondary">
          Validating invite...
        </Text>
      </YStack>
    );
  }

  // Invalid/expired invite
  if (!validation?.valid || !validation.invite) {
    const errorMessages = {
      not_found: {
        title: 'Invalid Invite',
        message: 'This invite link is invalid or has been revoked.',
        icon: 'close-circle' as const,
      },
      expired: {
        title: 'Invite Expired',
        message: 'This invite link has expired. Please request a new one from the event organizer.',
        icon: 'time' as const,
      },
      max_uses_reached: {
        title: 'Invite Limit Reached',
        message: 'This invite link has reached its maximum number of uses.',
        icon: 'people' as const,
      },
      inactive: {
        title: 'Invite Deactivated',
        message: 'This invite link is no longer active.',
        icon: 'ban' as const,
      },
    };

    const errorInfo = errorMessages[validation?.reason || 'not_found'];

    return (
      <YStack flex={1} backgroundColor="$background">
        <XStack
          paddingTop={insets.top + 8}
          paddingHorizontal="$4"
          paddingBottom="$3"
        >
          <XStack
            width={40}
            height={40}
            borderRadius="$full"
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.7 }}
            onPress={handleClose}
            testID="close-button"
          >
            <Ionicons name="close" size={28} color="#1A202C" />
          </XStack>
        </XStack>

        <YStack flex={1} justifyContent="center" alignItems="center" padding="$6">
          <YStack
            width={80}
            height={80}
            borderRadius="$full"
            backgroundColor="rgba(225, 45, 57, 0.1)"
            alignItems="center"
            justifyContent="center"
            marginBottom="$4"
          >
            <Ionicons name={errorInfo.icon} size={40} color="#E12D39" />
          </YStack>
          <Text fontSize="$6" fontWeight="700" color="$textPrimary" textAlign="center">
            {errorInfo.title}
          </Text>
          <Text
            fontSize="$3"
            color="$textSecondary"
            textAlign="center"
            marginTop="$2"
            paddingHorizontal="$4"
          >
            {errorInfo.message}
          </Text>
          <Button
            marginTop="$6"
            variant="secondary"
            onPress={() => router.replace('/(tabs)/events')}
            testID="go-home-button"
          >
            Go to My Events
          </Button>
        </YStack>
      </YStack>
    );
  }

  const invite = validation.invite;
  const event = invite.event;

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$4"
        paddingBottom="$3"
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
          pressStyle={{ opacity: 0.7 }}
          onPress={handleClose}
          testID="close-button"
        >
          <Ionicons name="close" size={28} color="#1A202C" />
        </XStack>
        <Text flex={1} fontSize="$5" fontWeight="700" color="$textPrimary" textAlign="center">
          Event Invitation
        </Text>
        <YStack width={40} />
      </XStack>

      <YStack flex={1} padding="$4" justifyContent="center">
        {/* Event Preview Card */}
        <Card testID="event-preview-card">
          <YStack alignItems="center" gap="$4">
            {/* Party Icon */}
            <YStack
              width={80}
              height={80}
              borderRadius="$full"
              backgroundColor="rgba(37, 140, 244, 0.1)"
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons name="gift" size={40} color="#258CF4" />
            </YStack>

            {/* Invitation Text */}
            <Text fontSize="$2" color="$textSecondary" textTransform="uppercase" letterSpacing={1}>
              You're Invited To
            </Text>

            {/* Event Name */}
            <Text fontSize="$7" fontWeight="800" color="$textPrimary" textAlign="center">
              {event?.title || `${event?.honoree_name}'s Party`}
            </Text>

            {/* Event Details */}
            {event && (
              <YStack gap="$2" alignItems="center">
                <XStack gap="$2" alignItems="center">
                  <Ionicons name="person" size={18} color="#64748B" />
                  <Text color="$textSecondary">
                    Celebrating {event.honoree_name}
                  </Text>
                </XStack>

                {event.city && (
                  <XStack gap="$2" alignItems="center">
                    <Ionicons name="location" size={18} color="#64748B" />
                    <Text color="$textSecondary">
                      {event.city.name}, {event.city.country}
                    </Text>
                  </XStack>
                )}

                <XStack gap="$2" alignItems="center">
                  <Ionicons name="calendar" size={18} color="#64748B" />
                  <Text color="$textSecondary">
                    {new Date(event.start_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </XStack>
              </YStack>
            )}

            {/* Status Badge */}
            {event?.status && (
              <Badge
                label={event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                variant={event.status === 'planning' ? 'info' : 'success'}
              />
            )}
          </YStack>
        </Card>

        {/* Accept Button */}
        <Button
          marginTop="$6"
          onPress={handleAcceptInvite}
          loading={isAccepting}
          disabled={isAccepting}
          testID="accept-invite-button"
        >
          <XStack gap="$2" alignItems="center">
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text color="white" fontWeight="600">
              Accept Invitation
            </Text>
          </XStack>
        </Button>

        {/* Decline Link */}
        <Text
          marginTop="$4"
          fontSize="$3"
          color="$textSecondary"
          textAlign="center"
          pressStyle={{ opacity: 0.7 }}
          onPress={handleClose}
          testID="decline-button"
        >
          No thanks, maybe later
        </Text>
      </YStack>
    </YStack>
  );
}
