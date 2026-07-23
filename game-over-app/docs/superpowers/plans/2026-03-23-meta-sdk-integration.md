# Meta SDK Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the Meta (Facebook) SDK into the Game Over app using a hybrid client SDK + server Conversions API approach, wrapped in a single isolation layer so tracking failures never affect app logic.

**Architecture:** A single `MetaAnalytics.ts` wrapper is the only file that imports `react-native-fbsdk-next`. All 5 funnel events (CompleteRegistration, ViewContent, AddToCart, InitiateCheckout, Purchase) route through this wrapper. Purchase events are also sent server-side via a new Supabase Edge Function for ATT-independent reliability.

**Tech Stack:** `react-native-fbsdk-next`, `expo-tracking-transparency`, Meta Conversions API (Graph API v18+), Supabase Edge Functions (Deno), TypeScript

**Spec:** `docs/superpowers/specs/2026-03-23-meta-sdk-integration-design.md`

---

## File Map

### New Files
| File | Responsibility |
|---|---|
| `src/lib/analytics/analyticsEvents.ts` | Event name constants + TypeScript param types |
| `src/lib/analytics/MetaAnalytics.ts` | Wrapper — all SDK calls, ATT gate, error isolation |
| `src/hooks/useATTPermission.ts` | iOS ATT permission state hook |
| `src/components/ATTPermissionPrompt.tsx` | Pre-prompt UI before iOS system dialog |
| `supabase/functions/send-meta-conversion/index.ts` | Edge Function — server-side Conversions API |
| `__tests__/unit/analytics/MetaAnalytics.test.ts` | Unit tests for wrapper isolation |

### Modified Files
| File | Change |
|---|---|
| `app.config.ts` | Add `react-native-fbsdk-next` + `expo-tracking-transparency` plugins, `NSUserTrackingUsageDescription` |
| `.env` + `.env.example` | Add `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN`, `META_CONVERSIONS_API_TOKEN`, `META_DATASET_ID` |
| `app/(tabs)/events/index.tsx` | Trigger ATT prompt on first focus (post-auth) |
| `app/(auth)/signup.tsx` | Fire `CompleteRegistration` after email signup success |
| `src/lib/auth/google.ts` | Fire `CompleteRegistration` for new OAuth users |
| `src/lib/auth/facebook.ts` | Fire `CompleteRegistration` for new OAuth users |
| `src/lib/auth/apple.ts` | Fire `CompleteRegistration` for new OAuth users |
| `app/wizard/packages.tsx` | Fire `ViewContent` + `AddToCart` |
| `app/booking/[eventId]/payment.tsx` | Fire `InitiateCheckout` |
| `app/booking/[eventId]/confirmation.tsx` | Fire `Purchase` |
| `app/(tabs)/profile/privacy.tsx` | Update Sections 8 + 9 (DE + EN) — DSGVO blocker |

---

## Task 1: Git Branch + Dependencies

**Files:**
- No code files — setup only

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feature/meta-sdk-integration
```

Expected: switched to new branch `feature/meta-sdk-integration`

- [ ] **Step 2: Install `react-native-fbsdk-next`**

```bash
npm install react-native-fbsdk-next --legacy-peer-deps
```

Expected: package added to `node_modules`, no peer dep errors

- [ ] **Step 3: Install `expo-tracking-transparency`**

```bash
npx expo install expo-tracking-transparency
```

Expected: package added, compatible version chosen for Expo SDK

- [ ] **Step 4: Verify both packages appear in package.json**

```bash
grep -E "fbsdk|tracking-transparency" package.json
```

Expected: both lines present

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install react-native-fbsdk-next and expo-tracking-transparency"
```

---

## Task 2: Config + Environment Variables

**Files:**
- Modify: `app.config.ts`
- Modify: `.env`
- Modify: `.env.example`

- [ ] **Step 1: Add env vars to `.env`**

Open `.env` and add these three lines after the existing `EXPO_PUBLIC_FACEBOOK_APP_ID` line:

```bash
EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN=    # Facebook Developer Console → App Settings → Advanced → Client Token
META_CONVERSIONS_API_TOKEN=           # Meta Events Manager → Settings → Conversions API → Generate Access Token
META_DATASET_ID=                      # Meta Events Manager → Settings → Dataset ID (≠ Facebook App ID)
```

