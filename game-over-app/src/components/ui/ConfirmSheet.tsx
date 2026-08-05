import React from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FONTS, RADII, SPACING } from '@/constants/designSystem';
import { useTheme } from '@/hooks/useTheme';
import { useUIStore } from '@/stores/uiStore';
import {
  FLOATING_FEEDBACK_MAX_WIDTH,
  useFloatingFeedbackBottomSpacing,
} from '@/components/ui/floatingFeedbackLayout';

export function ConfirmSheet() {
  const bottomSpacing = useFloatingFeedbackBottomSpacing();
  const { theme } = useTheme();
  const request = useUIStore((state) => state.activeConfirm);
  const resolveConfirm = useUIStore((state) => state.resolveConfirm);

  React.useEffect(() => {
    if (!request) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      resolveConfirm(null);
      return true;
    });
    return () => subscription.remove();
  }, [request, resolveConfirm]);

  if (!request) return null;

  return (
    <View style={[styles.host, { paddingBottom: bottomSpacing }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={request.cancelLabel}
        onPress={() => resolveConfirm(null)}
        style={StyleSheet.absoluteFill}
      >
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.shadowColor, opacity: 0.24 },
          ]}
        />
      </Pressable>

      <View
        accessibilityViewIsModal
        style={[
          styles.card,
          {
            backgroundColor: theme.surfaceBright,
            borderColor: theme.ghostBorder,
            shadowColor: theme.shadowColor,
            shadowOpacity: theme.shadowOpacity,
            shadowRadius: theme.shadowRadius,
          },
        ]}
      >
        <View style={styles.content}>
          <Ionicons
            name={request.options.some((option) => option.destructive)
              ? 'alert-circle-outline'
              : 'help-circle-outline'}
            size={24}
            color={request.options.some((option) => option.destructive)
              ? theme.error
              : theme.primary}
          />
          <View style={styles.copy}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{request.title}</Text>
            <Text style={[styles.message, { color: theme.textSecondary }]}>{request.message}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          {request.options.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              onPress={() => resolveConfirm(option.value)}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: option.destructive ? theme.error : theme.primary },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.primaryButtonText, { color: theme.textOnPrimary }]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => resolveConfirm(null)}
            style={({ pressed }) => [
              styles.cancelButton,
              { borderColor: theme.ghostBorder },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.cancelButtonText, { color: theme.textPrimary }]}>
              {request.cancelLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: FLOATING_FEEDBACK_MAX_WIDTH,
    borderRadius: RADII.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  copy: {
    flex: 1,
    gap: SPACING.xs,
  },
  title: {
    fontFamily: FONTS.labelBold,
    fontSize: 16,
    lineHeight: 22,
  },
  message: {
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 21,
  },
  actions: {
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  primaryButtonText: {
    fontFamily: FONTS.labelBold,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  cancelButton: {
    minHeight: 44,
    borderRadius: RADII.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  cancelButtonText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.78,
  },
});
