/**
 * Appearance Selection Screen
 * Dark / Light / System — mirrors the language.tsx pattern.
 * Uses themeStore for persistence and useTheme for live re-render.
 */

import React from 'react';
import { Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeMode } from '@/constants/designSystem';

interface Option {
  code: ThemeMode;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: Option[] = [
  {
    code: 'dark',
    label: 'Midnight Navy',
    description: 'Editorial dark — default, matches mockups',
    icon: 'moon',
  },
  {
    code: 'light',
    label: 'Ivory Paper',
    description: 'Warm off-white — editorial light variant',
    icon: 'sunny',
  },
  {
    code: 'system',
    label: 'System',
    description: 'Follow device appearance setting',
    icon: 'phone-portrait',
  },
];

export default function AppearanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode, setMode } = useTheme();

  return (
    <View flex={1} backgroundColor={theme.background}>
      <XStack
        paddingTop={insets.top}
        paddingHorizontal="$4"
        paddingBottom="$3"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor={theme.surfaceLow}
        borderBottomWidth={StyleSheet.hairlineWidth}
        borderBottomColor={theme.ghostBorder}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          testID="appearance-back"
        >
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <Text fontSize={17} fontWeight="600" color={theme.textPrimary}>
          Appearance
        </Text>
        <View width={40} />
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          paddingTop: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack paddingHorizontal="$4" gap="$6">
          <Text fontSize={14} color={theme.textSecondary} marginLeft="$1">
            Choose how Game Over looks. Your preference is saved across sessions.
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surfaceCard,
                borderColor: theme.ghostBorder,
              },
            ]}
          >
            {OPTIONS.map((opt, index) => {
              const isSelected = mode === opt.code;
              return (
                <React.Fragment key={opt.code}>
                  {index > 0 && (
                    <View style={[styles.separator, { backgroundColor: theme.ghostBorder }]} />
                  )}
                  <Pressable
                    style={styles.item}
                    onPress={() => setMode(opt.code)}
                    testID={`appearance-${opt.code}`}
                  >
                    <XStack alignItems="center" gap="$3" flex={1}>
                      <View
                        style={[
                          styles.iconSlot,
                          {
                            borderColor: isSelected ? theme.accentGold : theme.ghostBorder,
                            backgroundColor: isSelected ? theme.surfaceHigh : 'transparent',
                          },
                        ]}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={18}
                          color={isSelected ? theme.accentGold : theme.textSecondary}
                        />
                      </View>
                      <YStack flex={1}>
                        <Text
                          fontSize={15}
                          fontWeight={isSelected ? '700' : '500'}
                          color={isSelected ? theme.textGold : theme.textPrimary}
                        >
                          {opt.label}
                        </Text>
                        <Text fontSize={12} color={theme.textTertiary}>
                          {opt.description}
                        </Text>
                      </YStack>
                    </XStack>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.accentGold} />
                    )}
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>
        </YStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  iconSlot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
});
