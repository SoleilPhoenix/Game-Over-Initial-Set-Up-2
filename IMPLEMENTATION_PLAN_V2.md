# Game-Over.app Implementation Plan v2.0

**Document ID:** IMPL-GO-2025-002
**Version:** 2.0
**Date:** January 2026
**Status:** Revised based on UI/UX Design Review
**Previous Version:** 1.0

---

## Executive Summary

This revised implementation plan incorporates all screens from the UI/UX design folder and addresses gaps identified in the original plan. Key additions include:

- **4-Step Event Creation Wizard** with preference capture
- **Rule-Based Package Matching Algorithm**
- **Topic-Based Communication Center** with Voting/Polling
- **Enhanced Budget Dashboard** with refund tracking
- **Package System** with Per Person/Total Group toggle

The Relationship Health Center is deferred to v1.1 per stakeholder decision.

---

## Key Changes from v1.0

| Aspect | v1.0 | v2.0 |
|--------|------|------|
| Timeline | 16 weeks | 18 weeks (expanded scope) |
| Event Creation | Basic form | 4-step wizard with preferences |
| Package Selection | Simple list | AI-matched with scoring |
| Chat | Single channel | Topic-based channels + Voting |
| Budget | Basic tracking | Hidden costs + Refunds |
| Payment | Standard flow | Exclude honoree toggle |
| Testing | TDD from Day 1 | TDD from Day 1 (unchanged) |
| Relationship Health | MVP feature | Deferred to v1.1 |

---

## Revised Phase Structure

```
Phase 0:  Architecture & Tooling           [Week 1]
Phase 1:  Foundation                        [Week 2-3]
Phase 2:  Authentication                    [Week 3-4]
├── Checkpoint: User Testing #1             [Week 4]
Phase 3:  Event Management                  [Week 5-6]
Phase 4:  Event Creation Wizard             [Week 5-7]      ← NEW
Phase 5:  Event Details & Destination       [Week 7-8]
Phase 6:  Package System                    [Week 8-10]     ← ENHANCED
Phase 7:  Communication Center              [Week 10-12]    ← RESTRUCTURED
├── Checkpoint: User Testing #2             [Week 12]
Phase 8:  Notifications                     [Week 12-13]
Phase 9:  Budget Dashboard                  [Week 13-14]    ← ENHANCED
├── Checkpoint: User Testing #3             [Week 14]
Phase 10: Profile & Settings                [Week 14-15]
Phase 11: Polish & Testing                  [Week 15-16]
Phase 12: Seed Data & Admin Panel           [Week 16-17]    ← ENHANCED
Phase 13: Deployment                        [Week 17-18]
Phase 14: Launch                            [Week 18]
Buffer                                      [+2 weeks]

Post-MVP (v1.1):
- Relationship Health Center
- Conflict Detection System
- Cohesion Scoring Algorithm
- Google/Facebook OAuth
- Advanced Voting (ranked choice)
```

---

## Phase 0: Architecture & Tooling [Week 1]

### 0.1 Technical Architecture Document

Before writing code, document decisions:

```markdown
# Architecture Decision Records (ADRs)

## ADR-001: State Management
- Decision: Zustand with slice pattern
- Stores: authStore, eventStore, chatStore, uiStore, packageStore
- Persistence: MMKV for performance

## ADR-002: Data Fetching
- Decision: TanStack Query (React Query)
- Benefits: Caching, optimistic updates, offline support

## ADR-003: Error Handling
- Decision: Error boundaries + global error handler
- Integration: Sentry for production monitoring

## ADR-004: Navigation
- Decision: Expo Router (file-based routing)
- Bottom tabs: Events, Chat, [+], Budget, Profile
```