> ⚠️ Fill in real values before any native build. Leave blank for now to unblock code tasks.

- [ ] **Step 2: Add same keys to `.env.example`**

Mirror the three keys in `.env.example` with placeholder values:

```bash
EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN=your_facebook_client_token
META_CONVERSIONS_API_TOKEN=your_meta_conversions_api_token
META_DATASET_ID=your_meta_dataset_id
```

- [ ] **Step 3: Update `app.config.ts` — add plugins and infoPlist**

In the `plugins` array (after the existing `@sentry/react-native/expo` entry), add:

```typescript
    [
      'react-native-fbsdk-next',
      {
        appID: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
        clientToken: process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN,
        displayName: 'Game Over',
        scheme: `fb${process.env.EXPO_PUBLIC_FACEBOOK_APP_ID}`,
        advertiserIDCollectionEnabled: false,
        autoLogAppEventsEnabled: false,
        autoInitEnabled: true,
      },
    ],
    ['expo-tracking-transparency'],
```

In the `ios.infoPlist` object (after `CFBundleURLTypes`), add:

```typescript
      NSUserTrackingUsageDescription:
        'Game Over uses your app activity to show you relevant ads on Instagram and Facebook. Your data is never sold.',
```

- [ ] **Step 4: Verify config compiles without errors**

```bash
npx expo config --type introspect 2>&1 | head -30
```

Expected: no TypeScript errors, config object printed

- [ ] **Step 5: Commit**

```bash
git add app.config.ts .env .env.example
git commit -m "chore: add Meta SDK config plugin and env vars"
```

---

## Task 3: Event Constants + Types

**Files:**
- Create: `src/lib/analytics/analyticsEvents.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/analytics/analyticsEvents.ts
// Meta standard event names and param types for Game Over funnel tracking.
// Reference: https://developers.facebook.com/docs/app-events/reference

export const META_EVENTS = {
  COMPLETE_REGISTRATION: 'fb_mobile_complete_registration',
  VIEW_CONTENT: 'fb_mobile_content_view',
  ADD_TO_CART: 'fb_mobile_add_to_cart',
  INITIATE_CHECKOUT: 'fb_mobile_initiated_checkout',
  PURCHASE: 'fb_mobile_purchase',
} as const;

export type MetaEventName = (typeof META_EVENTS)[keyof typeof META_EVENTS];

export interface RegistrationParams {
  registrationMethod: 'email' | 'google' | 'facebook' | 'apple';
}

export interface ViewContentParams {
  contentId: string;
  contentType: string;
  currency: string;
  valueToSum: number;
}

export interface AddToCartParams {
  contentId: string;
  currency: string;
  valueToSum: number;
}

export interface InitiateCheckoutParams {
  numItems: number;
  currency: string;
  valueToSum: number;
}

export interface PurchaseParams {
  orderId: string;
  currency: string;
  valueToSum: number;
}

export type EventParams =
  | RegistrationParams
  | ViewContentParams
  | AddToCartParams
  | InitiateCheckoutParams
  | PurchaseParams;
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck 2>&1 | grep "analyticsEvents"
```

Expected: no errors for this file

- [ ] **Step 3: Commit**

```bash
git add src/lib/analytics/analyticsEvents.ts
git commit -m "feat(analytics): add Meta event constants and TypeScript types"
```

---

## Task 4: MetaAnalytics Wrapper

**Files:**
- Create: `src/lib/analytics/MetaAnalytics.ts`

- [ ] **Step 1: Write the failing test first**

Create `__tests__/unit/analytics/MetaAnalytics.test.ts`:

