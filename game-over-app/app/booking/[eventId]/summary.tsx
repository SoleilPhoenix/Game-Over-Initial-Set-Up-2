/**
 * Booking Summary Screen (Phase 6)
 * Payment summary with pricing breakdown
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner, Switch } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function BookingSummaryScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    event,
    participants,
    package: pkg,
    excludeHonoree,
    setExcludeHonoree,
    pricing,
    isLoading,
  } = useBookingFlow(eventId);

  if (isLoading || !event || !pkg || !pricing) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    });
  };

  const handleProceedToPayment = () => {
    router.push(`/booking/${eventId}/payment`);
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <XStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$4"
        paddingBottom="$3"
        alignItems="center"
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
          onPress={() => router.back()}
          testID="back-button"
        >
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </XStack>
        <Text flex={1} fontSize="$5" fontWeight="700" color="$textPrimary" textAlign="center">
          Payment Summary
        </Text>
        <YStack width={40} />
      </XStack>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Package Card */}
        <Card marginBottom="$4" testID="package-summary-card">
          <XStack gap="$3" alignItems="flex-start">
            <YStack
              width={60}
              height={60}
              borderRadius="$md"
              backgroundColor="$backgroundHover"
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons name="gift" size={28} color="#258CF4" />
            </YStack>
            <YStack flex={1}>
              <Badge label={pkg.tier} variant="primary" size="sm" marginBottom="$1" />
              <Text fontSize="$4" fontWeight="700" color="$textPrimary">
                {pkg.name}
              </Text>
              <Text fontSize="$2" color="$textSecondary">
                {event.city?.name}
              </Text>
            </YStack>
          </XStack>
        </Card>

        {/* Exclude Honoree Toggle */}
        <Card marginBottom="$4" testID="exclude-honoree-card">
          <XStack justifyContent="space-between" alignItems="center">
            <YStack flex={1}>
              <Text fontSize="$3" fontWeight="600" color="$textPrimary">
                Exclude Guest of Honor
              </Text>
              <Text fontSize="$2" color="$textSecondary">
                {event.honoree_name} won't pay for the package
              </Text>
            </YStack>
            <Switch
              checked={excludeHonoree}
              onCheckedChange={setExcludeHonoree}
              backgroundColor={excludeHonoree ? '$primary' : '$borderColor'}
              testID="exclude-honoree-toggle"
            >
              <Switch.Thumb animation="quick" backgroundColor="white" />
            </Switch>
          </XStack>
        </Card>

        {/* Cost Breakdown */}
        <Card marginBottom="$4" testID="cost-breakdown-card">
          <YStack gap="$3">
            <Text fontSize="$4" fontWeight="700" color="$textPrimary">
              Cost Breakdown
            </Text>

            <XStack justifyContent="space-between">
              <Text color="$textSecondary">Package Price</Text>
              <Text fontWeight="600" color="$textPrimary">
                {formatPrice(pricing.packagePriceCents)}
              </Text>
            </XStack>

            <XStack justifyContent="space-between">
              <XStack gap="$1" alignItems="center">
                <Text color="$textSecondary">Service Fee (10%)</Text>
                <Ionicons name="information-circle-outline" size={14} color="#64748B" />
              </XStack>
              <Text fontWeight="600" color="$textPrimary">
                {formatPrice(pricing.serviceFeeCents)}
              </Text>
            </XStack>

            <YStack
              height={1}
              backgroundColor="$borderColor"
              marginVertical="$2"
            />

            <XStack justifyContent="space-between">
              <Text fontSize="$4" fontWeight="700" color="$textPrimary">
                Total
              </Text>
              <Text fontSize="$5" fontWeight="800" color="$primary">
                {formatPrice(pricing.totalCents)}
              </Text>
            </XStack>
          </YStack>
        </Card>

        {/* Per Person Card */}
        <Card
          variant="filled"
          backgroundColor="rgba(37, 140, 244, 0.1)"
          borderWidth={0}
          marginBottom="$4"
          testID="per-person-card"
        >
          <YStack alignItems="center" gap="$1">
            <Text fontSize="$2" color="$primary" fontWeight="600">
              Per Person ({pricing.payingParticipantCount} paying)
            </Text>
            <Text fontSize="$7" fontWeight="800" color="$primary">
              {formatPrice(pricing.perPersonCents)}
            </Text>
          </YStack>
        </Card>

        {/* Participants Summary */}
        <Card marginBottom="$4" testID="participants-summary-card">
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text fontSize="$3" fontWeight="600" color="$textPrimary">
                {participants.length} Participants
              </Text>
              <Text fontSize="$2" color="$textSecondary">
                {pricing.payingParticipantCount} paying
                {excludeHonoree && ` (excluding ${event.honoree_name})`}
              </Text>
            </YStack>
            <XStack
              pressStyle={{ opacity: 0.7 }}
              onPress={() => router.push(`/event/${eventId}/participants`)}
            >
              <Text color="$primary" fontWeight="600">
                Manage →
              </Text>
            </XStack>
          </XStack>
        </Card>

        {/* Security Info */}
        <XStack
          padding="$3"
          backgroundColor="$backgroundHover"
          borderRadius="$lg"
          gap="$2"
          alignItems="center"
        >
          <Ionicons name="shield-checkmark" size={20} color="#47B881" />
          <Text fontSize="$2" color="$textSecondary" flex={1}>
            Secured by Stripe. Your payment information is encrypted.
          </Text>
        </XStack>
      </ScrollView>

      {/* Footer */}
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
          onPress={handleProceedToPayment}
          testID="proceed-to-payment-button"
        >
          Proceed to Payment
        </Button>
      </XStack>
    </YStack>
  );
}
