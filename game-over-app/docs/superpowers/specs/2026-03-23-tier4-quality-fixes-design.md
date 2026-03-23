# Tier 4 Quality Fixes — Design Spec

**Date:** 2026-03-23
**Branch:** fix/tier4-quality-accessibility-sre
**Scope:** Accessibility audit findings + SRE reliability findings from agent analysis

---

## Overview

This spec addresses all Tier 4 findings from the multi-agent quality analysis of the Game Over app. The work falls into four areas: accessibility attributes, color contrast, SRE code reliability, and Sentry native crash reporting.

---

## Section 1 — Accessibility Fixes

### 1.1 signup.tsx
- Add `accessibilityLabel` + `accessibilityHint` to every `TextInput` (firstName, lastName, phone, email, password, confirmPassword)
- Add `accessibilityRole="button"` + `accessibilityLabel` to back button, Show/Hide password toggles, and submit button
- Add `accessibilityState={{ disabled: isLoading }}` to submit button
- Add `accessibilityLiveRegion="polite"` to the error container `View` so VoiceOver announces errors on appearance

### 1.2 app/(tabs)/profile/notifications.tsx
- Add `accessibilityLabel` + `accessibilityRole="button"` to back button
- Add `accessibilityLabel` describing each row (e.g. "Push notifications, switch") to each toggle row `XStack`
- Add `accessibilityRole="switch"` + `accessibilityState={{ checked: value }}` to each toggle row wrapper

### 1.3 src/components/ui/Input.tsx
- Accept `accessibilityLabel` prop and forward it explicitly to `StyledInput` (currently in `...props` but not guaranteed to pass through)
- Add `accessibilityLiveRegion="polite"` to `StyledHelperText` when `error` is truthy so field errors are announced automatically
- Add `accessibilityState={{ disabled }}` to `StyledInput`

### 1.4 src/components/ui/Button.tsx
- Accept and forward `accessibilityLabel` prop explicitly
- `aria-busy` and `aria-disabled` already present — no changes needed

### 1.5 src/components/ui/Chip.tsx
- Replace `aria-selected={selected}` with `accessibilityRole="checkbox"` + `accessibilityState={{ checked: selected }}`
- Add `accessibilityLabel={label}` so screen readers announce chip content
- Note: Chip is used exclusively in multi-select wizard contexts in this app, so `"checkbox"` is the correct role

### 1.6 app/(tabs)/_layout.tsx — Tab Bar
- **Change** (not add) `accessibilityRole="button"` → `"tab"` on each tab `Pressable` in `CustomTabBar` (currently line ~202)
- `accessibilityLabel` is already read from `options.tabBarAccessibilityLabel` — set this in each `Tabs.Screen` options:
  ```tsx
  // Use the translation hook value at layout render time, e.g.:
  options={{ tabBarAccessibilityLabel: `${t.tabs.events}, tab 1 of 4` }}
  ```
  Each tab gets its own translated label (events/chat/budget/profile) with its position. The `t` instance must be read inside the component body where the hook is valid.
- Add `accessibilityLabel="Create new event"` + `accessibilityRole="button"` to `FABButton`'s inner `Pressable`

### 1.7 Modal Focus Trap
- Scan all modal `View` roots (e.g., `CreatePollModal`, any Sheet/Dialog wrapper components in `src/components/`) and add `accessibilityViewIsModal={true}` to the root `View` of each modal content area

---

## Section 2 — Color Contrast Fix

**Problem:** `#5A7EB0` (primary) = 3.9:1 contrast ratio on dark background. WCAG AA requires ≥ 4.5:1 for normal text.
**Solution:** Use `DARK_THEME.primaryLight` (`#7A9BC4`, 5.6:1) where primary is used as *text or icon color* on dark backgrounds.

