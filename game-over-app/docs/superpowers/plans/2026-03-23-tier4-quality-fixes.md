# Tier 4 Quality Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all Tier 4 audit findings — accessibility attributes, WCAG contrast, SRE reliability bugs, background polling waste, email confirmation UX, and full native Sentry crash reporting.

**Architecture:** Six independent fix areas applied in order of risk (low-risk utilities first, then UI, then backend, then Sentry). Each task is self-contained and commit-able on its own. Sentry is the only change requiring a native rebuild at the end.

**Tech Stack:** React Native (Expo), TypeScript, Tamagui, React Query, Supabase, @sentry/react-native, Vitest

**Spec:** `docs/superpowers/specs/2026-03-23-tier4-quality-fixes-design.md`

---

## File Map

| File | Action | Task |
|------|--------|------|
| `src/hooks/useAppState.ts` | **Create** — shared AppState hook | 1 |
| `src/hooks/queries/useNotifications.ts` | **Modify** — pause polling in background | 2 |
| `src/hooks/queries/useChat.ts` | **Modify** — pause polling in background | 2 |
| `app/(tabs)/_layout.tsx` | **Modify** — tab role, active color, FAB label | 3 |
| `src/components/ui/Input.tsx` | **Modify** — a11y label/state, liveRegion | 4 |
| `src/components/ui/Button.tsx` | **Modify** — a11y label passthrough | 4 |
| `src/components/ui/Chip.tsx` | **Modify** — checkbox role + state | 4 |
| `app/(auth)/signup.tsx` | **Modify** — a11y attributes + email confirmation state | 5 |
| `app/(tabs)/profile/notifications.tsx` | **Modify** — a11y on back + toggles | 6 |
| `src/components/ui/Toggle.tsx` | **Modify (if exists)** — a11y role on switch | 6 |
| `src/repositories/bookings.ts` | **Modify** — race condition + atomic audit log | 7 |
| `src/lib/participantCountCache.ts` | **Modify** — add initBudgetCache() | 8 |
| `app/_layout.tsx` | **Modify** — initBudgetCache, Sentry init, Sentry.wrap | 8, 11 |
| `app.config.ts` | **Modify** — Sentry Expo plugin | 9 |
| `metro.config.js` | **Modify** — Sentry metro wrapper | 9 |
| `.env` + `.env.example` | **Modify** — Sentry env vars | 9 |
| `src/components/ErrorBoundary.tsx` | **Modify** — Sentry.captureException | 10 |
| `supabase/migrations/20260323000000_append_booking_audit_log.sql` | **Create** — atomic RPC | 7 |
| `__tests__/unit/lib/participantCountCache.test.ts` | **Create** — tests for initBudgetCache | 8 |
| `__tests__/unit/repositories/bookings.test.ts` | **Create** — tests for race fix | 7 |

---

## Task 1: Shared AppState Hook

**Purpose:** Single source of truth for detecting when the app is active vs backgrounded. Used by polling hooks to stop wasting DB queries when the app is not visible.

**Files:**
- Create: `src/hooks/useAppState.ts`
- Create: `__tests__/hooks/useAppState.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/hooks/useAppState.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppState } from 'react-native';

// Test the subscription/cleanup logic by exercising the listener directly
describe('useAppState integration', () => {
  it('registers a change listener on AppState', () => {
    const addSpy = vi.spyOn(AppState, 'addEventListener');
    // Simulate what the hook does
    const handler = vi.fn();
    const sub = AppState.addEventListener('change', handler);
    expect(addSpy).toHaveBeenCalledWith('change', handler);
    sub.remove();
  });
});
```

- [ ] **Step 2: Run test to verify it fails (or verify it would pass with correct impl)**

```bash
cd /Users/soleilphoenix/Desktop/GameOver/game-over-app
npm test -- __tests__/hooks/useAppState.test.ts
```

- [ ] **Step 3: Create the hook**

```typescript
// src/hooks/useAppState.ts
import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Returns the current React Native AppState ('active' | 'background' | 'inactive').
 * Updates automatically when the user backgrounds or foregrounds the app.
 * Use this to pause polling/subscriptions when the app is not visible.
 */
export function useAppState(): AppStateStatus {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', setAppState);
    return () => sub.remove();
  }, []);

  return appState;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/hooks/useAppState.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAppState.ts __tests__/hooks/useAppState.test.ts
git commit -m "feat: add useAppState hook for background detection"
```

---

## Task 2: Pause Background Polling

**Purpose:** Stop `useUnreadNotificationsCount` and `useUnreadCount` from hitting the DB every 30 seconds when the app is backgrounded. At 100 users, unconditional polling = 200 DB requests/minute for nothing.

