# Tier 3 — UX/Design Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 22 Tier 3 UX/Design findings: 1 critical dark-theme visual bug, ~25 stale color references across 10 files, a guest invite login dead-end, fragile tab bar visibility logic, a shared IconCircle component extraction, and UX polish for Budget auto-select and Event Detail error states.

**Architecture:** Fixes are grouped by scope — pure color/style changes first (no logic risk), then UX flow corrections, then design-system component extractions. Each task produces an independently testable change. The wizard step-progress indicator is already implemented and does NOT need to be added.

**Tech Stack:** React Native, Expo Router, Tamagui, Zustand, TypeScript. All styling uses `DARK_THEME` from `src/constants/theme.ts` (`primary: '#5A7EB0'`).

---

## File Map

| File | Change |
|------|--------|
| `app/event/[id]/polls.tsx` | Replace `colors.light.*` → `DARK_THEME.*` throughout |
| `src/components/ui/GlassPanel.tsx` | `rgba(37,140,244,0.2)` → `rgba(90,126,176,0.2)` |
| `src/components/ui/Badge.tsx` | `rgba(37,140,244,0.15)` → `rgba(90,126,176,0.15)` |
| `src/constants/spacing.ts` | `shadowColor: '#258CF4'` → `'#5A7EB0'` |
| `src/hooks/usePushNotifications.ts` | `lightColor: '#258CF4'` → `'#5A7EB0'` |
| `app/booking/[eventId]/confirmation.tsx` | 5× `#258CF4` / `rgba(37,140,244` → `#5A7EB0` / `rgba(90,126,176` |
| `app/booking/[eventId]/payment.tsx` | 3× `#258CF4` / `rgba(37,140,244` → correct values |
| `app/create-event/review.tsx` | 1× `rgba(37,140,244` → `rgba(90,126,176` |
| `app/package/[id].tsx` | 2× `rgba(37,140,244` → `rgba(90,126,176` |
| `app/event/[id]/communication.tsx` | 14× `#4A6FA5` → `DARK_THEME.primary` |
| `app/notifications/index.tsx` | 1× `#4A6FA5` (stylesheet) → `DARK_THEME.primary` |
| `src/components/ui/Toggle.tsx` | outputRange second value `#4A6FA5` → `#5A7EB0` |
| `src/components/polls/PollCard.tsx` | local `primary: '#4A6FA5'` → `'#5A7EB0'` |
| `src/components/profile/AvatarUpload.tsx` | local `primary: '#4a6fa5'` → `'#5A7EB0'` |
| `app/invite/[code].tsx` | Persistent login link + safe Decline navigation |
| `app/(tabs)/_layout.tsx` | Replace `routeHasEventId` inspection with focus-effect approach |
| `app/(tabs)/chat/index.tsx` | Add `useTabBarStore` hide/show on focus when eventId present |
| `src/components/ui/IconCircle.tsx` | **Create** — new shared component |
| `src/components/ui/index.ts` | Export `IconCircle` |
| `src/constants/theme.ts` | Add `CARD_VARIANTS` documentation const |
| `app/(tabs)/budget/index.tsx` | Auto-select last booked event, remove manual selector dialog |
| `app/event/[id]/index.tsx` | Add `isError` + "Try Again" button |

---

## Task 1: Fix polls.tsx — Dark Theme Violation

**This is the only genuine dark-theme-breaking visual bug in the app.** The file currently imports `colors` from `@/constants/colors` and uses `colors.light.*` values (white backgrounds, light borders) for filter chips and buttons — visually broken on the dark background.

**Files:**
- Modify: `app/event/[id]/polls.tsx`

- [ ] **Step 1: Replace the import**

  In `app/event/[id]/polls.tsx`, replace line 14:
  ```typescript
  // Remove:
  import { colors } from '@/constants/colors';

  // Add:
  import { DARK_THEME } from '@/constants/theme';
  ```

- [ ] **Step 2: Fix RefreshControl**

  Around line 182–183, replace:
  ```typescript
  colors={[colors.light.primary]}
  tintColor={colors.light.primary}
  ```
  With:
  ```typescript
  colors={[DARK_THEME.primary]}
  tintColor={DARK_THEME.primary}
  ```