```typescript
import { MetaAnalytics } from '@/lib/analytics/MetaAnalytics';
import { META_EVENTS } from '@/lib/analytics/analyticsEvents';

// Mock react-native-fbsdk-next so tests run without native modules
jest.mock('react-native-fbsdk-next', () => ({
  AppEventsLogger: {
    logEvent: jest.fn(),
    setAdvertiserTrackingEnabled: jest.fn(),
    flush: jest.fn(),
  },
  Settings: {
    initializeSDK: jest.fn(),
  },
}));

describe('MetaAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MetaAnalytics.reset(); // resets singleton state between tests
  });

  it('does not throw when SDK throws', async () => {
    const { AppEventsLogger } = require('react-native-fbsdk-next');
    AppEventsLogger.logEvent.mockRejectedValue(new Error('SDK crashed'));
    MetaAnalytics.enableClient(); // simulate ATT granted

    await expect(
      MetaAnalytics.trackEvent(META_EVENTS.VIEW_CONTENT, {
        contentId: 'pkg-1',
        contentType: 'package',
        currency: 'EUR',
        valueToSum: 99,
      })
    ).resolves.toBeUndefined(); // never throws
  });

  it('does not call SDK when client is disabled (ATT denied)', async () => {
    const { AppEventsLogger } = require('react-native-fbsdk-next');
    MetaAnalytics.disableClient(); // simulate ATT denied

    await MetaAnalytics.trackEvent(META_EVENTS.VIEW_CONTENT, {
      contentId: 'pkg-1',
      contentType: 'package',
      currency: 'EUR',
      valueToSum: 99,
    });

    expect(AppEventsLogger.logEvent).not.toHaveBeenCalled();
  });

  it('calls SDK with correct event name when client is enabled', async () => {
    const { AppEventsLogger } = require('react-native-fbsdk-next');
    MetaAnalytics.enableClient();

    await MetaAnalytics.trackEvent(META_EVENTS.COMPLETE_REGISTRATION, {
      registrationMethod: 'email',
    });

    expect(AppEventsLogger.logEvent).toHaveBeenCalledWith(
      META_EVENTS.COMPLETE_REGISTRATION,
      expect.any(Object)
    );
  });
});
```

- [ ] **Step 2: Run test — confirm it fails (file not yet created)**

```bash
npm test -- __tests__/unit/analytics/MetaAnalytics.test.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '@/lib/analytics/MetaAnalytics'`

- [ ] **Step 3: Implement `MetaAnalytics.ts`**

```typescript
// src/lib/analytics/MetaAnalytics.ts
// Single wrapper around react-native-fbsdk-next.
// ALL Meta SDK calls go through this file. No other file imports fbsdk-next.
// Tracking failures are always silent — they never propagate to callers.

import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { MetaEventName, EventParams } from './analyticsEvents';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazy-load the native SDK — safe no-op in Expo Go or if SDK fails to load
let AppEventsLogger: { logEvent: (name: string, params?: object) => Promise<void> } | null = null;
let Settings: { initializeSDK: () => void; setAdvertiserTrackingEnabled: (v: boolean) => void } | null = null;

if (!isExpoGo) {
  try {
    const fbsdk = require('react-native-fbsdk-next');
    AppEventsLogger = fbsdk.AppEventsLogger;
    Settings = fbsdk.Settings;
  } catch {
    // SDK not available — all methods become no-ops
  }
}

class MetaAnalyticsClass {
  private clientEnabled = false;
  private initialized = false;

  initialize(): void {
    if (this.initialized || isExpoGo) return;
    try {
      Settings?.initializeSDK();
      this.initialized = true;
    } catch {
      // Silent
    }
  }

  enableClient(): void {
    this.clientEnabled = true;
    try {
      Settings?.setAdvertiserTrackingEnabled(true);
    } catch {
      // Silent
    }
  }

  disableClient(): void {
    this.clientEnabled = false;
    try {
      Settings?.setAdvertiserTrackingEnabled(false);
    } catch {
      // Silent
    }
  }

  // reset() is used in tests only to restore singleton state between cases
  reset(): void {
    this.clientEnabled = false;
    this.initialized = false;
  }

  async trackEvent(event: MetaEventName, params?: EventParams): Promise<void> {
    // Client SDK path — gated on ATT consent, never throws
    if (this.clientEnabled && AppEventsLogger) {
      try {
        await AppEventsLogger.logEvent(event, params as object | undefined);
      } catch {
        // Silent — SDK errors never surface to app logic
      }
    }
    // Server Conversions API is called separately from each screen
    // after DB writes, using the sendMetaConversion() helper below
  }
}

export const MetaAnalytics = new MetaAnalyticsClass();

// Convenience helper called from confirmation.tsx after payment success.
// Sends Purchase event to the server-side Conversions API.
// Fire-and-forget — never awaited by callers.
export async function sendMetaConversion(params: {
  eventName: MetaEventName;
  conversionEventId: string;
  valueToSum?: number;
  currency?: string;
  orderId?: string;
  userEmail?: string;
  userPhone?: string;
  userName?: string;
}): Promise<void> {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    await fetch(`${supabaseUrl}/functions/v1/send-meta-conversion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(params),
    });
  } catch {
    // Silent — server-side tracking never blocks the app
  }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test -- __tests__/unit/analytics/MetaAnalytics.test.ts 2>&1 | tail -15
