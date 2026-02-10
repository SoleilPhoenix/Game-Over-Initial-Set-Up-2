/**
 * Push Notifications Hook
 * Handles push notification registration and listening
 *
 * Note: Requires expo-notifications to be installed:
 * npx expo install expo-notifications expo-device
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    notification: null,
    error: null,
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) {
      setState(prev => ({
        ...prev,
        error: new Error('Push notifications require a physical device'),
      }));
      return null;
    }

    setIsRegistering(true);

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setState(prev => ({
          ...prev,
          error: new Error('Permission to receive notifications was denied'),
        }));
        return null;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ??
                       Constants.easConfig?.projectId;

      if (!projectId) {
        console.warn('No projectId found — push notifications require an EAS project ID. Skipping token registration.');
        setState(prev => ({
          ...prev,
          error: new Error('Push notifications are not available in Expo Go without an EAS project ID. Build with EAS to enable.'),
        }));
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#258CF4',
        });
      }

      setState(prev => ({
        ...prev,
        expoPushToken: token.data,
        error: null,
      }));

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      setState(prev => ({
        ...prev,
        error: error as Error,
      }));
      return null;
    } finally {
      setIsRegistering(false);
    }
  }, []);

  // Save push token to backend
  const savePushToken = useCallback(async (token: string) => {
    if (!user?.id) return;

    try {
      // Note: user_push_tokens table may need to be created in Supabase
      await (supabase as any)
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          push_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform',
        });
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }, [user?.id]);

  // Handle notification tap (deep linking)
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    // Navigate based on notification data
    if (data?.action_url) {
      router.push(data.action_url as any);
    } else if (data?.screen) {
      router.push(data.screen as any);
    } else if (data?.event_id) {
      router.push(`/event/${data.event_id}`);
    }
  }, [router]);

  // Initialize push notifications
  useEffect(() => {
    // Register and save token
    registerForPushNotifications().then(token => {
      if (token) {
        savePushToken(token);
      }
    });

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setState(prev => ({ ...prev, notification }));
      }
    );

    // Listen for user interaction with notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [registerForPushNotifications, savePushToken, handleNotificationResponse]);

  // Schedule a local notification
  const scheduleNotification = useCallback(async ({
    title,
    body,
    data,
    trigger,
  }: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    trigger?: Notifications.NotificationTriggerInput;
  }) => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: trigger || null, // null = immediate
      });
      return id;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }, []);

  // Cancel a scheduled notification
  const cancelNotification = useCallback(async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }, []);

  // Get badge count
  const getBadgeCount = useCallback(async () => {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  }, []);

  // Set badge count
  const setBadgeCount = useCallback(async (count: number) => {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }, []);

  return {
    ...state,
    isRegistering,
    registerForPushNotifications,
    scheduleNotification,
    cancelNotification,
    getBadgeCount,
    setBadgeCount,
  };
}

/**
 * Send a push notification to specific users via Supabase Edge Function
 */
export async function sendPushNotification(userIds: string[], notification: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userIds,
        notification,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    throw error;
  }
}