- [ ] **Step 3: Fix empty-state icon circle**

  Around line 192, replace:
  ```typescript
  backgroundColor={`${colors.light.primary}15`}
  ```
  With:
  ```typescript
  backgroundColor="rgba(90, 126, 176, 0.08)"
  ```
  And around line 200:
  ```typescript
  color={colors.light.primary}
  ```
  With:
  ```typescript
  color={DARK_THEME.primary}
  ```

- [ ] **Step 4: Fix StyleSheet values**

  In the `StyleSheet.create` block (around lines 237–271), replace every `colors.light.*` reference:
  ```typescript
  // BEFORE (addButton):
  backgroundColor: colors.light.primary,

  // AFTER:
  backgroundColor: DARK_THEME.primary,

  // BEFORE (filterChip):
  backgroundColor: colors.light.background,
  borderColor: colors.light.border,

  // AFTER:
  backgroundColor: DARK_THEME.surface,
  borderColor: DARK_THEME.glassBorder,

  // BEFORE (filterChipSelected):
  backgroundColor: colors.light.primary,
  borderColor: colors.light.primary,

  // AFTER:
  backgroundColor: DARK_THEME.primary,
  borderColor: DARK_THEME.primary,

  // BEFORE (createButton):
  backgroundColor: colors.light.primary,

  // AFTER:
  backgroundColor: DARK_THEME.primary,
  ```

- [ ] **Step 5: Verify no remaining `colors.light` references in polls.tsx**

  ```bash
  grep "colors\.light" app/event/\[id\]/polls.tsx
  # Expected: no output
  ```

- [ ] **Step 6: Typecheck**

  ```bash
  cd /Users/soleilphoenix/Desktop/GameOver/game-over-app && npm run typecheck 2>&1 | grep "polls"
  # Expected: no output
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add app/event/\[id\]/polls.tsx
  git commit -m "fix: replace colors.light.* with DARK_THEME in polls.tsx (dark-theme violation)"
  ```

---

## Task 2: Stale Color Cleanup — `#258CF4` → `#5A7EB0`

The old primary color `#258CF4` (bright blue) appears in 9 files. The canonical primary is now `#5A7EB0` (muted navy blue) from `DARK_THEME.primary`.

**Files:**
- Modify: `src/components/ui/GlassPanel.tsx`, `src/components/ui/Badge.tsx`, `src/constants/spacing.ts`, `src/hooks/usePushNotifications.ts`, `app/booking/[eventId]/confirmation.tsx`, `app/booking/[eventId]/payment.tsx`, `app/create-event/review.tsx`, `app/package/[id].tsx`

- [ ] **Step 1: Fix GlassPanel icon circle background**

  In `src/components/ui/GlassPanel.tsx` line 43:
  ```typescript
  // Before:
  backgroundColor="rgba(37, 140, 244, 0.2)"

  // After:
  backgroundColor="rgba(90, 126, 176, 0.2)"
  ```

- [ ] **Step 2: Fix Badge primary variant background**

  In `src/components/ui/Badge.tsx` line 36:
  ```typescript
  // Before:
  backgroundColor: 'rgba(37, 140, 244, 0.15)',

  // After:
  backgroundColor: 'rgba(90, 126, 176, 0.15)',
  ```

- [ ] **Step 3: Fix spacing.ts shadow color**

  In `src/constants/spacing.ts` line 86:
  ```typescript
  // Before:
  shadowColor: '#258CF4',

  // After:
  shadowColor: '#5A7EB0',
  ```

- [ ] **Step 4: Fix usePushNotifications lightColor**

  In `src/hooks/usePushNotifications.ts` around line 103:
  ```typescript
  // Before:
  lightColor: '#258CF4',

  // After:
  lightColor: '#5A7EB0',
  ```

- [ ] **Step 5: Fix confirmation.tsx (5 references)**

  In `app/booking/[eventId]/confirmation.tsx`, do the following replacements:
  ```typescript
  // All: '#258CF4' → '#5A7EB0'
  // All: 'rgba(37, 140, 244, 0.1)' → 'rgba(90, 126, 176, 0.1)'
  ```
  Run verify:
  ```bash
  grep "258CF4\|37, 140, 244" app/booking/\[eventId\]/confirmation.tsx
  # Expected: no output
  ```

