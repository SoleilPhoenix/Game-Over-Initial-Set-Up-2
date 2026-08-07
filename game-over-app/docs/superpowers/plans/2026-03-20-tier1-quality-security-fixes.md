# Tier 1 Quality & Security Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical/high/medium findings from the Software Architect, Code Reviewer, and Security Engineer agent reports — without breaking existing functionality.

**Architecture:** Three sequential phases in a dedicated worktree (`fix/tier1-quality-and-security`). Each phase ends with a TypeScript check. Security phase includes edge function changes (Supabase Deno, not npm).

**Tech Stack:** TypeScript, React Native/Expo, Zustand, React Query, Supabase (PostgreSQL + Edge Functions/Deno), Zod

**Worktree path:** `/Users/soleilphoenix/Desktop/GameOver-quality-fixes/`
**Branch:** `fix/tier1-quality-and-security`
**Verify command:** `cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes && npm run typecheck`

---

## PHASE 1: Software Architect Fixes

### Task 1.1: Consolidate Pricing Logic into `src/utils/pricing.ts`

**Why:** Three independent pricing implementations produce different totals for the same inputs. This is a financial correctness risk.

**Files:**
- Create: `src/utils/pricing.ts`
- Modify: `src/repositories/bookings.ts` (delegate `calculateCosts` to new utility)
- Modify: `src/hooks/useBookingFlow.ts` (delegate pricing `useMemo` to new utility)

- [ ] **Step 1: Create canonical pricing utility**

```typescript
// src/utils/pricing.ts

export const SERVICE_FEE_PERCENTAGE = 0.10; // 10%
export const MIN_SERVICE_FEE_CENTS = 5000;  // €50

export interface PackagePricingInput {
  pricePerPersonCents: number;
  baseFeeCents?: number; // some packages have an additional base fee
  totalParticipants: number;
  excludeHonoree?: boolean;
}

export interface BookingPricing {
  packageBaseCents: number;
  serviceFeeCents: number;
  totalCents: number;
  perPersonCents: number;
  payingCount: number;
  depositCents: number;
  remainingCents: number;
}

/**
 * Single source of truth for all booking pricing calculations.
 * Used by bookingsRepository.calculateCosts() and useBookingFlow.
 */
export function calculateBookingPricing(input: PackagePricingInput): BookingPricing {
  const { pricePerPersonCents, baseFeeCents = 0, totalParticipants, excludeHonoree = false } = input;

  const payingCount = excludeHonoree ? Math.max(totalParticipants - 1, 1) : totalParticipants;
  const packageBaseCents = (pricePerPersonCents * payingCount) + baseFeeCents;
  const serviceFeeCents = Math.max(
    Math.round(packageBaseCents * SERVICE_FEE_PERCENTAGE),
    MIN_SERVICE_FEE_CENTS
  );
  const totalCents = packageBaseCents + serviceFeeCents;
  const perPersonCents = payingCount > 0 ? Math.round(totalCents / payingCount) : totalCents;
  const depositCents = Math.round(totalCents * 0.3); // 30% deposit
  const remainingCents = totalCents - depositCents;

  return {
    packageBaseCents,
    serviceFeeCents,
    totalCents,
    perPersonCents,
    payingCount,
    depositCents,
    remainingCents,
  };
}
```

- [ ] **Step 2: Update `bookingsRepository.calculateCosts` to delegate**

In `src/repositories/bookings.ts`, find the `calculateCosts` method. Replace its internal calculation:

```typescript
// ADD import at top of bookings.ts:
import { calculateBookingPricing } from '@/utils/pricing';

// REPLACE the calculateCosts method body:
calculateCosts(pricePerPersonCents: number, totalParticipants: number, excludeHonoree = false) {
  const baseFeeCents = 0; // packages use price_per_person_cents only
  return calculateBookingPricing({
    pricePerPersonCents,
    baseFeeCents,
    totalParticipants,
    excludeHonoree,
  });
},
```

- [ ] **Step 3: Update `useBookingFlow.ts` pricing useMemo**

Find the pricing `useMemo` in `src/hooks/useBookingFlow.ts`. Replace the inline calculation:

