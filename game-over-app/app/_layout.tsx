/**
 * Root Layout
 * Main app layout with auth state management and navigation
 */

import * as Sentry from '@sentry/react-native';

import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, LogBox, StyleSheet } from 'react-native';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TamaguiProvider, Theme, Spinner, YStack } from 'tamagui';
import { ToastProvider, ToastViewport } from '@tamagui/toast';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { StripeProviderWrapper } from '@/components/StripeProviderWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { preloadPackageImages } from '@/constants/packageImages';
import { preloadSportLogos, preloadShareImages } from '@/constants/sportLogos';
import { initBudgetCache, migratePlaintextGuestDetails } from '@/lib/participantCountCache';
import { useEditorialFonts } from '@/hooks/useEditorialFonts';
import config from '../tamagui.config';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableNativeCrashHandling: true,
  enableAutoSessionTracking: true,
  tracesSampleRate: 0.2,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

// Suppress noisy dev-only LogBox red-boxes for Supabase Auth network retries.
// AuthRetryableFetchError is *by design* — Supabase will retry transparently
// when the network or backend is briefly unavailable (e.g. project paused on
// free tier and waking up). Surfacing it as a red box scares users without
// being actionable. Production builds aren't affected (LogBox is dev-only).
if (__DEV__) {
  LogBox.ignoreLogs([
    'AuthRetryableFetchError',
    'TypeError: Network request failed',
  ]);
}

// Crisp Chat — native module, not available in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let configureCrisp: ((id: string) => void) | undefined;
let setUserEmail: ((email: string, signature: string | null) => void) | undefined;
let setUserNickname: ((name: string) => void) | undefined;

if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional native module
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
      // gcTime must outlive the persister's maxAge so cache entries survive
      // the in-memory garbage collector long enough to be persisted/restored.
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * AsyncStorage-backed query cache persister.
 * On launch, queries are rehydrated from storage so the app shows last-seen
 * data immediately — no spinner on reconnect or cold start with no network.
 * Stale queries still refetch in background once a connection is available.
 */
const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'game-over-rq-cache',
  // Throttle writes — every state change writing to AsyncStorage would
  // thrash storage and battery. 1 second is the React Query default.
  throttleTime: 1000,
});

function RootLayoutNav() {
  const { isInitialized, isLoading, session, initialize } = useAuthStore();
  const { fontsLoaded } = useEditorialFonts();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initialize()
      .then((fn: unknown) => {
        if (typeof fn === 'function') cleanup = fn as () => void;
      })
      .catch(() => {}); // initialize handles its own errors internally
    // Preload package images during splash screen to eliminate loading delays
    preloadPackageImages().catch(() => {});
    preloadSportLogos().catch(() => {});
    preloadShareImages().catch(() => {});
    return () => { cleanup?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialize is a stable Zustand action; effect must run only once on mount
  }, []);

  // Eagerly hydrate budget cache so urgency bell works on cold start, and move
  // any legacy plaintext guest PII into encrypted storage.
  useEffect(() => {
    void initBudgetCache();
    void migratePlaintextGuestDetails();
  }, []);

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
    const inInviteGroup = segments[0] === 'invite';

    if (!session && !inAuthGroup && !inInviteGroup) {
      // Redirect to welcome screen if not authenticated
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/(tabs)/events');
    }
  }, [session, isInitialized, segments, router]);

  if (!isInitialized || isLoading || !fontsLoaded) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor={'#0D1B2A'}>
        <LinearGradient
          colors={['#1A2F47', '#0D1B2A']}
          style={StyleSheet.absoluteFill}
        />
        {/* Game Over Logo */}
        <Image
          source={require('../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {/* Loading Spinner below logo */}
        <Spinner size="large" color={'#C6A75E'} style={{ marginTop: 24 }} />
      </YStack>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
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

function RootLayout() {
  // Game Over is a dark-mode-only app
  return (
    <ErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProviderWrapper
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.gameover.app"
        urlScheme="gameover"
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <Theme name="dark">
            <ToastProvider>
              <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{
                  persister: queryPersister,
                  // Cached queries older than 24h are dropped on hydrate —
                  // forces a refresh of long-stale data on next launch.
                  maxAge: 1000 * 60 * 60 * 24,
                  // Buster invalidates every cached query when bumped; do this
                  // whenever query shape changes in a breaking way.
                  buster: 'v1',
                }}
              >
                <RootLayoutNav />
              </PersistQueryClientProvider>
            </ToastProvider>
          </Theme>
        </TamaguiProvider>
      </StripeProviderWrapper>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout) as typeof RootLayout;