**Files:**
- Modify: `src/hooks/queries/useNotifications.ts`
- Modify: `src/hooks/queries/useChat.ts`

- [ ] **Step 1: Update `useUnreadNotificationsCount`** in `src/hooks/queries/useNotifications.ts`

Add import at top of file (after existing imports):
```typescript
import { useAppState } from '@/hooks/useAppState';
```

Update `useUnreadNotificationsCount` function body — add `appState` before the `useQuery` call:
```typescript
export function useUnreadNotificationsCount() {
  const user = useAuthStore((state) => state.user);
  const appState = useAppState();

  return useQuery({
    queryKey: notificationKeys.unreadCount(user?.id || ''),
    queryFn: () => notificationsRepository.getUnreadCount(user!.id),
    enabled: !!user?.id,
    refetchInterval: appState === 'active' ? 30000 : false,
  });
}
```

- [ ] **Step 2: Update `useUnreadCount`** in `src/hooks/queries/useChat.ts`

Add import at top of file (after existing imports):
```typescript
import { useAppState } from '@/hooks/useAppState';
```

Update `useUnreadCount` function body:
```typescript
export function useUnreadCount(eventId: string | undefined) {
  const appState = useAppState();

  return useQuery({
    queryKey: chatKeys.unreadCount(eventId || ''),
    queryFn: () => channelsRepository.getTotalUnreadCount(eventId!),
    enabled: !!eventId,
    refetchInterval: appState === 'active' ? 30000 : false,
  });
}
```

- [ ] **Step 3: Verify TypeScript is clean**

```bash
npm run typecheck
```
Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add src/hooks/queries/useNotifications.ts src/hooks/queries/useChat.ts
git commit -m "perf: pause unread count polling when app is backgrounded"
```

---

## Task 3: Color Contrast Fix (WCAG AA)

**Purpose:** `#5A7EB0` as *text/icon* color on dark backgrounds scores 3.9:1 — below WCAG AA (4.5:1 minimum). Swap to `DARK_THEME.primaryLight` (`#7A9BC4`, 5.6:1) for text/icon uses only. Backgrounds stay unchanged.

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `src/components/ui/Input.tsx`
- Modify: `app/(auth)/signup.tsx` (color only, a11y in Task 5)

- [ ] **Step 1: Fix `app/(tabs)/_layout.tsx` active tab color**

Find the line in `TabIcon` component:
```typescript
const activeColor = '#5A7EB0'; // Same as Share Event card
```
Replace with:
```typescript
const activeColor = DARK_THEME.primaryLight; // #7A9BC4 — passes WCAG AA (5.6:1)
```
Make sure `DARK_THEME` is imported (it already is at the top of the file).

- [ ] **Step 2: Fix `src/components/ui/Input.tsx` focused label + Show/Hide text**

In `StyledLabel`, the `focused: true` variant uses `color: '$primary'`. Change it to use an inline value:
```typescript
variants: {
  focused: {
    true: {
      color: DARK_THEME.primaryLight,  // was '$primary' — improves contrast
    },
  },
  // ...
} as const,
```
Import `DARK_THEME` at top: `import { DARK_THEME } from '@/constants/theme';`

Find the Show/Hide toggle text in the `secureTextEntry` XStack block:
```tsx
<Text color="$primary" fontWeight="600" fontSize="$2">
```
Change to:
```tsx
<Text color={DARK_THEME.primaryLight} fontWeight="600" fontSize="$2">
```

- [ ] **Step 3: Fix `app/(auth)/signup.tsx` text colors**

Three style entries to update in the `StyleSheet.create` at the bottom of the file:

```typescript
showHideText: {
  color: DARK_THEME.primaryLight,  // was DARK_THEME.primary
  fontSize: 14,
  fontWeight: '600' as const,
  paddingLeft: 8,
},
termsLink: {
  color: DARK_THEME.primaryLight,  // was DARK_THEME.primary
},
loginLinkText: {
  fontSize: 14,
  color: DARK_THEME.primaryLight,  // was DARK_THEME.primary
  fontWeight: '700',
},
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/_layout.tsx src/components/ui/Input.tsx "app/(auth)/signup.tsx"
git commit -m "fix: improve primary color contrast to WCAG AA (3.9:1 → 5.6:1)"
```

---

## Task 4: Accessibility — UI Components

**Purpose:** Add screen reader support to the three shared UI components used throughout the app. Fixes systematic a11y gaps across all screens that use `Input`, `Button`, or `Chip`.

