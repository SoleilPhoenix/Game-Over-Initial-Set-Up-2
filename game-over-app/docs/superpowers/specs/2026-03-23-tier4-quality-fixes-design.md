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
- Add `accessibilityRole="button"` + `accessibilityLabel` to back button, show/hide password toggles, and submit button
- Add `accessibilityState={{ disabled: isLoading }}` to submit button
- Add `accessibilityLiveRegion="polite"` to the error container `View` so VoiceOver announces errors on appearance

### 1.2 app/(tabs)/profile/notifications.tsx
- Add `accessibilityLabel` + `accessibilityRole="button"` to back button
- Add `accessibilityLabel` + `accessibilityRole="switch"` + `accessibilityState={{ checked }}` to each toggle row wrapper (`XStack`)

### 1.3 src/components/ui/Input.tsx
- Accept `accessibilityLabel` prop (already in `...props` spread but needs explicit forwarding to `StyledInput`)
- Add `accessibilityLiveRegion="polite"` to `StyledHelperText` when `error` is truthy so field errors are announced automatically
- Add `accessibilityState={{ disabled }}` to `StyledInput`

### 1.4 src/components/ui/Button.tsx
- Accept and forward `accessibilityLabel` prop explicitly (currently relies on children string inference)
- `aria-busy` and `aria-disabled` already present — no changes needed there

### 1.5 src/components/ui/Chip.tsx
- Replace `aria-selected={selected}` with `accessibilityRole="checkbox"` + `accessibilityState={{ checked: selected }}`
- Add `accessibilityLabel={label}` so screen readers announce chip content

### 1.6 app/(tabs)/_layout.tsx — Tab Bar
- Change `accessibilityRole="button"` → `"tab"` on each tab `Pressable`
- Add `accessibilityLabel` per tab: `"Events, tab 1 of 4"`, `"Chat, tab 2 of 4"`, etc. (use translation keys)
- Add `accessibilityLabel="Create new event"` + `accessibilityRole="button"` to `FABButton`

### 1.7 Modal Focus Trap
- Scan all modal `View` roots (CreatePollModal, any Sheet/Dialog components) and add `accessibilityViewIsModal={true}`

---

## Section 2 — Color Contrast Fix

**Problem:** `#5A7EB0` (primary) = 3.9:1 contrast ratio on dark background. WCAG AA requires ≥ 4.5:1 for normal text.
**Solution:** Use `#7A9BC4` (`DARK_THEME.primaryLight`) where primary is used as *text or icon color* on dark backgrounds.

### Targets (text/icon use only — backgrounds unchanged):
- `app/(tabs)/_layout.tsx` — `activeColor` constant in `TabIcon` (line 43)
- `src/components/ui/Input.tsx` — focused label color (`$primary` token → explicit `DARK_THEME.primaryLight`), Show/Hide toggle text color
- `app/(auth)/signup.tsx` — `showHideText` style, `termsLink` style, `loginLinkText` style
- Note: Button primary background, Chip selected background stay at `#5A7EB0` — white text on primary background passes at 4.0:1 (large text exception applies; acceptable for button height)

---

## Section 3 — SRE Code Fixes

### 3.1 Booking Write Race (`src/repositories/bookings.ts:create`)
**Problem:** After inserting a booking, the event status update (`status: 'booked'`) is fire-and-forget — if it fails, the event stays in the wrong state with no error surfaced.
**Fix:** Wrap the status update in try/catch; throw a descriptive error if it fails so callers know the full create operation didn't complete.

```ts
// After booking insert succeeds:
const { error: statusError } = await supabase
  .from('events')
  .update({ status: 'booked' })
  .eq('id', booking.event_id);

if (statusError) {
  throw new Error(`Booking created but event status update failed: ${statusError.message}`);
}
```

