/**
 * NotificationItem Component
 * Displays a single notification with glassmorphic styling
 * Matches the dark theme design from UI specifications
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { Database } from '@/lib/supabase/types';
import { useTranslation, getCurrentLanguage } from '@/i18n';
import { isGuestDataChangedMeta, isGuestJoinedMeta, formatGuestChanges } from '@/utils/guestDataChange';
import { isRefundDueMeta } from '@/utils/refundDue';
import { useTheme } from '@/hooks/useTheme';
import { resolvePaymentReminderCopy } from './paymentReminderCopy';
import { resolvePaymentSuccessCopy } from './paymentSuccessCopy';
import type { NotificationEventSummary } from '@/repositories/notifications';

type Notification = Database['public']['Tables']['notifications']['Row'] & {
  event?: NotificationEventSummary | null;
};

interface BookingCancelledMeta {
  honoreeName: string;
  retainedDepositCents: number;
}

function isBookingCancelledMeta(value: unknown): value is BookingCancelledMeta {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const meta = value as Record<string, unknown>;
  return typeof meta.honoreeName === 'string'
    && typeof meta.retainedDepositCents === 'number'
    && Number.isFinite(meta.retainedDepositCents);
}

function getOpsAlertCheckKey(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const checkKey = (value as Record<string, unknown>).checkKey;
  return typeof checkKey === 'string' && checkKey.length > 0 ? checkKey : null;
}

// Maps a notification type to the i18n key used for its action-button label.
// Kept as a plain lookup so NOTIFICATION_CONFIG below can stay a static const.
const ACTION_LABEL_KEYS: Record<string, string> = {
  relationship_health: 'actionViewInsights',
  conflict_detected: 'actionResolveVoting',
  payment_reminder: 'actionPayNow',
  poll_created: 'actionVoteNow',
  poll_closing: 'actionVoteNow',
  poll_closed: 'actionViewResults',
  event_update: 'actionViewEvent',
  payment_claimed: 'actionConfirmPayment',
  guest_data_changed: 'actionViewParticipants',
  guest_profile_updated: 'actionViewParticipants',
  refund_due: 'actionViewBudget',
};

const ACTION_COLOR = '#F97316';
const ACTION_BG_COLOR = 'rgba(249, 115, 22, 0.2)';
const INFO_COLOR = '#22C55E';
const INFO_BG_COLOR = 'rgba(34, 197, 94, 0.2)';

// Orange means action/error; green means informational.
const NOTIFICATION_CONFIG: Record<
  string,
  {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
    glowColor?: string;
    hasAction?: boolean;
    actionLabel?: string;
    warningBorder?: boolean;
  }
> = {
  // Relationship/Health notifications
  relationship_health: {
    icon: 'heart',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
    glowColor: 'rgba(249, 115, 22, 0.3)',
    hasAction: true,
    actionLabel: 'View Insights',
  },

  // Conflict/Warning notifications
  conflict_detected: {
    icon: 'warning',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
    hasAction: true,
    actionLabel: 'Resolve in Voting Tab',
    warningBorder: true,
  },

  // Budget notifications
  budget_update: {
    icon: 'wallet',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
  },
  payment_received: {
    icon: 'cash',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
  },
  payment_failed: {
    icon: 'card',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
    warningBorder: true,
  },
  payment_reminder: {
    icon: 'card-outline',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
    hasAction: true,
    actionLabel: 'Pay Now',
  },
  payment_claimed: {
    icon: 'receipt-outline',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
    hasAction: true,
    actionLabel: 'Confirm Payment',
  },
  refund_due: {
    icon: 'return-down-back-outline',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
    hasAction: true,
    actionLabel: 'View Budget',
    warningBorder: true,
  },

  // Booking notifications
  booking_confirmed: {
    icon: 'checkmark-circle',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
  },
  booking_cancelled: {
    icon: 'close-circle',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
  },
  // Legacy alias for rows created by process-payment-reminders before the
  // cancellation notification adopted the canonical booking_cancelled type.
  event_cancelled_nonpayment: {
    icon: 'close-circle',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
  },
  booking_reminder: {
    icon: 'alarm',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
  },

  // Feedback notifications
  feedback_received: {
    icon: 'chatbox-ellipses',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
  },

  // Poll notifications
  poll_created: {
    icon: 'bar-chart',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
    hasAction: true,
    actionLabel: 'Vote Now',
  },
  poll_closing: {
    icon: 'time',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
    hasAction: true,
    actionLabel: 'Vote Now',
  },
  poll_closed: {
    icon: 'checkmark-done',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
    hasAction: true,
    actionLabel: 'View Results',
  },
  poll_vote: {
    icon: 'hand-left',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
  },

  // Chat notifications
  new_message: {
    icon: 'chatbubble',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
  },
  mention: {
    icon: 'at',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
  },

  // Event notifications
  event_update: {
    icon: 'calendar',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
    hasAction: true,
    actionLabel: 'View Event',
  },
  event_cancelled: {
    icon: 'calendar-outline',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
    warningBorder: true,
  },
  invite_accepted: {
    icon: 'person-add',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
  },
  new_participant: {
    icon: 'people',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
  },
  guest_joined: {
    icon: 'person-add-outline',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
  },
  guest_data_changed: {
    icon: 'create',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
    hasAction: true,
    actionLabel: 'View Guests',
  },
  // Legacy alias. Rows written before guest_profile_updated was merged into
  // guest_data_changed still sit in the database and would otherwise fall
  // through to `default` — an orange bell, which reads as "you must act".
  guest_profile_updated: {
    icon: 'create',
    color: INFO_COLOR,
    bgColor: INFO_BG_COLOR,
    hasAction: true,
    actionLabel: 'View Guests',
  },

  // Default
  default: {
    icon: 'notifications',
    color: ACTION_COLOR,
    bgColor: ACTION_BG_COLOR,
  },
};

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  testID?: string;
}

export function NotificationItem({
  notification,
  onPress,
  testID,
}: NotificationItemProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const config = notification.type === 'ops_cron_health'
    ? {
        icon: 'construct-outline' as const,
        color: theme.textSecondary,
        bgColor: theme.surfaceHigh,
      }
    : NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.default;
  const actionLabelKey = ACTION_LABEL_KEYS[notification.type];
  const actionLabel = actionLabelKey ? (t.notifications as any)[actionLabelKey] : undefined;

  // Notifications whose copy can be rebuilt are localized to the organizer's
  // language at render time. Falls back to stored title/body when the required
  // source data is absent or malformed.
  const paymentSuccessCopy = resolvePaymentSuccessCopy(notification, t.notifications);
  const paymentReminderCopy = resolvePaymentReminderCopy(
    notification,
    t.notifications.paymentReminders,
    getCurrentLanguage(),
  );
  let displayTitle = notification.type.startsWith('payment_reminder_')
    ? paymentReminderCopy.title
    : paymentSuccessCopy.title;
  let displayBody = notification.type.startsWith('payment_reminder_')
    ? paymentReminderCopy.body
    : paymentSuccessCopy.body;
  if (notification.type === 'guest_joined' && isGuestJoinedMeta(notification.metadata)) {
    displayTitle = (t.notifications as any).guestJoinedTitle;
    displayBody = ((t.notifications as any).guestJoinedBody as string)
      .replace('{{guest}}', notification.metadata.guestName);
  } else if (
    (notification.type === 'guest_data_changed' || notification.type === 'guest_profile_updated')
    && isGuestDataChangedMeta(notification.metadata)
  ) {
    const meta = notification.metadata;
    displayTitle = (t.notifications as any).guestDataChangedTitle;
    const changesText = formatGuestChanges(meta.changes, {
      name: (t.notifications as any).fieldName,
      email: (t.notifications as any).fieldEmail,
      phone: (t.notifications as any).fieldPhone,
    });
    displayBody = ((t.notifications as any).guestDataChangedBody as string)
      .replace('{{guest}}', meta.guestName)
      .replace('{{changes}}', changesText);
  } else if (notification.type === 'refund_due' && isRefundDueMeta(notification.metadata)) {
    const meta = notification.metadata;
    const locale = getCurrentLanguage() === 'de' ? 'de-DE' : 'en-US';
    const amount = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
    }).format(meta.amountCents / 100);
    const date = new Date(`${meta.expectedBy}T00:00:00`).toLocaleDateString(locale);
    displayTitle = (t.notifications as any).refundDueTitle;
    displayBody = ((t.notifications as any).refundDueBody as string)
      .replace('{{description}}', meta.description)
      .replace('{{amount}}', amount)
      .replace('{{date}}', date);
  } else if (
    (notification.type === 'booking_cancelled'
      || notification.type === 'event_cancelled_nonpayment')
    && isBookingCancelledMeta(notification.metadata)
  ) {
    const meta = notification.metadata;
    const locale = getCurrentLanguage() === 'de' ? 'de-DE' : 'en-US';
    const deposit = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
    }).format(meta.retainedDepositCents / 100);
    displayTitle = (t.notifications as any).bookingCancelledTitle;
    displayBody = ((t.notifications as any).bookingCancelledBody as string)
      .replace('{{honoree}}', meta.honoreeName)
      .replace('{{deposit}}', deposit);
  } else if (notification.type === 'ops_cron_health') {
    const checkKey = getOpsAlertCheckKey(notification.metadata);
    displayTitle = t.notifications.opsAlertTitle;

    if (checkKey === 'config:pg_net') {
      displayBody = t.notifications.opsAlertPgNetMissing;
    } else if (checkKey?.startsWith('config:vault:')) {
      displayBody = t.notifications.opsAlertVaultSecretMissing
        .replace('{{name}}', checkKey.slice('config:vault:'.length));
    } else if (checkKey === 'http:no_response') {
      displayBody = t.notifications.opsAlertHttpNoResponse;
    } else if (checkKey && /^http:\d{3}$/.test(checkKey)) {
      displayBody = t.notifications.opsAlertHttpError
        .replace('{{status}}', checkKey.slice('http:'.length));
    } else if (checkKey?.startsWith('job:')) {
      displayBody = t.notifications.opsAlertJobFailed
        .replace('{{job}}', checkKey.slice('job:'.length));
    } else if (checkKey) {
      displayBody = t.notifications.opsAlertUnknown.replace('{{checkKey}}', checkKey);
    } else {
      displayBody = t.notifications.opsAlertUnknownWithoutKey;
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return (t.notifications as any).timeJustNow;
    if (diffMins < 60) return (t.notifications as any).timeMinutesAgo.replace('{{n}}', String(diffMins));
    if (diffHours < 24) return (t.notifications as any).timeHoursAgo.replace('{{n}}', String(diffHours));
    if (diffDays < 7) return (t.notifications as any).timeDaysAgo.replace('{{n}}', String(diffDays));
    const locale = getCurrentLanguage() === 'de' ? 'de-DE' : 'en-US';
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    // Navigate to action URL if available
    if (notification.action_url) {
      router.push(notification.action_url as any);
    }
  };

  const handleActionPress = () => {
    if (notification.action_url) {
      router.push(notification.action_url as any);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        config.warningBorder && styles.warningBorder,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      testID={testID}
    >
      {/* Glass overlay */}
      <View style={styles.glassOverlay} />

      <XStack gap="$4" flex={1}>
        {/* Icon */}
        <YStack
          width={48}
          height={48}
          borderRadius={24}
          backgroundColor={config.bgColor}
          alignItems="center"
          justifyContent="center"
          style={config.glowColor ? { shadowColor: config.glowColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 15 } : undefined}
        >
          <Ionicons name={config.icon} size={24} color={config.color} />
        </YStack>

        {/* Content */}
        <YStack flex={1} gap="$1">
          <XStack justifyContent="space-between" alignItems="flex-start">
            <Text
              fontSize={14}
              fontWeight="600"
              color={'#FFFFFF'}
              numberOfLines={1}
              flex={1}
              marginRight="$2"
            >
              {displayTitle}
            </Text>
            <Text fontSize={10} color={'rgba(255,255,255,0.48)'} fontWeight="500">
              {notification.created_at && formatTime(notification.created_at)}
            </Text>
          </XStack>

          {displayBody && (
            <Text
              fontSize={12}
              color={'rgba(255,255,255,0.72)'}
              numberOfLines={2}
              lineHeight={18}
            >
              {displayBody}
            </Text>
          )}

          {/* Action button or link */}
          {config.hasAction && (
            <Pressable
              onPress={handleActionPress}
              style={({ pressed }) => [
                config.warningBorder ? styles.actionButton : styles.actionLink,
                pressed && styles.actionPressed,
              ]}
            >
              {config.warningBorder ? (
                <XStack alignItems="center" gap="$2" flex={1}>
                  <Ionicons name="hand-left" size={16} color={config.color} />
                  <Text fontSize={11} fontWeight="600" color={`${config.color}EE`} flex={1}>
                    {actionLabel ?? config.actionLabel}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={config.color} />
                </XStack>
              ) : (
                <XStack alignItems="center" gap="$1">
                  <Text fontSize={10} fontWeight="700" color={config.color} textTransform="uppercase" letterSpacing={0.5}>
                    {actionLabel ?? config.actionLabel}
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={config.color} />
                </XStack>
              )}
            </Pressable>
          )}
        </YStack>
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(26,47,71,0.8)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(230,220,200,0.15)',
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(13,27,42,0.7)',
  },
  warningBorder: {
    borderLeftWidth: 3,
    borderLeftColor: ACTION_COLOR,
  },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionButton: {
    marginTop: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderWidth: 1,
    borderColor: ACTION_BG_COLOR,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionLink: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPressed: {
    opacity: 0.7,
  },
});