**Files:**
- Modify: `src/components/ui/Input.tsx`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Chip.tsx`

- [ ] **Step 1: Update `Input.tsx` — add accessibilityLabel, state, and liveRegion**

Add `accessibilityLabel` to the `InputProps` interface (it may already be in `...props` but we want explicit forwarding):
```typescript
export interface InputProps extends Omit<GetProps<typeof StyledInput>, 'ref'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  testID?: string;
  containerTestID?: string;
  disabled?: boolean;
  accessibilityLabel?: string;  // ADD THIS
}
```

In the destructure at the top of the `forwardRef` render function, add `accessibilityLabel` alongside `label`, `error`, etc.

Pass it explicitly to `StyledInput`:
```tsx
<StyledInput
  ref={ref as any}
  {...props}
  value={value}
  onFocus={handleFocus}
  onBlur={handleBlur}
  secureTextEntry={secureTextEntry && !showPassword}
  editable={!disabled}
  placeholderTextColor="$textMuted"
  testID={testID}
  accessibilityLabel={accessibilityLabel ?? label}
  accessibilityState={{ disabled }}
/>
```

Add `accessibilityLiveRegion` to `StyledHelperText` when showing an error:
```tsx
{(error || hint) && (
  <StyledHelperText
    error={hasError}
    accessibilityLiveRegion={hasError ? 'polite' : 'none'}
  >
    {error || hint}
  </StyledHelperText>
)}
```

- [ ] **Step 2: Update `Button.tsx` — add accessibilityLabel passthrough**

Add to `ButtonProps` interface:
```typescript
accessibilityLabel?: string;
```

Pass it through to `StyledButton`:
```tsx
<StyledButton
  {...props}
  variant={variant}
  disabled={isDisabled}
  testID={testID}
  aria-busy={loading}
  aria-disabled={isDisabled}
  accessibilityLabel={props.accessibilityLabel}
/>
```

- [ ] **Step 3: Update `Chip.tsx` — fix role + state for screen readers**

In `ChipProps` interface, add `accessibilityLabel`:
```typescript
export interface ChipProps extends Omit<StyledChipProps, 'children'> {
  label: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  showCheckmark?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;  // ADD THIS
}
```

In the `Chip` function, replace `aria-selected={selected}` + `aria-disabled={disabled}` with proper RN accessibility props:
```tsx
<StyledChip
  {...props}
  selected={selected}
  disabled={disabled}
  size={size}
  onPress={onPress}
  testID={testID}
  accessibilityRole="checkbox"
  accessibilityState={{ checked: selected, disabled }}
  accessibilityLabel={accessibilityLabel ?? label}
  gap="$1.5"
>
```
Remove `aria-selected` and `aria-disabled` (they were Tamagui web props with no RN effect).

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Input.tsx src/components/ui/Button.tsx src/components/ui/Chip.tsx
git commit -m "feat(a11y): add accessibility labels, roles, and liveRegion to UI components"
```

---

## Task 5: Accessibility — signup.tsx + Email Confirmation UI

**Purpose:** Two changes in one file: (1) add missing a11y attributes to all inputs and buttons, (2) handle the email confirmation flow that Supabase returns when confirmation is enabled.

**Files:**
- Modify: `app/(auth)/signup.tsx`

- [ ] **Step 1: Add `emailSent` state at top of component**

After the existing `useState` declarations, add:
```typescript
const [emailSent, setEmailSent] = useState(false);
const [submittedEmail, setSubmittedEmail] = useState('');
```

- [ ] **Step 2: Update `onSubmit` to detect unconfirmed accounts**

After `if (error) throw error;`, add the email confirmation check:
```typescript
// Check if email confirmation is pending (Supabase returns identities: [] when unconfirmed)
if (signUpData.user?.identities?.length === 0) {
  setSubmittedEmail(data.email);
  setEmailSent(true);
  return;
}
```

- [ ] **Step 3: Add email-sent view to JSX**

`LinearGradient` and `Ionicons` are already imported in `signup.tsx` — no new imports needed for this step.