### 3.2 Audit Log Race Condition (`src/repositories/bookings.ts:updatePaymentStatus`)
**Problem:** Read audit_log → append → write back. Concurrent Stripe webhook retries can both read before either writes, causing lost audit entries.
**Fix:** Use a Supabase RPC call with `array_append` for atomic server-side append, eliminating the read-modify-write pattern.

```sql
-- supabase/migrations: add RPC function
create or replace function append_booking_audit_log(
  booking_id uuid,
  entry jsonb
) returns void language sql security definer as $$
  update bookings
  set audit_log = coalesce(audit_log, '[]'::jsonb) || entry::jsonb
  where id = booking_id;
$$;
```

Then in `updatePaymentStatus`: call `supabase.rpc('append_booking_audit_log', { booking_id, entry })` instead of the read-modify-write pattern.

### 3.3 Cold-Start Budget Cache Bug (`src/lib/participantCountCache.ts`)
**Problem:** `getAllBudgetInfos()` is synchronous and returns `{}` on fresh app start. `useUrgentPayment` calls it before the async AsyncStorage read completes → `isPaid` defaults to `true` → urgency bell never shows for unpaid events after restart.
**Fix:** Add `initBudgetCache()` that eagerly hydrates in-memory `budgetCache` from AsyncStorage. Call it once in `app/_layout.tsx` before the query client is ready.

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

---

## Section 4 — Sentry Native Integration

### 4.1 Package Installation
```bash
npx expo install @sentry/react-native
```

### 4.2 Expo Config Plugin (`app.config.ts`)
Add to `plugins` array:
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
Wrap existing metro config with Sentry's metro plugin for source map support:
```js
const { withSentryConfig } = require('@sentry/react-native/metro');
module.exports = withSentryConfig(config);
```

### 4.4 Initialization (`app/_layout.tsx`)
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

### 4.5 ErrorBoundary
Wire `componentDidCatch` to `Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } })`.

### 4.6 Environment Variables
Add to `.env` and `.env.example`:
```
EXPO_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

### 4.7 Native Rebuild
After all changes: `npx expo prebuild --clean` to regenerate iOS/Android native projects with Sentry Cocoa + Sentry Android SDK wired in.

### 4.8 Native Capabilities
- **iOS:** Hard crashes, OOM kills, hang detection (via Sentry Cocoa)
- **Android:** Native crashes, ANRs, OOM kills, NDK crashes (via Sentry Android)
- **Both:** JS exceptions, unhandled promise rejections, performance traces, breadcrumbs

---

## Files Changed

| File | Change |
|------|--------|
| `app/(auth)/signup.tsx` | Accessibility attributes on all inputs + buttons |
| `app/(tabs)/profile/notifications.tsx` | Accessibility on back button + toggle rows |
| `app/(tabs)/_layout.tsx` | Tab role fix, active color contrast fix, FAB label |
| `src/components/ui/Input.tsx` | Accessibility label/state passthrough, liveRegion |
| `src/components/ui/Button.tsx` | Accessibility label passthrough |
| `src/components/ui/Chip.tsx` | Role + state fix for screen readers |
| `src/components/ErrorBoundary.tsx` | Sentry.captureException in componentDidCatch |
| `src/repositories/bookings.ts` | Race condition fix in create + updatePaymentStatus |
| `src/lib/participantCountCache.ts` | Add initBudgetCache() |
| `app/_layout.tsx` | Sentry.init, Sentry.wrap, initBudgetCache() call |
| `app.config.ts` | Sentry expo plugin |
| `metro.config.js` | Sentry metro plugin |
| `supabase/migrations/` | append_booking_audit_log RPC function |
| `.env` / `.env.example` | Sentry env vars |

---

## Out of Scope

- **B2 (Email confirmation):** Supabase dashboard setting — no code change possible
- **B6 (WhatsApp Meta Business Verification):** External service account verification — no code change possible
- **useUnreadCount background polling:** Noted as P1 post-launch; deferred to separate optimization sprint
