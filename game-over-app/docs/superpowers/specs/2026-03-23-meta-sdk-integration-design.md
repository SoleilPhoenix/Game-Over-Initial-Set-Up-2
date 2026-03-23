# Meta SDK Integration — Design Spec
**Date:** 2026-03-23
**Status:** Approved (v2 — post spec-review)
**Branch:** `feature/meta-sdk-integration`

---

## Overview

Integrate the Meta (Facebook) SDK into the Game Over app to enable accurate ad attribution and funnel analytics for Instagram and Facebook ad campaigns. The integration uses a **hybrid approach**: a client-side native SDK for install attribution and real-time events, combined with a server-side Meta Conversions API for reliable purchase confirmation independent of iOS ATT consent.

**Goal:** Measure the full booking funnel (Signup → ViewContent → AddToCart → InitiateCheckout → Purchase) so Meta Ads can optimise for users who actually complete a booking.

---

## Architecture

### Isolation Principle
All Meta SDK calls are routed through a single wrapper file (`src/lib/analytics/MetaAnalytics.ts`). No app component imports `react-native-fbsdk-next` directly. This means:
- A tracking failure **never** blocks app logic
- The SDK can be updated or replaced by editing one file
- The wrapper is the foundation for future Mixpanel/Amplitude integration (Phase 3)

```
App Components
     │
     ▼ (single import)
MetaAnalytics.ts (Wrapper / Guard)
     │                    │
     ▼                    ▼
react-native-fbsdk-next   send-meta-conversion (Supabase Edge Function)
(Client SDK)              (Server Conversions API)
```

### Client SDK
- Package: `react-native-fbsdk-next`
- Activated only after ATT consent on iOS; always active on Android
- Handles: app install attribution, deferred deep links, real-time funnel events

### Server Conversions API
- New Supabase Edge Function: `send-meta-conversion`
- Triggered from app after successful DB writes (payment confirmation)
- Runs independently of ATT — even if user declines tracking, purchase events are still sent
- Sends hashed user data: SHA-256 email + phone + first/last name (Meta standard for good match quality)
- No plaintext PII sent to Meta

### Deduplication
Each analytics firing generates a UUID `conversionEventId` (distinct from the DB `event.id` party UUID). This ID is shared between the client SDK call and the server Conversions API call. Meta uses `event_id` to deduplicate and count once per conversion.

---

## Files

### New Files

| File | Purpose |
|---|---|
| `src/lib/analytics/MetaAnalytics.ts` | Main wrapper — only file that imports `react-native-fbsdk-next` |
| `src/lib/analytics/analyticsEvents.ts` | Event name constants and TypeScript types |
| `supabase/functions/send-meta-conversion/index.ts` | Edge Function for server-side Conversions API |
| `src/hooks/useATTPermission.ts` | iOS App Tracking Transparency hook (uses `expo-tracking-transparency`) |
| `src/components/ATTPermissionPrompt.tsx` | Pre-prompt UI shown before iOS system dialog |

### Modified Files (minimal changes)

| File | Change |
|---|---|
| `app/(tabs)/events.tsx` | Trigger ATT prompt on first focus after auth (safe post-auth trigger point) |
| `app/(auth)/signup.tsx` | Add `CompleteRegistration` for email/password signup |
| `src/lib/auth/google.ts` | Add `CompleteRegistration` for new OAuth users (check `created_at` recency) |
| `src/lib/auth/facebook.ts` | Add `CompleteRegistration` for new OAuth users |
| `src/lib/auth/apple.ts` | Add `CompleteRegistration` for new OAuth users |
| `app/wizard/packages.tsx` | Add `ViewContent` (package detail opened) and `AddToCart` (package selected) |
| `app/booking/[eventId]/payment.tsx` | Add `InitiateCheckout` event when payment screen loads |
| `app/booking/[eventId]/confirmation.tsx` | Add `Purchase` event after confirmed payment |
| `app.config.ts` | Add config plugins + `NSUserTrackingUsageDescription` in `infoPlist` |
| `.env` / `.env.example` | Add `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN`, `META_CONVERSIONS_API_TOKEN`, `META_DATASET_ID` |

