/**
 * Create Event Wizard Layout
 * Modal presentation with progress indicator
 * Includes auto-save functionality
 */

import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWizardStore, useWizardLastSavedAt, useWizardIsDirty } from '@/stores/wizardStore';
import { ProgressBar } from '@/components/ui/ProgressBar';

const STEPS = [
  { path: '/create-event', label: 'Key Details' },
  { path: '/create-event/preferences', label: 'Preferences' },
  { path: '/create-event/participants', label: 'Group' },
  { path: '/create-event/packages', label: 'Package' },
  { path: '/create-event/review', label: 'Review' },
];

/**
 * Draft Saved Indicator Component
 * Shows subtle "Draft saved X seconds ago" text
 */
function DraftSavedIndicator() {
  const lastSavedAt = useWizardLastSavedAt();
  const isDirty = useWizardIsDirty();
  const [, setTick] = useState(0);

  // Update every 10 seconds to keep the time display fresh
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!lastSavedAt) return null;

  const secondsAgo = Math.floor(
    (Date.now() - new Date(lastSavedAt).getTime()) / 1000
  );

  let timeText: string;
  if (secondsAgo < 60) {
    timeText = `${secondsAgo}s ago`;
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    timeText = `${minutes}m ago`;
  } else {
    timeText = 'recently';
  }

  return (
    <XStack alignItems="center" gap="$1" opacity={0.7}>
      <Ionicons
        name={isDirty ? 'cloud-outline' : 'cloud-done-outline'}
        size={14}
        color="#64748B"
      />
      <Text fontSize="$1" color="$textSecondary">
        {isDirty ? 'Saving...' : `Draft saved ${timeText}`}
      </Text>
    </XStack>
  );
}

export default function CreateEventLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { clearDraft, startAutoSave, stopAutoSave, hasDraft } = useWizardStore();

  // Start auto-save when wizard mounts, stop when unmounts
  useEffect(() => {
    startAutoSave();
    return () => {
      stopAutoSave();
    };
  }, [startAutoSave, stopAutoSave]);

  const currentStepIndex = STEPS.findIndex(s => s.path === pathname);
  const currentStep = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;
  const progress = (currentStep / STEPS.length) * 100;

  const handleClose = () => {
    const isDirty = useWizardStore.getState().isDirty;

    if (isDirty) {
      Alert.alert(
        'Discard Draft?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              clearDraft();
              router.back();
            },
          },
        ]
      );
    } else {
      clearDraft();
      router.back();
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <YStack paddingTop={insets.top} backgroundColor="$surface">
        <XStack paddingHorizontal="$4" paddingVertical="$3" alignItems="center" justifyContent="space-between">
          <XStack
            width={40}
            height={40}
            borderRadius="$full"
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.7 }}
            onPress={handleClose}
            testID="wizard-close-button"
          >
            <Ionicons name="close" size={24} color="#64748B" />
          </XStack>

          <Text fontSize="$3" fontWeight="600" color="$textPrimary">
            Step {currentStep} of {STEPS.length}
          </Text>

          <YStack width={40} />
        </XStack>

        <YStack paddingHorizontal="$4" paddingBottom="$3">
          <ProgressBar value={progress} size="sm" />
        </YStack>
      </YStack>

      {/* Content */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="participants" />
        <Stack.Screen name="packages" />
        <Stack.Screen name="review" />
      </Stack>
    </YStack>
  );
}
