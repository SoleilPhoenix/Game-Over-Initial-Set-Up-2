# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Game Over is an AI-powered bachelor/bachelorette party planning app built with Expo (React Native), Supabase, and TypeScript. The app helps users plan party events with package booking, group chat, polls, and budget tracking.

## Commands

```bash
# Development
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator

# Testing
npm test               # Run unit tests with Vitest
npm run test:e2e       # Run Detox E2E tests (iOS simulator)

# Code Quality
npm run typecheck      # TypeScript type checking
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier formatting
```

### E2E Testing Configurations
- `ios.sim.debug` / `ios.sim.release` - iPhone 15 simulator
- `android.emu.debug` / `android.emu.release` - Pixel 7 API 34 emulator
- `android.att.debug` / `android.att.release` - Attached Android device

## Architecture

### Routing (Expo Router)
File-based routing in `/app` with route groups:
- `(auth)/` - Authentication screens (welcome, login, signup, forgot-password)
- `(tabs)/` - Main app tabs (events, chat, budget, profile)
- Root `_layout.tsx` handles auth state redirects via `useAuthStore`

### Data Layer Pattern
Three-tier architecture:
1. **Repositories** (`src/repositories/`) - Direct Supabase operations, typed queries
2. **React Query Hooks** (`src/hooks/queries/`) - Caching, mutations, optimistic updates
3. **Components** - Consume hooks, never call repositories directly

Key query hooks pattern:
```typescript
// Query keys factory for cache management
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
};
```

### State Management
Zustand stores with MMKV persistence (`src/stores/`):
- `authStore` - Auth state, session, user
- `wizardStore` - Event creation wizard with auto-save (debounced 2s persist to MMKV)
- `uiStore` - Global UI state (loading, toasts, modals)

Auto-save pattern in wizardStore:
```typescript
// Draft saved indicator component shows when lastSavedAt updates
const lastSavedAt = useWizardStore((state) => state.lastSavedAt);
```

### Supabase Integration
- Client config: `src/lib/supabase/client.ts` (MMKV session storage)
- Database types: `src/lib/supabase/types.ts` (auto-generated)
- Migrations: `supabase/migrations/` (schema, RLS policies, seed data)
- Edge Functions: `supabase/functions/` (Deno runtime)
- Auth: Email/password, Apple Sign-In, Google OAuth, Facebook OAuth

### Edge Functions (Supabase/Deno)
Located in `supabase/functions/`:
- `create-payment-intent` - Creates Stripe PaymentIntent for package bookings
- `stripe-webhook` - Handles Stripe webhook events (payment success/failure)

Deploy with: `npx supabase functions deploy <function-name>`

### Path Aliases
Configured in `tsconfig.json`:
- `@/*` → `src/*`
- `@/components/*`, `@/hooks/*`, `@/stores/*`, `@/repositories/*`, etc.

## Environment Variables

Required in `.env` or Expo config:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=
EXPO_PUBLIC_FACEBOOK_APP_ID=
```

## Key Patterns

### Form Handling
React Hook Form + Zod validation. Auth screens demonstrate the pattern:
```typescript
const schema = z.object({ email: z.string().email() });
const { control, handleSubmit } = useForm({ resolver: zodResolver(schema) });
```

### E2E Test IDs
All interactive elements in auth screens have `testID` props for Detox testing. Maintain this pattern when adding new screens.

### Realtime Subscriptions
Chat and notifications use Supabase realtime with cleanup:
```typescript
useEffect(() => {
  const channel = supabase.channel('...').on('postgres_changes', ...).subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

### Package Matching Algorithm
Located in `src/utils/packageMatching.ts`. Scores packages based on:
- Gathering type match (40 points)
- Energy level match (30 points)
- Vibe keywords match (30 points)

Usage via `usePackageMatching` hook - returns packages sorted by score with `bestMatch` flag.

### Invite Deep Links
URL scheme: `gameover://invite/[code]`
- `app/invite/[code].tsx` - Handles invite acceptance
- `useValidateInvite` / `useAcceptInvite` hooks in `src/hooks/queries/useInvites.ts`
- invite_codes table with expiration, max_uses, RLS policies

### Calendar Integration
`src/utils/calendar.ts` provides:
- `addEventToCalendar(eventData)` - Adds event with permission handling
- `addEventToCalendarWithFeedback(eventData)` - Same with Alert feedback
- Uses expo-calendar, handles iOS/Android differences

### UI Components
Tamagui-based components in `src/components/ui/`:
- `Skeleton` - Loading states with `SkeletonEventCard`, `SkeletonPackageCard` variants
- `Badge` - Status badges including `bestMatch` variant for package recommendations
- `Card`, `Button`, `Input` - Standard form components

### Booking References
Auto-generated `GO-XXXXXX` format via database trigger on bookings table.
Displayed on confirmation screen with copy-to-clipboard functionality.

### Dark Theme Design System
UI designs in `UI_and_UX/` folder use a consistent dark theme:
```typescript
const DARK_THEME = {
  backgroundDark: '#15181D',    // Main background
  surfaceDark: '#1E2329',       // Surface/cards
  surfaceCard: '#23272F',       // Elevated cards
  secondary: '#2D3748',         // Alternative background
  primary: '#4A6FA5',           // Primary accent
  glassCard: 'rgba(45, 55, 72, 0.6)', // Glassmorphic effect
};
```

### Push Notifications
`src/hooks/usePushNotifications.ts` handles:
- Expo push token registration
- Permission requests
- Token storage to `user_push_tokens` table
- Local notification scheduling
- Deep link handling on notification tap

Send notifications via Edge Function: `supabase/functions/send-push-notification/`

## Troubleshooting

### npm Dependency Conflicts
If `npx expo install` fails with peer dependency errors, use:
```bash
npm install <package> --legacy-peer-deps
```
This is due to @testing-library/react-native peer dependency conflicts with react-test-renderer.
