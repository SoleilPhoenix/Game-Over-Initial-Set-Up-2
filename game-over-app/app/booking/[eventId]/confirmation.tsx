/**
 * Booking Confirmation Screen
 * Success screen after payment with calendar and copy functionality
 */

import React, { useState } from 'react';
import { Alert, ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useQueryClient } from '@tanstack/react-query';
import { useEvent, eventKeys } from '@/hooks/queries/useEvents';
import { useBooking } from '@/hooks/queries/useBookings';
import { useWizardStore } from '@/stores/wizardStore';
import { addEventToCalendarWithFeedback } from '@/utils/calendar';
import { useTranslation, getTranslation } from '@/i18n';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getPackageImage, resolveImageSource } from '@/constants/packageImages';

const CITY_NAMES: Record<string, string> = {
  berlin: 'Berlin', hamburg: 'Hamburg', hannover: 'Hannover',
  '550e8400-e29b-41d4-a716-446655440101': 'Berlin',
  '550e8400-e29b-41d4-a716-446655440102': 'Hamburg',
  '550e8400-e29b-41d4-a716-446655440103': 'Hannover',
};
const FALLBACK_PKG_NAMES: Record<string, string> = {
  'berlin-classic': 'Classic (M)', 'berlin-essential': 'Essential (S)', 'berlin-grand': 'Grand (L)',
  'hamburg-classic': 'Classic (M)', 'hamburg-essential': 'Essential (S)', 'hamburg-grand': 'Grand (L)',
  'hannover-classic': 'Classic (M)', 'hannover-essential': 'Essential (S)', 'hannover-grand': 'Grand (L)',
};