---

## Event Plan

### Funnel Events (Funnel Focus)

| Event | Trigger | Params |
|---|---|---|
| `CompleteRegistration` | Signup successful (all 4 auth methods) | `registrationMethod: 'email'\|'google'\|'facebook'\|'apple'` |
| `ViewContent` | Package detail screen opened | `contentId: packageId`, `contentType: 'package'`, `currency: 'EUR'`, `value: pricePerPerson` |
| `AddToCart` | Package selected in wizard (packages.tsx) | `contentId: packageId`, `currency: 'EUR'`, `value: totalPrice` |
| `InitiateCheckout` | Payment screen loaded | `numItems: participantCount`, `currency: 'EUR'`, `value: totalPrice` |
| `Purchase` | Payment confirmed | `AppEventsConstants.EVENT_PARAM_ORDER_ID: bookingRef`, `currency: 'EUR'`, `value: totalPrice` |

`Purchase` is sent via **both** client SDK and server Conversions API with the same `conversionEventId` for deduplication.

**Note on `CompleteRegistration`:** For OAuth flows, detect new users by checking if `session.user.created_at` is within the last 30 seconds of the auth callback. Existing users logging in again must not re-fire this event.

---

## ATT Flow (iOS 14.5+)

**Trigger point:** `useFocusEffect` on `app/(tabs)/events.tsx` (first screen after auth completes). This avoids race conditions with the auth redirect logic in `_layout.tsx`.

1. User lands on Events tab (post-login)
2. `useATTPermission` hook checks: iOS 14.5+? Permission already requested?
3. If not yet requested: show `ATTPermissionPrompt` (pre-prompt UI in React Native)
4. User taps "Continue" → iOS system dialog appears (text from `NSUserTrackingUsageDescription`)
5. **User accepts:** Client SDK activates, all 5 funnel events fire from device
6. **User declines:** Client SDK stays silent, Server Conversions API still sends Purchase events
7. Android: no ATT required, SDK always active

**`NSUserTrackingUsageDescription` (set in `app.config.ts` → `infoPlist`, bilingual via two builds or device locale):**
> EN: "Game Over uses your app activity to show you relevant ads on Instagram and Facebook. Your data is never sold."
> DE: "Game Over nutzt deine App-Aktivität, um dir auf Instagram und Facebook relevante Angebote zu zeigen. Deine Daten werden niemals verkauft."

**Note:** The React Native `ATTPermissionPrompt` component is a pre-prompt only. The actual system dialog text is controlled by `NSUserTrackingUsageDescription` in `Info.plist` — not by any React Native UI.

---

## Error Handling & Isolation

```typescript
// Pattern used throughout MetaAnalytics.ts
async trackEvent(event: MetaEventName, params?: EventParams): Promise<void> {
  // Client SDK — isolated, never throws to caller
  try {
    if (this.clientEnabled) {
      await AppEventsLogger.logEvent(event, params);
    }
  } catch {
    // Silent — tracking errors are invisible to the user
  }

  // Server API — fire-and-forget, own error boundary
  this.sendToConversionsAPI(event, params).catch(() => {});
}
```

**Rules:**
- `MetaAnalytics` methods are always `async` and always `void` — callers never await a result
- No error from `MetaAnalytics` propagates to the calling screen
- The wrapper initialises lazily — if the SDK fails to load, all methods become no-ops

---

## Environment Variables

```bash
# .env additions
EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN=    # Facebook Developer Console → App Settings → Advanced → Client Token
                                      # REQUIRED since FBSDK v13 — app crashes on iOS without this
META_CONVERSIONS_API_TOKEN=           # Meta Events Manager → Settings → Conversions API → Generate Access Token
META_DATASET_ID=                      # Meta Events Manager → Settings → Dataset ID (≠ Facebook App ID)
```

`EXPO_PUBLIC_FACEBOOK_APP_ID` already exists (`2083822122367839`) — reused for SDK initialisation.

> ⚠️ `META_DATASET_ID` is **not** the same as `EXPO_PUBLIC_FACEBOOK_APP_ID`. Find it in Meta Business Manager → Events Manager → your dataset → Settings.

