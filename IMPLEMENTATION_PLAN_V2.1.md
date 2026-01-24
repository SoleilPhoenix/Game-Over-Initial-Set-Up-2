# Game-Over.app Implementation Plan v2.1

**Document ID:** IMPL-GO-2025-003
**Version:** 2.1
**Date:** January 2026
**Status:** Detailed Phase Breakdown with Full OAuth
**Previous Version:** 2.0

---

## Executive Summary

This implementation plan provides **detailed day-by-day task breakdowns** for building the Game-Over.app MVP. All OAuth providers (Apple, Google, Facebook) are included in MVP.

**Total Duration:** 20 weeks (including buffer)
**Working Days per Week:** 5 days
**Hours per Day:** 8 hours (focused development)

---

## Key Updates from v2.0

| Change | v2.0 | v2.1 |
|--------|------|------|
| OAuth | Apple only (Google/Facebook in v1.1) | **All three in MVP** |
| Timeline | 18 weeks | 20 weeks (OAuth adds time) |
| Detail Level | Phase-level | **Day-by-day tasks** |
| Authentication | 1 week | **2 weeks** (full OAuth) |

---

## Master Phase Overview

```
Phase 0:  Architecture & Tooling           [Week 1]        5 days
Phase 1:  Foundation                        [Week 2-3]     10 days
Phase 2:  Authentication (Full OAuth)       [Week 4-5]     10 days  ← EXPANDED
├── Checkpoint: User Testing #1             [Week 5]
Phase 3:  Event Management                  [Week 6]       5 days
Phase 4:  Event Creation Wizard             [Week 7-8]     10 days
Phase 5:  Event Details & Destination       [Week 9]       5 days
Phase 6:  Package System                    [Week 10-12]   15 days
├── Checkpoint: User Testing #2             [Week 12]
Phase 7:  Communication Center              [Week 13-14]   10 days
Phase 8:  Notifications                     [Week 15]      5 days
Phase 9:  Budget Dashboard                  [Week 15-16]   5 days
├── Checkpoint: User Testing #3             [Week 16]
Phase 10: Profile & Settings                [Week 16-17]   5 days
Phase 11: Polish & Testing                  [Week 17-18]   10 days
Phase 12: Seed Data & Admin Panel           [Week 18-19]   5 days
Phase 13: Deployment & Launch               [Week 19-20]   5 days
Buffer                                      [+2 weeks]
```

---

# PHASE 0: Architecture & Tooling
## Week 1 (Days 1-5)

### Day 1: Development Environment Setup

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Install Node.js 20 LTS | `node -v` returns v20.x |
| 10:30-11:00 | Install pnpm globally | `pnpm -v` returns version |
| 11:00-12:00 | Install Docker Desktop | Docker running, `docker -v` works |
| 13:00-14:30 | Install Xcode 15+ from App Store | Xcode launches, simulators available |
| 14:30-16:00 | Install Android Studio + SDK | Emulator launches successfully |
| 16:00-17:00 | Install Expo CLI, EAS CLI | `npx expo --version`, `eas --version` |

**End of Day 1 Verification:**
```bash
node -v        # v20.x.x
pnpm -v        # 8.x.x
docker -v      # Docker version 24.x
npx expo -v    # 50.x.x
eas -v         # 7.x.x
```

### Day 2: Project Initialization

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:00 | Create Expo project with TypeScript template | `pnpm create expo-app game-over-app -t tabs` |
| 10:00-11:00 | Configure `app.config.ts` with app metadata | Bundle ID, app name, scheme configured |
| 11:00-12:00 | Set up folder structure per spec | All directories created |
| 13:00-14:00 | Install core dependencies | React Query, Zustand, MMKV installed |
| 14:00-15:30 | Configure TypeScript strict mode | `tsconfig.json` with strict settings |
| 15:30-17:00 | Set up path aliases (`@/components`, etc.) | Import aliases working |

**Dependencies to Install:**
```bash
pnpm add @tanstack/react-query zustand react-native-mmkv
pnpm add @supabase/supabase-js
pnpm add expo-secure-store expo-image
pnpm add zod react-hook-form @hookform/resolvers
pnpm add -D typescript @types/react
```

### Day 3: CI/CD Pipeline Setup

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Create GitHub repository | Repo created with README |
| 10:30-12:00 | Write `.github/workflows/ci.yml` | CI workflow file created |
| 13:00-14:00 | Configure quality checks (lint, typecheck) | ESLint + Prettier configured |
| 14:00-15:30 | Set up Vitest for unit testing | First test passes |
| 15:30-17:00 | Push and verify CI runs green | GitHub Actions shows green |