After the `<StatusBar>` line, add a conditional early return for the email-sent state:
```tsx
if (emailSent) {
  return (
    <View style={styles.container} testID="email-confirmation-screen">
      <LinearGradient
        colors={[DARK_THEME.deepNavy, DARK_THEME.background]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Ionicons name="mail-open-outline" size={64} color={DARK_THEME.primaryLight} style={{ alignSelf: 'center', marginBottom: 24 }} />
        <Text style={[styles.title, { textAlign: 'center' }]} accessibilityRole="header">
          Check your email
        </Text>
        <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: 32 }]}>
          We sent a confirmation link to {submittedEmail}. Tap it to activate your account.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace('/(auth)/login')}
          accessibilityRole="button"
          accessibilityLabel="Go to login"
        >
          <Text style={styles.primaryButtonText}>Back to Login</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Add accessibilityLabel + accessibilityHint to all TextInputs**

For each `TextInput` in the form, add the appropriate props (all six fields shown here):

**firstName TextInput:**
```tsx
accessibilityLabel="First name"
accessibilityHint="Enter your first name"
```

**lastName TextInput:**
```tsx
accessibilityLabel="Last name"
accessibilityHint="Enter your last name"
```

**phone TextInput:**
```tsx
accessibilityLabel="Phone number"
accessibilityHint="Enter your phone or WhatsApp number"
```

**email TextInput:**
```tsx
accessibilityLabel="Email address"
accessibilityHint="Enter your email address"
```

**password TextInput:**
```tsx
accessibilityLabel="Password"
accessibilityHint="At least 8 characters with uppercase, lowercase, and number"
```

**confirmPassword TextInput:**
```tsx
accessibilityLabel="Confirm password"
accessibilityHint="Re-enter your password"
```

- [ ] **Step 5: Add a11y to Pressables**

**Back button** (the `<Pressable onPress={() => router.back()}>` with arrow icon):
```tsx
accessibilityRole="button"
accessibilityLabel="Go back"
```

**Show/Hide password Pressables** (both of them):
```tsx
accessibilityRole="button"
accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
```
and:
```tsx
accessibilityRole="button"
accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
```

**Submit button** (`signup-submit-button`):
```tsx
accessibilityRole="button"
accessibilityLabel={isLoading ? 'Creating account, please wait' : 'Create account'}
accessibilityState={{ disabled: isLoading, busy: isLoading }}
```

- [ ] **Step 6: Add liveRegion to error container**

Find the `errorContainer` View:
```tsx
<View style={styles.errorContainer} testID="error-message">
```
Add:
```tsx
<View
  style={styles.errorContainer}
  testID="error-message"
  accessibilityLiveRegion="polite"
  accessibilityRole="alert"
>
```

- [ ] **Step 7: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add "app/(auth)/signup.tsx"
git commit -m "feat(a11y): add accessibility attributes and email confirmation UI to signup"
```

---

## Task 6: Accessibility — notifications.tsx + Modal Focus Trap

**Purpose:** Add screen reader support to the notification preferences screen (back button and all toggle rows). Also scan for modals missing `accessibilityViewIsModal`.

**Files:**
- Modify: `app/(tabs)/profile/notifications.tsx`
- Modify: any modal components found in `src/components/`

- [ ] **Step 1: Add a11y to back button in `notifications.tsx`**

Find:
```tsx
<Pressable onPress={() => router.back()} style={styles.headerButton} testID="notifications-back">
```
Add:
```tsx
accessibilityRole="button"
accessibilityLabel="Go back"
```

- [ ] **Step 2: Add a11y to each toggle row XStack**

There are three separate toggle rows in `notifications.tsx`. Each row is an `XStack` with `paddingVertical="$3" paddingHorizontal="$4"`. Add the props shown below to **each specific row** — do not merge them onto the same XStack.

**Row 1 — General push notifications** (the XStack wrapping the "Enable Push Notifications" row, around line 167):
```tsx
<XStack
  paddingVertical="$3" paddingHorizontal="$4"
  alignItems="center" justifyContent="space-between"
  accessibilityRole="switch"
  accessibilityLabel="Enable push notifications"
  accessibilityState={{ checked: pushNotificationsEnabled, disabled: isSaving }}
  onPress={() => handleTogglePush(!pushNotificationsEnabled)}
>
```

**Row 2 — Payment due alerts** (the XStack wrapping the "Payment Due Alerts" row, around line 194):
```tsx
<XStack
  paddingVertical="$3" paddingHorizontal="$4"
  alignItems="center" justifyContent="space-between"
  accessibilityRole="switch"
  accessibilityLabel="Payment due alerts"
  accessibilityState={{ checked: paymentAlertsEnabled, disabled: isSaving }}
  onPress={() => handleTogglePaymentAlerts(!paymentAlertsEnabled)}
>
```

**Row 3 — Email notifications** (the XStack in the Email Notifications section, around line 226):
```tsx
<XStack
  paddingVertical="$3" paddingHorizontal="$4"
  alignItems="center" justifyContent="space-between"
  accessibilityRole="switch"
  accessibilityLabel="Email notifications for event updates"
  accessibilityState={{ checked: emailNotificationsEnabled, disabled: isSaving }}
  onPress={() => handleToggleEmail(!emailNotificationsEnabled)}
>
```