```

Expected: PASS — 3 tests passing

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck 2>&1 | grep "MetaAnalytics\|analyticsEvents"
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/analytics/MetaAnalytics.ts __tests__/unit/analytics/MetaAnalytics.test.ts
git commit -m "feat(analytics): add MetaAnalytics wrapper with isolation and error boundary"
```

---

## Task 5: ATT Permission Hook + Pre-Prompt UI

**Files:**
- Create: `src/hooks/useATTPermission.ts`
- Create: `src/components/ATTPermissionPrompt.tsx`

- [ ] **Step 1: Create `useATTPermission.ts`**

```typescript
// src/hooks/useATTPermission.ts
// Manages iOS App Tracking Transparency permission state.
// On Android or Expo Go, always returns 'granted' (no ATT needed).

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const ATT_STORAGE_KEY = 'gameover:att_requested';
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type ATTStatus = 'not-determined' | 'granted' | 'denied' | 'restricted';

export function useATTPermission() {
  const [status, setStatus] = useState<ATTStatus>('not-determined');
  const [shouldPrompt, setShouldPrompt] = useState(false);

  useEffect(() => {
    checkATTStatus();
  }, []);

  async function checkATTStatus() {
    // Android and Expo Go: always granted, no prompt needed
    if (Platform.OS !== 'ios' || isExpoGo) {
      setStatus('granted');
      return;
    }

    // Check if we already asked
    const alreadyRequested = await AsyncStorage.getItem(ATT_STORAGE_KEY);
    if (alreadyRequested) {
      // Re-read actual permission status
      try {
        const { getTrackingPermissionsAsync } = await import('expo-tracking-transparency');
        const { status: currentStatus } = await getTrackingPermissionsAsync();
        setStatus(currentStatus === 'granted' ? 'granted' : 'denied');
      } catch {
        setStatus('denied');
      }
      return;
    }

    // First time — show pre-prompt
    setShouldPrompt(true);
  }

  async function requestPermission(): Promise<ATTStatus> {
    setShouldPrompt(false);
    try {
      const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
      const { status: result } = await requestTrackingPermissionsAsync();
      const mapped: ATTStatus = result === 'granted' ? 'granted' : 'denied';
      setStatus(mapped);
      await AsyncStorage.setItem(ATT_STORAGE_KEY, '1');
      return mapped;
    } catch {
      setStatus('denied');
      await AsyncStorage.setItem(ATT_STORAGE_KEY, '1');
      return 'denied';
    }
  }

  function dismiss() {
    setShouldPrompt(false);
    setStatus('denied');
    AsyncStorage.setItem(ATT_STORAGE_KEY, '1');
  }

  return { status, shouldPrompt, requestPermission, dismiss };
}
```

- [ ] **Step 2: Create `ATTPermissionPrompt.tsx`**