**CI Workflow File:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test

  build-ios:
    runs-on: macos-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: npx expo prebuild --platform ios --no-install
      - run: xcodebuild -workspace ios/gameoverapp.xcworkspace -scheme gameoverapp -configuration Debug -sdk iphonesimulator -derivedDataPath build

  build-android:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - run: pnpm install
      - run: npx expo prebuild --platform android --no-install
      - run: cd android && ./gradlew assembleDebug
```

### Day 4: Supabase Setup & Architecture Documentation

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:00 | Create Supabase project | Project dashboard accessible |
| 10:00-11:30 | Run `supabase init` locally | Local Supabase config created |
| 11:30-12:00 | Start local Supabase | `supabase start` runs containers |
| 13:00-14:30 | Write ADR-001: State Management | ADR document in `/docs/ADRs/` |
| 14:30-15:30 | Write ADR-002: Data Fetching | React Query decision documented |
| 15:30-17:00 | Write ADR-003: Authentication | OAuth strategy documented |

**ADR-003: Authentication Strategy**
```markdown
# ADR-003: Authentication Strategy

## Status
Accepted

## Context
Need to support multiple auth providers for user convenience.

## Decision
- **Primary:** Email/Password (always available)
- **Social:** Apple (required for iOS), Google, Facebook
- **Provider:** Supabase Auth with OAuth tokens
- **Token Storage:** expo-secure-store for sensitive data

## Providers Configuration
1. Apple Sign-In (iOS native, required by App Store)
2. Google Sign-In (expo-auth-session + Google OAuth)
3. Facebook Login (expo-auth-session + Facebook OAuth)

## Consequences
- Need to configure 3 OAuth providers in Supabase
- Need developer accounts: Apple, Google Cloud, Meta
- More testing complexity but better user conversion
```

### Day 5: Design System Foundation

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Install and configure Tamagui or NativeWind | Styling system working |
| 10:30-12:00 | Create color palette constants | `colors.ts` with all brand colors |
| 13:00-14:30 | Create typography scale | `typography.ts` with font sizes |
| 14:30-16:00 | Build Button component (Primary, Secondary, Text) | Button.tsx with tests |
| 16:00-17:00 | Build Input component with validation states | Input.tsx with tests |

**Color Palette (`src/constants/colors.ts`):**
```typescript
export const colors = {
  // Primary
  primary: '#258CF4',
  primaryLight: '#5AA5F7',
  primaryDark: '#1A6BC4',

  // Semantic
  success: '#47B881',
  warning: '#FF8551',
  error: '#E12D39',
  info: '#7B68EE',

  // Light Mode
  background: '#F5F7F8',
  surface: '#FFFFFF',
  textPrimary: '#1A202C',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',

  // Dark Mode
  backgroundDark: '#101922',
  surfaceDark: '#1B2127',
  textPrimaryDark: '#FFFFFF',
  textSecondaryDark: '#9CABBA',
  borderDark: '#283039',
};
```

**Week 1 Deliverables Checklist:**
- [ ] Development environment fully configured
- [ ] Expo project initialized with TypeScript
- [ ] CI/CD pipeline running on GitHub Actions
- [ ] Local Supabase running
- [ ] ADRs written for key decisions
- [ ] Button and Input components created with tests

---

# PHASE 1: Foundation
## Week 2-3 (Days 6-15)

### Day 6: Database Schema - Core Tables

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Create migration: profiles table | Migration file created |
| 10:30-12:00 | Create migration: cities table | Migration with seed data |
| 13:00-14:30 | Create migration: events table | Events table with indexes |
| 14:30-16:00 | Create migration: event_preferences table | Preferences linked to events |
| 16:00-17:00 | Run migrations locally, verify | `supabase db reset` succeeds |

### Day 7: Database Schema - Package & Booking Tables

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Create migration: packages table | Package table with JSON fields |
| 10:30-12:00 | Create migration: package_reviews table | Reviews linked to packages |
| 13:00-14:30 | Create migration: bookings table | Bookings with payment status |
| 14:30-16:00 | Create migration: refunds table | Refund tracking table |
| 16:00-17:00 | Create migration: event_participants table | Participants with roles |

### Day 8: Database Schema - Communication & Notifications

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Create migration: chat_channels table | Channels with categories |
| 10:30-12:00 | Create migration: messages table | Messages with indexes |
| 13:00-14:30 | Create migration: polls, poll_options, poll_votes | Voting system tables |
| 14:30-16:00 | Create migration: notifications table | Notification types |
| 16:00-17:00 | Create migration: destination_content table | Destination guide content |

### Day 9: Row Level Security Policies

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Enable RLS on all tables | RLS enabled |
| 10:30-12:00 | Write policies for profiles table | Users see own profile |
| 13:00-14:30 | Write policies for events table | Participants can view |
| 14:30-16:00 | Write policies for messages/chat | Event participants only |
| 16:00-17:00 | Write policies for notifications | User's own notifications |

**RLS Policy Example:**
```sql
-- Events: Only participants can view
CREATE POLICY "Event participants can view"
ON events FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM event_participants
    WHERE event_id = events.id
  )
  OR created_by = auth.uid()
);