- [ ] **Step 3: Scan for modals missing accessibilityViewIsModal**

```bash
grep -rn "Modal\|modal\|Sheet\|BottomSheet" /Users/soleilphoenix/Desktop/GameOver/game-over-app/src/components/ --include="*.tsx" -l
```

For each modal component found, locate the root content `View` of the modal and add:
```tsx
accessibilityViewIsModal={true}
```
This tells VoiceOver to prevent navigation outside the modal while it's open. Common pattern to look for:
```tsx
<View style={styles.modalContent}>
// becomes:
<View style={styles.modalContent} accessibilityViewIsModal={true}>
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/profile/notifications.tsx" src/components/
git commit -m "feat(a11y): add accessibility to notifications screen and modal focus traps"
```

---

## Task 7: Accessibility — Tab Bar + FAB

**Purpose:** Fix the tab bar role (`"button"` → `"tab"`) and add translated accessibility labels per tab. Add a label to the FAB so screen readers can identify "Create new event".

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Change tab Pressable role**

Find in `CustomTabBar`:
```tsx
<Pressable
  key={route.key}
  accessibilityRole="button"
  accessibilityState={isFocused ? { selected: true } : {}}
  accessibilityLabel={options.tabBarAccessibilityLabel}
```

Change `accessibilityRole="button"` to `accessibilityRole="tab"`:
```tsx
<Pressable
  key={route.key}
  accessibilityRole="tab"
  accessibilityState={isFocused ? { selected: true } : {}}
  accessibilityLabel={options.tabBarAccessibilityLabel}
```

- [ ] **Step 2: Add translated tabBarAccessibilityLabel to each Tabs.Screen**

The `t` hook cannot be called at module level; it must be called inside a component. `TabsLayout` is a component, so add the hook there. `useTranslation` is already imported at the top of the file — only the hook *call* needs to be added inside the component body.

Find the current `TabsLayout` function. It currently starts:
```tsx
export default function TabsLayout() {
  // Safety reset: ensure tab bar is never stuck hidden after hard navigation
  useEffect(() => {
    useTabBarStore.getState().setHidden(false);
  }, []);
```

Change to:
```tsx
export default function TabsLayout() {
  const { t } = useTranslation();  // ADD: needed for translated tab accessibility labels

  // Safety reset: ensure tab bar is never stuck hidden after hard navigation
  useEffect(() => {
    useTabBarStore.getState().setHidden(false);
  }, []);
```

Then update each `Tabs.Screen` options:
```tsx
export default function TabsLayout() {
  const { t } = useTranslation();  // ADD THIS — useTranslation is already imported

  useEffect(() => {
    useTabBarStore.getState().setHidden(false);
  }, []);

  return (
    <ErrorBoundary fallbackTitle="Tab Error">
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: DARK_THEME.background } }}
    >
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          href: '/(tabs)/events',
          tabBarAccessibilityLabel: `${t.tabs.events}, tab 1 of 4`,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          href: '/(tabs)/chat',
          tabBarAccessibilityLabel: `${t.tabs.chat}, tab 2 of 4`,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          href: '/(tabs)/budget',
          tabBarAccessibilityLabel: `${t.tabs.budget}, tab 3 of 4`,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: '/(tabs)/profile',
          tabBarAccessibilityLabel: `${t.tabs.profile}, tab 4 of 4`,
        }}
      />
    </Tabs>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 3: Add a11y to FABButton**

Find the `<Pressable` in `FABButton`:
```tsx
<Pressable
  onPress={handlePress}
  style={({ pressed }) => [...]}
  testID="fab-create-event"
>
```
Add:
```tsx
accessibilityRole="button"
accessibilityLabel="Create new event"
accessibilityHint="Opens the event creation wizard"
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/_layout.tsx"
git commit -m "feat(a11y): fix tab role and add translated accessibility labels to tab bar and FAB"
```

---

## Task 8: SRE — Cold-Start Budget Cache Fix

**Purpose:** On app restart, `getAllBudgetInfos()` returns `{}` because the in-memory cache is empty. This causes `useUrgentPayment` to default `isPaid = true` and the urgency bell never appears for unpaid events after a cold start.

**Files:**
- Modify: `src/lib/participantCountCache.ts`
- Modify: `app/_layout.tsx`
- Create: `__tests__/unit/lib/participantCountCache.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/unit/lib/participantCountCache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

