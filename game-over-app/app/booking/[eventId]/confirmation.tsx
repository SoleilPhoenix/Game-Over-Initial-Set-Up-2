/**
 * Booking Confirmation Screen
 * Success screen after payment with calendar and copy functionality
 */

import React, { useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useEvent } from '@/hooks/queries/useEvents';
import { useBooking } from '@/hooks/queries/useBookings';
import { addEventToCalendarWithFeedback } from '@/utils/calendar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function BookingConfirmationScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: booking, isLoading: bookingLoading } = useBooking(eventId);

  if (eventLoading || bookingLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  const bookingReference = booking?.reference_number || `GO-${booking?.id?.slice(0, 6).toUpperCase()}`;

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    });
  };

  const handleCopyReference = async () => {
    try {
      await Clipboard.setStringAsync(bookingReference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleAddToCalendar = async () => {
    if (!event) return;

    await addEventToCalendarWithFeedback({
      title: event.title || `${event.honoree_name}'s Party`,
      startDate: event.start_date,
      endDate: event.end_date || event.start_date,
      location: event.city?.name,
      bookingReference: bookingReference,
      notes: `Celebrating ${event.honoree_name}`,
    });
  };

  const handleViewEvent = () => {
    router.replace(`/event/${eventId}`);
  };

  const handleGoHome = () => {
    router.replace('/(tabs)/events');
  };

  return (
    <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
      <YStack flex={1} padding="$4" justifyContent="center" alignItems="center">
        {/* Success Icon */}
        <YStack
          width={100}
          height={100}
          borderRadius="$full"
          backgroundColor="rgba(71, 184, 129, 0.15)"
          alignItems="center"
          justifyContent="center"
          marginBottom="$6"
        >
          <YStack
            width={70}
            height={70}
            borderRadius="$full"
            backgroundColor="$success"
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name="checkmark" size={40} color="white" />
          </YStack>
        </YStack>

        {/* Success Message */}
        <Text fontSize="$7" fontWeight="800" color="$textPrimary" textAlign="center" marginBottom="$2">
          Booking Confirmed!
        </Text>
        <Text fontSize="$3" color="$textSecondary" textAlign="center" marginBottom="$6">
          Your package has been booked successfully
        </Text>

        {/* Booking Details Card */}
        <Card width="100%" marginBottom="$6" testID="booking-details-card">
          <YStack gap="$4">
            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$textSecondary">Event</Text>
              <Text fontWeight="600" color="$textPrimary">
                {event?.title || `${event?.honoree_name}'s Party`}
              </Text>
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$textSecondary">Destination</Text>
              <Text fontWeight="600" color="$textPrimary">
                {event?.city?.name}
              </Text>
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$textSecondary">Date</Text>
              <Text fontWeight="600" color="$textPrimary">
                {event?.start_date && new Date(event.start_date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </XStack>

            {booking && (
              <>
                <YStack height={1} backgroundColor="$borderColor" />

                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$textSecondary">Booking Reference</Text>
                  <Pressable onPress={handleCopyReference} testID="copy-reference-button">
                    <XStack gap="$2" alignItems="center">
                      <Text fontWeight="700" color="$primary" fontFamily="$mono">
                        {bookingReference}
                      </Text>
                      <Ionicons
                        name={copied ? 'checkmark-circle' : 'copy-outline'}
                        size={18}
                        color={copied ? '#47B881' : '#258CF4'}
                      />
                    </XStack>
                  </Pressable>
                </XStack>

                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$textSecondary">Total Paid</Text>
                  <Text fontSize="$5" fontWeight="800" color="$primary">
                    {formatPrice(booking.total_amount_cents)}
                  </Text>
                </XStack>
              </>
            )}
          </YStack>
        </Card>

        {/* Next Steps */}
        <Card width="100%" backgroundColor="rgba(37, 140, 244, 0.1)" borderWidth={0}>
          <YStack gap="$3">
            <Text fontSize="$4" fontWeight="700" color="$primary">
              What's Next?
            </Text>
            <XStack gap="$2" alignItems="flex-start">
              <Ionicons name="mail-outline" size={18} color="#258CF4" style={{ marginTop: 2 }} />
              <Text fontSize="$2" color="$textSecondary" flex={1}>
                You'll receive a confirmation email with all the details
              </Text>
            </XStack>
            <XStack gap="$2" alignItems="flex-start">
              <Ionicons name="people-outline" size={18} color="#258CF4" style={{ marginTop: 2 }} />
              <Text fontSize="$2" color="$textSecondary" flex={1}>
                Invite your guests and split the cost
              </Text>
            </XStack>
            <XStack gap="$2" alignItems="flex-start">
              <Ionicons name="chatbubbles-outline" size={18} color="#258CF4" style={{ marginTop: 2 }} />
              <Text fontSize="$2" color="$textSecondary" flex={1}>
                Use the group chat to coordinate with everyone
              </Text>
            </XStack>
          </YStack>
        </Card>
      </YStack>

      {/* Footer */}
      <YStack
        padding="$4"
        paddingBottom={insets.bottom + 16}
        backgroundColor="$surface"
        borderTopWidth={1}
        borderTopColor="$borderColor"
        gap="$3"
      >
        {/* Add to Calendar Button */}
        <Button
          variant="secondary"
          onPress={handleAddToCalendar}
          testID="add-to-calendar-button"
        >
          <XStack gap="$2" alignItems="center">
            <Ionicons name="calendar-outline" size={20} color="#258CF4" />
            <Text color="$primary" fontWeight="600">
              Add to Calendar
            </Text>
          </XStack>
        </Button>

        {/* Navigation Buttons */}
        <XStack gap="$3">
          <Button flex={1} variant="outline" onPress={handleGoHome} testID="go-home-button">
            Go Home
          </Button>
          <Button flex={1} onPress={handleViewEvent} testID="view-event-button">
            View Event
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
