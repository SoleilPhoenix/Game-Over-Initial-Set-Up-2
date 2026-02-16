/**
 * Root Layout
 * Main app layout with auth state management and navigation
 */

import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TamaguiProvider, Theme, Spinner, YStack } from 'tamagui';
import { ToastProvider, ToastViewport } from '@tamagui/toast';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { DARK_THEME } from '@/constants/theme';
import config from '../tamagui.config';

// Crisp Chat — native module, not available in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let configureCrisp: ((id: string) => void) | undefined;
let setUserEmail: ((email: string, signature: string | null) => void) | undefined;
let setUserNickname: ((name: string) => void) | undefined;

if (!isExpoGo) {
  try {
    const crisp = require('react-native-crisp-chat-sdk');
    configureCrisp = crisp.configure;
    setUserEmail = crisp.setUserEmail;
    setUserNickname = crisp.setUserNickname;
    configureCrisp?.('403b436b-3ea7-4b76-8d8d-3f860ed63468');
  } catch {
    // Crisp SDK not available
  }
}

// Stripe publishable key from environment
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayoutNav() {
  const { isInitialized, isLoading, session, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Sync user info with Crisp when session changes (with identity verification)
  useEffect(() => {
    if (!session?.user || isExpoGo) return;

    const { email, user_metadata } = session.user;
    const name = user_metadata?.full_name || user_metadata?.name;
    if (name) setUserNickname?.(name);

    if (!email) return;

    // Fetch HMAC signature for identity verification, fallback to null if unavailable
    supabase.functions.invoke('crisp-identity').then(({ data }) => {
      const signature = data?.signature ?? null;
      setUserEmail?.(email, signature);
    }).catch(() => {
      setUserEmail?.(email, null);
    });
  }, [session]);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to welcome screen if not authenticated
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/(tabs)/events');
    }
  }, [session, isInitialized, segments, router]);

  if (!isInitialized || isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor={DARK_THEME.background}>
        <LinearGradient
          colors={[DARK_THEME.deepNavy, DARK_THEME.background]}
          style={StyleSheet.absoluteFill}
        />
        {/* Game Over Logo */}
        <Image
          source={require('../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {/* Loading Spinner below logo */}
        <Spinner size="large" color={DARK_THEME.primary} style={{ marginTop: 24 }} />
      </YStack>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="create-event"
          options={{
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="event" />
        <Stack.Screen name="package" />
        <Stack.Screen name="booking" />
        <Stack.Screen name="invite" />
      </Stack>
      <ToastViewport flexDirection="column-reverse" top="$4" left={0} right={0} />
    </>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 150,
    height: 150,
  },
});

export default function RootLayout() {
  // Force dark theme - Game Over is a dark-mode-only app
  const colorScheme = 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.gameover.app"
        urlScheme="gameover"
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <Theme name="dark">
            <ToastProvider>
              <QueryClientProvider client={queryClient}>
                <RootLayoutNav />
              </QueryClientProvider>
            </ToastProvider>
          </Theme>
        </TamaguiProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
