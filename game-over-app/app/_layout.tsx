/**
 * Root Layout
 * Main app layout with auth state management and navigation
 */

import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TamaguiProvider, Theme, Spinner, YStack } from 'tamagui';
import { ToastProvider, ToastViewport } from '@tamagui/toast';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useAuthStore } from '@/stores/authStore';
import config from '../tamagui.config';

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
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="create-event"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
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

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.gameover.app"
        urlScheme="gameover"
      >
        <TamaguiProvider config={config} defaultTheme={colorScheme ?? 'light'}>
          <Theme name={colorScheme ?? 'light'}>
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
