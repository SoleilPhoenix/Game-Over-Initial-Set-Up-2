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
- `wizardStore` - Event creation wizard (multi-step form state)
- `uiStore` - Global UI state (loading, toasts, modals)

### Supabase Integration
- Client config: `src/lib/supabase/client.ts` (MMKV session storage)
- Database types: `src/lib/supabase/types.ts` (auto-generated)
- Migrations: `supabase/migrations/` (schema, RLS policies, seed data)
- Auth: Email/password, Apple Sign-In, Google OAuth, Facebook OAuth

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
