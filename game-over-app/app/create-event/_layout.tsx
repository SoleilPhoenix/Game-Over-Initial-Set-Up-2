/**
 * Create Event Wizard Layout — Editorial redesign
 * Clean step indicator + serif heading. No app chrome (no hamburger, no avatar).
 * Tab bar is hidden because the wizard uses fullScreenModal presentation.
 */

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Stack, useRouter, usePathname } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useWizardStore,
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

  const { deleteDraft, activeDraftId, saveDraft, partyType, goToStep } =
    useWizardStore();

  const [menuVisible, setMenuVisible] = useState(false);
  const [backConfirmVisible, setBackConfirmVisible] = useState(false);

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
        setBackConfirmVisible(true);
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
              {t.wizard.stepOf
                .replace('{{current}}', String(currentStep))
                .replace('{{total}}', String(STEPS.length))
                .toUpperCase()}
            </Text>
            <Text style={styles.heading}>{currentStepLabel}</Text>
          </View>

          {/* Right: three-dots menu */}
          <Pressable
            onPress={() => setMenuVisible(true)}
            hitSlop={12}
            style={styles.headerSide}
            testID="wizard-menu-button"
          >
            <Text style={styles.menuDots}>⋯</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Screen content ──────────────────────────── */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#0D1B2A' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="participants" />
        <Stack.Screen name="packages" options={{ gestureEnabled: false }} />
      </Stack>

      {/* ── Draft Options modal ─────────────────────── */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable onPress={() => {}} style={styles.menuCard}>
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
            {/* Gold title */}
            <Text style={styles.menuTitle}>{getTranslation().wizard.draftOptions ?? 'Draft Options'}</Text>
            <View style={styles.menuDivider} />

            {/* Save Draft */}
            <Pressable
              style={({ pressed }) => [styles.menuAction, pressed && { opacity: 0.7 }]}
              onPress={() => {
                setMenuVisible(false);
                const store = useWizardStore.getState();
                store.saveDraft();
                goToEventsTab();
              }}
            >
              <Ionicons name="bookmark-outline" size={18} color="#C6A75E" style={styles.menuActionIcon} />
              <Text style={styles.menuActionText}>{getTranslation().wizard.saveExit ?? 'Save Draft'}</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            {/* Delete Draft */}
            <Pressable
              style={({ pressed }) => [styles.menuAction, pressed && { opacity: 0.7 }]}
              onPress={() => {
                setMenuVisible(false);
                if (activeDraftId) useWizardStore.getState().deleteDraft(activeDraftId);
                goToEventsTab();
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#E8836B" style={styles.menuActionIcon} />
              <Text style={[styles.menuActionText, { color: '#E8836B' }]}>{getTranslation().wizard.discard ?? 'Delete Draft'}</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            {/* Continue */}
            <Pressable
              style={({ pressed }) => [styles.menuAction, pressed && { opacity: 0.7 }]}
              onPress={() => setMenuVisible(false)}
            >
              <Ionicons name="arrow-forward-outline" size={18} color="rgba(255,255,255,0.55)" style={styles.menuActionIcon} />
              <Text style={[styles.menuActionText, { color: 'rgba(255,255,255,0.55)' }]}>{getTranslation().wizard.cancel ?? 'Continue'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Back / Leave confirmation modal ─────────── */}
      <Modal visible={backConfirmVisible} transparent animationType="fade" onRequestClose={() => setBackConfirmVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setBackConfirmVisible(false)}>
          <Pressable onPress={() => {}} style={styles.menuCard}>
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
            <Text style={styles.menuTitle}>{getTranslation().wizard.saveDraftTitle ?? 'Leave Wizard?'}</Text>
            <View style={styles.menuDivider} />

            {/* Save & Exit */}
            <Pressable
              style={({ pressed }) => [styles.menuAction, pressed && { opacity: 0.7 }]}
              onPress={() => {
                setBackConfirmVisible(false);
                saveDraft();
                goToEventsTab();
              }}
            >
              <Ionicons name="bookmark-outline" size={18} color="#C6A75E" style={styles.menuActionIcon} />
              <Text style={styles.menuActionText}>{getTranslation().wizard.saveExit ?? 'Save Draft'}</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            {/* Discard */}
            <Pressable
              style={({ pressed }) => [styles.menuAction, pressed && { opacity: 0.7 }]}
              onPress={() => {
                setBackConfirmVisible(false);
                if (activeDraftId) deleteDraft(activeDraftId);
                goToEventsTab();
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#E8836B" style={styles.menuActionIcon} />
              <Text style={[styles.menuActionText, { color: '#E8836B' }]}>{getTranslation().wizard.discard ?? 'Discard Draft'}</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            {/* Stay */}
            <Pressable
              style={({ pressed }) => [styles.menuAction, pressed && { opacity: 0.7 }]}
              onPress={() => setBackConfirmVisible(false)}
            >
              <Ionicons name="arrow-back-outline" size={18} color="rgba(255,255,255,0.55)" style={styles.menuActionIcon} />
              <Text style={[styles.menuActionText, { color: 'rgba(255,255,255,0.55)' }]}>{getTranslation().wizard.cancel ?? 'Keep Editing'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  menuDots: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '400',
    letterSpacing: 2,
    lineHeight: 28,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  menuCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(198,167,94,0.35)',
  },
  menuTitle: {
    color: '#C6A75E',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(198,167,94,0.25)',
  },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuActionIcon: {
    marginRight: 12,
  },
  menuActionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#C6A75E',
    fontFamily: 'Inter_500Medium',
  },
});