### 0.2 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm test:e2e

  ios:
    runs-on: macos-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: npx expo prebuild --platform ios
      - run: xcodebuild test -workspace ios/*.xcworkspace -scheme GameOver

  android:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: npx expo prebuild --platform android
      - run: cd android && ./gradlew test
```

### 0.3 Project Structure v2.0

```
game-over-app/
├── app/                          # Expo Router screens
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/
│   │   ├── events/
│   │   │   ├── index.tsx         # My Events dashboard
│   │   │   ├── [id]/
│   │   │   │   ├── index.tsx     # Event Summary
│   │   │   │   ├── chat.tsx      # Communication Center
│   │   │   │   └── details.tsx
│   │   │   └── create/
│   │   │       ├── step-1.tsx    # Key Details
│   │   │       ├── step-2.tsx    # Honoree Preferences
│   │   │       ├── step-3.tsx    # Participant Preferences
│   │   │       └── step-4.tsx    # Package Selection
│   │   ├── chat/
│   │   │   └── index.tsx         # Chat hub
│   │   ├── budget/
│   │   │   └── index.tsx         # Budget Dashboard
│   │   └── profile/
│   │       ├── index.tsx         # User Settings
│   │       ├── settings.tsx      # Account Settings
│   │       └── notifications.tsx # Notification feed
│   ├── packages/
│   │   ├── [id].tsx              # Package Details
│   │   └── payment.tsx           # Payment Summary
│   └── _layout.tsx
├── src/
│   ├── components/
│   │   ├── ui/                   # Primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Toggle.tsx
│   │   │   └── Badge.tsx
│   │   └── features/             # Domain components
│   │       ├── EventCard.tsx
│   │       ├── PackageCard.tsx
│   │       ├── PollCard.tsx
│   │       ├── ChatChannel.tsx
│   │       ├── BudgetContribution.tsx
│   │       └── NotificationItem.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── types.ts
│   │   ├── stripe/
│   │   │   └── client.ts
│   │   └── sentry/
│   │       └── config.ts
│   ├── repositories/
│   │   ├── events.ts
│   │   ├── packages.ts
│   │   ├── bookings.ts
│   │   ├── messages.ts
│   │   ├── polls.ts
│   │   └── notifications.ts
│   ├── hooks/
│   │   ├── queries/              # React Query hooks
│   │   │   ├── useEvents.ts
│   │   │   ├── usePackages.ts
│   │   │   ├── usePolls.ts
│   │   │   └── useBudget.ts
│   │   └── mutations/
│   │       ├── useCreateEvent.ts
│   │       ├── useVote.ts
│   │       └── usePayment.ts
│   ├── stores/                   # Zustand stores
│   │   ├── authStore.ts
│   │   ├── eventStore.ts
│   │   ├── wizardStore.ts        # Event creation wizard state
│   │   └── uiStore.ts
│   ├── services/
│   │   ├── packageMatcher.ts     # Rule-based matching algorithm
│   │   ├── costCalculator.ts     # Payment splitting logic
│   │   └── analytics.ts
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
├── __tests__/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/
│   ├── seed-cities.ts
│   ├── seed-packages.ts
│   └── seed-test-data.ts
├── supabase/
│   ├── migrations/
│   └── functions/
└── docs/
    ├── ADRs/
    └── API.md
```

### 0.4 Testing Infrastructure

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      threshold: { statements: 70 }
    }
  }
})

// Detox for E2E (detox.config.js)
module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/jest.config.js',
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15 Pro' }
    }
  }
}
```

---

## Phase 1: Foundation [Week 2-3]

### 1.1 Environment Setup

```bash
# Required tools
- Node.js 20 LTS
- pnpm (faster than npm)
- Docker (for local Supabase)
- Xcode 15+ (iOS)
- Android Studio (Android)
```

### 1.2 Supabase Local Development

```bash
# Run Supabase locally for development
npx supabase init
npx supabase start

# Create migrations
npx supabase migration new create_initial_schema
```

### 1.3 Complete Database Schema

```sql
-- ===========================================
-- CORE TABLES
-- ===========================================

-- Users/Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'en',
  push_notifications_enabled BOOLEAN DEFAULT true,
  email_notifications_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cities (MVP: Berlin, Hamburg, Hannover)
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Germany',
  is_active BOOLEAN DEFAULT true,
  hero_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  party_type TEXT CHECK (party_type IN ('bachelor', 'bachelorette')) NOT NULL,
  honoree_name TEXT NOT NULL,
  city_id UUID REFERENCES cities(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  vibe TEXT, -- "High Energy / Nightlife"
  status TEXT CHECK (status IN ('draft', 'planning', 'booked', 'completed', 'cancelled')) DEFAULT 'draft',
  hero_image_url TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_status ON events(status);

-- Event Preferences (from 4-step wizard)
CREATE TABLE event_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE UNIQUE,

  -- Step 2: Honoree Preferences
  gathering_size TEXT CHECK (gathering_size IN ('intimate', 'small_group', 'party')),
  social_approach TEXT CHECK (social_approach IN ('wallflower', 'butterfly', 'observer', 'mingler')),
  energy_level TEXT CHECK (energy_level IN ('low_key', 'moderate', 'high_energy')),

  -- Step 3: Participant Preferences
  average_age TEXT CHECK (average_age IN ('21-25', '26-30', '31-35', '35+')),
  group_cohesion TEXT CHECK (group_cohesion IN ('close_friends', 'mixed_group', 'strangers')),
  vibe_preferences TEXT[], -- ['sports_action', 'culture', 'nightlife', 'wellness', 'outdoor']

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Participants
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  role TEXT CHECK (role IN ('organizer', 'guest', 'honoree')) NOT NULL,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  contribution_amount_cents INTEGER DEFAULT 0,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_participants_event ON event_participants(event_id);
CREATE INDEX idx_participants_user ON event_participants(user_id);

-- ===========================================
-- PACKAGE SYSTEM
-- ===========================================

-- Packages (Admin-managed)
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- "The Essential (S)"
  tier TEXT CHECK (tier IN ('essential', 'classic', 'grand')) NOT NULL,
  city_id UUID REFERENCES cities(id),

  -- Pricing
  base_price_cents INTEGER NOT NULL,
  price_per_person_cents INTEGER NOT NULL,

  -- Display
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]', -- ["Dinner reservations", "1 Nightlife pass"]
  premium_highlights JSONB DEFAULT '[]', -- ["Reserved Bar Area", "Private Wine Tasting"]
  hero_image_url TEXT,

  -- Ratings
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,

  -- AI Matching Criteria
  ideal_gathering_size TEXT[],
  ideal_energy_level TEXT[],
  ideal_vibe TEXT[],

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_packages_city ON packages(city_id);
CREATE INDEX idx_packages_tier ON packages(tier);

-- Package Reviews
CREATE TABLE package_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  review_text TEXT,
  reviewer_name TEXT, -- Can be different from profile name
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- COMMUNICATION CENTER
-- ===========================================

-- Chat Channels (Topic-based)
CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Main Lobby", "Villa Selection"
  category TEXT CHECK (category IN ('general', 'accommodation', 'activities', 'budget')) NOT NULL,
  unread_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_channels_event ON chat_channels(event_id);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_channel ON messages(channel_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Polls (Voting System)
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES chat_channels(id),
  category TEXT CHECK (category IN ('accommodation', 'activities', 'budget', 'general')),
  title TEXT NOT NULL, -- "Base Camp Location"
  description TEXT, -- "Decide where we crash for the weekend"
  status TEXT CHECK (status IN ('draft', 'active', 'closing_soon', 'closed')) DEFAULT 'draft',
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_polls_event ON polls(event_id);
CREATE INDEX idx_polls_status ON polls(status);

-- Poll Options
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- "Luxury Villa (Pool)"
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poll Votes
CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id) -- One vote per user per poll
);

-- ===========================================
-- BUDGET & PAYMENTS
-- ===========================================

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id),

  -- Pricing snapshot at booking time
  package_base_cents INTEGER NOT NULL,
  service_fee_cents INTEGER NOT NULL,
  total_amount_cents INTEGER NOT NULL,

  -- Options
  exclude_honoree BOOLEAN DEFAULT false,
  paying_participants INTEGER NOT NULL,
  per_person_cents INTEGER NOT NULL,

  -- Status
  payment_status TEXT CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  stripe_payment_intent_id TEXT,

  -- Audit
  audit_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_event ON bookings(event_id);
CREATE INDEX idx_bookings_status ON bookings(payment_status);

-- Refunds (for Budget Dashboard)
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  description TEXT NOT NULL, -- "Airbnb Deposit"
  category TEXT CHECK (category IN ('security_hold', 'overcharge', 'cancellation', 'adjustment')),
  amount_cents INTEGER NOT NULL,
  status TEXT CHECK (status IN ('processing', 'received', 'failed')) DEFAULT 'processing',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- NOTIFICATIONS
-- ===========================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),

  type TEXT CHECK (type IN (
    'budget_update',
    'booking_confirmed',
    'feedback_received',
    'payment_received',
    'payment_reminder',
    'poll_created',
    'poll_closing',
    'event_reminder'
    -- v1.1: 'relationship_health', 'conflict_detected'
  )) NOT NULL,

  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT, -- Deep link
  is_read BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ===========================================
-- DESTINATION GUIDE
-- ===========================================

CREATE TABLE destination_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- "Top Rated Spots in Vegas"
  content_type TEXT CHECK (content_type IN ('guide', 'recommendation', 'tip')),
  description TEXT,
  image_url TEXT,
  external_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- RATE LIMITING
-- ===========================================

CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Events: participants can view, organizers can modify
CREATE POLICY "Participants can view events" ON events
  FOR SELECT USING (
    id IN (SELECT event_id FROM event_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Organizers can modify events" ON events
  FOR ALL USING (
    id IN (SELECT event_id FROM event_participants
           WHERE user_id = auth.uid() AND role = 'organizer')
  );

-- Messages: event participants can view/create
CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT USING (
    channel_id IN (
      SELECT cc.id FROM chat_channels cc
      JOIN event_participants ep ON ep.event_id = cc.event_id
      WHERE ep.user_id = auth.uid()
    )
  );
```

### 1.4 Repository Pattern

```typescript
// src/repositories/events.ts
import { supabase } from '@/lib/supabase/client';
import { AppError } from '@/utils/errors';

export const eventsRepository = {
  async getByUser(userId: string) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        city:cities(name),
        participants:event_participants(count),
        preferences:event_preferences(*)
      `)
      .eq('created_by', userId)
      .is('deleted_at', null)
      .order('start_date', { ascending: true });

    if (error) throw new AppError('EVENTS_FETCH_FAILED', error);
    return data;
  },

  async getById(eventId: string) {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        city:cities(*),
        preferences:event_preferences(*),
        participants:event_participants(
          *,
          user:profiles(id, full_name, avatar_url)
        ),
        booking:bookings(*)
      `)
      .eq('id', eventId)
      .single();

    if (error) throw new AppError('EVENT_NOT_FOUND', error);
    return data;
  },

  async create(event: CreateEventInput) {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single();

    if (error) throw new AppError('EVENT_CREATE_FAILED', error);
    return data;
  }
};
```

---

## Phase 2: Authentication [Week 3-4]

### 2.1 OAuth Configuration (MVP: Email + Apple only)

```typescript
// src/lib/supabase/auth.ts
import { supabase } from './client';
import * as AppleAuthentication from 'expo-apple-authentication';

export const auth = {
  // Email/Password
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'gameover://auth/callback'
      }
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  // Apple Sign-In (required for iOS)
  async signInWithApple() {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL
      ]
    });

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken!
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
};
```

### 2.2 Security Measures

```typescript
// Rate limiting on auth attempts
const MAX_AUTH_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Input validation
import { z } from 'zod';

export const authSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128)
});

// Secure token storage
import * as SecureStore from 'expo-secure-store';

export const tokenStorage = {
  async setToken(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async removeToken(key: string) {
    await SecureStore.deleteItemAsync(key);
  }
};
```

### 2.3 Deep Linking Setup

```typescript
// app.config.ts
export default {
  scheme: 'gameover',
  android: {
    intentFilters: [{
      action: 'VIEW',
      data: [
        { scheme: 'https', host: 'gameover.app', pathPrefix: '/invite' },
        { scheme: 'https', host: 'gameover.app', pathPrefix: '/event' }
      ]
    }]
  },
  ios: {
    associatedDomains: ['applinks:gameover.app']
  }
};
```

### 2.4 UI Screens (from design)

**Screen: Welcome/Landing**
- Hero image with party scene
- Headline: "Bachelor parties without the drama."
- Subtext: "Let AI plan an unforgettable night that everyone enjoys—and remembers fondly."
- Primary CTA: "Get Started →"
- Secondary: "Already have an account? Log In"

**Screen: Sign Up**
- Back arrow, "Log In" link
- Headline: "Plan better. Party smarter."
- Email input field
- Password input field
- "Create Account" button
- "OR CONTINUE WITH" divider
- OAuth buttons: Apple, Google, Facebook (Google/Facebook grayed out for MVP)
- Terms acceptance text

---

## Phase 3: Event Management [Week 5-6]

### 3.1 My Events Dashboard (from design: Screen 3)

**UI Components:**
- Profile avatar with online indicator
- "My Events" title
- Notification bell with badge
- Tab bar: All | Organizing | Attending
- Event cards with:
  - Hero image
  - Event name (truncated)
  - Date range
  - Role badge (ORGANIZER / GUEST)
  - Payment status (if guest)
  - Progress indicator with percentage
  - Status label (Planning Phase, All Set & Ready, Budgeting)
- "Start New Plan" dashed button
- Bottom navigation: Events, Chat, [+], Budget, Profile

```typescript
// src/components/features/EventCard.tsx
interface EventCardProps {
  event: Event;
  onPress: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const progress = calculateEventProgress(event);
  const statusConfig = getStatusConfig(event.status);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Image source={{ uri: event.hero_image_url }} style={styles.heroImage} />

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>

        <View style={styles.meta}>
          <CalendarIcon />
          <Text style={styles.dateRange}>
            {formatDateRange(event.start_date, event.end_date)}
          </Text>
        </View>

        <View style={styles.badges}>
          <Badge variant={event.role === 'organizer' ? 'primary' : 'secondary'}>
            {event.role.toUpperCase()}
          </Badge>
          {event.role === 'guest' && (
            <Badge variant={event.payment_status === 'paid' ? 'success' : 'warning'}>
              • {event.payment_status === 'paid' ? 'Paid' : 'Pending'}
            </Badge>
          )}
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={styles.statusLabel}>{statusConfig.label}</Text>
          <Text style={styles.percentage}>{progress}%</Text>
        </View>
        <ProgressBar value={progress} color={statusConfig.color} />
      </View>

      <MoreOptionsButton eventId={event.id} />
    </Pressable>
  );
}
```

---

## Phase 4: Event Creation Wizard [Week 5-7] ← NEW

### 4.1 Multi-Step Form Architecture

```typescript
// src/stores/wizardStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

interface WizardState {
  currentStep: number;

  // Step 1: Key Details
  partyType: 'bachelor' | 'bachelorette' | null;
  honoreeName: string;
  cityId: string | null;

  // Step 2: Honoree Preferences
  gatheringSize: 'intimate' | 'small_group' | 'party' | null;
  socialApproach: 'wallflower' | 'butterfly' | 'observer' | 'mingler' | null;
  energyLevel: 'low_key' | 'moderate' | 'high_energy' | null;

  // Step 3: Participant Preferences
  averageAge: '21-25' | '26-30' | '31-35' | '35+' | null;
  groupCohesion: 'close_friends' | 'mixed_group' | 'strangers' | null;
  vibePreferences: string[];

  // Step 4: Package Selection
  selectedPackageId: string | null;

  // Actions
  setStep: (step: number) => void;
  updateStep1: (data: Partial<Step1Data>) => void;
  updateStep2: (data: Partial<Step2Data>) => void;
  updateStep3: (data: Partial<Step3Data>) => void;
  selectPackage: (packageId: string) => void;
  reset: () => void;
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      currentStep: 1,
      partyType: null,
      honoreeName: '',
      cityId: null,
      gatheringSize: null,
      socialApproach: null,
      energyLevel: null,
      averageAge: null,
      groupCohesion: null,
      vibePreferences: [],
      selectedPackageId: null,

      setStep: (step) => set({ currentStep: step }),

      updateStep1: (data) => set((state) => ({ ...state, ...data })),
      updateStep2: (data) => set((state) => ({ ...state, ...data })),
      updateStep3: (data) => set((state) => ({ ...state, ...data })),

      selectPackage: (packageId) => set({ selectedPackageId: packageId }),

      reset: () => set({
        currentStep: 1,
        partyType: null,
        honoreeName: '',
        cityId: null,
        gatheringSize: null,
        socialApproach: null,
        energyLevel: null,
        averageAge: null,
        groupCohesion: null,
        vibePreferences: [],
        selectedPackageId: null
      })
    }),
    {
      name: 'wizard-storage',
      storage: createJSONStorage(() => ({
        getItem: (name) => storage.getString(name) ?? null,
        setItem: (name, value) => storage.set(name, value),
        removeItem: (name) => storage.delete(name)
      }))
    }
  )
);
```

### 4.2 Step 1: Key Details (Screen 11)

**UI Components:**
- Back arrow, "Create New Event" title, more options
- "Key Details" heading with "STEP 1 OF 4"
- Progress bar (4 segments)
- Description text

- **Party For** section:
  - Bachelor Party (selected state with checkmark)
  - Bachelorette Party

- **Honoree's Name** section:
  - Text input field

- **Select City** section:
  - Chip buttons: Berlin (selected), Hamburg, Hannover

- Bottom navigation: Back arrow, "Next Step →" button

```typescript
// app/events/create/step-1.tsx
export default function CreateEventStep1() {
  const { partyType, honoreeName, cityId, updateStep1 } = useWizardStore();
  const { data: cities } = useCities();
  const router = useRouter();

  const canProceed = partyType && honoreeName.trim() && cityId;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Create New Event" showBack />

      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.heading}>Key Details</Text>
          <Text style={styles.step}>STEP 1 OF 4</Text>
        </View>

        <StepProgressBar current={1} total={4} />

        <Text style={styles.description}>
          Start by defining the basics. We'll use this to tailor the entire party experience.
        </Text>

        {/* Party For */}
        <Section title="Party For" icon={<PartyIcon />}>
          <SelectableButton
            selected={partyType === 'bachelor'}
            onPress={() => updateStep1({ partyType: 'bachelor' })}
            icon={<MaleIcon />}
            label="Bachelor Party"
          />
          <SelectableButton
            selected={partyType === 'bachelorette'}
            onPress={() => updateStep1({ partyType: 'bachelorette' })}
            icon={<FemaleIcon />}
            label="Bachelorette Party"
          />
        </Section>

        {/* Honoree's Name */}
        <Section title="Honoree's Name" icon={<PersonIcon />}>
          <TextInput
            value={honoreeName}
            onChangeText={(text) => updateStep1({ honoreeName: text })}
            placeholder="Enter name"
            style={styles.input}
          />
        </Section>

        {/* Select City */}
        <Section title="Select City" icon={<LocationIcon />}>
          <View style={styles.chips}>
            {cities?.map((city) => (
              <Chip
                key={city.id}
                selected={cityId === city.id}
                onPress={() => updateStep1({ cityId: city.id })}
                label={city.name}
              />
            ))}
          </View>
        </Section>
      </ScrollView>

      <View style={styles.footer}>
        <IconButton icon={<ChevronLeft />} onPress={() => router.back()} />
        <Button
          label="Next Step"
          icon={<ArrowRight />}
          disabled={!canProceed}
          onPress={() => router.push('/events/create/step-2')}
        />
      </View>
    </SafeAreaView>
  );
}
```

### 4.3 Step 2: Honoree Preferences (Screen 12)

**UI Components:**
- "Preferences" title with "STEP 2 OF 4"
- "Groom's Preferences" / "Bride's Preferences" heading
- Progress bar

- **Social Energy** section:
  - GATHERING SIZE: Intimate (1-4), Small Group (selected), Party (10+)
  - SOCIAL APPROACH: Wallflower, Butterfly (selected), Observer, Mingler

- **Activity** section:
  - ENERGY LEVEL: Low Key, Moderate, High Energy

- Footer: Back, "Next Step →"

### 4.4 Step 3: Participant Preferences (Screen 13)

**UI Components:**
- "Participants Preferences" heading with "STEP 3 OF 4"
- Description: "Tailor the event to the group's profile..."

- **Group Dynamics** section:
  - AVERAGE AGE: 21-25, 26-30 (selected), 31-35, 35+
  - GROUP COHESION: Close Friends, Mixed Group (selected), Strangers

- **Shared Interests** section:
  - VIBE PREFERENCE: Sports & Action, Culture, Nightlife, Wellness, Outdoor

- Footer: "Skip" button, "Save ✓" button

### 4.5 Step 4: Package Selection (Screen 14-15)

**UI Components:**
- "Package Selection" title with "Step 4 of 4"
- "Choose Your Experience" heading
- "Select a tier that fits your group's vibe."
- Toggle: Per Person | Total Group

- **Package Cards** (3 tiers):
  - **The Essential (S)**
    - $145 Per Person / $1,450 Total Group
    - 4.5 stars (120 reviews)
    - Features: Dinner reservations, 1 Nightlife entry pass, Standard itinerary support
    - "Select Package" button

  - **The Classic (M)** - "BEST MATCH 🤖" badge
    - $249 Per Person / $2,490 Total Group
    - 4.9 stars (340 reviews)
    - Testimonial quote
    - Features: Private transport, Premium Dinner Reservations, VIP Club Table & Service
    - "Select Recommended Package" button (highlighted)

  - **The Grand (L)**
    - $535 Per Person / $5,350 Total Group
    - 5.0 stars (85 reviews)
    - Features: Full Weekend Itinerary, Private Yacht Rental (4hrs), 24/7 Private Concierge & Security
    - "Select Package" button

```typescript
// src/services/packageMatcher.ts
interface MatchResult {
  packageId: string;
  score: number;
  isBestMatch: boolean;
}

