/**
 * Create Event Wizard Layout — Editorial redesign
 * Clean step indicator + serif heading. No app chrome (no hamburger, no avatar).
 * Tab bar is hidden because the wizard uses fullScreenModal presentation.
 */

import React, { useEffect, useState } from 'react';
import { Alert, View, Text, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useWizardStore,
  useWizardLastSavedAt,
  useWizardIsDirty,
  useWizardAutoSave,
} from '@/stores/wizardStore';
import { useTranslation, getTranslation } from '@/i18n';

const STEPS = [
  { path: '/create-event',              label: 'Key Details' },
  { path: '/create-event/preferences',  label: 'Preferences' },
  { path: '/create-event/participants', label: 'Participants' },
  { path: '/create-event/packages',     label: 'Packages' },
];

export default function CreateEventLayout() {
  const router   = useRouter();
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();
  const { t }    = useTranslation();

  const { deleteDraft, activeDraftId, saveDraft, hasDraft, partyType, goToStep } =
    useWizardStore();

  useWizardAutoSave(true);

  const currentStepIndex = STEPS.findIndex(s => s.path === pathname);
  const currentStep      = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;

  // Derive step label (translated, with party-type variants for steps 2 & 3)
  const stepLabels: string[] = [
    t.wizard.keyDetails,
    t.wizard.preferences,
    t.wizard.participants,
    t.wizard.packageSelection,
  ];
  let currentStepLabel = currentStepIndex >= 0 ? stepLabels[currentStepIndex] : stepLabels[0];
  if (currentStep === 2) {
    currentStepLabel = partyType === 'bachelor' ? t.wizard.groomPreferences : t.wizard.bridePreferences;
  } else if (currentStep === 3) {
    currentStepLabel = t.wizard.participantsPreferences;
  }

  // Sync wizard store with actual navigation position
  useEffect(() => {
    if (currentStepIndex >= 0) goToStep(currentStepIndex + 1);
  }, [currentStepIndex, goToStep]);

  const goToEventsTab = () => {
    if (router.canDismiss()) {
      router.dismissTo('/(tabs)/events');
    } else {
      router.replace('/(tabs)/events');
    }
  };

  const handleBack = () => {
    if (currentStepIndex === 0) {
      const state = useWizardStore.getState();
      if (state.hasDraft()) {
        const tr = getTranslation();
        Alert.alert(tr.wizard.saveDraftTitle, tr.wizard.saveDraftMessage, [
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
        ]);
      } else {
        router.back();
      }
    } else {
      const prevPath = STEPS[currentStepIndex - 1]?.path;
      if (prevPath) {
        router.replace(prevPath as any);
      } else {
        router.back();
      }
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: '#0D1B2A' }]}>
      {/* ── Header — same slim pattern as Event Summary ─ */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          {/* Back */}
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={styles.headerSide}
            testID="wizard-back-button"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>

          {/* Center: step counter + label */}
          <View style={styles.headerCenter}>
            <Text style={styles.stepCounter}>
              STEP {currentStep} OF {STEPS.length}
            </Text>
            <Text style={styles.heading}>{currentStepLabel}</Text>
          </View>

          {/* Right spacer — mirrors back button */}
          <View style={styles.headerSide} />
        </View>
      </View>

      {/* ── Screen content ──────────────────────────── */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="participants" />
        <Stack.Screen name="packages" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
    backgroundColor: '#0D1B2A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(230,220,200,0.15)',
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerSide: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  stepCounter: {
    color: '#C6A75E',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Fraunces_600SemiBold',
    textAlign: 'center',
  },
});
