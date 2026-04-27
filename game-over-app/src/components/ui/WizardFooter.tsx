/**
 * WizardFooter Component
 * Consistent footer for wizard steps: square back button + gold-bordered primary action.
 */

import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface WizardFooterProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  showBack?: boolean;
  testIDPrefix?: string;
}

export function WizardFooter({
  onBack,
  onNext,
  nextLabel = 'Next Step',
  nextDisabled = false,
  nextLoading = false,
  secondaryLabel,
  onSecondary,
  showBack = true,
  testIDPrefix = 'wizard',
}: WizardFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}>
      {/* Back square */}
      {showBack && onBack && (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          testID={`${testIDPrefix}-back-button`}
        >
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </Pressable>
      )}

      {/* Optional secondary */}
      {secondaryLabel && onSecondary && (
        <Pressable
          onPress={onSecondary}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
          testID={`${testIDPrefix}-secondary-button`}
        >
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      )}

      {/* Primary — gold border + gold text */}
      <Pressable
        onPress={nextDisabled ? undefined : onNext}
        style={({ pressed }) => [
          styles.nextBtn,
          nextDisabled && styles.nextBtnDisabled,
          pressed && !nextDisabled && { opacity: 0.85 },
        ]}
        testID={`${testIDPrefix}-next-button`}
      >
        {nextLoading ? (
          <ActivityIndicator size="small" color="#C6A75E" />
        ) : (
          <Text style={[styles.nextText, nextDisabled && styles.nextTextDisabled]}>
            {nextLabel}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0D1B2A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(230,220,200,0.08)',
  },
  backBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(230,220,200,0.2)',
    backgroundColor: '#1A2F47',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(198,167,94,0.4)',
    backgroundColor: '#1A2F47',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#C6A75E',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  nextBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#C6A75E',
    backgroundColor: '#1A2F47',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.4,
    borderColor: 'rgba(198,167,94,0.3)',
  },
  nextText: {
    color: '#C6A75E',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
    fontFamily: 'Inter_600SemiBold',
  },
  nextTextDisabled: {
    color: 'rgba(198,167,94,0.6)',
  },
});

export default WizardFooter;