```typescript
// src/components/ATTPermissionPrompt.tsx
// Pre-prompt shown before the iOS ATT system dialog.
// Explains WHY we ask — increases acceptance rate.

import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Text, Button, YStack, XStack } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { DARK_THEME } from '@/constants/theme';
import { useTranslation } from '@/i18n';

interface ATTPermissionPromptProps {
  visible: boolean;
  onContinue: () => void;
  onSkip: () => void;
}

export function ATTPermissionPrompt({ visible, onContinue, onSkip }: ATTPermissionPromptProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <YStack style={styles.card} gap="$4" padding="$6">
          <XStack justifyContent="center">
            <Ionicons name="shield-checkmark-outline" size={48} color={DARK_THEME.primary} />
          </XStack>

          <Text color="$textPrimary" fontSize={20} fontWeight="700" textAlign="center">
            Deine Privatsphäre ist uns wichtig
          </Text>

          <Text color="$textSecondary" fontSize={14} textAlign="center" lineHeight={22}>
            Game Over nutzt deine App-Aktivität, um dir auf Instagram und Facebook relevante
            Angebote zu zeigen. Deine Daten werden niemals verkauft.
          </Text>

          <YStack gap="$3" marginTop="$2">
            <Button
              backgroundColor={DARK_THEME.primary}
              color="white"
              borderRadius={12}
              height={52}
              onPress={onContinue}
            >
              Weiter
            </Button>
            <Button
              backgroundColor="transparent"
              color={DARK_THEME.textTertiary}
              onPress={onSkip}
            >
              Nein danke
            </Button>
          </YStack>
        </YStack>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: DARK_THEME.surfaceCard,
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
  },
});
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck 2>&1 | grep -E "useATT|ATTPermission"
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useATTPermission.ts src/components/ATTPermissionPrompt.tsx
git commit -m "feat(analytics): add ATT permission hook and pre-prompt UI component"
```

---

## Task 6: ATT Trigger on Events Tab

**Files:**
- Modify: `app/(tabs)/events/index.tsx`

- [ ] **Step 1: Add ATT prompt trigger to events screen**

At the top of `EventsScreen` component (after existing imports and before the component body), add the ATT imports:

```typescript
import { useATTPermission } from '@/hooks/useATTPermission';
import { ATTPermissionPrompt } from '@/components/ATTPermissionPrompt';
import { MetaAnalytics } from '@/lib/analytics/MetaAnalytics';
```

Inside `EventsScreen`, add the ATT hook and initialize SDK on grant:

```typescript
const { shouldPrompt, requestPermission, dismiss } = useATTPermission();

// Initialize Meta SDK once on first render
useEffect(() => {
  MetaAnalytics.initialize();
}, []);
```

Add the ATT prompt handler that enables the client SDK on grant:

```typescript
async function handleATTContinue() {
  const result = await requestPermission();
  if (result === 'granted') {
    MetaAnalytics.enableClient();
  }
}
```

Add `ATTPermissionPrompt` to the component's JSX return (just before the closing tag):

```tsx
<ATTPermissionPrompt
  visible={shouldPrompt}
  onContinue={handleATTContinue}
  onSkip={dismiss}
/>
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npm run typecheck 2>&1 | grep "events/index"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/events/index.tsx"
git commit -m "feat(analytics): trigger ATT prompt on Events tab first focus"
```

---

## Task 7: CompleteRegistration — Email Signup

**Files:**
- Modify: `app/(auth)/signup.tsx`

- [ ] **Step 1: Add tracking to signup success**

In `signup.tsx`, add the import at the top:

```typescript
import { MetaAnalytics } from '@/lib/analytics/MetaAnalytics';
import { META_EVENTS } from '@/lib/analytics/analyticsEvents';
```

In the `onSubmit` function, after the `if (signUpData.user)` check at line ~105, add the tracking call (fire-and-forget):

```typescript
if (signUpData.user) {
  // Track new registration — fire and forget, never blocks navigation
  MetaAnalytics.trackEvent(META_EVENTS.COMPLETE_REGISTRATION, {
    registrationMethod: 'email',
  });

  // existing profile update code below...
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck 2>&1 | grep "signup"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/signup.tsx"
git commit -m "feat(analytics): track CompleteRegistration on email signup"
```

---

## Task 8: CompleteRegistration — OAuth Flows

**Files:**
- Modify: `src/lib/auth/google.ts`
- Modify: `src/lib/auth/facebook.ts`
- Modify: `src/lib/auth/apple.ts`

> **Key pattern:** An OAuth user is "new" if `session.user.created_at` is within 60 seconds of `Date.now()`. This prevents existing users who sign in again from re-firing the event.

- [ ] **Step 1: Add helper function to `src/lib/auth/auth.ts`**

Add this utility to the existing `auth.ts` file (does not change existing exports):

```typescript
// Returns true if this is the user's first login (account just created)
export function isNewOAuthUser(createdAt: string): boolean {
  const accountAgeMs = Date.now() - new Date(createdAt).getTime();
  return accountAgeMs < 60_000; // within 60 seconds = new signup
}
```