```typescript
// ADD import:
import { calculateBookingPricing } from '@/utils/pricing';

// REPLACE the pricing useMemo:
const activePricing = useMemo(() => {
  if (!activePkg || !totalParticipants) return null;
  const pricePerPersonCents = activePkg.price_per_person_cents ?? 0;
  const baseFeeCents = activePkg.base_price_cents ?? 0;
  return calculateBookingPricing({
    pricePerPersonCents,
    baseFeeCents,
    totalParticipants,
    excludeHonoree: excludeHonoree ?? false,
  });
}, [activePkg, totalParticipants, excludeHonoree]);
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes && npm run typecheck 2>&1 | tail -20
```
Expected: 0 errors related to pricing.ts changes.

- [ ] **Step 5: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add src/utils/pricing.ts src/repositories/bookings.ts src/hooks/useBookingFlow.ts
git commit -m "refactor: consolidate pricing logic into canonical src/utils/pricing.ts"
```

---

### Task 1.2: Fix `getProgressPercentage` — hardcoded `8` → `steps.length`

**Files:**
- Modify: `src/utils/planningProgress.ts`

- [ ] **Step 1: Fix the hardcoded divisor**

In `src/utils/planningProgress.ts` line 117, change:
```typescript
// BEFORE:
return Math.round((completedCount / 8) * 100);

// AFTER:
return Math.round((completedCount / steps.length) * 100);
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add src/utils/planningProgress.ts
git commit -m "fix: getProgressPercentage uses steps.length instead of hardcoded 8"
```

---

### Task 1.3: Type `useBookingFlow` Returns — Remove `any`

**Files:**
- Modify: `src/hooks/useBookingFlow.ts`

- [ ] **Step 1: Add `FallbackPackage` type and replace `any` return types**

At the top of `src/hooks/useBookingFlow.ts`, add/update the return type interface:

```typescript
// ADD after existing imports:
import type { EventWithDetails } from '@/repositories/events';
import type { ParticipantWithProfile } from '@/repositories/participants';
import type { BookingWithDetails } from '@/repositories/bookings';
import type { Database } from '@/lib/supabase/types';

type Package = Database['public']['Tables']['packages']['Row'];

// FallbackPackage matches the FALLBACK_PKG record shape
export interface FallbackPackage {
  id: string;
  name: string;
  tier: string;
  price_per_person_cents: number;
  base_price_cents: 0;
  slug: string;
  [key: string]: unknown;
}

export interface UseBookingFlowResult {
  event: EventWithDetails | null | undefined;
  participants: ParticipantWithProfile[];
  booking: BookingWithDetails | null | undefined;
  package: Package | FallbackPackage | null | undefined;
  // ... keep all other existing fields
}
```

- [ ] **Step 2: Replace `any` casts in the hook's return value**

Find all `event: any`, `participants: any[]`, `booking: any`, `package: any` in the `UseBookingFlowResult` interface and replace with the typed versions from Step 1.

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes && npm run typecheck 2>&1 | grep -E "useBookingFlow|error" | head -20
```

- [ ] **Step 4: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add src/hooks/useBookingFlow.ts
git commit -m "fix: type useBookingFlow return shape — replace any with proper types"
```

---

### Task 1.4: Fix Auth Subscription Leak in `_layout.tsx`

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Fix the async cleanup in useEffect**

In `app/_layout.tsx`, find the `useEffect` that calls `initialize()`. The current pattern ignores the cleanup Promise. Replace:

```typescript
// BEFORE (approximately):
useEffect(() => {
  initialize();
  // ...
}, [initialize]);