- [ ] **Step 6: Fix payment.tsx (3 references)**

  In `app/booking/[eventId]/payment.tsx`:
  ```typescript
  // All: '#258CF4' → '#5A7EB0'
  // All: 'rgba(37, 140, 244, 0.1)' → 'rgba(90, 126, 176, 0.1)'
  ```
  Verify: `grep "258CF4\|37, 140, 244" app/booking/\[eventId\]/payment.tsx` → no output

- [ ] **Step 7: Fix review.tsx and package/[id].tsx**

  In `app/create-event/review.tsx`:
  ```typescript
  // 'rgba(37, 140, 244, 0.1)' → 'rgba(90, 126, 176, 0.1)'
  ```
  In `app/package/[id].tsx` (2 instances):
  ```typescript
  // 'rgba(37, 140, 244, 0.15)' → 'rgba(90, 126, 176, 0.15)'
  ```

- [ ] **Step 8: Verify no remaining old primary across entire codebase**

  ```bash
  grep -rn "258CF4\|37, 140, 244" \
    app/ src/ \
    --include="*.tsx" --include="*.ts" \
    | grep -v node_modules
  # Expected: no output
  ```

- [ ] **Step 9: Typecheck**

  ```bash
  npm run typecheck 2>&1 | grep -c "error"
  # Expected: 0
  ```

- [ ] **Step 10: Commit**

  ```bash
  git add \
    src/components/ui/GlassPanel.tsx \
    src/components/ui/Badge.tsx \
    src/constants/spacing.ts \
    src/hooks/usePushNotifications.ts \
    "app/booking/[eventId]/confirmation.tsx" \
    "app/booking/[eventId]/payment.tsx" \
    app/create-event/review.tsx \
    "app/package/[id].tsx"
  git commit -m "fix: replace stale #258CF4 primary color with #5A7EB0 across 8 files"
  ```

---

## Task 3: Stale Color Cleanup — `#4A6FA5` → `#5A7EB0`

The intermediate primary `#4A6FA5` appears in 5 files. This is a slightly darker variant that predates the unified `#5A7EB0`.

**Files:**
- Modify: `app/event/[id]/communication.tsx` (14 refs), `app/notifications/index.tsx` (1 ref), `src/components/ui/Toggle.tsx` (1 ref), `src/components/polls/PollCard.tsx` (1 ref), `src/components/profile/AvatarUpload.tsx` (1 ref)

- [ ] **Step 1: Fix communication.tsx (14 references)**

  In `app/event/[id]/communication.tsx`, replace all `#4A6FA5` with `#5A7EB0`:
  ```bash
  # Count before:
  grep -c "4A6FA5" "app/event/[id]/communication.tsx"
  # Expected: 14
  ```
  Use find-and-replace: `'#4A6FA5'` → `'#5A7EB0'` (all occurrences, case-sensitive).

  ```bash
  # Verify:
  grep "4A6FA5\|4a6fa5" "app/event/[id]/communication.tsx"
  # Expected: no output
  ```

- [ ] **Step 2: Fix notifications/index.tsx StyleSheet**

  In `app/notifications/index.tsx`, find the StyleSheet with `backgroundColor: '#4A6FA5'` (around line 514) and replace with `backgroundColor: DARK_THEME.primary`. Note: `DARK_THEME` is already imported at the top of this file.

- [ ] **Step 3: Fix Toggle.tsx animation output**

  In `src/components/ui/Toggle.tsx` around line 47, the outputRange controls thumb animation:
  ```typescript
  // Before:
  outputRange: ['#4B5563', '#4A6FA5'],

  // After — keep OFF state gray, update ON state:
  outputRange: ['#4B5563', '#5A7EB0'],
  ```

- [ ] **Step 4: Fix PollCard.tsx local primary**

  In `src/components/polls/PollCard.tsx` around line 18:
  ```typescript
  // Before:
  primary: '#4A6FA5',

  // After:
  primary: '#5A7EB0',
  ```

