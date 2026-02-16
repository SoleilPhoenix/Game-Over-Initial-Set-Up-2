/**
 * Support & FAQ Screen
 * Common questions and contact support
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';

// Crisp Chat — native module, not available in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let showCrispChat: (() => void) | undefined;
if (!isExpoGo) {
  try {
    showCrispChat = require('react-native-crisp-chat-sdk').show;
  } catch {
    // Crisp SDK not available
  }
}

interface FAQItem {
  question: string;
  answer: string;
  icon: string;
  iconColor: string;
}

const FAQ_ICONS: { icon: string; iconColor: string }[] = [
  { icon: 'information-circle', iconColor: '#60A5FA' },
  { icon: 'add-circle', iconColor: '#34D399' },
  { icon: 'gift', iconColor: '#A78BFA' },
  { icon: 'card', iconColor: '#FB923C' },
  { icon: 'close-circle', iconColor: '#F87171' },
  { icon: 'people', iconColor: '#60A5FA' },
  { icon: 'location', iconColor: '#34D399' },
  { icon: 'lock-closed', iconColor: '#47B881' },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={styles.faqItem}
    >
      <XStack alignItems="center" justifyContent="space-between">
        <XStack flex={1} alignItems="center" gap={12}>
          <View
            width={32}
            height={32}
            borderRadius={16}
            backgroundColor={`${item.iconColor}20`}
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name={item.icon as any} size={16} color={item.iconColor} />
          </View>
          <Text
            fontSize={14}
            fontWeight="600"
            color={DARK_THEME.textPrimary}
            flex={1}
          >
            {item.question}
          </Text>
        </XStack>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={DARK_THEME.textSecondary}
        />
      </XStack>
      {expanded && (
        <Text
          fontSize={13}
          color={DARK_THEME.textSecondary}
          lineHeight={20}
          marginTop={12}
          marginLeft={44}
        >
          {item.answer}
        </Text>
      )}
    </Pressable>
  );
}

type LegalRoute = '/profile/terms' | '/profile/privacy' | '/profile/impressum';

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const FAQ_ITEMS: FAQItem[] = FAQ_ICONS.map((cfg, i) => ({
    ...cfg,
    question: t.support[`faq${i + 1}Q` as keyof typeof t.support],
    answer: t.support[`faq${i + 1}A` as keyof typeof t.support],
  }));

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@game-over.app?subject=Support%20Request');
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
          testID="support-back"
        >
          <Ionicons name="chevron-back" size={24} color={DARK_THEME.textPrimary} />
        </Pressable>
        <Text fontSize={17} fontWeight="600" color={DARK_THEME.textPrimary}>
          {t.support.title}
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
          {/* Contact Support */}
          <YStack gap="$3">
            <Text
              fontSize={11}
              fontWeight="600"
              color={DARK_THEME.textSecondary}
              textTransform="uppercase"
              letterSpacing={1}
              marginLeft="$1"
            >
              {t.support.contactUs}
            </Text>
            <Pressable
              style={styles.contactCard}
              onPress={handleEmailSupport}
              testID="email-support-button"
            >
              <XStack alignItems="center" gap="$3">
                <View
                  width={44}
                  height={44}
                  borderRadius={22}
                  backgroundColor="rgba(96, 165, 250, 0.2)"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="mail" size={22} color="#60A5FA" />
                </View>
                <YStack flex={1}>
                  <Text fontSize={15} fontWeight="600" color={DARK_THEME.textPrimary}>
                    {t.support.emailSupport}
                  </Text>
                  <Text fontSize={12} color={DARK_THEME.textSecondary}>
                    support@game-over.app
                  </Text>
                </YStack>
                <Ionicons name="open-outline" size={18} color={DARK_THEME.textSecondary} />
              </XStack>
            </Pressable>

            {/* Live Chat — hidden in Expo Go (native module) */}
            {showCrispChat && <Pressable
              style={styles.contactCard}
              onPress={() => showCrispChat?.()}
              testID="live-chat-button"
            >
              <XStack alignItems="center" gap="$3">
                <View
                  width={44}
                  height={44}
                  borderRadius={22}
                  backgroundColor="rgba(52, 211, 153, 0.2)"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Ionicons name="chatbubbles" size={22} color="#34D399" />
                </View>
                <YStack flex={1}>
                  <Text fontSize={15} fontWeight="600" color={DARK_THEME.textPrimary}>
                    {t.support.liveChat}
                  </Text>
                  <Text fontSize={12} color={DARK_THEME.textSecondary}>
                    {t.support.liveChatSubtitle}
                  </Text>
                </YStack>
                <Ionicons name="chevron-forward" size={18} color={DARK_THEME.textSecondary} />
              </XStack>
            </Pressable>}

            {/* Response time info */}
            <XStack
              padding="$3"
              backgroundColor="rgba(52, 211, 153, 0.1)"
              borderRadius={12}
              gap="$2"
              alignItems="center"
            >
              <Ionicons name="time-outline" size={16} color="#34D399" />
              <Text fontSize={12} color={DARK_THEME.textSecondary} flex={1}>
                {t.support.responseTime}
              </Text>
            </XStack>
          </YStack>

          {/* FAQ Section */}
          <YStack gap="$3">
            <Text
              fontSize={11}
              fontWeight="600"
              color={DARK_THEME.textSecondary}
              textTransform="uppercase"
              letterSpacing={1}
              marginLeft="$1"
            >
              {t.support.faqTitle}
            </Text>
            <View style={styles.faqCard}>
              {FAQ_ITEMS.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <View style={styles.faqSeparator} />}
                  <FAQAccordion item={item} />
                </React.Fragment>
              ))}
            </View>
          </YStack>

          {/* App Info */}
          <YStack gap="$3">
            <Text
              fontSize={11}
              fontWeight="600"
              color={DARK_THEME.textSecondary}
              textTransform="uppercase"
              letterSpacing={1}
              marginLeft="$1"
            >
              {t.support.legal}
            </Text>
            <View style={styles.legalCard}>
              <Pressable style={styles.legalItem} onPress={() => router.push('/profile/terms' as LegalRoute)} testID="legal-terms">
                <XStack alignItems="center" justifyContent="space-between">
                  <Text fontSize={14} color={DARK_THEME.textPrimary}>{t.support.termsOfService}</Text>
                  <Ionicons name="chevron-forward" size={18} color={DARK_THEME.textSecondary} />
                </XStack>
              </Pressable>
              <View style={styles.faqSeparator} />
              <Pressable style={styles.legalItem} onPress={() => router.push('/profile/privacy' as LegalRoute)} testID="legal-privacy">
                <XStack alignItems="center" justifyContent="space-between">
                  <Text fontSize={14} color={DARK_THEME.textPrimary}>{t.support.privacyPolicy}</Text>
                  <Ionicons name="chevron-forward" size={18} color={DARK_THEME.textSecondary} />
                </XStack>
              </Pressable>
              <View style={styles.faqSeparator} />
              <Pressable style={styles.legalItem} onPress={() => router.push('/profile/impressum' as LegalRoute)} testID="legal-impressum">
                <XStack alignItems="center" justifyContent="space-between">
                  <Text fontSize={14} color={DARK_THEME.textPrimary}>{t.support.impressum}</Text>
                  <Ionicons name="chevron-forward" size={18} color={DARK_THEME.textSecondary} />
                </XStack>
              </Pressable>
            </View>
          </YStack>
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
  contactCard: {
    backgroundColor: DARK_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    padding: 16,
  },
  faqCard: {
    backgroundColor: DARK_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    overflow: 'hidden',
  },
  faqItem: {
    padding: 16,
  },
  faqSeparator: {
    height: 1,
    backgroundColor: DARK_THEME.border,
    marginLeft: 16,
  },
  legalCard: {
    backgroundColor: DARK_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    overflow: 'hidden',
  },
  legalItem: {
    padding: 16,
  },
});
