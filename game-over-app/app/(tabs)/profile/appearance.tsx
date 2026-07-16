/**
 * Appearance Selection Screen
 * Midnight Navy is the only active option; Ivory Paper is planned but not wired up yet.
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
import { useTranslation } from '@/i18n';

interface Option {
  code: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  comingSoon?: boolean;
}

export default function AppearanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode, setMode } = useTheme();
  const { t } = useTranslation();

  // Ivory Paper is not wired up yet and System mode was removed — anyone previously on
  // those falls back to dark so the selection UI stays consistent.
  React.useEffect(() => {
    if (mode !== 'dark') setMode('dark');
  }, [mode, setMode]);

  const OPTIONS: Option[] = [
    {
      code: 'dark',
      label: t.appearance.darkLabel,
      icon: 'moon',
    },
    {
      code: 'light',
      label: t.appearance.lightLabel,
      icon: 'sunny',
      comingSoon: true,
    },
  ];

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
          {t.appearance.headerTitle}
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
            {t.appearance.description}
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
              const isSelected = mode === opt.code && !opt.comingSoon;
              const isDisabled = opt.comingSoon === true;
              return (
                <React.Fragment key={opt.code}>
                  {index > 0 && (
                    <View style={[styles.separator, { backgroundColor: theme.ghostBorder }]} />
                  )}
                  <Pressable
                    style={[styles.item, isDisabled && styles.itemDisabled]}
                    onPress={() => { if (!isDisabled) setMode(opt.code); }}
                    disabled={isDisabled}
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
                      <Text
                        flex={1}
                        fontSize={15}
                        fontWeight={isSelected ? '700' : '500'}
                        color={isSelected ? theme.textGold : theme.textPrimary}
                      >
                        {opt.label}
                      </Text>
                    </XStack>
                    {isDisabled ? (
                      <View style={[styles.comingSoonBadge, { backgroundColor: theme.surfaceHigh, borderColor: theme.ghostBorder }]}>
                        <Text fontSize={10} fontWeight="700" color={theme.textTertiary} letterSpacing={0.5} style={{ textTransform: 'uppercase' }}>
                          {t.common.comingSoon}
                        </Text>
                      </View>
                    ) : isSelected ? (
                      <Ionicons name="checkmark-circle" size={24} color={theme.accentGold} />
                    ) : null}
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
  itemDisabled: {
    opacity: 0.55,
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
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
