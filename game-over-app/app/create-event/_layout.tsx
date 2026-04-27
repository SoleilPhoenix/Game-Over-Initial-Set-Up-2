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
      {/* ── Editorial wizard header ─────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {/* Back button row */}
        <View style={styles.navRow}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={styles.backBtn}
            testID="wizard-back-button"
          >
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.55)" />
          </Pressable>
          {/* Step counter */}
          <Text style={styles.stepCounter}>
            STEP {currentStep} OF {STEPS.length}
          </Text>
          {/* Spacer mirrors back button width */}
          <View style={styles.backBtn} />
        </View>

        {/* Serif heading */}
        <Text style={styles.heading}>{currentStepLabel}</Text>

        {/* Gold divider */}
        <View style={styles.goldDivider} />
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
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#0D1B2A',
    zIndex: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  backBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCounter: {
    flex: 1,
    textAlign: 'center',
    color: '#C6A75E',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    fontFamily: 'Inter_600SemiBold',
  },
  heading: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 24,
    fontFamily: 'Fraunces_600SemiBold',
    lineHeight: 30,
    marginBottom: 8,
  },
  goldDivider: {
    alignSelf: 'center',
    width: 32,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#C6A75E',
  },
});