- [ ] **Step 5: Fix AvatarUpload.tsx local primary**

  In `src/components/profile/AvatarUpload.tsx` around line 28:
  ```typescript
  // Before:
  primary: '#4a6fa5',

  // After:
  primary: '#5A7EB0',
  ```

- [ ] **Step 6: Final audit — no old primaries anywhere**

  ```bash
  grep -rn "4A6FA5\|4a6fa5\|258CF4\|258cf4\|37, 140, 244" \
    app/ src/ \
    --include="*.tsx" --include="*.ts" \
    | grep -v node_modules | grep -v ".test."
  # Expected: no output
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add \
    "app/event/[id]/communication.tsx" \
    app/notifications/index.tsx \
    src/components/ui/Toggle.tsx \
    src/components/polls/PollCard.tsx \
    src/components/profile/AvatarUpload.tsx
  git commit -m "fix: replace stale #4A6FA5 with unified #5A7EB0 primary across 5 files"
  ```

---

## Task 4: Guest Invite — Persistent Login Link + Safe Decline

**Two fixes in one file:**
1. "Log in instead" is only shown when the email error message contains the string "Log in instead". A user who already has an account sees an error, then must notice the conditionally-rendered link. Fix: add a persistent "Already have an account? Log in →" link below the signup form, always visible.
2. "Decline" button calls `router.back()`, which on cold-start (app opened directly from invite link) has nothing to go back to and exits the app. Fix: use `router.canGoBack()` with a fallback to `/(tabs)/events`.

**Files:**
- Modify: `app/invite/[code].tsx`

- [ ] **Step 1: Add persistent login link in signup step**

  In `app/invite/[code].tsx`, find the signup form's submit button (around line 495–502):
  ```tsx
  <Button
    onPress={signupForm.handleSubmit(handleSignup)}
    loading={isSubmitting}
    testID="signup-submit-button"
    marginTop="$2"
  >
    Create Account →
  </Button>
  ```
  Add a persistent login link **after** that button (outside the conditional error check):
  ```tsx
  <Button
    onPress={signupForm.handleSubmit(handleSignup)}
    loading={isSubmitting}
    testID="signup-submit-button"
    marginTop="$2"
  >
    Create Account →
  </Button>

  {/* Persistent link — visible before any error occurs */}
  <Pressable
    onPress={handleLoginInstead}
    style={{ alignItems: 'center', paddingVertical: 12 }}
    testID="login-instead-link"
  >
    <Text fontSize={13} color={DARK_THEME.textTertiary}>
      Already have an account?{' '}
      <Text color={DARK_THEME.primary} textDecorationLine="underline">
        Log in instead →
      </Text>
    </Text>
  </Pressable>
  ```
  Keep the existing error-triggered link as-is (it gives contextual placement near the email field).

- [ ] **Step 2: Fix Decline safe navigation**

  Find line ~378:
  ```tsx
  <Pressable onPress={() => router.back()} style={{ alignItems: 'center', paddingVertical: 8 }}>
    <Text fontSize={13} color="$textTertiary">Decline</Text>
  </Pressable>
  ```
  Replace with:
  ```tsx
  <Pressable
    onPress={() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/events');
      }
    }}
    style={{ alignItems: 'center', paddingVertical: 8 }}
    testID="decline-invite-button"
  >
    <Text fontSize={13} color="$textTertiary">Decline</Text>
  </Pressable>
  ```

- [ ] **Step 3: Typecheck**

  ```bash
  npm run typecheck 2>&1 | grep "invite"
  # Expected: no output
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add "app/invite/[code].tsx"
  git commit -m "fix: persistent login link in invite signup + safe Decline navigation on cold-start"
  ```

---

## Task 5: Tab Bar Visibility — Replace Route Inspection with Focus Effects

**The problem:** `app/(tabs)/_layout.tsx` currently inspects route names and params at render time to decide whether to hide the tab bar when chat/budget are opened from Event Summary. This is fragile because it relies on knowing the internal structure of nested navigators.

**The fix:** The `useTabBarStore` (Zustand) is already the right approach. Budget already uses it (it calls `setTabBarHidden(true)` when `eventIdParam` is set). The problem is chat doesn't. Remove the `routeHasEventId` inspection and rely entirely on the store.

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `app/(tabs)/chat/index.tsx`