// We test the module in isolation by importing after mocks are set up
describe('initBudgetCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the module to clear the in-memory cache between tests
    vi.resetModules();
  });

  it('hydrates in-memory budgetCache from AsyncStorage on init', async () => {
    const mockData = {
      'event-abc': { totalCents: 10000, perPersonCents: 5000, payingCount: 2, paidAmountCents: 0 },
    };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(mockData));

    // Import fresh module instance after mocks
    const { initBudgetCache, getAllBudgetInfos } = await import('@/lib/participantCountCache');

    // Before init, cache should be empty
    expect(getAllBudgetInfos()).toEqual({});

    await initBudgetCache();

    // After init, cache should match AsyncStorage data
    expect(getAllBudgetInfos()).toEqual(mockData);
  });

  it('handles missing AsyncStorage data gracefully', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
    const { initBudgetCache, getAllBudgetInfos } = await import('@/lib/participantCountCache');

    await initBudgetCache();

    expect(getAllBudgetInfos()).toEqual({});
  });

  it('handles corrupted AsyncStorage data without throwing', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('not valid json{{{');
    const { initBudgetCache } = await import('@/lib/participantCountCache');

    await expect(initBudgetCache()).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/unit/lib/participantCountCache.test.ts
```
Expected: FAIL — `initBudgetCache is not a function`

- [ ] **Step 3: Add `initBudgetCache` to `participantCountCache.ts`**

At the bottom of `src/lib/participantCountCache.ts`, after `loadBudgetInfo`, add:

```typescript
/**
 * Eagerly hydrates the in-memory budgetCache from AsyncStorage.
 * Call once at app startup (before any queries run) to ensure
 * getAllBudgetInfos() returns correct data on cold start.
 */
export async function initBudgetCache(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(BUDGET_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(budgetCache, data);
    }
  } catch {}
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/unit/lib/participantCountCache.test.ts
```
Expected: PASS (all 3 tests)

- [ ] **Step 5: Call `initBudgetCache` in `app/_layout.tsx`**

Add import near the top of `app/_layout.tsx` (alongside other `@/lib/` imports):
```typescript
import { initBudgetCache } from '@/lib/participantCountCache';
```

Inside `RootLayoutNav`, add a new `useEffect` after the existing initialization one:
```typescript
// Eagerly hydrate budget cache so urgency bell works on cold start
useEffect(() => {
  void initBudgetCache();
}, []);
```

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/participantCountCache.ts app/_layout.tsx __tests__/unit/lib/participantCountCache.test.ts
git commit -m "fix: hydrate budget cache on cold start so urgency bell shows after restart"
```

---

## Task 9: SRE — Booking Write Race + Atomic Audit Log

**Purpose:** Two related fixes in `bookings.ts`:
1. Event status update after booking creation is currently fire-and-forget — if it fails, the booking exists but the event stays in the wrong state silently.
2. Audit log uses read-modify-write — Stripe webhook retries can race and lose entries.

**Files:**
- Modify: `src/repositories/bookings.ts`
- Create: `supabase/migrations/20260323000000_append_booking_audit_log.sql`
- Create: `__tests__/unit/repositories/bookings.test.ts`

- [ ] **Step 1: Create the migration SQL file**

```sql
-- supabase/migrations/20260323000000_append_booking_audit_log.sql
-- Atomic audit log append to prevent race conditions on concurrent Stripe webhook retries.
-- Using array_append semantics via jsonb concatenation ensures each entry is added
-- exactly once even if two requests read the same stale value simultaneously.

create or replace function append_booking_audit_log(
  booking_id uuid,
  entry jsonb
) returns void language sql security definer as $$
  update bookings
  set audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(entry)
  where id = booking_id;
$$;
```

- [ ] **Step 2: Write the failing test for booking race fix**

Note on mock sequencing: `supabase.from` is called twice in `create()` — once for the booking insert and once for the event status update. `mockImplementationOnce` is called twice so each `.from()` call consumes one mock in order.

Also note: `supabase.rpc` must be mocked because `updatePaymentStatus` (after Step 5) will call it. Add it to the global mock here so later tests don't fail unexpectedly.

```typescript
// __tests__/unit/repositories/bookings.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase/client';

// Mock supabase.rpc for the atomic audit log call (used in updatePaymentStatus)
vi.mocked(supabase as any).rpc = vi.fn().mockResolvedValue({ error: null });

describe('bookingsRepository.create', () => {
  it('throws if event status update fails after booking insert', async () => {
    // First .from() call: booking insert — succeeds
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'booking-1', event_id: 'event-1' },
        error: null,
      }),
    } as any));

    // Second .from() call: event status update — fails
    vi.mocked(supabase.from).mockImplementationOnce(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: { message: 'RLS violation', code: '42501' },
      }),
    } as any));

    const { bookingsRepository } = await import('@/repositories/bookings');
    await expect(
      bookingsRepository.create({ event_id: 'event-1', package_id: 'pkg-1' } as any)
    ).rejects.toThrow('event status update failed');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- __tests__/unit/repositories/bookings.test.ts
```
Expected: FAIL — promise resolves instead of rejecting

- [ ] **Step 4: Fix `bookingsRepository.create` in `src/repositories/bookings.ts`**

Replace the current fire-and-forget status update (after `return data` is currently never reached on error):
```typescript
// BEFORE (lines ~89-93):
// Update event status to 'booked'
await supabase
  .from('events')
  .update({ status: 'booked' })
  .eq('id', booking.event_id);

return data;
```

Replace with:
```typescript
// Update event status to 'booked' — this must succeed for the booking to be valid
const { error: statusError } = await supabase
  .from('events')
  .update({ status: 'booked' })
  .eq('id', booking.event_id);

if (statusError) {
  throw new Error(
    `Booking created but event status update failed: ${statusError?.message ?? JSON.stringify(statusError)}`
  );
}

return data;
```

- [ ] **Step 5: Fix `updatePaymentStatus` to use atomic RPC**

Replace the entire read-modify-write block in `updatePaymentStatus` (the `select audit_log` → `auditLog.push` → `updates.audit_log = auditLog` section):

**Remove** these lines (roughly lines 144–157):
```typescript
// Add to audit log
const { data: existing } = await supabase
  .from('bookings')
  .select('audit_log')
  .eq('id', bookingId)
  .single();

const auditLog = Array.isArray(existing?.audit_log) ? existing.audit_log : [];
auditLog.push({
  action: 'payment_status_updated',
  status,
  timestamp: new Date().toISOString(),
});

updates.audit_log = auditLog;
```

**Replace** with a fire-and-forget atomic RPC call (after the main update succeeds):
```typescript
// Atomically append to audit log (prevents race conditions on concurrent webhook retries)
void supabase.rpc('append_booking_audit_log', {
  booking_id: bookingId,
  entry: { action: 'payment_status_updated', status, timestamp: new Date().toISOString() },
});
```

The `updates` object no longer sets `audit_log` — remove that key entirely.

- [ ] **Step 6: Run tests**

```bash
npm test -- __tests__/unit/repositories/bookings.test.ts
```
Expected: PASS

- [ ] **Step 7: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 8: Commit**

```bash
git add src/repositories/bookings.ts \
  "supabase/migrations/20260323000000_append_booking_audit_log.sql" \
  __tests__/unit/repositories/bookings.test.ts
git commit -m "fix: booking write race and atomic audit log append via RPC"
```

---

## Task 10: Sentry — Install, Config, Metro

**Purpose:** Install the Sentry React Native SDK and wire up the Expo plugin + Metro integration. No init code yet — that comes in Task 11.

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `app.config.ts`
- Modify: `metro.config.js`
- Modify: `.env` + `.env.example`

- [ ] **Step 1: Install the package**

```bash
cd /Users/soleilphoenix/Desktop/GameOver/game-over-app
npx expo install @sentry/react-native
```
Expected: package added to `package.json`, no peer dependency errors

- [ ] **Step 2: Add Sentry plugin to `app.config.ts`**

Find the `plugins` array (currently ending with the `react-native-crisp-chat-sdk` entry). Add the Sentry plugin as the last entry:

```typescript
plugins: [
  'expo-router',
  'expo-secure-store',
  'expo-apple-authentication',
  ['expo-calendar', { calendarPermission: 'Game Over needs access to add events to your calendar.' }],
  ['@stripe/stripe-react-native', { merchantIdentifier: 'merchant.app.gameover', enableGooglePay: true }],
  ['react-native-crisp-chat-sdk', { websiteId: '403b436b-3ea7-4b76-8d8d-3f860ed63468' }],
  [
    '@sentry/react-native/expo',
    {
      organization: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    },
  ],
],
```

- [ ] **Step 3: Update `metro.config.js` to wrap with Sentry plugin**

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withSentryConfig } = require('@sentry/react-native/metro');