- [ ] **Step 2: Update `google.ts`**

Add imports at top:

```typescript
import { MetaAnalytics } from '@/lib/analytics/MetaAnalytics';
import { META_EVENTS } from '@/lib/analytics/analyticsEvents';
import { isNewOAuthUser } from './auth';
```

In `useGoogleAuth`, find the point where `supabase.auth.setSession()` succeeds and a session is established (the `useEffect` watching `response`). After session is set, add:

```typescript
if (session?.user?.created_at && isNewOAuthUser(session.user.created_at)) {
  MetaAnalytics.trackEvent(META_EVENTS.COMPLETE_REGISTRATION, {
    registrationMethod: 'google',
  });
}
```

- [ ] **Step 3: Update `facebook.ts`** — same pattern, `registrationMethod: 'facebook'`

- [ ] **Step 4: Update `apple.ts`** — same pattern, `registrationMethod: 'apple'`

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck 2>&1 | grep -E "google|facebook|apple" | grep -v "^$"
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/auth.ts src/lib/auth/google.ts src/lib/auth/facebook.ts src/lib/auth/apple.ts
git commit -m "feat(analytics): track CompleteRegistration for all 4 OAuth methods"
```

---

## Task 9: ViewContent + AddToCart in Packages Screen

**Files:**
- Modify: `app/wizard/packages.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { MetaAnalytics } from '@/lib/analytics/MetaAnalytics';
import { META_EVENTS } from '@/lib/analytics/analyticsEvents';
```

- [ ] **Step 2: Add `ViewContent` when a package card is tapped**

Find where a package detail is opened (the `onPress` handler on each package card). Add before navigation:

```typescript
MetaAnalytics.trackEvent(META_EVENTS.VIEW_CONTENT, {
  contentId: pkg.id,
  contentType: 'package',
  currency: 'EUR',
  valueToSum: (pkg.price_per_person_cents ?? 9900) / 100,
});
```

- [ ] **Step 3: Add `AddToCart` when booking is confirmed**

Find where the user confirms their package selection and the booking/event creation is triggered (the "Continue" button handler). Add before `router.push`:

```typescript
MetaAnalytics.trackEvent(META_EVENTS.ADD_TO_CART, {
  contentId: selectedPackage.id,
  currency: 'EUR',
  valueToSum: totalPriceCents / 100,
});
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck 2>&1 | grep "packages"
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/wizard/packages.tsx
git commit -m "feat(analytics): track ViewContent and AddToCart in packages screen"
```

---

## Task 10: InitiateCheckout in Payment Screen

**Files:**
- Modify: `app/booking/[eventId]/payment.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { MetaAnalytics } from '@/lib/analytics/MetaAnalytics';
import { META_EVENTS } from '@/lib/analytics/analyticsEvents';
```

- [ ] **Step 2: Fire event on screen mount**

Add a `useEffect` that fires once when the payment screen loads (after pricing data is available):

```typescript
useEffect(() => {
  if (!activePricing) return; // wait until pricing is loaded
  MetaAnalytics.trackEvent(META_EVENTS.INITIATE_CHECKOUT, {
    numItems: participantCount,
    currency: 'EUR',
    valueToSum: activePricing.totalCents / 100,
  });
}, [activePricing?.totalCents]); // fires once when pricing first resolves
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck 2>&1 | grep "payment"
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "app/booking/[eventId]/payment.tsx"
git commit -m "feat(analytics): track InitiateCheckout when payment screen loads"
```

---

## Task 11: Purchase Event in Confirmation Screen

**Files:**
- Modify: `app/booking/[eventId]/confirmation.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { v4 as uuidv4 } from 'uuid'; // already available via expo-crypto or @types/uuid
import { MetaAnalytics, sendMetaConversion } from '@/lib/analytics/MetaAnalytics';
import { META_EVENTS } from '@/lib/analytics/analyticsEvents';
import { useAuthStore } from '@/stores/authStore';
```

- [ ] **Step 2: Fire Purchase event once on confirmation mount**

Find the existing `useEffect` that runs on mount (or add a new one). Add:

```typescript
const { user } = useAuthStore();

