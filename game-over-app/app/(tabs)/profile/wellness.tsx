/**
 * Relationship Health Center
 * Interactive wellness hub: toast builder, couple trivia, group pledge, friendship insights
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';

// ─── Section header ────────────────────────────────────────────

function SectionLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <YStack marginBottom="$3" marginLeft="$1">
      <Text fontSize={11} fontWeight="600" color={DARK_THEME.textSecondary} textTransform="uppercase" letterSpacing={1}>
        {title}
      </Text>
      {subtitle && (
        <Text fontSize={12} color={DARK_THEME.textTertiary} marginTop={2}>
          {subtitle}
        </Text>
      )}
    </YStack>
  );
}

// ─── Toast Builder ─────────────────────────────────────────────

function ToastBuilder() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  const prompts = [
    t.wellness.toastPrompt1,
    t.wellness.toastPrompt2,
    t.wellness.toastPrompt3,
    t.wellness.toastPrompt4,
    t.wellness.toastPrompt5,
  ];

  const total = prompts.length;

  return (
    <View style={styles.card}>
      {/* Prompt card */}
      <View style={styles.toastCard}>
        <View style={styles.toastIconRow}>
          <View style={styles.toastIconBg}>
            <Ionicons name="wine" size={20} color="#FB923C" />
          </View>
          <Text fontSize={11} color={DARK_THEME.textTertiary}>
            {index + 1} {t.wellness.toastOf} {total}
          </Text>
        </View>
        <Text fontSize={16} color={DARK_THEME.textPrimary} fontWeight="500" lineHeight={24} marginTop="$3">
          {prompts[index]}
        </Text>
      </View>

      {/* Progress dots */}
      <XStack justifyContent="center" gap="$2" marginTop="$4">
        {prompts.map((_, i) => (
          <View
            key={i}
            width={i === index ? 20 : 6}
            height={6}
            borderRadius={3}
            backgroundColor={i === index ? '#FB923C' : DARK_THEME.border}
          />
        ))}
      </XStack>

      {/* Navigation */}
      <XStack justifyContent="space-between" marginTop="$4" gap="$3">
        <Pressable
          style={[styles.toastNavBtn, index === 0 && styles.toastNavBtnDisabled]}
          onPress={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <Ionicons name="chevron-back" size={16} color={index === 0 ? DARK_THEME.textTertiary : DARK_THEME.textPrimary} />
          <Text fontSize={13} color={index === 0 ? DARK_THEME.textTertiary : DARK_THEME.textPrimary}>
            {t.wellness.toastPrev}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toastNavBtn, styles.toastNavBtnNext, index === total - 1 && styles.toastNavBtnDisabled]}
          onPress={() => setIndex(i => Math.min(total - 1, i + 1))}
          disabled={index === total - 1}
        >
          <Text fontSize={13} color={index === total - 1 ? DARK_THEME.textTertiary : '#FB923C'} fontWeight="600">
            {t.wellness.toastNext}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={index === total - 1 ? DARK_THEME.textTertiary : '#FB923C'} />
        </Pressable>
      </XStack>
    </View>
  );
}

// ─── Know Your Couple ──────────────────────────────────────────

interface CoupleCardProps {
  question: string;
  answer: string;
}

function CoupleCard({ question, answer }: CoupleCardProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);

  return (
    <Pressable onPress={() => setRevealed(r => !r)} style={styles.coupleCard}>
      <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
        <YStack flex={1}>
          <Text fontSize={14} fontWeight="600" color={DARK_THEME.textPrimary} lineHeight={20}>
            {question}
          </Text>
          {revealed && (
            <Text fontSize={13} color={DARK_THEME.textSecondary} lineHeight={19} marginTop={8}>
              {answer}
            </Text>
          )}
        </YStack>
        <View style={[styles.revealBadge, revealed && styles.revealBadgeActive]}>
          <Ionicons
            name={revealed ? 'eye-off' : 'eye'}
            size={14}
            color={revealed ? '#A78BFA' : DARK_THEME.textTertiary}
          />
        </View>
      </XStack>
      {!revealed && (
        <Text fontSize={11} color={DARK_THEME.textTertiary} marginTop={6}>
          {t.wellness.tapToReveal}
        </Text>
      )}
    </Pressable>
  );
}