-- Events: Only organizers can update
CREATE POLICY "Organizers can update events"
ON events FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM event_participants
    WHERE event_id = events.id AND role = 'organizer'
  )
);
```

### Day 10: Supabase Client & Type Generation

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Configure Supabase client | `src/lib/supabase/client.ts` |
| 10:30-12:00 | Generate TypeScript types from schema | `src/lib/supabase/types.ts` |
| 13:00-14:30 | Create type-safe query helpers | Generic query functions |
| 14:30-16:00 | Set up React Query provider | QueryClientProvider configured |
| 16:00-17:00 | Write integration test for Supabase connection | Test passes |

**Supabase Client Setup:**
```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import { MMKV } from 'react-native-mmkv';
import { Database } from './types';

const storage = new MMKV();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => storage.getString(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Day 11: Repository Layer - Events

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Create `eventsRepository.getByUser()` | Function with types |
| 10:30-12:00 | Create `eventsRepository.getById()` | Single event fetch |
| 13:00-14:30 | Create `eventsRepository.create()` | Event creation |
| 14:30-16:00 | Create `eventsRepository.update()` | Event updates |
| 16:00-17:00 | Write unit tests for events repository | Tests pass |

### Day 12: Repository Layer - Packages & Bookings

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Create `packagesRepository.getByCity()` | Packages by city |
| 10:30-12:00 | Create `packagesRepository.getById()` | Single package with reviews |
| 13:00-14:30 | Create `bookingsRepository.create()` | Booking creation |
| 14:30-16:00 | Create `bookingsRepository.updatePaymentStatus()` | Payment updates |
| 16:00-17:00 | Write unit tests | Tests pass |

### Day 13: Repository Layer - Communication

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Create `channelsRepository` | CRUD for channels |
| 10:30-12:00 | Create `messagesRepository` | Messages with pagination |
| 13:00-14:30 | Create `pollsRepository` | Polls CRUD |
| 14:30-16:00 | Create `votesRepository` | Vote submission |
| 16:00-17:00 | Write unit tests | Tests pass |

### Day 14: React Query Hooks

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Create `useEvents()` hook | Events query hook |
| 10:30-12:00 | Create `useEvent(id)` hook | Single event hook |
| 13:00-14:30 | Create `usePackages(cityId)` hook | Packages hook |
| 14:30-16:00 | Create `useCreateEvent()` mutation | Creation mutation |
| 16:00-17:00 | Create `useUpdateEvent()` mutation | Update mutation |

**React Query Hook Example:**
```typescript
// src/hooks/queries/useEvents.ts
import { useQuery } from '@tanstack/react-query';
import { eventsRepository } from '@/repositories/events';
import { useAuth } from '@/hooks/useAuth';

export function useEvents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['events', user?.id],
    queryFn: () => eventsRepository.getByUser(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsRepository.getById(eventId),
    enabled: !!eventId,
  });
}
```

### Day 15: Zustand Stores & Error Handling

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Create `authStore` | Auth state management |
| 10:30-12:00 | Create `uiStore` | UI state (modals, loading) |
| 13:00-14:30 | Create `wizardStore` | Event creation wizard state |
| 14:30-16:00 | Set up global error boundary | ErrorBoundary component |
| 16:00-17:00 | Set up Sentry (placeholder config) | Sentry init file |

**Week 2-3 Deliverables Checklist:**
- [ ] All database tables created with migrations
- [ ] RLS policies for all tables
- [ ] Supabase client configured with type safety
- [ ] Repository layer for all entities
- [ ] React Query hooks for data fetching
- [ ] Zustand stores for state management
- [ ] Error boundary configured

---

# PHASE 2: Authentication (Full OAuth)
## Week 4-5 (Days 16-25)

### Day 16: Email/Password Authentication

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Implement `auth.signUp()` | Sign up function |
| 10:30-12:00 | Implement `auth.signIn()` | Sign in function |
| 13:00-14:30 | Implement `auth.signOut()` | Sign out function |
| 14:30-16:00 | Implement `auth.resetPassword()` | Password reset flow |
| 16:00-17:00 | Write tests for email auth | Tests pass |

### Day 17: Apple Sign-In Implementation

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:00 | Configure Apple Developer account | App ID created |
| 10:00-11:00 | Enable Sign in with Apple capability | Xcode capability added |
| 11:00-12:00 | Configure Supabase Apple provider | Provider enabled |
| 13:00-14:30 | Install `expo-apple-authentication` | Package installed |
| 14:30-16:00 | Implement `auth.signInWithApple()` | Function working |
| 16:00-17:00 | Test on iOS simulator | Apple sign-in works |

**Apple Sign-In Implementation:**
```typescript
// src/lib/auth/apple.ts
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase/client';

export async function signInWithApple() {
  // Check availability
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Apple Sign-In not available on this device');
  }

  // Request credentials
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('No identity token received from Apple');
  }

  // Sign in with Supabase
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) throw error;

  // Update profile with Apple name if provided
  if (credential.fullName?.givenName) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim(),
    });
  }

  return data;
}
```

### Day 18: Google Sign-In Implementation

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:00 | Create Google Cloud project | Project created |
| 10:00-11:00 | Configure OAuth consent screen | Consent screen approved |
| 11:00-12:00 | Create OAuth 2.0 credentials (iOS, Android, Web) | Client IDs generated |
| 13:00-14:00 | Configure Supabase Google provider | Provider enabled with client ID |
| 14:00-15:30 | Install `expo-auth-session` and `expo-web-browser` | Packages installed |
| 15:30-17:00 | Implement `auth.signInWithGoogle()` | Function working |

**Google Sign-In Implementation:**
```typescript
// src/lib/auth/google.ts
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase/client';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS!;
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID!;
const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB!;

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
    webClientId: GOOGLE_CLIENT_ID_WEB,
  });

  const signInWithGoogle = async () => {
    const result = await promptAsync();

    if (result.type !== 'success') {
      throw new Error('Google sign-in was cancelled');
    }

    const { id_token } = result.params;

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: id_token,
    });

    if (error) throw error;
    return data;
  };

  return {
    signInWithGoogle,
    isReady: !!request,
  };
}
```

### Day 19: Facebook Sign-In Implementation

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:00 | Create Meta Developer app | App created |
| 10:00-11:00 | Configure Facebook Login product | Login enabled |
| 11:00-12:00 | Add iOS and Android platforms | Bundle IDs configured |
| 13:00-14:00 | Configure Supabase Facebook provider | Provider enabled |
| 14:00-15:30 | Implement `auth.signInWithFacebook()` | Function working |
| 15:30-17:00 | Test Facebook login flow | Login works |

**Facebook Sign-In Implementation:**
```typescript
// src/lib/auth/facebook.ts
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase/client';

WebBrowser.maybeCompleteAuthSession();

const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID!;

export function useFacebookAuth() {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
  });

  const signInWithFacebook = async () => {
    const result = await promptAsync();

    if (result.type !== 'success') {
      throw new Error('Facebook sign-in was cancelled');
    }

    const { access_token } = result.params;

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'facebook',
      token: access_token,
    });

    if (error) throw error;
    return data;
  };

  return {
    signInWithFacebook,
    isReady: !!request,
  };
}
```

### Day 20: Auth Store & Session Management

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Implement auth state listener | Session persistence |
| 10:30-12:00 | Implement auto-refresh token logic | Token refresh working |
| 13:00-14:30 | Create `useAuth()` hook | Hook with all auth methods |
| 14:30-16:00 | Implement secure token storage | expo-secure-store integration |
| 16:00-17:00 | Test session persistence across app restarts | Session persists |

**Auth Store:**
```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
      isInitialized: true,
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
```

### Day 21: Welcome Screen UI

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build Welcome screen layout | Hero image, text, buttons |
| 10:30-12:00 | Add hero image with gradient overlay | Image displays correctly |
| 13:00-14:30 | Style "Get Started" button | Primary button styled |
| 14:30-16:00 | Style "Log In" link | Secondary action styled |
| 16:00-17:00 | Add animations (fade in) | Smooth entrance animation |

### Day 22: Sign Up Screen UI

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build Sign Up form layout | Email, password fields |
| 10:30-12:00 | Add form validation with react-hook-form | Real-time validation |
| 13:00-14:30 | Build OAuth buttons row | Apple, Google, Facebook buttons |
| 14:30-16:00 | Add "OR CONTINUE WITH" divider | Styled divider |
| 16:00-17:00 | Add Terms acceptance checkbox | Checkbox with links |

### Day 23: Login Screen UI

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build Login form layout | Email, password, remember me |
| 10:30-12:00 | Add "Forgot Password" link | Link styled and navigates |
| 13:00-14:30 | Build Forgot Password screen | Email input, submit |
| 14:30-16:00 | Implement password reset email flow | Email sends |
| 16:00-17:00 | Add loading states to all auth buttons | Loading spinners |

### Day 24: Auth Navigation & Deep Linking

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Configure Expo Router auth groups | `(auth)` and `(tabs)` groups |
| 10:30-12:00 | Implement auth redirect logic | Unauthenticated → login |
| 13:00-14:30 | Configure deep linking for OAuth callbacks | `gameover://` scheme works |
| 14:30-16:00 | Test OAuth flows on iOS simulator | All 3 providers work |
| 16:00-17:00 | Test OAuth flows on Android emulator | All 3 providers work |

**Navigation Structure:**
```typescript
// app/_layout.tsx
import { useAuthStore } from '@/stores/authStore';
import { Redirect, Stack } from 'expo-router';

export default function RootLayout() {
  const { isInitialized, user, isLoading } = useAuthStore();

  if (!isInitialized || isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="(auth)" />
      )}
    </Stack>
  );
}
```

### Day 25: Auth Testing & Error Handling

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Write E2E tests for email sign up | Test passes |
| 10:30-12:00 | Write E2E tests for email sign in | Test passes |
| 13:00-14:30 | Add error handling for all auth methods | User-friendly error messages |
| 14:30-16:00 | Implement rate limiting UI feedback | "Too many attempts" message |
| 16:00-17:00 | **USER TESTING CHECKPOINT #1** | Demo auth flow to stakeholders |

**Week 4-5 Deliverables Checklist:**
- [ ] Email/Password authentication working
- [ ] Apple Sign-In working (iOS)
- [ ] Google Sign-In working (iOS + Android)
- [ ] Facebook Sign-In working (iOS + Android)
- [ ] Session persistence across app restarts
- [ ] Auth navigation with redirects
- [ ] Deep linking for OAuth callbacks
- [ ] Welcome, Sign Up, Login, Forgot Password screens
- [ ] E2E tests for auth flows

---

# PHASE 3: Event Management
## Week 6 (Days 26-30)

### Day 26: My Events Dashboard - Data Layer

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Implement `useMyEvents()` hook | Hook fetches user's events |
| 10:30-12:00 | Add filtering logic (All, Organizing, Attending) | Filter functions work |
| 13:00-14:30 | Calculate event progress percentage | Progress calculation |
| 14:30-16:00 | Determine event status labels | Status mapping function |
| 16:00-17:00 | Write tests for event data transformations | Tests pass |

### Day 27: My Events Dashboard - UI Components

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build EventCard component | Card with hero image |
| 10:30-12:00 | Add role badge (ORGANIZER/GUEST) | Badge component |
| 13:00-14:30 | Add progress bar with percentage | ProgressBar component |
| 14:30-16:00 | Add status indicator (dot + label) | Status display |
| 16:00-17:00 | Add payment status for guests | Payment badge |

### Day 28: My Events Dashboard - Screen Assembly

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build dashboard header (avatar, title, bell) | Header component |
| 10:30-12:00 | Build tab bar (All, Organizing, Attending) | Tabs component |
| 13:00-14:30 | Implement FlashList for event cards | Virtualized list |
| 14:30-16:00 | Add "Start New Plan" button | Dashed CTA button |
| 16:00-17:00 | Add pull-to-refresh | Refresh functionality |

### Day 29: Bottom Navigation

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Configure Expo Router tabs layout | `(tabs)/_layout.tsx` |
| 10:30-12:00 | Build custom tab bar component | TabBar.tsx |
| 13:00-14:30 | Add floating action button (center +) | FAB component |
| 14:30-16:00 | Add notification badges to tabs | Badge indicators |
| 16:00-17:00 | Test navigation between all tabs | Navigation works |

### Day 30: Empty States & Loading

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build empty state for no events | Illustration + CTA |
| 10:30-12:00 | Build skeleton loading for event cards | Shimmer animation |
| 13:00-14:30 | Add error state with retry | Error component |
| 14:30-16:00 | Polish animations and transitions | Smooth UX |
| 16:00-17:00 | Write component tests | Tests pass |

---

# PHASE 4: Event Creation Wizard
## Week 7-8 (Days 31-40)

### Day 31: Wizard Store & Navigation

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Implement full wizard store with MMKV persistence | Store with all fields |
| 10:30-12:00 | Set up wizard navigation routes | 4 step routes configured |
| 13:00-14:30 | Build step progress indicator component | ProgressIndicator.tsx |
| 14:30-16:00 | Implement draft auto-save (every 30s) | Auto-save working |
| 16:00-17:00 | Test draft persistence across app kills | Draft survives |

### Day 32: Step 1 - Key Details (Party Type)

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build "Party For" section with selectable buttons | Bachelor/Bachelorette selection |
| 10:30-12:00 | Add selection animations (checkmark, highlight) | Smooth transitions |
| 13:00-14:30 | Style selected vs unselected states | Visual feedback |
| 14:30-16:00 | Write tests for party type selection | Tests pass |
| 16:00-17:00 | Verify state persists to store | Store updates |

### Day 33: Step 1 - Key Details (Honoree & City)

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build "Honoree's Name" input section | Text input with icon |
| 10:30-12:00 | Fetch cities from Supabase | `useCities()` hook |
| 13:00-14:30 | Build "Select City" chip selector | Chip components |
| 14:30-16:00 | Add validation (all required) | Validation logic |
| 16:00-17:00 | Build footer with Back/Next buttons | Footer component |

### Day 34: Step 2 - Honoree Preferences (Social Energy)

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build "Gathering Size" selector | 3 options: Intimate, Small, Party |
| 10:30-12:00 | Build "Social Approach" selector | 4 options |
| 13:00-14:30 | Dynamic heading based on party type | "Groom's/Bride's Preferences" |
| 14:30-16:00 | Style subsection headers (GATHERING SIZE, etc.) | Styled headers |
| 16:00-17:00 | Test preference persistence | Store updates |

### Day 35: Step 2 - Honoree Preferences (Activity)

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build "Energy Level" selector | 3 options |
| 10:30-12:00 | Add optional "Activity Style" if needed | Additional preferences |
| 13:00-14:30 | Validate at least gathering size + energy selected | Validation |
| 14:30-16:00 | Polish step 2 animations | Smooth transitions |
| 16:00-17:00 | Write step 2 tests | Tests pass |

### Day 36: Step 3 - Participant Preferences (Group Dynamics)

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build "Average Age" selector | 4 age ranges |
| 10:30-12:00 | Build "Group Cohesion" selector | 3 options |
| 13:00-14:30 | Style section with "Group Dynamics" header | Styled section |
| 14:30-16:00 | Test group dynamics persistence | Store updates |
| 16:00-17:00 | Add avatar count display if available | Group size indicator |

### Day 37: Step 3 - Participant Preferences (Shared Interests)

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build "Vibe Preference" multi-select chips | Multi-select component |
| 10:30-12:00 | Allow multiple selections with visual feedback | Selected state styling |
| 13:00-14:30 | Add "Skip" and "Save" footer buttons | Two CTAs |
| 14:30-16:00 | Implement skip logic (defaults to empty) | Skip functionality |
| 16:00-17:00 | Write step 3 tests | Tests pass |

### Day 38: Step 4 - Package Selection (Data & Matching)

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Implement package matching algorithm | `calculatePackageMatches()` |
| 10:30-12:00 | Fetch packages by city with match scores | `useMatchedPackages()` hook |
| 13:00-14:30 | Sort packages by match score | Best match first |
| 14:30-16:00 | Calculate "Best Match" badge logic | Badge appears on top scorer |
| 16:00-17:00 | Test matching with various preferences | Algorithm works correctly |

### Day 39: Step 4 - Package Selection (UI)

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build Per Person / Total Group toggle | Toggle component |
| 10:30-12:00 | Build PackageCard component | Card with all elements |
| 13:00-14:30 | Add "BEST MATCH 🤖" badge | Badge overlay |
| 14:30-16:00 | Add rating stars and review count | Rating display |
| 16:00-17:00 | Add "Select Package" / "Select Recommended" buttons | CTA buttons |

### Day 40: Wizard Completion & Event Creation

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Implement `createEvent()` mutation | Creates event + preferences |
| 10:30-12:00 | Create default chat channel on event creation | "Main Lobby" created |
| 13:00-14:30 | Add organizer as first participant | Participant record created |
| 14:30-16:00 | Navigate to Event Summary on completion | Navigation works |
| 16:00-17:00 | Clear wizard store after successful creation | Store resets |

---

# PHASE 5: Event Details & Destination
## Week 9 (Days 41-45)

### Day 41: Event Summary Screen - Header & Info

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Fetch event data with `useEvent(id)` | Data loads |
| 10:30-12:00 | Build header (back, title, edit icon) | Header component |
| 13:00-14:30 | Display event name and tagline | Title section |
| 14:30-16:00 | Build info card (location, dates, vibe) | Info card component |
| 16:00-17:00 | Add edit functionality navigation | Edit button works |

### Day 42: Event Summary Screen - Planning Tools Grid

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build 2x2 grid layout for planning tools | Grid component |
| 10:30-12:00 | Build "Manage Invitations" card | Card with count badge |
| 13:00-14:30 | Build "Group Chat" card | Card with unread indicator |
| 14:30-16:00 | Build "Budget" card | Card with per-person estimate |
| 16:00-17:00 | Build "Packages" card | Card with selected package |

### Day 43: Event Summary Screen - Destination Guide

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Fetch destination content for city | `useDestinationContent()` |
| 10:30-12:00 | Build destination guide card | Hero image + title |
| 13:00-14:30 | Add arrow CTA for navigation | Navigation to guide |
| 14:30-16:00 | Build destination guide detail screen | Full guide view |
| 16:00-17:00 | Test deep linking to destination | Links work |

### Day 44: Invitation Management

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build participant list view | List of participants |
| 10:30-12:00 | Add invite via email/link functionality | Share sheet integration |
| 13:00-14:30 | Generate shareable invite link | Deep link generation |
| 14:30-16:00 | Implement invite acceptance flow | Accept invite screen |
| 16:00-17:00 | Test full invite flow | Invite → Accept works |

### Day 45: Event Editing

| Time | Task | Deliverable |
|------|------|-------------|
| 9:00-10:30 | Build edit event form | Pre-populated form |
| 10:30-12:00 | Allow editing dates, vibe, title | Edit fields work |
| 13:00-14:30 | Implement update mutation | Changes save |
| 14:30-16:00 | Add delete event functionality | Soft delete works |
| 16:00-17:00 | Test edit/delete flows | All edits work |

---

# PHASE 6: Package System
## Week 10-12 (Days 46-60)

### Days 46-48: Package Details Screen

**Day 46:**
- Build Package Details screen structure
- Implement hero image with parallax
- Display package name, rating, price

**Day 47:**
- Build premium highlights grid
- Display feature list
- Add "AI Recommended" badge logic

**Day 48:**
- Build testimonials carousel
- Add "Book Now" CTA
- Add favorite/wishlist functionality

### Days 49-51: Payment Summary Screen

**Day 49:**
- Build selected package summary card
- Implement cost breakdown display
- Calculate service fee (10% or min €50)

**Day 50:**
- Build "Exclude Honoree" toggle
- Implement dynamic per-person calculation
- Display paying participants count

**Day 51:**
- Add Stripe badge and security messaging
- Add cancellation policy text
- Implement "Proceed to Payment" navigation

### Days 52-55: Stripe Integration

**Day 52:**
- Set up Stripe account and API keys
- Create Supabase Edge Function for Payment Intent
- Implement idempotency keys

**Day 53:**
- Install `@stripe/stripe-react-native`
- Configure Stripe provider
- Build payment sheet integration

**Day 54:**
- Implement webhook handler
- Handle `payment_intent.succeeded`
- Handle `payment_intent.payment_failed`

**Day 55:**
- Test card payments (success, decline, 3D Secure)
- Implement payment confirmation screen
- Send confirmation notification

### Days 56-58: Booking Creation

**Day 56:**
- Implement `createBooking()` mutation
- Snapshot pricing at booking time
- Set initial payment status

**Day 57:**
- Update event status on booking
- Notify all participants
- Generate booking reference number

**Day 58:**
- Build booking confirmation screen
- Add "Add to Calendar" functionality
- Implement receipt/invoice display

### Days 59-60: Payment Testing & Edge Cases

**Day 59:**
- Test all Stripe test card scenarios
- Implement retry logic for failed payments
- Add refund request functionality

**Day 60:**
- **USER TESTING CHECKPOINT #2**
- Demo full booking flow
- Gather feedback on payment UX

---

# PHASE 7: Communication Center
## Week 13-14 (Days 61-70)

### Days 61-63: Chat Tab Implementation

**Day 61:**
- Build Communication Center screen with 3 tabs
- Implement Chat tab structure
- Build channel list by category

**Day 62:**
- Build individual chat channel screen
- Implement message list with pagination
- Add message input with send button

**Day 63:**
- Implement Supabase Realtime subscriptions
- Handle new message notifications
- Update unread counts

### Days 64-66: Voting Tab Implementation

**Day 64:**
- Build Voting tab structure
- Implement poll cards by category
- Add "New Poll +" button

**Day 65:**
- Build poll creation modal
- Implement poll options management
- Add poll deadline picker

**Day 66:**
- Implement vote submission
- Update vote counts in real-time
- Add "You voted" indicator

### Days 67-68: Poll States & Lifecycle

**Day 67:**
- Implement poll status transitions (draft → active → closing → closed)
- Add "CLOSING SOON" badge logic
- Implement auto-close at deadline

**Day 68:**
- Build draft poll placeholder UI
- Add "Add Suggestion" functionality
- Implement poll results view

### Days 69-70: Share Event & Decisions Tab

**Day 69:**
- Build "Share Event" banner
- Implement invite link generation
- Add share sheet with social options

**Day 70:**
- Build Decisions tab (finalized choices)
- Display closed polls with results
- Link decisions to booking/itinerary

---

# PHASE 8: Notifications
## Week 15 (Days 71-75)

### Days 71-73: Notification System

**Day 71:**
- Build notification feed screen
- Implement grouped sections (Today, Yesterday, Earlier)
- Fetch notifications with pagination

**Day 72:**
- Build notification item components for each type
- Add icons and colors per notification type
- Implement "Mark all read" functionality

**Day 73:**
- Implement push notification registration
- Configure Expo Push Notifications
- Send push for key events (booking, payment, poll)

### Days 74-75: Deep Linking from Notifications

**Day 74:**
- Implement `action_url` deep linking
- Navigate to relevant screen on tap
- Handle notification in foreground vs background

**Day 75:**
- Test all notification flows
- Implement notification preferences
- Add quiet hours functionality

---

# PHASE 9: Budget Dashboard
## Week 15-16 (Days 76-80)

### Days 76-78: Budget Dashboard Core

**Day 76:**
- Build budget dashboard screen
- Implement total budget card with progress bar
- Calculate spent percentage

**Day 77:**
- Build group contributions list
- Display payment status badges
- Implement "Remind All" functionality

**Day 78:**
- Build hidden cost alerts section
- Implement cost detection logic
- Display success state when no issues

### Days 79-80: Refund Tracking

**Day 79:**
- Build refund tracking section
- Display refund items with status
- Implement status colors (Processing, Received)

**Day 80:**
- Add refund request functionality
- Test full budget dashboard
- Polish animations and transitions

---

# PHASE 10: Profile & Settings
## Week 16-17 (Days 81-85)

### Days 81-83: User Settings

**Day 81:**
- Build User Settings screen
- Display profile avatar and info
- Build settings sections (Notifications, Account, Support)

**Day 82:**
- Implement Edit Profile screen
- Add avatar upload functionality
- Implement name/email update

**Day 83:**
- Build Password & Security screen
- Implement password change flow
- Add "Relationship Health Center" placeholder (Coming Soon)

### Days 84-85: Account Settings & Logout

**Day 84:**
- Build Account Settings screen
- Implement push/email notification toggles
- Add language selector

**Day 85:**
- Implement logout functionality
- Clear all local data on logout
- Test settings persistence

---

# PHASE 11: Polish & Testing
## Week 17-18 (Days 86-95)

### Days 86-88: Performance Optimization

**Day 86:**
- Implement image optimization with expo-image
- Add blurhash placeholders
- Configure caching policies

**Day 87:**
- Optimize list rendering with FlashList
- Implement lazy loading
- Profile and fix performance bottlenecks

**Day 88:**
- Reduce bundle size
- Remove unused dependencies
- Implement code splitting

### Days 89-91: Accessibility

**Day 89:**
- Add accessibility labels to all interactive elements
- Test with VoiceOver (iOS)
- Test with TalkBack (Android)

**Day 90:**
- Implement Dynamic Type support
- Add keyboard navigation for forms
- Fix color contrast issues

**Day 91:**
- Test with accessibility scanner
- Fix all A11y violations
- Document accessibility features

### Days 92-95: E2E Testing

**Day 92:**
- Set up Detox for E2E testing
- Write E2E test for onboarding flow
- Write E2E test for event creation

**Day 93:**
- Write E2E test for package booking
- Write E2E test for payment flow
- Write E2E test for chat/voting

**Day 94:**
- Run full test suite on CI
- Fix flaky tests
- Add test coverage reporting

**Day 95:**
- **USER TESTING CHECKPOINT #3**
- Full app walkthrough with stakeholders
- Document all feedback

---

# PHASE 12: Seed Data & Admin
## Week 18-19 (Days 96-100)

### Days 96-98: Seed Data

**Day 96:**
- Create seed script for cities (Berlin, Hamburg, Hannover)
- Create seed script for packages (3 per city = 9 total)
- Create seed script for destination content

**Day 97:**
- Create seed script for test users
- Create seed script for sample events
- Create seed script for sample reviews

**Day 98:**
- Run seeds on staging environment
- Verify all data integrity
- Document seed process

### Days 99-100: Admin Panel Setup

**Day 99:**
- Document admin capabilities needed
- Configure Supabase Dashboard access
- Create admin role and policies

**Day 100:**
- Write admin SQL queries for common tasks
- Document admin procedures
- Train stakeholders on Supabase Dashboard

---

# PHASE 13: Deployment & Launch
## Week 19-20 (Days 101-105)

### Days 101-102: App Store Preparation

**Day 101:**
- Create App Store Connect listing
- Prepare screenshots for all device sizes
- Write app description and keywords

**Day 102:**
- Create Google Play Console listing
- Prepare Play Store graphics
- Complete content rating questionnaire

### Days 103-104: Beta Testing

**Day 103:**
- Submit iOS build to TestFlight
- Submit Android build to Play Store Beta
- Invite beta testers

**Day 104:**
- Monitor crash reports in Sentry
- Fix critical bugs from beta
- Update builds with fixes

### Day 105: Launch

**Day 105:**
- Submit for App Store review
- Submit for Play Store review
- Monitor rollout
- **LAUNCH!** 🚀

---

## Risk Mitigation Updates

| Risk | Mitigation |
|------|------------|
| OAuth complexity | 2 full weeks allocated, provider-by-provider approach |
| Stripe issues | Test mode extensive testing, 1 full week for edge cases |
| App Store rejection | Review guidelines during Week 17, fix issues early |
| Solo dev burnout | Realistic daily tasks (8 hours), weekends off |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-06 | PM Team | Initial plan |
| 2.0 | 2026-01 | Claude | UI/UX alignment |
| 2.1 | 2026-01 | Claude | Full OAuth in MVP, detailed day-by-day breakdown |