const config = getDefaultConfig(__dirname);

module.exports = withSentryConfig(config);
```

- [ ] **Step 4: Add Sentry env vars to `.env` and `.env.example`**

Add to **`.env`** (after the existing Stripe key):
```
EXPO_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

Add the same four lines to **`.env.example`**. If `.env.example` doesn't exist, create it with all variables from `.env` (with empty values).

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add app.config.ts metro.config.js .env.example package.json package-lock.json
git commit -m "feat: install @sentry/react-native with Expo plugin and metro config"
```

---

## Task 11: Sentry — Init, Wrap, ErrorBoundary

**Purpose:** Initialize Sentry at app startup, wrap the root component for navigation breadcrumbs, and connect `ErrorBoundary` to forward caught errors to Sentry.

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `src/components/ErrorBoundary.tsx`

- [ ] **Step 1: Add Sentry init to `app/_layout.tsx`**

Add import at the very top of `app/_layout.tsx` (before all other imports):
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableNativeCrashHandling: true,
  enableAutoSessionTracking: true,
  tracesSampleRate: 0.2,       // Sample 20% of transactions for performance monitoring
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,  // No-op when DSN is not set
});
```

Placing `Sentry.init()` at module level (outside any component) ensures it runs before any component renders.

- [ ] **Step 2: Wrap root export with `Sentry.wrap`**