export function calculatePackageMatches(
  preferences: EventPreferences,
  packages: Package[]
): MatchResult[] {
  const scored = packages.map((pkg) => ({
    packageId: pkg.id,
    score: calculateMatchScore(preferences, pkg)
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Mark highest as best match
  return scored.map((result, index) => ({
    ...result,
    isBestMatch: index === 0 && result.score >= 60 // Only if score is meaningful
  }));
}

function calculateMatchScore(
  preferences: EventPreferences,
  pkg: Package
): number {
  let score = 0;

  // Gathering size match (0-30 points)
  if (pkg.ideal_gathering_size?.includes(preferences.gathering_size)) {
    score += 30;
  }

  // Energy level match (0-25 points)
  if (pkg.ideal_energy_level?.includes(preferences.energy_level)) {
    score += 25;
  }

  // Vibe overlap (0-30 points)
  const vibeOverlap = preferences.vibe_preferences.filter(
    (v) => pkg.ideal_vibe?.includes(v)
  ).length;
  score += Math.min(vibeOverlap * 10, 30);

  // Group cohesion alignment (0-15 points)
  // Close friends → premium packages score higher
  // Mixed/Strangers → structured packages score higher
  if (preferences.group_cohesion === 'close_friends' && pkg.tier === 'grand') {
    score += 15;
  } else if (preferences.group_cohesion === 'strangers' && pkg.tier === 'essential') {
    score += 15;
  } else if (preferences.group_cohesion === 'mixed_group' && pkg.tier === 'classic') {
    score += 15;
  }

  return score; // Max 100
}
```

---

## Phase 5: Event Details & Destination [Week 7-8]

### 5.1 Event Summary Screen (Screen 4)

**UI Components:**
- Back arrow, "Event Summary" title, Edit icon
- Event name: "Sarah's Bachelorette"
- Tagline: "Let's make memories, not mistakes."

- **Info Card:**
  - LOCATION: Las Vegas, NV (with location icon)
  - DATES: Nov 12 - Nov 14 (with calendar icon)
  - VIBE: High Energy / Nightlife (with vibe icon)

- **Planning Tools** grid (2x2):
  - Manage Invitations: "8/10 Confirmed" (with badge)
  - Group Chat: "2 Unread Polls" (with notification dot)
  - Budget: "$450/person est."
  - Packages: "VIP Tables Selected"

- **Destination Guide** card:
  - Hero image of destination
  - "DESTINATION GUIDE"
  - "Top Rated Spots in Vegas"
  - Arrow CTA

- Bottom navigation

### 5.2 Destination Guide Implementation

```typescript
// src/hooks/queries/useDestinationContent.ts
export function useDestinationContent(cityId: string) {
  return useQuery({
    queryKey: ['destination-content', cityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('destination_content')
        .select('*')
        .eq('city_id', cityId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000 // Cache for 24 hours
  });
}
```

---

## Phase 6: Package System [Week 8-10] ← ENHANCED

### 6.1 Package Details Screen (Screens 16-18)

**UI Components - The Essential (S):**
- Back arrow, "Package Details" title, Heart/Favorite icon
- Hero image (blurred/gradient)
- Package name: "The Essential (S)"
- Rating: 4.8 (120 reviews)
- Price: "$850 Total Group"
- Description text
- **PREMIUM HIGHLIGHT**: Reserved Bar Area icon
- "View price breakdown" link
- "Book Now" button
- "24/7 Digital Concierge" badge
- User testimonial card

**UI Components - The Classic (M):**
- "AI RECOMMENDED 🤖" badge overlay on image
- Package name: "The Classic (M)"
- Rating: 4.9 (340 reviews)
- Price: "$1,500 Total Group"
- Description
- **PREMIUM HIGHLIGHTS** grid: Private Wine Tasting, Fine Dining Experience
- "View price breakdown" link
- "Book Now" button
- VIP Club Access badge
- 24/7 Digital Concierge badge
- User testimonial

**UI Components - The Grand (L):**
- Package name: "The Grand (L)"
- Rating: 5.0 (128 reviews)
- Price: "$3,200 Total Group"
- Description
- **PREMIUM HIGHLIGHTS**: Private Yacht Charter, Penthouse Suite
- Package includes list:
  - Private Luxury Limo
  - All-Access VIP Pass
  - 24/7 Digital Concierge
  - Premium Bottle Service
  - Recovery Spa Session
- Multiple user testimonials

### 6.2 Payment Summary Screen (Screen 19)

**UI Components:**
- Back arrow, "Payment Summary" title
- **Selected Package** card:
  - Package image
  - "SELECTED PACKAGE"
  - "The Classic (M)"
  - "Berlin • 2 Nights • 10 Guests"

- **Cost Breakdown** section:
  - Package Base: €1,200.00
  - Service Fee (10%): €120.00
  - Total Group Cost: €1,320.00

- **Exclude Honoree** toggle:
  - "Exclude Honoree" label
  - "Honoree pays €0.00" subtext
  - Toggle switch (ON state shown)

- **Cost Per Person** card:
  - "COST PER PERSON (9 PAYING)"
  - "€146.66 / person"
  - "✓ Includes all taxes & fees"

- "🔒 Secure payment processing via Stripe" badge
- Cancellation policy text
- "Proceed to Payment →" button

```typescript
// src/services/costCalculator.ts
interface CostBreakdown {
  packageBaseCents: number;
  serviceFeeCents: number;
  totalGroupCents: number;
  payingParticipants: number;
  perPersonCents: number;
}

export function calculateCosts(
  packagePrice: number,
  totalParticipants: number,
  excludeHonoree: boolean
): CostBreakdown {
  const packageBaseCents = packagePrice;

  // Service fee: 10% or minimum €50
  const tenPercent = Math.round(packageBaseCents * 0.10);
  const minimumFee = 5000; // €50 in cents
  const serviceFeeCents = Math.max(tenPercent, minimumFee);

  const totalGroupCents = packageBaseCents + serviceFeeCents;

  const payingParticipants = excludeHonoree
    ? totalParticipants - 1
    : totalParticipants;

  const perPersonCents = Math.ceil(totalGroupCents / payingParticipants);

  return {
    packageBaseCents,
    serviceFeeCents,
    totalGroupCents,
    payingParticipants,
    perPersonCents
  };
}
```

### 6.3 Stripe Integration

```typescript
// supabase/functions/create-payment-intent/index.ts
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

serve(async (req) => {
  const { bookingId } = await req.json();

  // Validate booking exists and belongs to user
  const booking = await validateBooking(bookingId, req.headers);

  // Idempotency key prevents duplicate charges
  const idempotencyKey = `booking_${bookingId}`;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: booking.total_amount_cents,
    currency: 'eur',
    metadata: {
      bookingId,
      eventId: booking.event_id
    }
  }, { idempotencyKey });

  // Update booking with payment intent ID
  await supabase
    .from('bookings')
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq('id', bookingId);

  return new Response(JSON.stringify({
    clientSecret: paymentIntent.client_secret
  }));
});

// Webhook handler
serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  const event = stripe.webhooks.constructEvent(
    body,
    sig!,
    Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  );

  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
  }

  return new Response(JSON.stringify({ received: true }));
});
```

---

## Phase 7: Communication Center [Week 10-12] ← RESTRUCTURED

### 7.1 Three-Tab Architecture (Screen 5, 7)

**Communication Center Screen:**
- Back arrow, Event name + "Communication Center", Search icon, Avatar
- **Tab bar**: Chat | Voting | Decisions

- **Share Event** banner:
  - "Share Event"
  - "Invite friends to join the party planning"
  - "Invite" button with share icon

### 7.2 Chat Tab (Screen 5)

**Sections:**
- **GENERAL**
  - Main Lobby channel
  - Last message preview: "You: Did everyone see the flight..."
  - Participant avatars + count: "6 participants"
  - "Just now" timestamp

- **ACCOMMODATION**
  - Villa Selection channel
  - "Michael: I think the one with the pool i..."
  - "3" unread badge
  - "10:42" timestamp

  - Room Allocation channel
  - "Sarah: I'm fine with the bunk beds if..."
  - "Yesterday" timestamp

- **ACTIVITIES**
  - Casino Night channel
  - "David: Rules are set. Bringing the chips."
  - "Tue" timestamp

  - Golf Booking channel
  - "Alex: Tee times are confirmed for 9AM."
  - "Mon" timestamp

- **BUDGET**
  - Payment Schedule channel
  - "System: Deposit deadline is..."
  - "Last Week" timestamp

- **+ buttons** to add channels in each section

```typescript
// Auto-create default channels on event creation
async function createDefaultChannels(eventId: string) {
  const defaultChannels = [
    { name: 'Main Lobby', category: 'general' }
  ];

  await supabase
    .from('chat_channels')
    .insert(defaultChannels.map(ch => ({
      ...ch,
      event_id: eventId
    })));
}

