/**
 * Language Selection Screen
 * Dedicated page for choosing app language
 */

import React from 'react';
import { Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguageStore, type Language } from '@/stores/languageStore';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';

const LANGUAGES: { code: Language; label: string; nativeLabel: string; flag: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', nativeLabel: 'German', flag: '🇩🇪' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const handleSelect = (code: Language) => {
    setLanguage(code);
  };

  return (
    <View flex={1} backgroundColor={DARK_THEME.background}>
      {/* Header */}
      <XStack
        paddingTop={insets.top}
        paddingHorizontal="$4"
        paddingBottom="$3"
        alignItems="center"
        justifyContent="space-between"
        backgroundColor={DARK_THEME.surface}
        borderBottomWidth={1}
        borderBottomColor={DARK_THEME.border}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          testID="language-back"
        >
          <Ionicons name="chevron-back" size={24} color={DARK_THEME.textPrimary} />
        </Pressable>
        <Text fontSize={17} fontWeight="600" color={DARK_THEME.textPrimary}>
          {t.profile.languageTitle}
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
          {/* Subtitle */}
          <Text
            fontSize={14}
            color={DARK_THEME.textSecondary}
            marginLeft="$1"
          >
            {t.profile.languageSubtitle}
          </Text>

          {/* Language Options */}
          <View style={styles.card}>
            {LANGUAGES.map((lang, index) => {
              const isSelected = language === lang.code;
              return (
                <React.Fragment key={lang.code}>
                  {index > 0 && <View style={styles.separator} />}
                  <Pressable
                    style={styles.languageItem}
                    onPress={() => handleSelect(lang.code)}
                    testID={`language-${lang.code}`}
                  >
                    <XStack alignItems="center" gap="$3" flex={1}>
                      <Text fontSize={24}>{lang.flag}</Text>
                      <YStack>
                        <Text
                          fontSize={15}
                          fontWeight={isSelected ? '700' : '500'}
                          color={isSelected ? DARK_THEME.primary : DARK_THEME.textPrimary}
                        >
                          {lang.label}
                        </Text>
                        <Text fontSize={12} color={DARK_THEME.textTertiary}>
                          {lang.nativeLabel}
                        </Text>
                      </YStack>
                    </XStack>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={DARK_THEME.primary} />
                    )}
                  </Pressable>
                </React.Fragment>
              );
            })}
          </View>

          {/* More languages coming soon */}
          <XStack
            padding="$3"
            backgroundColor={DARK_THEME.surface}
            borderRadius={12}
            borderWidth={1}
            borderColor={DARK_THEME.border}
            gap="$2"
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name="globe-outline" size={16} color={DARK_THEME.textTertiary} />
            <Text fontSize={13} color={DARK_THEME.textTertiary}>
              {t.profile.moreLangSoon}
            </Text>
          </XStack>
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
    backgroundColor: DARK_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    overflow: 'hidden',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  separator: {
    height: 1,
    backgroundColor: DARK_THEME.border,
    marginLeft: 60,
  },
});
