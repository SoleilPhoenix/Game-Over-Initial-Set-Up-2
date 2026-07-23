import React, { type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, RADII, SPACING } from '@/constants/designSystem';
import { useTheme } from '@/hooks/useTheme';
import { useUIStore } from '@/stores/uiStore';

type IconName = ComponentProps<typeof Ionicons>['name'];

const toastIcons: Record<'success' | 'error' | 'warning' | 'info', IconName> = {
  success: 'checkmark-circle-outline',
  error: 'alert-circle-outline',
  warning: 'warning-outline',
  info: 'information-circle-outline',
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const toasts = useUIStore((state) => state.toasts);
  const hideToast = useUIStore((state) => state.hideToast);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingTop: insets.top + SPACING.xl }]}
    >
      {toasts.map((toast) => {
        const accentColor = toast.type === 'success'
          ? theme.success
          : toast.type === 'error'
            ? theme.error
            : toast.type === 'warning'
              ? theme.warning
              : theme.primary;

        return (
          <Pressable
            key={toast.id}
            accessibilityRole="button"
            accessibilityLabel={`${toast.title}${toast.message ? `. ${toast.message}` : ''}`}
            accessibilityLiveRegion="polite"
            onPress={() => hideToast(toast.id)}
            style={[
              styles.toast,
              {
                backgroundColor: theme.surfaceBright,
                borderColor: theme.ghostBorder,
                shadowColor: theme.shadowColor,
                shadowOpacity: theme.shadowOpacity,
                shadowRadius: theme.shadowRadius,
              },
            ]}
          >
            <Ionicons name={toastIcons[toast.type]} size={20} color={accentColor} />
            <View style={styles.copy}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                {toast.title}
              </Text>
              {toast.message ? (
                <Text style={[styles.message, { color: theme.textSecondary }]}>
                  {toast.message}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  toast: {
    width: '100%',
    maxWidth: 420,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADII.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  copy: {
    flex: 1,
    gap: SPACING.xs,
  },
  title: {
    fontFamily: FONTS.labelBold,
    fontSize: 14,
    lineHeight: 19,
  },
  message: {
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