// Real-time subscription for messages
function useChatSubscription(channelId: string) {
  useEffect(() => {
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      }, (payload) => {
        // Add new message to state
        queryClient.setQueryData(
          ['messages', channelId],
          (old) => [...old, payload.new]
        );
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [channelId]);
}
```

### 7.3 Voting Tab (Screen 7)

**UI Components:**
- **New Poll +** button (top right)

- **ACCOMMODATION** section
  - **Poll Card: Base Camp Location**
    - "ACTIVE" badge
    - "Decide where we crash for the weekend"
    - Option 1: "Luxury Villa (Pool)" - 65% - avatars
    - Option 2: "Downtown Hotel Suites" - 35% - initials
    - "6 votes cast • Ends in 24h"
    - "Tap option to vote" CTA

- **ACTIVITIES** section
  - **Poll Card: Saturday Afternoon**
    - "CLOSING SOON" badge (orange)
    - "What's the plan for 2PM - 6PM?"
    - Option 1: "Go-Kart Racing" - 8 votes (selected with checkmark)
    - Option 2: "Top Golf" - 2 votes
    - "10 votes cast • Ends in 2h"
    - "✓ You voted" indicator

- **BUDGET** section
  - **Poll Card: Steakhouse Budget**
    - "DRAFT" badge (gray)
    - "Target spend per person for Sat dinner"
    - Dashed border: "This poll is currently in draft mode. Options are being finalized."
    - "Add Suggestion" link

```typescript
// src/components/features/PollCard.tsx
interface PollCardProps {
  poll: Poll;
  options: PollOption[];
  userVote: string | null;
  onVote: (optionId: string) => void;
}

export function PollCard({ poll, options, userVote, onVote }: PollCardProps) {
  const totalVotes = options.reduce((sum, opt) => sum + opt.vote_count, 0);
  const timeRemaining = getTimeRemaining(poll.ends_at);

  return (
    <Card style={styles.pollCard}>
      <View style={styles.header}>
        <CategoryIcon category={poll.category} />
        <Text style={styles.title}>{poll.title}</Text>
        <PollStatusBadge status={poll.status} />
      </View>

      {poll.description && (
        <Text style={styles.description}>{poll.description}</Text>
      )}

      {poll.status === 'draft' ? (
        <DraftPollPlaceholder onAddSuggestion={() => {}} />
      ) : (
        <View style={styles.options}>
          {options.map((option) => (
            <PollOption
              key={option.id}
              option={option}
              percentage={totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0}
              isSelected={userVote === option.id}
              onPress={() => onVote(option.id)}
              disabled={poll.status === 'closed' || !!userVote}
            />
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.voteCount}>{totalVotes} votes cast</Text>
        {poll.ends_at && (
          <Text style={styles.timeRemaining}>
            • {timeRemaining.isClosing ? 'Ends in ' : ''}{timeRemaining.text}
          </Text>
        )}
        {userVote ? (
          <View style={styles.votedIndicator}>
            <CheckIcon color="green" />
            <Text style={styles.votedText}>You voted</Text>
          </View>
        ) : (
          <Text style={styles.tapToVote}>Tap option to vote</Text>
        )}
      </View>
    </Card>
  );
}
```

---

## Phase 8: Notifications [Week 12-13]

### 8.1 Notifications Screen (Screen 9)

**UI Components:**
- Back arrow, "Notifications" title, Mark all read icon

- **TODAY** section
  - **Relationship Health** (pink heart icon) - v1.1
    - "Group cohesion score is up! 🚀 Cohesion increased by 15% after the latest poll participation."
    - "VIEW INSIGHTS →" CTA
    - "Just now"

  - **Conflict Detected** (yellow warning icon) - v1.1
    - Yellow left border
    - "Dietary preferences conflict for 'Sushi Samba'. 2 guests have allergies."
    - "Resolve in Voting Tab →" button
    - "2h ago"

  - **Budget Update** (green dollar icon)
    - "New expense added: 'Party Bus Deposit' ($200). Your estimated share is now $485."
    - "4h ago"

- **YESTERDAY** section
  - **Booking Confirmed** (blue checkmark)
    - "VIP Table at Omnia has been secured. Confirmation #88291 is saved to itinerary."
    - "10:42 AM"

  - **Feedback Received** (orange star)
    - "Mike left a comment on the Saturday Brunch options: 'Love the bottomless mimosa idea!'"
    - "9:15 AM"

  - **Payment Received** (green dollar)
    - "Jessica paid $150 towards the Airbnb. 2 guests remaining."
    - "8:30 AM"

```typescript
// MVP Notification Types (without relationship health)
const NOTIFICATION_CONFIGS = {
  budget_update: {
    icon: DollarIcon,
    iconBg: '#22C55E',
    category: 'budget'
  },
  booking_confirmed: {
    icon: CheckCircleIcon,
    iconBg: '#3B82F6',
    category: 'booking'
  },
  feedback_received: {
    icon: StarIcon,
    iconBg: '#F97316',
    category: 'social'
  },
  payment_received: {
    icon: DollarIcon,
    iconBg: '#22C55E',
    category: 'payment'
  },
  payment_reminder: {
    icon: BellIcon,
    iconBg: '#EAB308',
    category: 'payment'
  },
  poll_created: {
    icon: ChartBarIcon,
    iconBg: '#8B5CF6',
    category: 'voting'
  },
  poll_closing: {
    icon: ClockIcon,
    iconBg: '#F97316',
    category: 'voting'
  }
};
```

---

## Phase 9: Budget Dashboard [Week 13-14] ← ENHANCED

### 9.1 Budget Dashboard Screen (Screen 6)

**UI Components:**
- Back arrow, "Budget Dashboard" title, Filter icon

- **Total Budget** card
  - "On Track" badge (green)
  - "$3,375 of $4,500"
  - Progress bar (75% filled)
  - "● Spent (75%)" | "$1,125 Remaining"

- **Group Contributions** section
  - "Remind All" link (top right)
  - Participant rows:
    - Avatar, "Sarah Jenkins (You)", "$1,500 Contribution", "✓ PAID" (green badge)
    - Initials "JD", "John Doe", "$250 Remaining", "⚠ PENDING" (yellow badge)
    - Initials "EM", "Emily Mars", "$1,500 Contribution", "✓ PAID"

- **Hidden Cost Alerts** section
  - Green checkmark icon
  - "No hidden costs detected"
  - "Great job! All expenses are accounted for within the agreed budget."

- **Refund Tracking** section
  - Row 1: Home icon, "Airbnb Deposit", "Security Hold", "+$500.00", "Processing" (blue)
  - Row 2: Car icon, "Uber Adjustment", "Overcharge", "+$12.50", "Received" (green)

- "Data updated just now" footer
- Bottom navigation

```typescript
// src/hooks/queries/useBudget.ts
export function useBudget(eventId: string) {
  return useQuery({
    queryKey: ['budget', eventId],
    queryFn: async () => {
      const [booking, participants, refunds] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('event_id', eventId)
          .single(),
        supabase
          .from('event_participants')
          .select('*, user:profiles(id, full_name, avatar_url)')
          .eq('event_id', eventId),
        supabase
          .from('refunds')
          .select('*')
          .eq('event_id', eventId)
      ]);

      return {
        totalBudget: booking.data?.total_amount_cents || 0,
        spent: calculateSpent(participants.data),
        contributions: participants.data,
        refunds: refunds.data,
        hiddenCosts: detectHiddenCosts(booking.data, participants.data)
      };
    }
  });
}

function detectHiddenCosts(booking: Booking, participants: Participant[]) {
  const issues = [];

  // Check for unaccounted fees
  // Check for gratuity gaps
  // Check for conversion fees

  return issues.length > 0 ? issues : null;
}
```

---

## Phase 10: Profile & Settings [Week 14-15]

### 10.1 User Settings Screen (Screen 8)

**UI Components:**
- Back arrow, "User Settings" title
- Profile avatar with edit overlay
- "Sarah Jenkins"
- "sarah.j@example.com"

- **NOTIFICATIONS** section
  - Unified Feed → (with red dot indicator)

- **ACCOUNT** section
  - Edit Profile →
  - Password & Security →
  - Language → "English (US)"

- **WELLNESS & SUPPORT** section
  - Relationship Health Center → (heart icon, disabled for MVP - "Coming Soon")
  - Support & FAQ →

- "Log Out" button (red)
- "Version 2.4.0 (Build 302)" footer

### 10.2 Account Settings Screen (Screen 10)

**UI Components:**
- Back arrow, "Account Settings" title
- Profile avatar with edit icon
- "Sarah Jenkins"
- "sarah.jenkins@example.com"

- **GENERAL** section
  - Edit Profile →
  - Change Password →
  - Language → "English"

- **NOTIFICATIONS** section
  - Push Notifications → Toggle ON
    - "Party updates & alerts"
  - Email Notifications → Toggle OFF
    - "Digest & summaries"

- "Log Out" button (red)
- "Version 2.4.0" footer

---

## Phase 11: Polish & Testing [Week 15-16]

### 11.1 Performance Optimization

```typescript
// Image optimization with expo-image
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>

// List virtualization
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={events}
  renderItem={renderEventCard}
  estimatedItemSize={200}
  keyExtractor={(item) => item.id}
/>
```

### 11.2 Accessibility

```typescript
// Screen reader support
<Pressable
  accessible
  accessibilityRole="button"
  accessibilityLabel={`${event.title}, ${event.status}, tap to view details`}
  accessibilityHint="Opens event details"
>
  <EventCard event={event} />
</Pressable>

// Dynamic type support
import { useDynamicTypeSize } from '@/hooks/useDynamicTypeSize';

const textSize = useDynamicTypeSize('body');
```

---

## Phase 12: Seed Data & Admin Panel [Week 16-17] ← ENHANCED

### 12.1 Seed Data Scripts

```typescript
// scripts/seed-cities.ts
const cities = [
  { name: 'Berlin', country: 'Germany', is_active: true },
  { name: 'Hamburg', country: 'Germany', is_active: true },
  { name: 'Hannover', country: 'Germany', is_active: true }
];

// scripts/seed-packages.ts
const packages = [
  {
    name: 'The Essential (S)',
    tier: 'essential',
    base_price_cents: 145000, // €1,450 total
    price_per_person_cents: 14500, // €145/person
    features: [
      'Dinner reservations included',
      '1 Nightlife entry pass',
      'Standard itinerary support'
    ],
    premium_highlights: ['Reserved Bar Area'],
    ideal_gathering_size: ['intimate', 'small_group'],
    ideal_energy_level: ['low_key', 'moderate'],
    ideal_vibe: ['culture', 'wellness']
  },
  {
    name: 'The Classic (M)',
    tier: 'classic',
    base_price_cents: 249000,
    price_per_person_cents: 24900,
    features: [
      'Private transport included',
      'Premium Dinner Reservations',
      'VIP Club Table & Service'
    ],
    premium_highlights: ['Private Wine Tasting', 'Fine Dining Experience'],
    ideal_gathering_size: ['small_group', 'party'],
    ideal_energy_level: ['moderate', 'high_energy'],
    ideal_vibe: ['nightlife', 'sports_action']
  },
  {
    name: 'The Grand (L)',
    tier: 'grand',
    base_price_cents: 535000,
    price_per_person_cents: 53500,
    features: [
      'Full Weekend Itinerary',
      'Private Yacht Rental (4hrs)',
      '24/7 Private Concierge & Security'
    ],
    premium_highlights: ['Private Yacht Charter', 'Penthouse Suite'],
    ideal_gathering_size: ['party'],
    ideal_energy_level: ['high_energy'],
    ideal_vibe: ['nightlife', 'outdoor']
  }
];
```

### 12.2 Admin Panel Requirements

Admin capabilities (via Supabase Dashboard initially, then custom web app):

1. **Cities Management**
   - CRUD cities
   - Toggle active status
   - Upload hero images

2. **Packages Management**
   - CRUD packages
   - Set pricing (base + per-person)
   - Manage features and highlights
   - Upload images
   - Configure matching criteria
   - Toggle active status

3. **Destination Content**
   - CRUD destination guides per city
   - Upload images
   - Set display order

4. **Bookings Overview**
   - View all bookings
   - Filter by status, city, date
   - View payment status

5. **Analytics Dashboard**
   - Booking conversion rates
   - Revenue by package tier
   - Popular cities

---

## Phase 13-14: Deployment & Launch [Week 17-18]

### 13.1 Deployment Checklist

- [ ] CI/CD pipeline green
- [ ] All E2E tests passing
- [ ] Security audit complete
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] App Store screenshots ready
- [ ] Privacy policy published
- [ ] Terms of service published

### 13.2 Launch Checklist

- [ ] TestFlight beta complete
- [ ] Google Play beta complete
- [ ] Seed data loaded in production
- [ ] Sentry configured
- [ ] Analytics tracking verified
- [ ] Monitoring dashboards set up
- [ ] Rollback plan documented

---

## Post-MVP: v1.1 Features

### Relationship Health Center
- Cohesion scoring algorithm
- Conflict detection system
- "Resolve in Voting Tab" workflows
- Group dynamics insights
- Relationship Health notifications

### Additional OAuth
- Google Sign-In
- Facebook Login

### Advanced Voting
- Ranked choice voting
- Anonymous voting option
- Auto-close polls at deadline

---

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep from UI details | High | Medium | Strict phase gates |
| Stripe integration complexity | High | High | Full week allocation, test mode |
| 4-step wizard UX issues | Medium | High | User testing at Week 4 |
| Real-time chat performance | Medium | Medium | Supabase Realtime, pagination |
| Package matching accuracy | Medium | Low | Rule-based is simple, iterate post-MVP |
| App Store rejection | Medium | High | Review guidelines early |
| Solo dev burnout | High | Critical | Realistic timeline, weekends off |

---

## Budget (Year 1)

| Item | Cost | Priority |
|------|------|----------|
| Supabase Pro | $25/mo | Required |
| Sentry | Free tier → $26/mo | Critical |
| Mixpanel/Amplitude | Free tier | High |
| Apple Developer | $99/year | Required |
| Google Play | $25 one-time | Required |
| Domain + SSL | ~$15/year | Required |
| Stripe fees | 2.9% + €0.25/tx | Variable |
| **Total Year 1** | **~$500 + Stripe fees** | |

---

## First Week Milestones

| Day | Task | Verification |
|-----|------|--------------|
| 1 | Install Node 20, pnpm, Docker | `node -v`, `pnpm -v`, `docker -v` |
| 2 | Install Expo CLI, EAS CLI, Xcode, Android Studio | Create test project |
| 3 | Initialize Expo project + CI pipeline | GitHub Actions green |
| 4 | Set up local Supabase + run migrations | `supabase status` shows tables |
| 5 | Configure Tamagui + create Button component | Component renders on both platforms |
| **Week 1** | CI passing, local dev working | PR merged with tests |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-06 | PM Team | Initial implementation plan |
| 2.0 | 2026-01 | Claude | UI/UX alignment, 4-step wizard, voting system, enhanced budget |