---

## `app.config.ts` Plugin Config

```typescript
plugins: [
  // existing plugins...
  [
    'react-native-fbsdk-next',
    {
      appID: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
      clientToken: process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN, // required since FBSDK v13
      displayName: 'Game Over',
      scheme: 'fb2083822122367839',
      advertiserIDCollectionEnabled: false, // enabled only after ATT consent
      autoLogAppEventsEnabled: false,       // controlled manually via wrapper
    },
  ],
  ['expo-tracking-transparency', { userTrackingPermission: '...' }], // see NSUserTrackingUsageDescription above
],
infoPlist: {
  NSUserTrackingUsageDescription:
    'Game Over uses your app activity to show you relevant ads on Instagram and Facebook. Your data is never sold.',
},
```

---

## Server Conversions API — Payload

The `send-meta-conversion` Edge Function hashes user data before sending to Meta:

```typescript
// Hashed fields sent for match quality (SHA-256, lowercase before hashing)
user_data: {
  em: sha256(email.toLowerCase()),      // required
  ph: sha256(phoneE164.replace('+','')), // improves match quality
  fn: sha256(firstName.toLowerCase()),  // improves match quality
  ln: sha256(lastName.toLowerCase()),   // improves match quality
}
```

All hashing happens server-side. No plaintext PII leaves the Supabase environment.

---

## Git Strategy

- Branch: `feature/meta-sdk-integration` (created from `main`)
- All changes on this branch
- PR review before merge
- `expo prebuild --clean` must be run after package install to regenerate native projects

---

## Build Notes

- **Dependencies to install:**
  ```bash
  npm install react-native-fbsdk-next --legacy-peer-deps
  npx expo install expo-tracking-transparency
  ```
- **Local builds:** After install, run `npx expo prebuild --clean` then `pod install` (iOS) and Gradle sync (Android)
- **EAS Build:** Config plugin in `app.config.ts` handles `AndroidManifest.xml` and `Info.plist` automatically
- **Expo Go:** Neither `react-native-fbsdk-next` nor `expo-tracking-transparency` is compatible with Expo Go — use a development build

---

## DSGVO / Privacy — PRE-DEPLOYMENT BLOCKER

> ⚠️ **The Privacy Policy update is a blocker — it must be completed before the SDK ships to users.** Under DSGVO Article 13, disclosure of third-party processors is mandatory before data is transmitted.

**Required changes to `app/(tabs)/profile/privacy.tsx`** (both DE and EN):

- **Section 8 (Cookies and Tracking):** Remove the statement that the app does not track users. Add: Meta pixel / Facebook App Events tracking for advertising purposes, gated on ATT consent (iOS) / user consent (EU).
- **Section 9 (Third-Party Services):** Add Meta Platforms Ireland Ltd. as a data processor, describe the data sent (hashed device identifiers, app events), and link to [Meta's Data Policy](https://www.facebook.com/privacy/policy/).

---

## Post-MVP — Phase 3

Full product analytics (Mixpanel or Amplitude) is tracked in `GO_LIVE_CHECKLIST.md` under **Monitoring & Analytics → Product Analytics — Full Funnel (Post-MVP — Phase 3)**.

The `MetaAnalytics.ts` wrapper architecture is designed to be extended: a future `AnalyticsManager.ts` can route the same events to both Meta and Mixpanel without touching app screens.

---

## Success Criteria

- [ ] All 5 funnel events appear in Meta Events Manager → Test Events tool
- [ ] `Purchase` event confirmed via both client and server (deduplication working — same `conversionEventId`)
- [ ] ATT prompt shown on Events tab first focus (post-auth), SDK correctly gated on response
- [ ] `CompleteRegistration` fires for all 4 auth methods (email, Google, Facebook, Apple)
- [ ] No app crashes or functional regressions in booking flow
- [ ] EAS build succeeds with Meta SDK + `expo-tracking-transparency` config plugins
- [ ] Privacy Policy updated (DE + EN) before production release — DSGVO Article 13 compliance
