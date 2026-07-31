import React, { useEffect, useRef, type ComponentProps } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, RADII, SPACING } from '@/constants/designSystem';
import { useTheme } from '@/hooks/useTheme';
import { useUIStore } from '@/stores/uiStore';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Toast = ReturnType<typeof useUIStore.getState>['toasts'][number];

const toastIcons: Record<'success' | 'error' | 'warning' | 'info', IconName> = {
  success: 'checkmark-circle-outline',
  error: 'alert-circle-outline',
  warning: 'warning-outline',
  info: 'information-circle-outline',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { theme } = useTheme();
  const entryProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(entryProgress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [entryProgress]);

  const accentColor = toast.type === 'success'
    ? theme.success
    : toast.type === 'error'
      ? theme.error
      : toast.type === 'warning'
        ? theme.warning
        : theme.primary;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity: entryProgress,
          transform: [{
            translateY: entryProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [SPACING.xxl, 0],
            }),
          }],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${toast.title}${toast.message ? `. ${toast.message}` : ''}`}
        accessibilityLiveRegion="polite"
        onPress={onDismiss}
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
        <Ionicons name={toastIcons[toast.type]} size={24} color={accentColor} />
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
    </Animated.View>
  );
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const toasts = useUIStore((state) => state.toasts);
  const hideToast = useUIStore((state) => state.hideToast);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingBottom: insets.bottom }]}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => hideToast(toast.id)}
        />
      ))}
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
    gap: SPACING.sm,
  },
  toastContainer: {
    width: '100%',
    maxWidth: 420,
  },
  toast: {
    width: '100%',
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
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
    fontSize: 16,
    lineHeight: 22,
  },
  message: {
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 21,
  },
});