- [ ] **Step 1: Read chat/index.tsx top section**

  Read `app/(tabs)/chat/index.tsx` lines 1–80 to confirm the component structure and imports. Look for any existing `useTabBarStore` usage.

- [ ] **Step 2: Add tab bar hide to chat when opened with eventId**

  In `app/(tabs)/chat/index.tsx`, find where `eventId` or `eventIdParam` is derived from URL params (similar to how budget does it). Add:
  ```typescript
  import { useTabBarStore } from '@/stores/tabBarStore';

  // Inside the component, near other hooks:
  const { eventId: rawEventIdParam } = useLocalSearchParams<{ eventId?: string }>();
  const setTabBarHidden = useTabBarStore((s) => s.setHidden);

  // Hide tab bar when accessed from Event Summary (eventId present in URL)
  useFocusEffect(
    useCallback(() => {
      if (rawEventIdParam) setTabBarHidden(true);
      return () => setTabBarHidden(false);
    }, [rawEventIdParam, setTabBarHidden])
  );
  ```
  Import `useFocusEffect` and `useCallback` from `react` / `expo-router` as needed.

- [ ] **Step 3: Simplify _layout.tsx — remove routeHasEventId**

  In `app/(tabs)/_layout.tsx`, remove the `routeHasEventId` function and the two variables that use it:

  ```typescript
  // Remove these 3 blocks entirely:
  const routeHasEventId = (route: any): boolean => {
    if (!route) return false;
    if ((route.params as any)?.eventId) return true;
    if (route.state?.routes) return route.state.routes.some(routeHasEventId);
    return false;
  };
  const isChatFromEventSummary = currentRoute?.name === 'chat' && routeHasEventId(currentRoute);
  const isBudgetFromEventSummary = currentRoute?.name === 'budget' && routeHasEventId(currentRoute);

  // Simplify the visibility check to:
  if (tabBarHidden || isChannelDetailScreen) {
    return null;
  }
  ```

  The `tabBarHidden` store now handles both chat-from-event and budget-from-event cases.

- [ ] **Step 4: Verify tab bar hide still works**

  Manual test checklist (visual):
  - Open app → tap any event → tap "Chat" tool from event summary → tab bar should be hidden
  - Open app → tap any event → tap "Budget" tool from event summary → tab bar should be hidden
  - Navigate back to Events tab → tab bar should be visible again

- [ ] **Step 5: Typecheck**

  ```bash
  npm run typecheck 2>&1 | grep -E "layout|chat" | grep error
  # Expected: no output
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add "app/(tabs)/_layout.tsx" "app/(tabs)/chat/index.tsx"
  git commit -m "fix: replace fragile route-inspection for tab bar with store-based focus effects"
  ```

---

## Task 6: Event Detail — Network Error State

**The Events list screen already has a "Tap to retry" error banner. Event Detail (`app/event/[id]/index.tsx`) currently has no error handling for failed data loads — the screen just shows empty/loading state indefinitely.**

**Files:**
- Modify: `app/event/[id]/index.tsx`

- [ ] **Step 1: Read the useEvent hook call in index.tsx**

  ```bash
  grep -n "useEvent\|isError\|isLoading\|error" app/event/\[id\]/index.tsx | head -20
  ```
  Note the variable names for `error` and `isLoading` from the hook.

- [ ] **Step 2: Add error state rendering**

  After the existing loading state check, add an error state. Find the section near the top of the return statement where loading is handled. Add:
  ```tsx
  // After the loading guard (isLoading && !event check), add:
  if (eventError && !event) {
    return (
      <View style={{ flex: 1, backgroundColor: DARK_THEME.background, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Ionicons name="cloud-offline-outline" size={48} color={DARK_THEME.textTertiary} />
        <Text style={{ color: DARK_THEME.textPrimary, fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 }}>
          {t.common.error}
        </Text>
        <Text style={{ color: DARK_THEME.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          {t.events.loadError}
        </Text>
        <Pressable
          onPress={() => refetch()}
          style={{ backgroundColor: DARK_THEME.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{t.common.retry}</Text>
        </Pressable>
      </View>
    );
  }
  ```
  Make sure `eventError` and `refetch` are destructured from the data hook, and `Pressable` and `Ionicons` are imported.