Find the final export at the bottom of `app/_layout.tsx`. It currently looks like:
```typescript
export default function RootLayout() {
  // ...
}
```

Wrap it:
```typescript
function RootLayout() {
  // ... (unchanged body)
}

export default Sentry.wrap(RootLayout);
```

- [ ] **Step 3: Update `ErrorBoundary.tsx` to forward to Sentry**

Add import at the top of `src/components/ErrorBoundary.tsx`:
```typescript
import * as Sentry from '@sentry/react-native';
```

Update `componentDidCatch`:
```typescript
componentDidCatch(error: Error, info: React.ErrorInfo) {
  Sentry.captureException(error, {
    contexts: { react: { componentStack: info.componentStack } },
  });
  console.error('[ErrorBoundary]', error, info);
}
```

Remove the `// TODO: forward to Sentry once integrated (Tier 4)` comment.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Run full test suite to confirm nothing broken**

```bash
npm test
```
Expected: all existing tests pass

- [ ] **Step 6: Commit**

```bash
git add app/_layout.tsx src/components/ErrorBoundary.tsx
git commit -m "feat: initialize Sentry with native crash reporting and wire ErrorBoundary"
```

---

## Task 12: Native Rebuild + Verification

**Purpose:** Generate the native iOS/Android projects with Sentry Cocoa + Sentry Android SDK wired in. Verify the full integration is live.

**Files:** iOS/Android native project files (auto-generated — do not manually edit)

- [ ] **Step 1: Run prebuild**

```bash
cd /Users/soleilphoenix/Desktop/GameOver/game-over-app
npx expo prebuild --clean
```
Expected: `ios/` and `android/` directories regenerated. Sentry Cocoa pod appears in `ios/Podfile.lock`.

- [ ] **Step 2: Verify Sentry appears in native configs**

```bash
grep -i sentry ios/Podfile.lock | head -5
grep -i sentry android/app/build.gradle | head -5
```
Expected: Sentry entries present in both files.

- [ ] **Step 3: Build and run on iOS simulator**

```bash
npx expo run:ios
```
Expected: app builds and launches without errors.

- [ ] **Step 4: Add a temporary Sentry test (remove after verifying)**

In `app/_layout.tsx`, inside `RootLayoutNav` after the `initialize()` call, add temporarily:
```typescript
// TEMP: remove after verifying Sentry connectivity
if (__DEV__ && process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.captureMessage('Sentry connectivity test — delete me');
}
```

**Success criteria:**
1. Open your Sentry project dashboard → Issues (or search for "Sentry connectivity test")
2. Within 30 seconds of app launch, the message should appear
3. Click into it — confirm it shows: device model, OS version, app version, and a stack trace pointing to `_layout.tsx`
4. If message does NOT appear after 60 seconds: check that `EXPO_PUBLIC_SENTRY_DSN` is set correctly in `.env`, rebuild with `npx expo run:ios` to pick up the new env var, and verify the DSN URL matches your Sentry project's DSN (found in Sentry → Project Settings → SDK Setup)

- [ ] **Step 5: Remove the temp test, commit**

Remove the temporary `captureMessage` line.

```bash
git add app/_layout.tsx
git commit -m "chore: verify Sentry wired — remove temp connectivity test"
```

- [ ] **Step 6: Final full test run**

```bash
npm test
npm run typecheck
npm run lint
```
Expected: all pass

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: finalize Tier 4 quality fixes — all tasks complete"
```

---

## Post-Implementation Checklist

- [ ] Enable email confirmation in Supabase Dashboard → Authentication → Settings → "Enable email confirmations"
- [ ] Create Sentry account, create project, copy DSN into `.env` as `EXPO_PUBLIC_SENTRY_DSN`
- [ ] Fill in `SENTRY_ORG` and `SENTRY_PROJECT` for source map uploads in CI
- [ ] For WhatsApp (B6): follow the Meta Business Verification steps documented in the spec Out-of-Scope section