useEffect(() => {
  if (!booking && !isDraft) return;
  if (isDraft) return; // demo mode — no real purchase

  const conversionEventId = uuidv4();
  const totalCents = booking?.total_price_cents ?? 0;

  // Client-side event (gated on ATT)
  MetaAnalytics.trackEvent(META_EVENTS.PURCHASE, {
    orderId: bookingReference,
    currency: 'EUR',
    valueToSum: totalCents / 100,
  });

  // Server-side Conversions API (ATT-independent, better match quality)
  sendMetaConversion({
    eventName: META_EVENTS.PURCHASE,
    conversionEventId,
    valueToSum: totalCents / 100,
    currency: 'EUR',
    orderId: bookingReference,
    userEmail: user?.email,
    userPhone: user?.phone ?? undefined,
    userName: user?.user_metadata?.full_name ?? undefined,
  });
}, [bookingReference]); // fires once when reference is available
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck 2>&1 | grep "confirmation"
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "app/booking/[eventId]/confirmation.tsx"
git commit -m "feat(analytics): track Purchase event via client SDK and server Conversions API"
```

---

## Task 12: Server-Side Conversions API Edge Function

**Files:**
- Create: `supabase/functions/send-meta-conversion/index.ts`

- [ ] **Step 1: Create the Edge Function**

```typescript
// supabase/functions/send-meta-conversion/index.ts
// Sends a Meta Conversions API event server-side.
// Hashes all PII (email, phone, name) with SHA-256 before sending.
// Runs independently of ATT — fires even when user declined tracking on iOS.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const META_CONVERSIONS_API_TOKEN = Deno.env.get('META_CONVERSIONS_API_TOKEN') ?? '';
const META_DATASET_ID = Deno.env.get('META_DATASET_ID') ?? '';
const META_API_VERSION = 'v18.0';