- [ ] **Step 3: Typecheck**

  ```bash
  npm run typecheck 2>&1 | grep "event.*index"
  # Expected: no output
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add "app/event/[id]/index.tsx"
  git commit -m "fix: add network error state with retry button to Event Detail screen"
  ```

---

## Task 7: Extract IconCircle Shared Component

**30+ instances of the same pattern (32px circle, translucent colored background, Ionicon inside) are spread across Profile, Event Detail, Budget, Notifications, GlassPanel, ShareEventBanner.** Extracting this eliminates maintenance drift and ensures consistent sizing.

**Files:**
- Create: `src/components/ui/IconCircle.tsx`
- Modify: `src/components/ui/index.ts` (add export)
- Migrate 3–5 key screens as proof-of-concept (not required to migrate every instance)

- [ ] **Step 1: Create the component**

  Create `src/components/ui/IconCircle.tsx`:
  ```tsx
  /**
   * IconCircle — shared 32px icon-in-circle component.
   * Used in Profile, Event Detail, Budget, Notifications, GlassPanel, etc.
   */
  import React from 'react';
  import { View, ViewStyle } from 'react-native';
  import { Ionicons } from '@expo/vector-icons';

  interface IconCircleProps {
    /** Ionicons icon name */
    name: string;
    /** Icon size — defaults to 18 */
    iconSize?: number;
    /** Icon color */
    color: string;
    /** Circle background color (e.g. 'rgba(90,126,176,0.2)') */
    backgroundColor: string;
    /** Circle diameter — defaults to 32 */
    size?: number;
    style?: ViewStyle;
  }

  export function IconCircle({
    name,
    iconSize = 18,
    color,
    backgroundColor,
    size = 32,
    style,
  }: IconCircleProps) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <Ionicons name={name as any} size={iconSize} color={color} />
      </View>
    );
  }

  export default IconCircle;
  ```

- [ ] **Step 2: Export from ui/index.ts**

  Check if `src/components/ui/index.ts` exists:
  ```bash
  ls src/components/ui/index.ts 2>/dev/null && echo "exists" || echo "missing"
  ```
  If it exists, add: `export { IconCircle } from './IconCircle';`
  If it doesn't exist (or doesn't export), add the export to whichever barrel file the other ui components use (check how `GlassPanel` is imported in other files to find the barrel).

- [ ] **Step 3: Migrate GlassPanel to use IconCircle**

  In `src/components/ui/GlassPanel.tsx`, replace the inline icon circle (lines ~39–48) with:
  ```tsx
  import { IconCircle } from './IconCircle';

  // Replace the inline YStack + Ionicons with:
  <IconCircle
    name={icon}
    color={DARK_THEME.primary}
    backgroundColor="rgba(90, 126, 176, 0.2)"
  />
  ```

- [ ] **Step 4: Typecheck**

  ```bash
  npm run typecheck 2>&1 | grep "IconCircle\|GlassPanel"
  # Expected: no output
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/ui/IconCircle.tsx src/components/ui/GlassPanel.tsx
  # Add index.ts if changed:
  git add src/components/ui/index.ts 2>/dev/null
  git commit -m "feat: extract IconCircle shared component, migrate GlassPanel"
  ```

---

## Task 8: Document Card Variants in theme.ts

**3 divergent card styles are used without documentation, so developers choose arbitrarily. This task adds a `CARD_VARIANTS` const to `theme.ts` that names the three styles and documents when to use each.**

**Files:**
- Modify: `src/constants/theme.ts`