// AFTER — properly await the cleanup function:
useEffect(() => {
  let cleanup: (() => void) | undefined;
  initialize().then((fn) => {
    if (typeof fn === 'function') cleanup = fn;
  });
  return () => {
    cleanup?.();
  };
}, []); // empty deps — initialize is stable (Zustand action)
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add app/_layout.tsx
git commit -m "fix: properly await and invoke auth subscription cleanup in root layout"
```

---

### Task 1.5: Remove Module-Level `autoSaveTimer` Singleton

**Files:**
- Modify: `src/stores/wizardStore.ts`

- [ ] **Step 1: Remove the module-level timer and dead actions**

In `src/stores/wizardStore.ts`:

1. Remove the module-level `let autoSaveTimer: ...` declaration (around line 18-19)
2. Remove the `startAutoSave` action from the store
3. Remove the `stopAutoSave` action from the store
4. The `useWizardAutoSave` hook (already in the file) is the correct pattern — keep it

- [ ] **Step 2: Find all callers of `startAutoSave`/`stopAutoSave` and remove them**

```bash
grep -r "startAutoSave\|stopAutoSave" /Users/soleilphoenix/Desktop/GameOver-quality-fixes/app /Users/soleilphoenix/Desktop/GameOver-quality-fixes/src --include="*.tsx" --include="*.ts" -l
```

For each file found, remove the `startAutoSave()`/`stopAutoSave()` calls. The `useWizardAutoSave()` hook handles this automatically when wizard screens mount.

- [ ] **Step 3: Update the TypeScript interface for the wizard store if it declares these methods**

Remove `startAutoSave` and `stopAutoSave` from `WizardStore` interface if present.

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes && npm run typecheck 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add src/stores/wizardStore.ts
git commit -m "refactor: remove module-level autoSaveTimer singleton — use useWizardAutoSave hook only"
```

---

### Task 1.6: Add Screen-Level Error Boundaries

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create reusable ErrorBoundary component**

```typescript
// src/components/ErrorBoundary.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DARK_THEME } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // TODO: send to Sentry when integrated
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </Text>
          <Text style={styles.subtitle}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: DARK_THEME.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: DARK_THEME.textSecondary,
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: DARK_THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Wrap tab screens in ErrorBoundary**

In `app/(tabs)/_layout.tsx`, wrap the `<Tabs>` component:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Wrap the return value:
return (
  <ErrorBoundary fallbackTitle="Tab Error">
    <Tabs ...>
      {/* existing content */}
    </Tabs>
  </ErrorBoundary>
);
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes && npm run typecheck 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add src/components/ErrorBoundary.tsx app/(tabs)/_layout.tsx
git commit -m "feat: add ErrorBoundary component with retry — wrap tab navigator"
```

---

### Task 1.7: Phase 1 TypeScript Verification

- [ ] **Run full typecheck**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes && npm run typecheck 2>&1
```
Expected: 0 errors introduced by Phase 1 changes.

---

## PHASE 2: Code Reviewer Fixes

### Task 2.1: Add Schema Validation on AsyncStorage Reads in `useUrgentPayment`

**Why:** `JSON.parse` on corrupted storage silently misrepresents payment state. A user who paid can be shown as unpaid.

**Files:**
- Modify: `src/hooks/useUrgentPayment.ts`

- [ ] **Step 1: Add a type guard for BudgetInfo**

```typescript
// In src/hooks/useUrgentPayment.ts, add after imports:

interface BudgetInfo {
  paidAmountCents: number;
  totalCents: number;
  perPersonCents?: number;
  payingCount?: number;
}

function isValidBudgetInfo(val: unknown): val is BudgetInfo {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return typeof obj.paidAmountCents === 'number' && typeof obj.totalCents === 'number';
}

function isValidBudgetInfoMap(val: unknown): val is Record<string, BudgetInfo> {
  if (!val || typeof val !== 'object') return false;
  return Object.values(val as object).every(isValidBudgetInfo);
}
```

- [ ] **Step 2: Apply validation on the AsyncStorage reads**

```typescript
// REPLACE the budget info useEffect:
useEffect(() => {
  AsyncStorage.getItem('budget_info')
    .then(raw => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (isValidBudgetInfoMap(parsed)) {
          setBudgetInfos(parsed);
        } else {
          console.warn('[useUrgentPayment] budget_info cache invalid schema, skipping');
        }
      } catch {
        console.warn('[useUrgentPayment] budget_info cache parse error');
      }
    })
    .catch(() => {});
}, [events]);

// REPLACE the seen events useEffect:
useEffect(() => {
  AsyncStorage.getItem(URGENT_SEEN_KEY)
    .then(raw => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every(id => typeof id === 'string')) {
          setSeenEventIds(new Set(parsed));
        }
      } catch {
        console.warn('[useUrgentPayment] urgent seen key parse error');
      }
    })
    .catch(() => {});
}, []);
```

- [ ] **Step 3: Update `budgetInfos` state type**

```typescript
// CHANGE:
const [budgetInfos, setBudgetInfos] = useState<Record<string, any>>({});
// TO:
const [budgetInfos, setBudgetInfos] = useState<Record<string, BudgetInfo>>({});
```

- [ ] **Step 4: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add src/hooks/useUrgentPayment.ts
git commit -m "fix: validate AsyncStorage JSON parse in useUrgentPayment — prevent silent payment state corruption"
```

