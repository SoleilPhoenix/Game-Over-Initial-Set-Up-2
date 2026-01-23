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
npm run web            # Run web version

# Testing
npm test               # Run unit tests with Vitest
npm run test:e2e       # Run Detox E2E tests (iOS simulator)
npm run typecheck      # TypeScript type checking

# Code Quality
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier formatting
```

### E2E Testing Configurations
- `ios.sim.debug` / `ios.sim.release` - iPhone 16 Pro simulator
- `android.emu.debug` / `android.emu.release` - Pixel 7 API 34 emulator
- `android.att.debug` / `android.att.release` - Attached Android device
- `ios.sim.ci` / `android.emu.ci` - Headless CI configurations

### Testing Structure
- **Unit Tests:** `__tests__/**/*.test.{ts,tsx}` with Vitest
- **E2E Tests:** `e2e/**/*.test.ts` with Detox
- **Test Setup:** `__tests__/setup.ts` contains global mocks for React Native, Expo, and Supabase modules

## Architecture

### Routing (Expo Router)
File-based routing in `/app` with route groups:
- `(auth)/` - Authentication screens (welcome, login, signup, forgot-password)
- `(tabs)/` - Main app tabs (events, chat, budget, profile)
- Root `_layout.tsx` handles auth state redirects via `useAuthStore`

**Auth Flow:**
- Unauthenticated users → `/(auth)/welcome`
- Authenticated users → `/(tabs)/events`
- Uses `useSegments()` to detect current route group

### Data Layer Pattern
Three-tier architecture enforcing separation of concerns:
1. **Repositories** (`src/repositories/`) - Direct Supabase operations with typed queries
2. **React Query Hooks** (`src/hooks/queries/`) - Caching, mutations, optimistic updates
3. **Components** - Consume hooks only, never call repositories directly

**Query Keys Pattern:**
All query hooks export a keys factory for cache management:
```typescript
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters: string) => [...eventKeys.lists(), { filters }] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
};
```

Query keys available in:
- `eventKeys`, `packageKeys`, `bookingKeys`, `participantKeys`
- `pollKeys`, `inviteKeys`, `chatKeys`, `notificationKeys`, `cityKeys`

**Mutations Pattern:**
Use `useMutation` with optimistic updates and automatic cache invalidation:
```typescript
const mutation = useMutation({
  mutationFn: (data) => repository.create(data),
  onMutate: async (data) => {
    // Optimistic update
    await queryClient.cancelQueries({ queryKey: eventKeys.lists() });
    const previous = queryClient.getQueryData(eventKeys.lists());
    queryClient.setQueryData(eventKeys.lists(), old => [...old, data]);
    return { previous };
  },
  onError: (err, data, context) => {
    // Rollback on error
    queryClient.setQueryData(eventKeys.lists(), context.previous);
  },
  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
  },
});
```

### State Management
Zustand stores with MMKV persistence (`src/stores/`):
- **`authStore`** - Auth state, session, user profile
- **`wizardStore`** - Event creation wizard with auto-save (debounced 2s persist to MMKV)
- **`uiStore`** - Global UI state (loading spinners, toasts, modals)

**Auto-save Pattern:**
```typescript
// wizardStore auto-saves draft every 2 seconds
const lastSavedAt = useWizardStore((state) => state.lastSavedAt);
// Display "Draft saved" indicator when lastSavedAt updates
```

### Supabase Integration

**Client Configuration:** `src/lib/supabase/client.ts`
- MMKV storage adapter for session persistence (native encrypted storage)
- Auto token refresh enabled
- Session persists across app restarts

**Database Types:** `src/lib/supabase/types.ts`
- Auto-generated from Supabase schema
- Regenerate with: `npx supabase gen types typescript --project-id stdbvehmjpmqbjyiodqg > src/lib/supabase/types.ts`

**Migrations:** `supabase/migrations/`
- `20240101000000_initial_schema.sql` - Main schema with all tables, RLS policies, triggers
- `20240101000002_seed_data.sql` - Cities and packages seed data
- `20240102000000_invite_codes_and_booking_refs.sql` - Invite system

**Key Database Patterns:**
- **RLS Policies:** Row-level security enforced on all tables
- **Auto-generated IDs:** UUID primary keys with `gen_random_uuid()`
- **Timestamps:** All tables have `created_at` and `updated_at` with triggers
- **Booking References:** `GO-XXXXXX` format via database trigger
- **Profile Creation:** Automatic on user signup via `handle_new_user()` trigger

**Edge Functions:** `supabase/functions/` (Deno runtime)
- `create-payment-intent` - Creates Stripe PaymentIntent for bookings
- `stripe-webhook` - Handles Stripe webhook events (payment success/failure)
- Deploy: `npx supabase functions deploy <function-name>`

**Realtime Subscriptions:**
Chat and notifications use Supabase realtime with proper cleanup:
```typescript
useEffect(() => {
  const channel = supabase
    .channel('chat-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handler)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

### Authentication
Multi-provider auth implementation in `src/lib/auth/`:
- **Email/Password:** React Hook Form + Zod validation with strong password requirements
- **Google OAuth:** `useGoogleAuth()` hook with `expo-auth-session`
- **Facebook OAuth:** `useFacebookAuth()` hook with `expo-auth-session`
- **Apple Sign-In:** Native `expo-apple-authentication` (iOS only)

**OAuth Flow:**
1. `signInWithOAuth()` with `skipBrowserRedirect: true`
2. Open browser with `WebBrowser.openAuthSessionAsync()`
3. Redirect to `gameover://` with tokens
4. Validate JWT format before `setSession()`

**Token Storage:** `src/lib/auth/storage.ts` uses `expo-secure-store` (OS-level encryption)

### Path Aliases
Configured in `tsconfig.json`:
- `@/*` → `src/*`
- All subpaths: `@/components/*`, `@/hooks/*`, `@/stores/*`, `@/repositories/*`, etc.

## Domain Configuration

**Production Domain:** `Game-Over.app`

### Deep Linking & Universal Links
- **URL Scheme:** `gameover://` (app-to-app navigation)
- **Universal Links (iOS):** `https://game-over.app/*` (in `GameOver.entitlements`)
- **App Links (Android):** `https://game-over.app/*` (in `app.config.ts`)

**Deep Link Patterns:**
- Invites: `gameover://invite/[code]` or `https://game-over.app/invite/[code]`
- Events: `gameover://event/[id]` or `https://game-over.app/event/[id]`

**Implementation:**
- `app/invite/[code].tsx` handles invite acceptance
- `useValidateInvite` / `useAcceptInvite` hooks in `src/hooks/queries/useInvites.ts`
- Invite codes table with expiration, max_uses, RLS policies

### OAuth Redirect Configuration
OAuth providers redirect to Supabase auth endpoint:
- **Current:** `https://stdbvehmjpmqbjyiodqg.supabase.co/auth/v1/callback`
- **Custom Domain (optional):** `https://auth.game-over.app/auth/v1/callback`

## Environment Variables

Required in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://stdbvehmjpmqbjyiodqg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=
EXPO_PUBLIC_FACEBOOK_APP_ID=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

## Key Patterns

### Form Handling
React Hook Form + Zod validation throughout:
```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/)
});

const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
});
```

### E2E Test IDs
All interactive elements must have `testID` props for Detox testing:
```tsx
<Button testID="submit-button" onPress={handleSubmit}>Submit</Button>
```

### Package Matching Algorithm
Located in `src/utils/packageMatching.ts`. AI-powered scoring:
- Gathering type match: 40 points
- Energy level match: 30 points
- Vibe keywords match: 30 points

Usage: `usePackageMatching` hook returns packages sorted by score with `bestMatch` flag.

### Calendar Integration
`src/utils/calendar.ts`:
- `addEventToCalendar(eventData)` - Adds event with permission handling
- `addEventToCalendarWithFeedback(eventData)` - Same with Alert feedback
- Handles iOS/Android differences

### UI Components (Tamagui)
Standard components in `src/components/ui/`:
- `Skeleton` - Loading states with variants (`SkeletonEventCard`, `SkeletonPackageCard`)
- `Badge` - Status badges including `bestMatch` variant
- `Card`, `Button`, `Input` - Form components
- `SocialButton` - OAuth provider buttons

### Dark Theme Design System
Consistent dark glassmorphic theme defined in `src/constants/theme.ts`:
```typescript
const DARK_THEME = {
  backgroundDark: '#15181D',
  surfaceDark: '#1E2329',
  surfaceCard: '#23272F',
  secondary: '#2D3748',
  primary: '#4A6FA5',
  glassCard: 'rgba(45, 55, 72, 0.6)',
};
```

UI reference designs in `UI_and_UX/` folder.

### Push Notifications
`src/hooks/usePushNotifications.ts` handles:
- Expo push token registration
- Permission requests (iOS/Android)
- Token storage to `user_push_tokens` table
- Local notification scheduling
- Deep link handling on notification tap

Send via Edge Function: `supabase/functions/send-push-notification/`

### Booking References
Auto-generated `GO-XXXXXX` format via database trigger on bookings table.
Displayed on confirmation screen with copy-to-clipboard functionality.

## Troubleshooting

### npm Dependency Conflicts
If `npx expo install` fails with peer dependency errors:
```bash
npm install <package> --legacy-peer-deps
```
This is due to `@testing-library/react-native` peer dependency conflicts.

### Supabase Type Generation
After schema changes:
```bash
npx supabase gen types typescript --project-id stdbvehmjpmqbjyiodqg > src/lib/supabase/types.ts
```

### Detox Build Issues
If E2E tests fail to build:
- iOS: Clean build folder `rm -rf ios/build`
- Android: `cd android && ./gradlew clean`
- Rebuild with configuration: `npm run test:e2e -- --configuration ios.sim.debug`

## Documentation

Additional documentation in `docs/`:
- `AUTH_CODE_REVIEW.md` - Comprehensive auth implementation review
- `DOMAIN_CONFIGURATION.md` - Domain setup and universal links guide
- `ADMIN_GUIDE.md` - Admin features and management
- `SESSION_SUMMARY_*.md` - Development session summaries

Production checklist: `GO_LIVE_CHECKLIST.md`