**Implementation rule:** Use the explicit hex value `DARK_THEME.primaryLight` (not a Tamagui `$primaryLight` token) for text/icon cases where the Tamagui design token system is not in play. In Tamagui-styled components that use `color: '$primary'`, update the theme token in `tamagui.config.ts` if a `$primaryLight` token exists there; otherwise inline `DARK_THEME.primaryLight`.

### Specific targets (text/icon use only — backgrounds stay at `#5A7EB0`):
- `app/(tabs)/_layout.tsx` — `activeColor` constant in `TabIcon` (currently `'#5A7EB0'` at line ~43) → `DARK_THEME.primaryLight`
- `src/components/ui/Input.tsx` — focused label `StyledLabel` variant uses `color: '$primary'`; update to `DARK_THEME.primaryLight` inline or via theme token
- `src/components/ui/Input.tsx` — Show/Hide toggle text `color="$primary"` → `DARK_THEME.primaryLight`
- `app/(auth)/signup.tsx` — `showHideText` style color, `termsLink` style color, `loginLinkText` style color
- Note: Button primary background and Chip selected background intentionally remain `#5A7EB0` — white text on primary background at large size passes the large-text exception

---

## Section 3 — SRE Code Fixes

### 3.1 Booking Write Race (`src/repositories/bookings.ts:create`)
**Problem:** After inserting a booking, the event status update (`status: 'booked'`) is fire-and-forget — if it fails, the event stays in the wrong state with no error surfaced.
**Fix:** Handle the status update error explicitly:

```ts
const { error: statusError } = await supabase
  .from('events')
  .update({ status: 'booked' })
  .eq('id', booking.event_id);

if (statusError) {
  throw new Error(
    `Booking created but event status update failed: ${statusError?.message ?? JSON.stringify(statusError)}`
  );
}
```

### 3.2 Audit Log Race Condition (`src/repositories/bookings.ts:updatePaymentStatus`)
**Problem:** Read audit_log → append → write back. Concurrent Stripe webhook retries can both read before either writes, causing lost audit entries.
**Fix:** Add a new migration with an RPC function for atomic server-side append:

**Migration file:** `supabase/migrations/20260323000000_append_booking_audit_log.sql`

```sql
create or replace function append_booking_audit_log(
  booking_id uuid,
  entry jsonb
) returns void language sql security definer as $$
  update bookings
  set audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(entry)
  where id = booking_id;
$$;
```

Replace the existing read-modify-write in `updatePaymentStatus` with:
```ts
await supabase.rpc('append_booking_audit_log', {
  booking_id: bookingId,
  entry: { action: 'payment_status_updated', status, timestamp: new Date().toISOString() },
});
```
Remove the preceding `select audit_log` + manual array manipulation.

### 3.3 Cold-Start Budget Cache Bug (`src/lib/participantCountCache.ts`)
**Problem:** `getAllBudgetInfos()` is synchronous and returns `{}` on fresh app start. `useUrgentPayment` calls it before the async AsyncStorage read completes → `isPaid` defaults to `true` → urgency bell never shows for unpaid events after restart.
**Fix:** Add `initBudgetCache()` to `participantCountCache.ts`:

```ts
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

**Call location in `app/_layout.tsx`:** Call fire-and-forget (non-blocking) inside the `RootLayout` function body before the JSX return, after imports but outside of any provider or hook. Pattern:

```ts
// Top of RootLayout component body, before return:
useEffect(() => {
  void initBudgetCache();
}, []);
```

This runs once on mount, before any query hooks evaluate urgency.

---

## Section 4 — Sentry Native Integration

### 4.1 Package Installation
```bash
npx expo install @sentry/react-native
```

### 4.2 Expo Config Plugin (`app.config.ts`)
Add to the `plugins` array as a tuple (matching existing plugin syntax in the file):
```ts
[
  "@sentry/react-native/expo",
  {
    organization: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  }
]
```

### 4.3 Metro Config (`metro.config.js`)
The existing `metro.config.js` uses `getDefaultConfig(__dirname)`. Wrap it with the Sentry plugin:
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withSentryConfig } = require('@sentry/react-native/metro');

const config = getDefaultConfig(__dirname);
module.exports = withSentryConfig(config);
```
If the file already has additional resolver/transformer customizations, `withSentryConfig` wraps the whole final config object — it is always the outermost wrapper.