---

### Task 2.2: Fix Raw Supabase Calls — Invite Codes in Budget Screen

**Why:** `budget/index.tsx` calls `supabase` directly, bypassing the repository/React Query layer. This violates the architecture rule and has no error handling.

**Files:**
- Modify: `src/repositories/invites.ts` (add `getGuestsByEventId`)
- Modify: `src/hooks/queries/useInvites.ts` (add `useInviteGuests` hook)
- Modify: `app/(tabs)/budget/index.tsx` (replace raw call with hook)

- [ ] **Step 1: Add `getGuestsByEventId` to invites repository**

In `src/repositories/invites.ts`, add:

```typescript
async getGuestsByEventId(eventId: string): Promise<Array<{
  id: string;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string | null;
}>> {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('id, guest_first_name, guest_last_name, guest_email')
    .eq('event_id', eventId);

  if (error) {
    console.warn('[invitesRepository.getGuestsByEventId]', error.message);
    return [];
  }
  return data ?? [];
},
```

- [ ] **Step 2: Add `useInviteGuests` hook in `src/hooks/queries/useInvites.ts`**

```typescript
export function useInviteGuests(eventId: string | null) {
  return useQuery({
    queryKey: inviteKeys.guests(eventId ?? ''),
    queryFn: () => invitesRepository.getGuestsByEventId(eventId!),
    enabled: !!eventId,
    staleTime: 60 * 1000,
  });
}
```

Also add to `inviteKeys`:
```typescript
guests: (eventId: string) => [...inviteKeys.all, 'guests', eventId] as const,
```

- [ ] **Step 3: Replace raw Supabase call in `budget/index.tsx`**

Find the `supabase.from('invite_codes').select(...)` block in `budget/index.tsx`.
Replace it by calling `useInviteGuests(selectedEventId)` at the top of the component:

```typescript
// ADD at top of BudgetScreen component:
const { data: inviteCodeGuests = [] } = useInviteGuests(selectedEventId);
```

Remove the local `inviteCodeGuests` useState + the raw supabase call effect.

- [ ] **Step 4: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add src/repositories/invites.ts src/hooks/queries/useInvites.ts app/(tabs)/budget/index.tsx
git commit -m "fix: replace raw Supabase call in budget screen with useInviteGuests hook"
```

---

### Task 2.3: Fix Raw Supabase Calls in `participants.tsx`

**Files:**
- Modify: `app/event/[id]/participants.tsx`

- [ ] **Step 1: Replace inline supabase call with existing repository method**

In `app/event/[id]/participants.tsx`, find the raw `supabase.from('invite_codes').select(...)` call (lines ~136-156). This data is already available via `useInviteGuests(eventId)` added in Task 2.2. Replace the raw call with that hook:

```typescript
// ADD import:
import { useInviteGuests } from '@/hooks/queries/useInvites';

// At component top, ADD:
const { data: inviteCodeGuests = [] } = useInviteGuests(id ?? null);

// REMOVE: the raw supabase call and its useState
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add app/event/[id]/participants.tsx
git commit -m "fix: replace raw Supabase call in participants screen with useInviteGuests hook"
```

---

### Task 2.4: Fix Swallowed Profile Errors in `participants.ts`

**Files:**
- Modify: `src/repositories/participants.ts`

- [ ] **Step 1: Surface profile fetch errors**

Find the profiles query in `getByEventId` where `error` is destructured but ignored:

```typescript
// BEFORE:
const { data: profilesData } = await supabase.from('profiles').select(...);