async function sha256(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const {
      eventName,
      conversionEventId,
      valueToSum,
      currency = 'EUR',
      orderId,
      userEmail,
      userPhone,
      userName,
    } = body;

    if (!eventName || !conversionEventId) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Build hashed user_data — only include fields that are present
    const userData: Record<string, string> = {};
    if (userEmail) userData['em'] = await sha256(userEmail);
    if (userPhone) userData['ph'] = await sha256(userPhone.replace(/\D/g, '')); // digits only
    if (userName) {
      const [firstName, ...rest] = userName.trim().split(' ');
      if (firstName) userData['fn'] = await sha256(firstName);
      if (rest.length > 0) userData['ln'] = await sha256(rest.join(' '));
    }

    // Build custom_data
    const customData: Record<string, unknown> = { currency };
    if (valueToSum != null) customData['value'] = valueToSum;
    if (orderId) customData['order_id'] = orderId;

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: conversionEventId,
          action_source: 'app',
          user_data: userData,
          custom_data: customData,
        },
      ],
    };

    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${META_DATASET_ID}/events?access_token=${META_CONVERSIONS_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('[send-meta-conversion] Meta API error:', JSON.stringify(result));
      return new Response(JSON.stringify({ error: result }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-meta-conversion] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
```

- [ ] **Step 2: Add `META_CONVERSIONS_API_TOKEN` and `META_DATASET_ID` as Supabase secrets**

```bash
npx supabase secrets set META_CONVERSIONS_API_TOKEN=<your_token>
npx supabase secrets set META_DATASET_ID=<your_dataset_id>
```

> ⚠️ Fill in real values from Meta Business Manager → Events Manager before deploying.

- [ ] **Step 3: Deploy the Edge Function**

```bash
npx supabase functions deploy send-meta-conversion
```

Expected: `Deployed successfully`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-meta-conversion/index.ts
git commit -m "feat(analytics): add send-meta-conversion Edge Function with SHA-256 hashing"
```

---

## Task 13: Privacy Policy Update (DSGVO Blocker)

**Files:**
- Modify: `app/(tabs)/profile/privacy.tsx`

> ⚠️ This task is a **pre-deployment blocker** under DSGVO Article 13. Must be done before any production release with the Meta SDK active.

- [ ] **Step 1: Find Section 8 (Cookies and Tracking)**

Open `app/(tabs)/profile/privacy.tsx` and locate Section 8 in both the DE and EN `SECTIONS`/`CONTENT` objects.

- [ ] **Step 2: Update Section 8 — DE**

Replace the text stating the app does not track users with:

> "Wir verwenden das Meta Pixel (Facebook App Events) zur Messung der Wirksamkeit unserer Werbeanzeigen auf Instagram und Facebook. Dies ermöglicht uns zu verstehen, wie Nutzer nach dem Klick auf eine Anzeige mit der App interagieren. Auf iOS-Geräten werden App-Ereignisse nur nach Ihrer ausdrücklichen Einwilligung über den iOS-Tracking-Dialog erfasst."

- [ ] **Step 3: Update Section 8 — EN**

> "We use Meta Pixel (Facebook App Events) to measure the effectiveness of our advertising on Instagram and Facebook. This allows us to understand how users interact with the app after clicking an ad. On iOS devices, app events are only collected after your explicit consent via the iOS tracking dialog."

- [ ] **Step 4: Update Section 9 (Third-Party Services) — add Meta**

Add Meta Platforms Ireland Ltd. to the list of third-party processors in both DE and EN, with a link to `https://www.facebook.com/privacy/policy/`.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/profile/privacy.tsx"
git commit -m "legal: update Privacy Policy Sections 8+9 for Meta SDK tracking (DSGVO Art. 13)"
```

---

## Task 14: Full Test Run + prebuild Verification

**Files:**
- No new files — verification only

- [ ] **Step 1: Run all unit tests**

```bash
npm test 2>&1 | tail -20
```

Expected: all existing tests pass + 3 new `MetaAnalytics` tests pass

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors

- [ ] **Step 3: Run linter**

```bash
npm run lint
```

Expected: 0 errors

- [ ] **Step 4: Run `expo prebuild --clean` to verify native config**

```bash
npx expo prebuild --clean 2>&1 | tail -20
```

Expected: no errors, `ios/` and `android/` directories regenerated with Meta SDK config

- [ ] **Step 5: Verify `Info.plist` contains ATT key**

```bash
grep -A2 "NSUserTrackingUsageDescription" ios/GameOver/Info.plist
```

Expected: key present with the English permission string

- [ ] **Step 6: Verify `AndroidManifest.xml` contains Facebook meta-data**

```bash
grep -A2 "com.facebook.sdk.ApplicationId" android/app/src/main/AndroidManifest.xml
```

Expected: `meta-data` entry with Facebook App ID

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: verify native build — Meta SDK config confirmed in Info.plist and AndroidManifest"
```

---

## Task 15: Manual Verification in Meta Events Manager

**No code — test checklist**

Before merging to `main`, verify in **Meta Business Manager → Events Manager → Test Events** tab:

- [ ] Install app on a physical device (or simulator with development build)
- [ ] Create a new account → confirm `CompleteRegistration` appears in Test Events
- [ ] Browse to a package → confirm `ViewContent` appears
- [ ] Select a package and complete wizard → confirm `AddToCart` appears
- [ ] Reach payment screen → confirm `InitiateCheckout` appears
- [ ] Complete a test payment → confirm `Purchase` appears from **both** client and server (two entries with same `event_id` — Meta deduplicates)
- [ ] On iOS: decline ATT → complete purchase → confirm `Purchase` still appears (server-side only)

---

## Task 16: Create Pull Request

- [ ] **Step 1: Push branch**

```bash
git push -u origin feature/meta-sdk-integration
```

- [ ] **Step 2: Create PR**

```bash
gh pr create \
  --title "feat: Meta SDK integration — hybrid client + server conversion tracking" \
  --body "$(cat <<'EOF'
## Summary
- Adds react-native-fbsdk-next + expo-tracking-transparency with full isolation wrapper
- Tracks 5 funnel events: CompleteRegistration, ViewContent, AddToCart, InitiateCheckout, Purchase
- Server-side Conversions API (send-meta-conversion Edge Function) for ATT-independent Purchase tracking
- Privacy Policy updated (DSGVO Art. 13 compliance)

## Test plan
- [ ] All unit tests pass (MetaAnalytics isolation tests)
- [ ] Typecheck and lint clean
- [ ] expo prebuild --clean succeeds, NSUserTrackingUsageDescription in Info.plist
- [ ] All 5 events visible in Meta Events Manager Test Events tab
- [ ] Purchase confirmed via both client + server with deduplication

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
