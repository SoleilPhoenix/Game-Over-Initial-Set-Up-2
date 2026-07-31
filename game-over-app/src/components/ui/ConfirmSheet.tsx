import React from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, RADII, SPACING } from '@/constants/designSystem';
import { useTheme } from '@/hooks/useTheme';
import { useUIStore } from '@/stores/uiStore';

export function ConfirmSheet() {
  const insets = useSafeAreaInsets();
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
    <View style={styles.host}>
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
            { backgroundColor: theme.shadowColor, opacity: 0.62 },
          ]}
        />
      </Pressable>

      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            backgroundColor: theme.surfaceCard,
            borderColor: theme.ghostBorder,
            paddingBottom: Math.max(insets.bottom, SPACING.lg) + SPACING.lg,
            shadowColor: theme.shadowColor,
            shadowOpacity: theme.shadowOpacity,
            shadowRadius: theme.shadowRadius,
          },
        ]}
      >
        <View style={[styles.dragHandle, { backgroundColor: theme.textTertiary }]} />
        <Text style={[styles.title, { color: theme.textPrimary }]}>{request.title}</Text>
        <Text style={[styles.message, { color: theme.textSecondary }]}>{request.message}</Text>

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
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    shadowOffset: { width: 0, height: -12 },
    elevation: 12,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    lineHeight: 28,
  },
  message: {
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: SPACING.sm,
  },
  actions: {
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  primaryButton: {
    minHeight: 54,
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
    minHeight: 52,
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