function KnowYourCouple() {
  const { t } = useTranslation();

  const cards = [
    { question: t.wellness.coupleQ1, answer: t.wellness.coupleA1 },
    { question: t.wellness.coupleQ2, answer: t.wellness.coupleA2 },
    { question: t.wellness.coupleQ3, answer: t.wellness.coupleA3 },
    { question: t.wellness.coupleQ4, answer: t.wellness.coupleA4 },
    { question: t.wellness.coupleQ5, answer: t.wellness.coupleA5 },
    { question: t.wellness.coupleQ6, answer: t.wellness.coupleA6 },
  ];

  return (
    <View style={styles.card}>
      {cards.map((card, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.separator} />}
          <CoupleCard question={card.question} answer={card.answer} />
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Group Pledge ──────────────────────────────────────────────

function GroupPledge() {
  const { t } = useTranslation();
  const [checked, setChecked] = useState<boolean[]>([false, false, false, false, false]);

  const pledges = [
    t.wellness.pledge1,
    t.wellness.pledge2,
    t.wellness.pledge3,
    t.wellness.pledge4,
    t.wellness.pledge5,
  ];

  const toggle = (i: number) =>
    setChecked(prev => prev.map((v, idx) => (idx === i ? !v : v)));

  const allChecked = checked.every(Boolean);

  return (
    <View style={styles.card}>
      {pledges.map((pledge, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.separator} />}
          <Pressable style={styles.pledgeRow} onPress={() => toggle(i)}>
            <View style={[styles.checkbox, checked[i] && styles.checkboxChecked]}>
              {checked[i] && <Ionicons name="checkmark" size={12} color="white" />}
            </View>
            <Text
              flex={1}
              fontSize={13}
              color={checked[i] ? DARK_THEME.textPrimary : DARK_THEME.textSecondary}
              lineHeight={19}
              fontWeight={checked[i] ? '500' : '400'}
            >
              {pledge}
            </Text>
          </Pressable>
        </React.Fragment>
      ))}

      {allChecked && (
        <XStack
          marginTop="$3"
          padding="$3"
          backgroundColor="rgba(52, 211, 153, 0.12)"
          borderRadius={10}
          gap="$2"
          alignItems="center"
        >
          <Ionicons name="heart" size={16} color="#34D399" />
          <Text fontSize={12} color="#34D399" fontWeight="600">
            This group is ready. Have an incredible time! 🎉
          </Text>
        </XStack>
      )}
    </View>
  );
}

// ─── Friendship Insights ───────────────────────────────────────

const INSIGHT_CONFIGS = [
  { icon: 'sunny', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' },
  { icon: 'chatbubble-ellipses', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' },
  { icon: 'leaf', color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)' },
  { icon: 'heart', color: '#F472B6', bg: 'rgba(244, 114, 182, 0.15)' },
];

function FriendshipInsights() {
  const { t } = useTranslation();

  const insights = [
    { title: t.wellness.insight1Title, body: t.wellness.insight1Body },
    { title: t.wellness.insight2Title, body: t.wellness.insight2Body },
    { title: t.wellness.insight3Title, body: t.wellness.insight3Body },
    { title: t.wellness.insight4Title, body: t.wellness.insight4Body },
  ];

  return (
    <YStack gap="$3">
      {insights.map((insight, i) => {
        const cfg = INSIGHT_CONFIGS[i];
        return (
          <View key={i} style={[styles.insightCard, { borderLeftColor: cfg.color }]}>
            <XStack gap="$3" alignItems="flex-start">
              <View
                width={36}
                height={36}
                borderRadius={18}
                backgroundColor={cfg.bg}
                alignItems="center"
                justifyContent="center"
              >
                <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
              </View>
              <YStack flex={1}>
                <Text fontSize={14} fontWeight="700" color={DARK_THEME.textPrimary} marginBottom={4}>
                  {insight.title}
                </Text>
                <Text fontSize={13} color={DARK_THEME.textSecondary} lineHeight={19}>
                  {insight.body}
                </Text>
              </YStack>
            </XStack>
          </View>
        );
      })}
    </YStack>
  );
}

// ─── Main Screen ───────────────────────────────────────────────

export default function WellnessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

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
        <Pressable onPress={() => router.back()} style={styles.headerButton} testID="wellness-back">
          <Ionicons name="chevron-back" size={24} color={DARK_THEME.textPrimary} />
        </Pressable>
        <Text fontSize={17} fontWeight="600" color={DARK_THEME.textPrimary}>
          {t.wellness.title}
        </Text>
        <View width={40} />
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero banner */}
        <View style={styles.heroBanner} marginHorizontal="$4" marginBottom="$6">
          <XStack gap="$3" alignItems="center">
            <View style={styles.heroIconBg}>
              <Ionicons name="heart" size={28} color="#F472B6" />
            </View>
            <YStack flex={1}>
              <Text fontSize={16} fontWeight="700" color={DARK_THEME.textPrimary}>
                {t.wellness.title}
              </Text>
              <Text fontSize={13} color={DARK_THEME.textSecondary} marginTop={2}>
                {t.wellness.subtitle}
              </Text>
            </YStack>
          </XStack>
        </View>

        <YStack paddingHorizontal="$4" gap="$6">
          {/* Toast Builder */}
          <YStack>
            <SectionLabel title={t.wellness.toastSection} subtitle={t.wellness.toastSectionSubtitle} />
            <ToastBuilder />
          </YStack>

          {/* Know Your Couple */}
          <YStack>
            <SectionLabel title={t.wellness.coupleSection} subtitle={t.wellness.coupleSectionSubtitle} />
            <KnowYourCouple />
          </YStack>

          {/* Group Pledge */}
          <YStack>
            <SectionLabel title={t.wellness.pledgeSection} subtitle={t.wellness.pledgeSectionSubtitle} />
            <GroupPledge />
          </YStack>

          {/* Friendship Insights */}
          <YStack>
            <SectionLabel title={t.wellness.insightsSection} />
            <FriendshipInsights />
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
  heroBanner: {
    backgroundColor: 'rgba(244, 114, 182, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.25)',
    padding: 16,
  },
  heroIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(244, 114, 182, 0.2)',
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
  separator: {
    height: 1,
    backgroundColor: DARK_THEME.border,
    marginLeft: 16,
  },
  // Toast Builder
  toastCard: {
    padding: 16,
    paddingBottom: 0,
  },
  toastIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toastIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(251, 146, 60, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: DARK_THEME.background,
    margin: 12,
    marginTop: 0,
  },
  toastNavBtnNext: {
    backgroundColor: 'rgba(251, 146, 60, 0.12)',
  },
  toastNavBtnDisabled: {
    opacity: 0.4,
  },
  // Couple cards
  coupleCard: {
    padding: 16,
  },
  revealBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DARK_THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  revealBadgeActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
  },
  // Pledge
  pledgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: DARK_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#34D399',
    borderColor: '#34D399',
  },
  // Insights
  insightCard: {
    backgroundColor: DARK_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    borderLeftWidth: 3,
    padding: 16,
  },
});