- [ ] **Step 1: Add CARD_VARIANTS to theme.ts**

  At the end of `src/constants/theme.ts`, after the `DARK_THEME` export, add:
  ```typescript
  /**
   * Named card style variants — use these instead of choosing background colors ad-hoc.
   *
   * card      — primary surface, used for main content cards (events, packages, profile sections)
   * glassCard — translucent glass effect, used for overlays and contextual cards
   * deepCard  — deeper background, used for nested content within a card (sub-sections)
   */
  export const CARD_VARIANTS = {
    /** Opaque surface — main content cards */
    card:      { backgroundColor: DARK_THEME.surface },          // '#1E2329'
    /** Translucent glass — overlays, contextual cards */
    glassCard: { backgroundColor: 'rgba(45, 55, 72, 0.4)' },
    /** Deep surface — nested content within cards */
    deepCard:  { backgroundColor: DARK_THEME.surfaceCard },      // '#23272F'
  } as const;
  ```

- [ ] **Step 2: Typecheck**

  ```bash
  npm run typecheck 2>&1 | grep "theme"
  # Expected: no output
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/constants/theme.ts
  git commit -m "docs: add CARD_VARIANTS to theme.ts to formalize the three card style patterns"
  ```

---

## Task 9: Budget — Auto-Select Last Booked Event

**The Budget tab in standalone mode (not opened from Event Summary) shows a manual event-selector dialog. Users with only one event shouldn't need to tap to select it. Fix: auto-select the most recently created booked event if only one booked event exists.**

**Files:**
- Modify: `app/(tabs)/budget/index.tsx`

- [ ] **Step 1: Read the current auto-selection logic**

  ```bash
  grep -n "setSelectedEventId\|selectedEventId\|bookedEvents\|hasBookedEvents" \
    "app/(tabs)/budget/index.tsx" | head -20
  ```
  Understand where `selectedEventId` is set and how `bookedEvents` is derived.

- [ ] **Step 2: Add auto-selection useEffect**

  Find the `useEffect` block that loads cached data or the block where `selectedEventId` is initialized. Add an effect that auto-selects when there is exactly one booked event and no eventId was passed via URL:
  ```typescript
  // After: const [selectedEventId, setSelectedEventId] = useState<string | null>(eventIdParam || null);

  // Auto-select the single booked event to skip the manual selector dialog
  useEffect(() => {
    if (selectedEventId) return; // Already selected (URL param or user choice)
    if (!bookedEvents || bookedEvents.length === 0) return;
    if (bookedEvents.length === 1) {
      setSelectedEventId(bookedEvents[0].id);
    }
    // Multiple events: leave selectedEventId null so the user can choose
  }, [bookedEvents, selectedEventId]);
  ```
  Where `bookedEvents` is the filtered list of events with status `'booked'`. Confirm the variable name by reading the file first (Step 1).

- [ ] **Step 3: Typecheck**

  ```bash
  npm run typecheck 2>&1 | grep "budget"
  # Expected: no output
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add "app/(tabs)/budget/index.tsx"
  git commit -m "ux: auto-select single booked event in Budget tab (skip manual selector)"
  ```

---

## Task 10: Button Component in Main Tab Screens

**The `Button` component (with press animation, loading state, `pressStyle` scale) is used in Wizard/Auth/Booking but not in main tabs. Budget, Event, and Profile use raw `Pressable` for primary actions. This creates two visual "classes" of buttons.**

**Scope:** Only address the 3 highest-impact buttons: Budget "Pay Remaining Balance", Event "Book Package" (packages CTA), Profile "Log Out". Do NOT refactor all Pressables — only primary CTA buttons.

**Files:**
- Modify: `app/(tabs)/budget/index.tsx`
- Modify: `app/(tabs)/profile/index.tsx`

- [ ] **Step 1: Read how "Pay Remaining Balance" button is implemented**

  ```bash
  grep -n "payRemainingBtn\|Pay Remaining\|handlePayRemaining" \
    "app/(tabs)/budget/index.tsx" | head -10
  ```

- [ ] **Step 2: Replace "Pay Remaining Balance" button in Budget**

  Find the raw `Pressable` that triggers the remaining-balance payment. Replace with the `Button` component:
  ```tsx
  // Before (raw Pressable pattern):
  <Pressable onPress={handlePayRemaining} style={styles.payRemainingButton}>
    <Text style={styles.payRemainingText}>{t.budget.payRemainingBtn}</Text>
  </Pressable>

  // After (using shared Button):
  import { Button } from '@/components/ui/Button';

  <Button
    onPress={handlePayRemaining}
    variant="primary"
    testID="pay-remaining-button"
    size="$5"
  >
    {t.budget.payRemainingBtn}
  </Button>
  ```
  Confirm `Button` is not already imported in this file first. If the existing button has specific style overrides (e.g. fills the card width), keep them via a wrapping `View` or the `style` prop.