// AFTER:
const { data: profilesData, error: profilesError } = await supabase.from('profiles').select(...).in('id', userIds);
if (profilesError) {
  console.warn('[participantsRepository.getByEventId] profiles fetch failed:', profilesError.message);
  // Continue — participants render without profile data rather than crashing
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add src/repositories/participants.ts
git commit -m "fix: log profile fetch errors in participantsRepository instead of silently swallowing"
```

---

### Task 2.5: Fix `emailBlurTimerRef` Unmount Leak in `participants.tsx`

**Files:**
- Modify: `app/event/[id]/participants.tsx`

- [ ] **Step 1: Add cleanup for the blur debounce timer**

Find where `emailBlurTimerRef` is used. Add a `useEffect` cleanup:

```typescript
// ADD this useEffect inside the component:
useEffect(() => {
  return () => {
    if (emailBlurTimerRef.current) {
      clearTimeout(emailBlurTimerRef.current);
    }
  };
}, []);
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add app/event/[id]/participants.tsx
git commit -m "fix: clear emailBlurTimerRef on unmount to prevent setState on unmounted component"
```

---

### Task 2.6: Fix Nullish Coalescing in `invites.ts` — `|| 7` → `?? 7`

**Files:**
- Modify: `src/repositories/invites.ts`

- [ ] **Step 1: Fix the falsy `0` bug**

Find in `invites.ts`:
```typescript
// BEFORE:
expiresAt.setDate(expiresAt.getDate() + (options?.expiresInDays || 7));

// AFTER:
expiresAt.setDate(expiresAt.getDate() + (options?.expiresInDays ?? 7));
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add src/repositories/invites.ts
git commit -m "fix: use nullish coalescing for expiresInDays default (|| → ??) to handle 0 correctly"
```

---

### Task 2.7: Fix `(booking as any)` Casts in Event Detail

**Files:**
- Modify: `app/event/[id]/index.tsx`

- [ ] **Step 1: Extend `BookingWithDetails` type or use the proper fields**

The fields `paying_participants` and `exclude_honoree` are actual booking fields. Add them to the type in `src/repositories/bookings.ts` if missing, or check that they're in the DB type. Then remove the `(booking as any)` casts in `event/[id]/index.tsx` and access the fields directly.

```typescript
// BEFORE (4 occurrences):
(booking as any).paying_participants
(booking as any).exclude_honoree

// AFTER (once you verify these fields exist in BookingWithDetails or Booking type):
booking?.paying_participants
booking?.exclude_honoree
```

If the fields aren't in the type, extend `BookingWithDetails`:
```typescript
export interface BookingWithDetails extends Booking {
  package: Package | null;
  event: { id: string; title: string; honoree_name: string; } | null;
  paying_participants?: number; // if not auto-generated from DB type
  exclude_honoree?: boolean;    // if not auto-generated from DB type
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add app/event/[id]/index.tsx src/repositories/bookings.ts
git commit -m "fix: remove (booking as any) casts — use typed fields directly"
```

---

### Task 2.8: Fix Hardcoded English Strings in Event Detail

**Files:**
- Modify: `app/event/[id]/index.tsx`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/de.ts`

- [ ] **Step 1: Add missing i18n keys**

In `src/i18n/en.ts`, add to the `events` section (or create a new `eventDetail` section):
```typescript
eventDetail: {
  bookPackage: 'Book Package',
  yourContribution: 'Your Contribution',
  gotIt: 'Got it',
},
```

In `src/i18n/de.ts`:
```typescript
eventDetail: {
  bookPackage: 'Paket buchen',
  yourContribution: 'Dein Beitrag',
  gotIt: 'Verstanden',
},
```

- [ ] **Step 2: Replace hardcoded strings in `event/[id]/index.tsx`**

```typescript
// Replace 'Book Package' with t.eventDetail.bookPackage
// Replace 'Your Contribution' with t.eventDetail.yourContribution
// Replace 'Got it' with t.eventDetail.gotIt
```

- [ ] **Step 3: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add app/event/[id]/index.tsx src/i18n/en.ts src/i18n/de.ts
git commit -m "fix: replace hardcoded English strings in event detail with i18n keys"
```

---

### Task 2.9: Fix `handleGenerateInvite` Unhandled Promise

**Files:**
- Modify: `app/event/[id]/index.tsx`

- [ ] **Step 1: Add try/catch to the generate invite handler**

Find `handleGenerateInvite` in `event/[id]/index.tsx`. Wrap in try/catch:

```typescript
const handleGenerateInvite = async (): Promise<string> => {
  try {
    const invite = await createInvite.mutateAsync({ eventId: id! });
    return invite.code;
  } catch (error) {
    console.error('[handleGenerateInvite] failed:', error);
    // Return empty string so callers can detect failure
    return '';
  }
};
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add app/event/[id]/index.tsx
git commit -m "fix: add try/catch to handleGenerateInvite to prevent unhandled promise rejection"
```

---

### Task 2.10: Phase 2 TypeScript Verification

- [ ] **Run full typecheck**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes && npm run typecheck 2>&1
```
Expected: 0 errors from Phase 2 changes.

---

## PHASE 3: Security Engineer Fixes

### Task 3.1: Replace ngrok URL in `send-guest-invitations` (CRITICAL — Pre-Launch)

**Files:**
- Modify: `supabase/functions/send-guest-invitations/index.ts`

- [ ] **Step 1: Replace hardcoded ngrok URL with production URL**

Find in `supabase/functions/send-guest-invitations/index.ts` (around line 349):
```typescript
// BEFORE:
const inviteUrl = `https://realestate-delisa-statesmanlike.ngrok-free.dev/invite/${code}`;

// AFTER:
const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://game-over.app';
const inviteUrl = `${appBaseUrl}/invite/${code}`;
```

Set the env variable in Supabase dashboard: `APP_BASE_URL=https://game-over.app`

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add supabase/functions/send-guest-invitations/index.ts
git commit -m "fix(security): replace hardcoded ngrok URL with APP_BASE_URL env var in guest invitations"
```

---

### Task 3.2: Add Authentication to `send-guest-invitations` (CRITICAL)

**Files:**
- Modify: `supabase/functions/send-guest-invitations/index.ts`

- [ ] **Step 1: Add auth verification at the top of the handler**

In `supabase/functions/send-guest-invitations/index.ts`, after the CORS preflight check, add:

```typescript
// After cors preflight block, before reading request body:

// Verify caller is authenticated and owns the event
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const userToken = authHeader.replace('Bearer ', '');

// Create a USER-scoped client (not service role) to verify the token
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
const userSupabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: `Bearer ${userToken}` } } }
);