### 4.4 Initialization (`app/_layout.tsx`)
Add before any component definitions:
```ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableNativeCrashHandling: true,
  enableAutoSessionTracking: true,
  tracesSampleRate: 0.2,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});
```
Wrap root export: `export default Sentry.wrap(RootLayout)`.

### 4.5 ErrorBoundary (`src/components/ErrorBoundary.tsx`)
Update `componentDidCatch`:
```ts
componentDidCatch(error: Error, info: React.ErrorInfo) {
  Sentry.captureException(error, {
    contexts: { react: { componentStack: info.componentStack } },
  });
  console.error('[ErrorBoundary]', error, info);
}
```

### 4.6 Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SENTRY_DSN` | Client (needs prefix) | DSN used at runtime in the app |
| `SENTRY_AUTH_TOKEN` | Build-time only (EAS / CI) | Upload source maps to Sentry |
| `SENTRY_ORG` | Build-time only (EAS / CI) | Sentry organization slug |
| `SENTRY_PROJECT` | Build-time only (EAS / CI) | Sentry project slug |

Add all four to `.env` and `.env.example`. `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` are only read by the Expo config plugin at build time — they are not exposed to the app bundle.

### 4.7 Native Rebuild & Verification
1. `npx expo prebuild --clean` — regenerates `ios/` and `android/` with Sentry Cocoa + Sentry Android SDK included
2. `npx expo run:ios` or `npx expo run:android` — build and launch
3. Verify Sentry is active: temporarily call `Sentry.captureMessage('Sentry test')` in `_layout.tsx`, check it appears in the Sentry dashboard, then remove
4. Test a simulated native crash (Sentry provides `Sentry.nativeCrash()`) in dev build to confirm native crash reporting is wired

### 4.8 Native Capabilities
- **iOS:** Hard crashes, OOM kills, hang detection (Sentry Cocoa)
- **Android:** Native crashes, ANRs, OOM kills, NDK crashes (Sentry Android)
- **Both:** JS exceptions, unhandled promise rejections, performance traces, navigation breadcrumbs

---

## Files Changed

| File | Change |
|------|--------|
| `app/(auth)/signup.tsx` | Accessibility attributes on all inputs + buttons |
| `app/(tabs)/profile/notifications.tsx` | Accessibility on back button + toggle rows |
| `app/(tabs)/_layout.tsx` | Tab role fix, active color contrast fix, FAB label, tab accessibilityLabel options |
| `src/components/ui/Input.tsx` | Accessibility label/state passthrough, liveRegion on error |
| `src/components/ui/Button.tsx` | Accessibility label passthrough |
| `src/components/ui/Chip.tsx` | Role + state fix for screen readers |
| `src/components/ErrorBoundary.tsx` | Sentry.captureException in componentDidCatch |
| `src/repositories/bookings.ts` | Race condition fix in create + atomic RPC for audit log |
| `src/lib/participantCountCache.ts` | Add initBudgetCache() |
| `app/_layout.tsx` | Sentry.init, Sentry.wrap, initBudgetCache() useEffect |
| `app.config.ts` | Sentry expo plugin |
| `metro.config.js` | Sentry metro plugin wrapper |
| `supabase/migrations/20260323000000_append_booking_audit_log.sql` | Atomic audit log RPC |
| `.env` + `.env.example` | Sentry env vars (all 4) |

---

## Out of Scope

- **B2 (Email confirmation):** Supabase dashboard setting — no code change possible
- **B6 (WhatsApp Meta Business Verification):** External service account verification — no code change possible
- **useUnreadCount background polling:** Noted as P1 post-launch; deferred to separate optimization sprint
