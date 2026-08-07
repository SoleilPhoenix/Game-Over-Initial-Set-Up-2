/**
 * PastEventBanner — Consistent read-only banner shown across all screens
 * when an event has ended (Day 1+ after end_date).
 *
 * Two layout modes:
 *  - Default (inline): rendered in normal flow.
 *  - Floating: pinned as an absolute bottom footer overlay that sits above
 *    the scrolling content — the unified style used across Invitations,
 *    Chat (Voting), Budget (Package) and Package Details.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

interface PastEventBannerProps {
  message: string;
  testID?: string;
  /** When true, pins the banner as an absolute bottom footer overlay. */
  floating?: boolean;
  /** Safe-area bottom inset, used only in floating mode. */
  bottomInset?: number;
  /** Horizontal margin of the banner box (default 16). */
  marginHorizontal?: number;
  /** Bottom margin in inline mode (default 12). Ignored when floating. */
  marginBottom?: number;
}

// Greyer, more visible translucent veil — clearly stands out on the navy theme
// while still letting a hint of content show through underneath.
const BANNER_BG = 'rgba(118, 130, 150, 0.22)';
const BANNER_BORDER = 'rgba(255, 255, 255, 0.24)';

export function PastEventBanner({
  message,
  testID,
  floating = false,
  bottomInset = 0,
  marginHorizontal = 16,
  marginBottom = 12,
}: PastEventBannerProps) {
  const { theme } = useTheme();

  const banner = (
    <View
      style={[styles.banner, { backgroundColor: BANNER_BG, borderColor: BANNER_BORDER }]}
      testID={testID}
    >
      <Ionicons name="lock-closed-outline" size={16} color={theme.textPrimary} />
      <Text style={[styles.bannerText, { color: theme.textPrimary }]} numberOfLines={2}>
        {message}
      </Text>
    </View>
  );

  if (floating) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.floatingWrap, { paddingBottom: bottomInset + 12, paddingHorizontal: marginHorizontal }]}
      >
        {banner}
      </View>
    );
  }

  return <View style={{ marginHorizontal, marginBottom }}>{banner}</View>;
}

const styles = StyleSheet.create({
  floatingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});