const { data: { user }, error: authError } = await userSupabase.auth.getUser();
if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Add ownership verification after reading `eventId`**

After `const { eventId, ... } = await req.json()`, add:

```typescript
// Verify caller owns the event (use service-role client for this check)
const { data: eventCheck, error: eventCheckError } = await supabase
  .from('events')
  .select('id, created_by')
  .eq('id', eventId)
  .single();

if (eventCheckError || !eventCheck) {
  return new Response(JSON.stringify({ error: 'Event not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

if (eventCheck.created_by !== user.id) {
  return new Response(JSON.stringify({ error: 'Forbidden — not event owner' }), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 3: Add batch size guard**

After extracting `guests` from the request body, add:

```typescript
const MAX_GUESTS_PER_CALL = 50;
if (guests.length > MAX_GUESTS_PER_CALL) {
  return new Response(JSON.stringify({
    error: `Too many guests. Maximum ${MAX_GUESTS_PER_CALL} per call. Paginate your requests.`
  }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add supabase/functions/send-guest-invitations/index.ts
git commit -m "fix(security): add JWT auth + event ownership verification to send-guest-invitations"
```

---

### Task 3.3: Add Authentication to `send-push-notification`

**Files:**
- Modify: `supabase/functions/send-push-notification/index.ts`

- [ ] **Step 1: Add service-role or JWT auth check**

`send-push-notification` is intended to be called internally (from other edge functions), not from the client. Add a service-role secret check:

```typescript
// At the top of the handler, after CORS preflight:
const authHeader = req.headers.get('Authorization');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Allow either service-role key or valid user JWT
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// For internal calls from other edge functions, accept service role key
if (authHeader !== `Bearer ${serviceRoleKey}`) {
  // Otherwise verify as user JWT
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
  const userSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { error: authError } = await userSupabase.auth.getUser();
  if (authError) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add supabase/functions/send-push-notification/index.ts
git commit -m "fix(security): add authorization check to send-push-notification edge function"
```

---

### Task 3.4: Add Authentication to `send-final-briefing` + Fix Missing try/catch

**Files:**
- Modify: `supabase/functions/send-final-briefing/index.ts`

- [ ] **Step 1: Add cron secret authentication**

`send-final-briefing` is triggered by pg_cron. Protect it with a cron secret:

```typescript
// At top of handler:
const authHeader = req.headers.get('Authorization');
const cronSecret = Deno.env.get('CRON_SECRET');

if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

Set `CRON_SECRET` env var in Supabase dashboard. Update the pg_cron SQL to pass it:
```sql
-- Update the cron job to include the auth header
SELECT cron.schedule('send-final-briefing-daily', '0 9 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-final-briefing',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.cron_secret') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )$$
);
```

- [ ] **Step 2: Add missing outer try/catch**

Wrap the entire handler body in try/catch:

```typescript
serve(async (req: Request) => {
  try {
    // ... all existing logic ...
  } catch (error) {
    console.error('[send-final-briefing] Unhandled error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 3: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add supabase/functions/send-final-briefing/index.ts
git commit -m "fix(security): add cron secret auth + outer try/catch to send-final-briefing"
```

---

### Task 3.5: Add Authentication to `send-email`

**Files:**
- Modify: `supabase/functions/send-email/index.ts`

- [ ] **Step 1: Add service-role-only auth**

`send-email` is internal-only (called from stripe-webhook, process-payment-reminders). Add service-role check:

```typescript
// At top of handler:
const authHeader = req.headers.get('Authorization');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
  return new Response(JSON.stringify({ error: 'Unauthorized — internal function' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add supabase/functions/send-email/index.ts
git commit -m "fix(security): restrict send-email to service-role callers only"
```

---

### Task 3.6: Fix `event_participants` RLS SELECT Policy

**Files:**
- Create: `supabase/migrations/20260320000000_restore_participant_rls_select.sql`

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/20260320000000_restore_participant_rls_select.sql
-- Restore scoped RLS on event_participants SELECT.
-- The USING (true) policy (from 20260205000003) exposed ALL participant data
-- to ALL authenticated users. The SECURITY DEFINER helper functions from
-- 20260211000001 already exist and break the RLS recursion cycle.

-- Drop the permissive open policy
DROP POLICY IF EXISTS "Authenticated users can view event participants" ON event_participants;

-- Restore scoped access using the existing SECURITY DEFINER helpers
-- These functions bypass the outer RLS check, preventing recursion.
CREATE POLICY "Participants and creators can view event participants"
  ON event_participants FOR SELECT TO authenticated
  USING (
    public.is_event_creator(event_id)
    OR public.is_event_participant(event_id)
  );
```

- [ ] **Step 2: Apply migration locally if Supabase CLI is available**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
npx supabase db push --dry-run 2>&1 || echo "Apply via Supabase dashboard SQL editor if CLI not linked"
```

- [ ] **Step 3: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add supabase/migrations/20260320000000_restore_participant_rls_select.sql
git commit -m "fix(security): restore scoped RLS SELECT on event_participants using SECURITY DEFINER helpers"
```

---

### Task 3.7: Add Avatar Upload Validation in `invite/[code].tsx`

**Files:**
- Modify: `app/invite/[code].tsx`

- [ ] **Step 1: Add MIME type and size validation before upload**

Find the avatar upload section in `app/invite/[code].tsx`. Before the `supabase.storage.from('avatars').upload(...)` call, add:

```typescript
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Validate blob before upload
if (!ALLOWED_MIME_TYPES.includes(blob.type)) {
  Alert.alert('Invalid file', 'Please select a JPEG, PNG, or WebP image.');
  return;
}
if (blob.size > MAX_FILE_SIZE_BYTES) {
  Alert.alert('File too large', 'Please select an image under 5 MB.');
  return;
}

// Use MIME type for extension instead of URI string parsing
const mimeToExt: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const ext = mimeToExt[blob.type] ?? 'jpg';
const path = `avatars/${currentUser.id}.${ext}`;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add app/invite/[code].tsx
git commit -m "fix(security): add MIME type and file size validation before avatar upload"
```

---

### Task 3.8: Add Currency Allowlist in `create-payment-intent`

**Files:**
- Modify: `supabase/functions/create-payment-intent/index.ts`

- [ ] **Step 1: Add currency validation**

Find where `currency` is extracted from the request. Add:

```typescript
const ALLOWED_CURRENCIES = ['eur', 'usd', 'gbp', 'chf'];
const normalizedCurrency = (currency ?? 'eur').toLowerCase();

if (!ALLOWED_CURRENCIES.includes(normalizedCurrency)) {
  return new Response(JSON.stringify({
    success: false,
    error: `Unsupported currency. Allowed: ${ALLOWED_CURRENCIES.join(', ')}`
  }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Use `normalizedCurrency` in the Stripe PaymentIntent creation**

Replace any subsequent `currency` usage with `normalizedCurrency`.

- [ ] **Step 3: Commit**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes
git add supabase/functions/create-payment-intent/index.ts
git commit -m "fix(security): validate currency against allowlist in create-payment-intent"
```

---

### Task 3.9: Phase 3 Final TypeScript Verification

- [ ] **Run full typecheck**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes && npm run typecheck 2>&1
```
Expected: 0 TypeScript errors across all three phases.

- [ ] **Run linter**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes && npm run lint 2>&1 | grep -E "error|warning" | head -30
```

---

## Final Verification & PR

- [ ] **Run full typecheck one last time**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes && npm run typecheck 2>&1
```

- [ ] **Check git log for all commits**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes && git log --oneline main..HEAD
```

- [ ] **Push branch**

```bash
cd /Users/soleilphoenix/Desktop/GameOver-quality-fixes && git push -u origin fix/tier1-quality-and-security
```

- [ ] **Create PR via GitHub CLI**

```bash
gh pr create \
  --title "fix: Tier 1 quality & security fixes — Architect, Code Reviewer, Security Engineer" \
  --body "$(cat <<'EOF'
## Summary

Implements all critical/high/medium findings from the Tier 1 agent analysis (Software Architect, Code Reviewer, Security Engineer).

### Phase 1 — Architecture (Software Architect)
- Consolidated pricing logic into `src/utils/pricing.ts` (single source of truth)
- Fixed `getProgressPercentage` hardcoded `8` → `steps.length`
- Typed `useBookingFlow` returns (removed `any`)
- Fixed auth subscription cleanup in root layout
- Removed module-level `autoSaveTimer` singleton
- Added `ErrorBoundary` component + wrapped tab navigator

### Phase 2 — Code Quality (Code Reviewer)
- Added schema validation on `AsyncStorage` JSON reads in `useUrgentPayment`
- Replaced raw Supabase calls in budget/participants screens with `useInviteGuests` hook
- Fixed swallowed profile fetch errors in `participantsRepository`
- Added `emailBlurTimerRef` unmount cleanup
- Fixed `|| 7` → `?? 7` for invite expiry
- Removed `(booking as any)` casts in event detail
- Added i18n for hardcoded English strings
- Wrapped `handleGenerateInvite` in try/catch

### Phase 3 — Security (Security Engineer)
- Replaced hardcoded ngrok URL with `APP_BASE_URL` env var
- Added JWT auth + event ownership check to `send-guest-invitations`
- Added 50-guest batch size limit to `send-guest-invitations`
- Added auth to `send-push-notification`, `send-final-briefing`, `send-email`
- Restored scoped RLS on `event_participants` SELECT (via new migration)
- Added MIME type + size validation on avatar upload
- Added currency allowlist validation in `create-payment-intent`

## Test plan
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run lint` passes
- [ ] Auth flows (signup, login, social) work in Expo Go
- [ ] Event creation wizard completes end-to-end
- [ ] Booking + payment flow works
- [ ] Guest invite acceptance flow works
- [ ] Budget screen loads without errors
- [ ] Edge functions: verify `send-guest-invitations` returns 401 without auth header

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Post-Merge: Supabase Dashboard Actions Required

The following must be done manually in the Supabase dashboard after merging:

1. **Apply migration** `20260320000000_restore_participant_rls_select.sql` via SQL Editor
2. **Set env vars** on edge functions:
   - `send-guest-invitations`: `APP_BASE_URL=https://game-over.app`
   - `send-final-briefing`: `CRON_SECRET=<generate secure random string>`
3. **Update pg_cron job** for `send-final-briefing` to pass `Authorization: Bearer <CRON_SECRET>` header
4. **Enable email confirmation** in Supabase Auth settings (currently disabled — security risk)
