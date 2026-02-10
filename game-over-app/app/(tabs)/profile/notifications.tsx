/**
 * Notification Preferences Screen
 * Push and email notification settings
 * Uses the profiles table for notification preferences
 */

import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Toggle } from '@/components/ui/Toggle';
import { useUser } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';

const PREFS_CACHE_KEY = 'notification_prefs';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const { registerForPushNotifications, expoPushToken, error: pushError } = usePushNotifications();
  const { t } = useTranslation();

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(!!expoPushToken);

  useEffect(() => {
    loadPreferences();
  }, [user?.id]);

  useEffect(() => {
    setPushEnabled(!!expoPushToken);
  }, [expoPushToken]);

  const loadPreferences = async () => {
    if (!user?.id) return;

    // Load from local cache first (instant, always available)
    try {
      const cached = await AsyncStorage.getItem(`${PREFS_CACHE_KEY}_${user.id}`);
      if (cached) {
        const prefs = JSON.parse(cached);
        setPushNotificationsEnabled(prefs.push ?? true);
        setEmailNotificationsEnabled(prefs.email ?? true);
      }
    } catch { /* ignore cache read errors */ }

    // Then try to sync from Supabase
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('push_notifications_enabled, email_notifications_enabled')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setPushNotificationsEnabled(data.push_notifications_enabled ?? false);
        setEmailNotificationsEnabled(data.email_notifications_enabled ?? false);
        // Update local cache with server values
        await AsyncStorage.setItem(`${PREFS_CACHE_KEY}_${user.id}`, JSON.stringify({
          push: data.push_notifications_enabled ?? false,
          email: data.email_notifications_enabled ?? false,
        }));
      }
    } catch (error) {
      console.error('Failed to load preferences from server:', error);
      // Local cache values remain — user sees their last known preference
    }
  };

  const handleTogglePush = async (value: boolean) => {
    setPushNotificationsEnabled(value);
    await savePreference('push_notifications_enabled', value);
  };

  const handleToggleEmail = async (value: boolean) => {
    setEmailNotificationsEnabled(value);
    await savePreference('email_notifications_enabled', value);
  };

  const savePreference = async (key: 'push_notifications_enabled' | 'email_notifications_enabled', value: boolean) => {
    if (!user?.id) return;

    // Always save to local cache immediately (survives screen remounts)
    const cacheKey = key === 'push_notifications_enabled' ? 'push' : 'email';
    try {
      const cached = await AsyncStorage.getItem(`${PREFS_CACHE_KEY}_${user.id}`);
      const prefs = cached ? JSON.parse(cached) : {};
      prefs[cacheKey] = value;
      await AsyncStorage.setItem(`${PREFS_CACHE_KEY}_${user.id}`, JSON.stringify(prefs));
    } catch { /* ignore cache write errors */ }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          [key]: value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error: any) {
      // Known RLS recursion issue — preference already saved locally above
      const isRlsRecursion = error?.code === '42P17' || error?.message?.includes('infinite recursion');
      if (isRlsRecursion) {
        console.warn('RLS recursion on profile update — preference saved locally only:', error);
      } else {
        console.error('Failed to save preference:', error);
        // Revert on error for non-RLS issues
        if (key === 'push_notifications_enabled') {
          setPushNotificationsEnabled(!value);
        } else {
          setEmailNotificationsEnabled(!value);
        }
        // Also revert local cache
        try {
          const cached = await AsyncStorage.getItem(`${PREFS_CACHE_KEY}_${user.id}`);
          const prefs = cached ? JSON.parse(cached) : {};
          prefs[cacheKey] = !value;
          await AsyncStorage.setItem(`${PREFS_CACHE_KEY}_${user.id}`, JSON.stringify(prefs));
        } catch { /* ignore */ }
        Alert.alert('Error', 'Failed to save preference. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnablePush = async () => {
    const token = await registerForPushNotifications();
    if (token) {
      setPushEnabled(true);
    } else if (pushError) {
      const isExpoGoLimit = pushError.message?.includes('EAS project ID') || pushError.message?.includes('Expo Go');
      Alert.alert(
        isExpoGoLimit ? 'Not Available in Expo Go' : 'Push Notifications',
        isExpoGoLimit
          ? 'Push notifications require a development build (EAS Build). They are not supported in Expo Go. You can still toggle the preference for when you switch to a full build.'
          : (pushError.message || 'Failed to enable push notifications. Please check your device settings.')
      );
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
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          testID="notifications-back"
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
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          paddingTop: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack paddingHorizontal="$4" gap="$6">
          {/* Push Notifications Section */}
          <YStack gap="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <Text
                fontSize={11}
                fontWeight="600"
                color={DARK_THEME.textSecondary}
                textTransform="uppercase"
                letterSpacing={1}
                marginLeft="$1"
              >
                {t.notificationPrefs.pushNotifications}
              </Text>
              {!pushEnabled && (
                <Pressable
                  onPress={handleEnablePush}
                  style={styles.enableButton}
                  testID="enable-push-button"
                >
                  <Text fontSize={12} fontWeight="600" color={DARK_THEME.primary}>
                    Enable
                  </Text>
                </Pressable>
              )}
            </XStack>

            {pushEnabled ? (
              <View style={styles.card}>
                <XStack
                  paddingVertical="$3"
                  paddingHorizontal="$4"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <XStack flex={1} alignItems="center" gap="$3" marginRight="$3">
                    <View
                      width={36}
                      height={36}
                      borderRadius={18}
                      backgroundColor="rgba(96, 165, 250, 0.2)"
                      alignItems="center"
                      justifyContent="center"
                    >
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
              </View>
            ) : (
              <View style={styles.disabledCard}>
                <Ionicons name="notifications-off" size={32} color="#6B7280" />
                <Text
                  fontSize={14}
                  color={DARK_THEME.textSecondary}
                  textAlign="center"
                  marginTop="$2"
                >
                  Push notifications are disabled.{'\n'}
                  Tap Enable to receive updates.
                </Text>
              </View>
            )}
          </YStack>

          {/* Email Notifications Section */}
          <YStack gap="$3">
            <Text
              fontSize={11}
              fontWeight="600"
              color={DARK_THEME.textSecondary}
              textTransform="uppercase"
              letterSpacing={1}
              marginLeft="$1"
            >
              {t.notificationPrefs.emailNotifications}
            </Text>
            <View style={styles.card}>
              <XStack
                paddingVertical="$3"
                paddingHorizontal="$4"
                alignItems="center"
                justifyContent="space-between"
              >
                <XStack flex={1} alignItems="center" gap="$3" marginRight="$3">
                  <View
                    width={36}
                    height={36}
                    borderRadius={18}
                    backgroundColor="rgba(52, 211, 153, 0.2)"
                    alignItems="center"
                    justifyContent="center"
                  >
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

          {/* Info Section */}
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
  disabledCard: {
    backgroundColor: 'rgba(45, 55, 72, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    padding: 24,
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: 'rgba(45, 55, 72, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    padding: 16,
  },
  enableButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(74, 111, 165, 0.2)',
  },
});