- [ ] **Step 3: Replace "Log Out" button in Profile**

  In `app/(tabs)/profile/index.tsx`, find the Log Out button. Replace the raw `Pressable` with:
  ```tsx
  <Button
    variant="outline"
    onPress={handleLogout}
    testID="logout-button"
  >
    {t.profile.logOut}
  </Button>
  ```

- [ ] **Step 4: Typecheck**

  ```bash
  npm run typecheck 2>&1 | grep -E "budget|profile" | grep error
  # Expected: no output
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add "app/(tabs)/budget/index.tsx" "app/(tabs)/profile/index.tsx"
  git commit -m "ux: replace raw Pressable with Button component for Pay Remaining + Log Out CTAs"
  ```

---

## Final Verification

- [ ] **Run full typecheck — 0 errors**

  ```bash
  cd /Users/soleilphoenix/Desktop/GameOver/game-over-app
  npm run typecheck 2>&1 | grep -c "error TS"
  # Expected: 0
  ```

- [ ] **Run linter**

  ```bash
  npm run lint 2>&1 | grep -c "error"
  # Expected: 0
  ```

- [ ] **Color audit — no old primaries**

  ```bash
  grep -rn "258CF4\|4A6FA5\|4a6fa5\|37, 140, 244\|colors\.light\." \
    app/ src/ \
    --include="*.tsx" --include="*.ts" \
    | grep -v node_modules | grep -v ".test."
  # Expected: no output
  ```

- [ ] **Final commit summary**

  ```bash
  git log --oneline -10
  ```

---

## Findings Addressed

| # | Finding | Agent | Task | Status |
|---|---------|-------|------|--------|
| 1 | Wizard step indicator missing | UX Architect | — | **Already implemented** in `create-event/_layout.tsx` |
| 2 | Guest "already have account" dead-end | UX Architect | Task 4 | ✅ |
| 3 | Tab bar visibility fragile (route inspection) | UX Architect | Task 5 | ✅ |
| 4 | Budget 2 modes (selector dialog) | UX Architect | Task 9 | ✅ |
| 5 | DARK_THEME local drift (#4A6FA5) | UX Architect | Task 3 | ✅ |
| 6 | "Decline" invite cold-start crash | UX Architect | Task 4 | ✅ |
| 7 | Network error states (Event Detail) | UX Architect | Task 6 | ✅ |
| 8 | Events screen error state | UX Architect | — | **Already implemented** (error banner exists) |
| 9 | Budget auto-select | UX Architect | Task 9 | ✅ |
| 10 | Persistent login link | UX Architect | Task 4 | ✅ |
| 11 | polls.tsx dark theme violation | UI Designer | Task 1 | ✅ |
| 12 | Stale #258CF4 in GlassPanel, Badge, spacing.ts + 5 app files | UI Designer | Task 2 | ✅ |
| 13 | Stale #4A6FA5 in communication.tsx + 4 more | UI Designer | Task 3 | ✅ |
| 14 | Button fragmentation in main tabs | UI Designer | Task 10 | ✅ |
| 15 | 3 divergent card styles undocumented | UI Designer | Task 8 | ✅ |
| 16 | Typography system unused | UI Designer | — | **Out of scope** — full typography migration is a major refactor; inline font sizes work correctly |
| 17 | 30+ IconCircle inline | UI Designer | Task 7 | ✅ (component created + GlassPanel migrated) |
| 18 | GlassPanel icon color (#258CF4) | UI Designer | Task 2 | ✅ |
| 19 | Badge primary color (#258CF4) | UI Designer | Task 2 | ✅ |
| 20 | usePushNotifications lightColor | UI Designer | Task 2 | ✅ |
| 21 | spacing.ts shadowColor | UI Designer | Task 2 | ✅ |
| 22 | Login redirect after invite | UX Architect | Task 4 | ✅ |