export default function BookingConfirmationScreen() {
  const { eventId, packageId, cityId, participants, total, fullTotal } = useLocalSearchParams<{
    eventId: string; packageId?: string; cityId?: string; participants?: string; total?: string; fullTotal?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const isDraft = eventId === 'draft';
  const { t } = useTranslation();
  const wizardStartDate = useWizardStore((s) => s.startDate);

  // Navigate to the Events tab — dismiss all modal/booking screens back to tabs
  const goToEventsTab = () => {
    if (router.canDismiss()) {
      router.dismissTo('/(tabs)/events');
    } else {
      router.replace('/(tabs)/events');
    }
  };

  const { data: event, isLoading: eventLoading } = useEvent(isDraft ? undefined : eventId);
  const { data: booking, isLoading: bookingLoading } = useBooking(isDraft ? undefined : eventId);

  if (!isDraft && (eventLoading || bookingLoading)) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  // Draft mode: generate a demo reference
  const draftRef = `GO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const bookingReference = isDraft
    ? draftRef
    : (booking?.reference_number || 'GO-' + (booking?.id?.substring(0, 6).toUpperCase() || 'XXXXXX'));

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
    if (isDraft) {
      const tr = getTranslation();
      Alert.alert(tr.booking.demoMode, tr.booking.demoCalendarMessage);
      return;
    }
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
    const { activeDraftId, deleteDraft } = useWizardStore.getState();
    if (activeDraftId) deleteDraft(activeDraftId);
    queryClient.invalidateQueries({ queryKey: eventKeys.all });
    if (isDraft) {
      goToEventsTab();
      return;
    }
    goToEventsTab();
    setTimeout(() => router.push(`/event/${eventId}`), 200);
  };

  const handleGoHome = () => {
    const { activeDraftId, deleteDraft } = useWizardStore.getState();
    if (activeDraftId) deleteDraft(activeDraftId);
    queryClient.invalidateQueries({ queryKey: eventKeys.all });
    goToEventsTab();
  };

  return (
    <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', padding: 0 }}>
        {/* Hero Image with Success Overlay */}
        <View style={confirmStyles.heroContainer}>
          <ImageBackground
            source={resolveImageSource((() => {
              // Derive city + tier from packageId slug (e.g., "berlin-classic")
              if (packageId) {
                const parts = packageId.split('-');
                const city = parts.slice(0, -1).join('-') || 'berlin';
                const tier = parts[parts.length - 1] || 'essential';
                return getPackageImage(city, tier);
              }
              // Fallback from cityId
              const slug = cityId ? (CITY_NAMES[cityId]?.toLowerCase() || 'berlin') : 'berlin';
              return getPackageImage(slug, 'essential');
            })())}
            style={confirmStyles.heroImage}
            fadeDuration={0}
            resizeMode="cover"
          >
            <View style={confirmStyles.heroOverlay}>
              <YStack
                width={80}
                height={80}
                borderRadius={40}
                backgroundColor="rgba(71, 184, 129, 0.2)"
                alignItems="center"
                justifyContent="center"
                marginBottom="$4"
              >
                <YStack
                  width={56}
                  height={56}
                  borderRadius={28}
                  backgroundColor="$success"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="checkmark" size={32} color="white" />
                </YStack>
              </YStack>

              <Text fontSize="$7" fontWeight="800" color="white" textAlign="center" marginBottom="$1">
                {t.booking.confirmationTitle}
              </Text>
              <Text fontSize="$3" color="rgba(255,255,255,0.85)" textAlign="center">
                {t.booking.confirmationSubtitle}
              </Text>
            </View>
          </ImageBackground>
        </View>

        {/* Booking Details Card */}
        <Card width="100%" marginBottom="$6" marginHorizontal="$4" paddingHorizontal={16} testID="booking-details-card">
          <YStack gap="$4">
            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$textSecondary">{t.booking.packageLabel}</Text>
              <Text fontWeight="600" color="$textPrimary">
                {isDraft
                  ? (packageId ? FALLBACK_PKG_NAMES[packageId] || packageId : 'Selected Package')
                  : (packageId ? FALLBACK_PKG_NAMES[packageId] : null) || (() => {
                      const bk = booking as any;
                      const tier = bk?.package?.tier || bk?.tier;
                      const tierNames: Record<string, string> = { essential: 'Essential (S)', classic: 'Classic (M)', grand: 'Grand (L)' };
                      return tier ? tierNames[tier] || event?.title : event?.title;
                    })() || 'Package'}
              </Text>
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$textSecondary">{t.booking.destination}</Text>
              <Text fontWeight="600" color="$textPrimary">
                {isDraft ? (cityId ? CITY_NAMES[cityId] || cityId : 'Unknown') : (event?.city?.name || (cityId ? CITY_NAMES[cityId] || cityId : 'Unknown'))}
              </Text>
            </XStack>

            {(() => {
              const rawDate = isDraft ? wizardStartDate : (event?.start_date || wizardStartDate);
              if (!rawDate) return null;
              const d = new Date(rawDate);
              if (isNaN(d.getTime())) return null;
              return (
                <XStack justifyContent="space-between" alignItems="center">
                  <Text color="$textSecondary">{t.booking.date}</Text>
                  <Text fontWeight="600" color="$textPrimary">
                    {d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                </XStack>
              );
            })()}

            {participants && (
              <XStack justifyContent="space-between" alignItems="center">
                <Text color="$textSecondary">Participants</Text>
                <Text fontWeight="600" color="$textPrimary">
                  {participants} Guests
                </Text>
              </XStack>
            )}

            <YStack height={1} backgroundColor="$borderColor" />

            <XStack justifyContent="space-between" alignItems="center">
              <Text color="$textSecondary">{t.booking.bookingReference}</Text>
              <Pressable onPress={handleCopyReference} testID="copy-reference-button">
                <XStack gap="$2" alignItems="center">
                  <Text fontWeight="700" color="$primary" fontFamily="$body">
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
              <Text color="$textSecondary">{t.booking.totalPaid}</Text>
              <XStack alignItems="baseline" gap="$1">
                <Text fontSize="$5" fontWeight="800" color="$primary">
                  {total ? formatPrice(parseInt(total, 10)) : booking?.total_amount_cents ? formatPrice(booking.total_amount_cents) : '---'}
                </Text>
                {fullTotal && (
                  <Text fontSize="$5" fontWeight="800" color="$textTertiary">
                    {' '}of {formatPrice(parseInt(fullTotal, 10))}
                  </Text>
                )}
              </XStack>
            </XStack>
          </YStack>
        </Card>

        {/* Next Steps */}
        <Card width="100%" marginHorizontal="$4" paddingHorizontal={16} backgroundColor="rgba(37, 140, 244, 0.1)" borderWidth={0}>
          <YStack gap="$3">
            <Text fontSize="$4" fontWeight="700" color="$primary" textAlign="center">
              {t.booking.whatsNext}
            </Text>
            <XStack gap="$2" alignItems="flex-start">
              <Ionicons name="mail-outline" size={18} color="#258CF4" style={{ marginTop: 2 }} />
              <Text fontSize="$2" color="$textSecondary" flex={1}>
                {t.booking.confirmationEmail}
              </Text>
            </XStack>
            <XStack gap="$2" alignItems="flex-start">
              <Ionicons name="people-outline" size={18} color="#258CF4" style={{ marginTop: 2 }} />
              <Text fontSize="$2" color="$textSecondary" flex={1}>
                {t.booking.inviteGuests}
              </Text>
            </XStack>
            <XStack gap="$2" alignItems="flex-start">
              <Ionicons name="chatbubbles-outline" size={18} color="#258CF4" style={{ marginTop: 2 }} />
              <Text fontSize="$2" color="$textSecondary" flex={1}>
                {t.booking.useGroupChat}
              </Text>
            </XStack>
          </YStack>
        </Card>
      </ScrollView>

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
              {t.booking.addToCalendar}
            </Text>
          </XStack>
        </Button>

        {/* Navigation Buttons */}
        <XStack gap="$3">
          <Button flex={1} variant="outline" onPress={handleGoHome} testID="go-home-button">
            {t.booking.goHome}
          </Button>
          {!isDraft && (
            <Button flex={1} onPress={handleViewEvent} testID="view-event-button">
              {t.booking.viewEvent}
            </Button>
          )}
        </XStack>
      </YStack>
    </YStack>
  );
}

const confirmStyles = StyleSheet.create({
  heroContainer: {
    width: '100%',
    height: 260,
    marginBottom: 24,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
});
