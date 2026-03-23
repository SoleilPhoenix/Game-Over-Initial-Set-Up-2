/**
 * Notification Preferences Screen
 * Push and email notification settings
 */

import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Toggle } from '@/components/ui/Toggle';
import { useUser } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';

const PREFS_CACHE_KEY = 'notification_prefs';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const { t } = useTranslation();

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [paymentAlertsEnabled, setPaymentAlertsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [user?.id]);

  const loadPreferences = async () => {
    if (!user?.id) return;

    // Load from local cache first (instant)
    try {
      const cached = await AsyncStorage.getItem(`${PREFS_CACHE_KEY}_${user.id}`);
      if (cached) {
        const prefs = JSON.parse(cached);
        setPushNotificationsEnabled(prefs.push ?? true);
        setEmailNotificationsEnabled(prefs.email ?? true);
        setPaymentAlertsEnabled(prefs.paymentAlerts ?? true);
      }
    } catch { /* ignore */ }

    // Sync from Supabase
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('push_notifications_enabled, email_notifications_enabled')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setPushNotificationsEnabled(data.push_notifications_enabled ?? false);
        setEmailNotificationsEnabled(data.email_notifications_enabled ?? false);
        // Merge into local cache (paymentAlerts is local-only, preserve it)
        const cached = await AsyncStorage.getItem(`${PREFS_CACHE_KEY}_${user.id}`);
        const existing = cached ? JSON.parse(cached) : {};
        await AsyncStorage.setItem(`${PREFS_CACHE_KEY}_${user.id}`, JSON.stringify({
          ...existing,
          push: data.push_notifications_enabled ?? false,
          email: data.email_notifications_enabled ?? false,
        }));
      }
    } catch (error) {
      console.error('Failed to load preferences from server:', error);
    }
  };

  const handleTogglePush = async (value: boolean) => {
    setPushNotificationsEnabled(value);
    await saveDbPreference('push_notifications_enabled', value, 'push');
  };

  const handleToggleEmail = async (value: boolean) => {
    setEmailNotificationsEnabled(value);
    await saveDbPreference('email_notifications_enabled', value, 'email');
  };

  const handleTogglePaymentAlerts = async (value: boolean) => {
    setPaymentAlertsEnabled(value);
    // Payment alerts preference stored locally (scheduled by the app itself)
    try {
      const cached = await AsyncStorage.getItem(`${PREFS_CACHE_KEY}_${user?.id}`);
      const prefs = cached ? JSON.parse(cached) : {};
      prefs.paymentAlerts = value;
      await AsyncStorage.setItem(`${PREFS_CACHE_KEY}_${user?.id}`, JSON.stringify(prefs));
    } catch { /* ignore */ }
  };

  const saveDbPreference = async (
    key: 'push_notifications_enabled' | 'email_notifications_enabled',
    value: boolean,
    cacheKey: string,
  ) => {
    if (!user?.id) return;

    // Always save to local cache immediately
    try {
      const cached = await AsyncStorage.getItem(`${PREFS_CACHE_KEY}_${user.id}`);
      const prefs = cached ? JSON.parse(cached) : {};
      prefs[cacheKey] = value;
      await AsyncStorage.setItem(`${PREFS_CACHE_KEY}_${user.id}`, JSON.stringify(prefs));
    } catch { /* ignore */ }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
    } catch (error: any) {
      const isRlsRecursion = error?.code === '42P17' || error?.message?.includes('infinite recursion');
      if (!isRlsRecursion) {
        // Revert optimistic update on non-RLS errors
        if (key === 'push_notifications_enabled') setPushNotificationsEnabled(!value);
        else setEmailNotificationsEnabled(!value);
      }
    } finally {
      setIsSaving(false);
    }
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
        <Pressable onPress={() => router.back()} style={styles.headerButton} testID="notifications-back"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={DARK_THEME.textPrimary} />
        </Pressable>
        <Text fontSize={17} fontWeight="600" color={DARK_THEME.textPrimary}>
          {t.notificationPrefs.title}
        </Text>
        <View width={40} />
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack paddingHorizontal="$4" gap="$6">

          {/* Push Notifications Section */}
          <YStack gap="$3">
            <Text fontSize={11} fontWeight="600" color={DARK_THEME.textSecondary}
              textTransform="uppercase" letterSpacing={1} marginLeft="$1">
              {t.notificationPrefs.pushNotifications}
            </Text>
            <View style={styles.card}>
              {/* General push toggle */}
              <XStack paddingVertical="$3" paddingHorizontal="$4" alignItems="center" justifyContent="space-between"
                accessibilityRole="switch"
                accessibilityLabel="Enable push notifications"
                accessibilityState={{ checked: pushNotificationsEnabled, disabled: isSaving }}
                onPress={() => handleTogglePush(!pushNotificationsEnabled)}
              >
                <XStack flex={1} alignItems="center" gap="$3" marginRight="$3">
                  <View width={36} height={36} borderRadius={18}
                    backgroundColor="rgba(96, 165, 250, 0.2)" alignItems="center" justifyContent="center">
                    <Ionicons name="notifications" size={18} color="#60A5FA" />
                  </View>
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                      {t.notificationPrefs.enablePush}
                    </Text>
                    <Text fontSize={12} color={DARK_THEME.textSecondary}>
                      {t.notificationPrefs.enablePushDesc}
                    </Text>
                  </YStack>
                </XStack>
                <Toggle
                  value={pushNotificationsEnabled}
                  onValueChange={handleTogglePush}
                  disabled={isSaving}
                  testID="toggle-push-notifications"
                />
              </XStack>

              {/* Divider */}
              <View height={1} backgroundColor={DARK_THEME.border} marginHorizontal={16} />

              {/* Payment Due Alerts */}
              <XStack paddingVertical="$3" paddingHorizontal="$4" alignItems="center" justifyContent="space-between"
                accessibilityRole="switch"
                accessibilityLabel="Payment due alerts"
                accessibilityState={{ checked: paymentAlertsEnabled, disabled: isSaving }}
                onPress={() => handleTogglePaymentAlerts(!paymentAlertsEnabled)}
              >
                <XStack flex={1} alignItems="center" gap="$3" marginRight="$3">
                  <View width={36} height={36} borderRadius={18}
                    backgroundColor="rgba(249, 115, 22, 0.15)" alignItems="center" justifyContent="center">
                    <Ionicons name="warning" size={18} color="#F97316" />
                  </View>
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                      Payment Due Alerts
                    </Text>
                    <Text fontSize={12} color={DARK_THEME.textSecondary}>
                      Remind when a balance is due soon
                    </Text>
                  </YStack>
                </XStack>
                <Toggle
                  value={paymentAlertsEnabled}
                  onValueChange={handleTogglePaymentAlerts}
                  disabled={isSaving}
                  testID="toggle-payment-alerts"
                />
              </XStack>
            </View>
          </YStack>

          {/* Email Notifications Section */}
          <YStack gap="$3">
            <Text fontSize={11} fontWeight="600" color={DARK_THEME.textSecondary}
              textTransform="uppercase" letterSpacing={1} marginLeft="$1">
              {t.notificationPrefs.emailNotifications}
            </Text>
            <View style={styles.card}>
              <XStack paddingVertical="$3" paddingHorizontal="$4" alignItems="center" justifyContent="space-between"
                accessibilityRole="switch"
                accessibilityLabel="Email notifications for event updates"
                accessibilityState={{ checked: emailNotificationsEnabled, disabled: isSaving }}
                onPress={() => handleToggleEmail(!emailNotificationsEnabled)}
              >
                <XStack flex={1} alignItems="center" gap="$3" marginRight="$3">
                  <View width={36} height={36} borderRadius={18}
                    backgroundColor="rgba(52, 211, 153, 0.2)" alignItems="center" justifyContent="center">
                    <Ionicons name="mail" size={18} color="#34D399" />
                  </View>
                  <YStack flex={1}>
                    <Text fontSize={14} fontWeight="500" color={DARK_THEME.textPrimary}>
                      {t.notificationPrefs.eventUpdates}
                    </Text>
                    <Text fontSize={12} color={DARK_THEME.textSecondary}>
                      {t.notificationPrefs.eventUpdatesDesc}
                    </Text>
                  </YStack>
                </XStack>
                <Toggle
                  value={emailNotificationsEnabled}
                  onValueChange={handleToggleEmail}
                  disabled={isSaving}
                  testID="toggle-email-notifications"
                />
              </XStack>
            </View>
          </YStack>

          {/* Info */}
          <View style={styles.infoCard}>
            <XStack alignItems="flex-start" gap="$3">
              <Ionicons name="information-circle" size={20} color={DARK_THEME.textSecondary} />
              <YStack flex={1}>
                <Text fontSize={13} color={DARK_THEME.textSecondary}>
                  You can manage notification permissions in your device settings at any time.
                </Text>
              </YStack>
            </XStack>
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
    backgroundColor: DARK_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    overflow: 'hidden',
  },
  infoCard: {
    backgroundColor: 'rgba(45, 55, 72, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    padding: 16,
  },
});
