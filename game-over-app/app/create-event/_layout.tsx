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
import { useTranslation, getTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';

const STEPS = [
  { path: '/create-event', label: 'Key Details' },
  { path: '/create-event/preferences', label: 'Preferences' },
  { path: '/create-event/participants', label: 'Participants' },
  { path: '/create-event/packages', label: 'Package Selection' },
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
        {isDirty ? getTranslation().wizard.saving : `${getTranslation().wizard.draftSaved.replace('{{time}}', timeText)}`}
      </Text>
    </XStack>
  );
}

/**
 * Segmented Progress Indicator
 * Shows 4 pill-shaped segments matching mockup design
 */
function SegmentedProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <XStack gap="$2" width="100%">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isUpcoming = stepNumber > currentStep;

        return (
          <YStack
            key={stepNumber}
            flex={1}
            height={6}
            borderRadius="$full"
            backgroundColor={
              isCompleted
                ? `${DARK_THEME.primary}40` // 40% opacity
                : isCurrent
                ? DARK_THEME.primary
                : DARK_THEME.surface
            }
            borderWidth={isUpcoming ? 1 : 0}
            borderColor={isUpcoming ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}
            {...(isCurrent && {
              shadowColor: DARK_THEME.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 8,
            })}
          />
        );
      })}
    </XStack>
  );
}

export default function CreateEventLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { deleteDraft, activeDraftId, saveDraft, startAutoSave, stopAutoSave, hasDraft, partyType, goToStep } = useWizardStore();
  const { t } = useTranslation();

  // Navigate to the Events tab — dismiss modal stack back to tabs
  const goToEventsTab = () => {
    if (router.canDismiss()) {
      router.dismissTo('/(tabs)/events');
    } else {
      router.replace('/(tabs)/events');
    }
  };

  // Start auto-save when wizard mounts, stop when unmounts
  useEffect(() => {
    startAutoSave();
    return () => {
      stopAutoSave();
    };
  }, [startAutoSave, stopAutoSave]);

  const currentStepIndex = STEPS.findIndex(s => s.path === pathname);
  const currentStep = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;

  // Sync store's currentStep with actual navigation so drafts save the correct step
  useEffect(() => {
    if (currentStepIndex >= 0) {
      goToStep(currentStepIndex + 1);
    }
  }, [currentStepIndex, goToStep]);
  const stepLabelsTranslated: string[] = [t.wizard.keyDetails, t.wizard.preferences, t.wizard.participants, t.wizard.packageSelection];
  let currentStepLabel: string = currentStepIndex >= 0 ? stepLabelsTranslated[currentStepIndex] : t.wizard.keyDetails;
  // Dynamic label for step 2 based on party type
  if (currentStep === 2) {
    currentStepLabel = partyType === 'bachelor' ? t.wizard.groomPreferences : t.wizard.bridePreferences;
  } else if (currentStep === 3) {
    currentStepLabel = t.wizard.participantsPreferences;
  }

  const handleBack = () => {
    if (currentStepIndex === 0) {
      // On first step, save draft and go back (user can resume from Events)
      const state = useWizardStore.getState();
      if (state.hasDraft()) {
        const tr = getTranslation();
        Alert.alert(
          tr.wizard.saveDraftTitle,
          tr.wizard.saveDraftMessage,
          [
            {
              text: tr.wizard.discard,
              style: 'destructive',
              onPress: () => {
                if (activeDraftId) deleteDraft(activeDraftId);
                goToEventsTab();
              },
            },
            {
              text: tr.wizard.saveExit,
              onPress: () => {
                saveDraft();
                goToEventsTab();
              },
            },
          ]
        );
      } else {
        router.back();
      }
    } else {
      // Go to previous step
      router.back();
    }
  };

  const handleMenu = () => {
    const tr = getTranslation();
    Alert.alert(
      tr.wizard.optionsTitle,
      tr.wizard.optionsMessage,
      [
        { text: tr.wizard.cancel, style: 'cancel' },
        {
          text: tr.wizard.saveDraftExit,
          onPress: () => {
            saveDraft();
            goToEventsTab();
          },
        },
        {
          text: tr.wizard.discardDraft,
          style: 'destructive',
          onPress: () => {
            if (activeDraftId) deleteDraft(activeDraftId);
            goToEventsTab();
          },
        },
      ]
    );
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <YStack paddingTop={insets.top} backgroundColor="$surface" zIndex={20}>
        {/* Navigation + Step Label */}
        <XStack paddingHorizontal="$4" paddingTop="$1" paddingBottom="$1" alignItems="center" justifyContent="space-between">
          <XStack
            width={36}
            height={36}
            borderRadius="$full"
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.7, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            onPress={handleBack}
            testID="wizard-back-button"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </XStack>

          <YStack alignItems="center" flex={1}>
            <Text fontSize={15} fontWeight="700" color="$textPrimary" numberOfLines={1}>
              {currentStepLabel}
            </Text>
            <Text fontSize={10} fontWeight="500" color="$primary" textTransform="uppercase" letterSpacing={0.5}>
              {t.wizard.stepOf.replace('{{current}}', String(currentStep)).replace('{{total}}', String(STEPS.length))}
            </Text>
          </YStack>

          <XStack
            width={36}
            height={36}
            borderRadius="$full"
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.7, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            onPress={handleMenu}
            testID="wizard-menu-button"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="rgba(255, 255, 255, 0.7)" />
          </XStack>
        </XStack>

        {/* Progress Bar */}
        <YStack paddingHorizontal="$4" paddingBottom="$1.5">
          <SegmentedProgress currentStep={currentStep} totalSteps={STEPS.length} />
        </YStack>
      </YStack>

      {/* Content */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="participants" />
        <Stack.Screen name="packages" />
      </Stack>
    </YStack>
  );
}
