# Meta SDK Integration — Design Spec
**Date:** 2026-03-23
**Status:** Approved
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
- Sends hashed user data (SHA-256 email) per Meta's standard — no plaintext PII

### Deduplication
Each event generates a UUID `eventId` shared between client and server. Meta uses this to deduplicate and count once.

---

## Files

### New Files

| File | Purpose |
|---|---|
| `src/lib/analytics/MetaAnalytics.ts` | Main wrapper — only file that imports `react-native-fbsdk-next` |
| `src/lib/analytics/analyticsEvents.ts` | Event name constants and TypeScript types |
| `supabase/functions/send-meta-conversion/index.ts` | Edge Function for server-side Conversions API |
| `src/hooks/useATTPermission.ts` | iOS App Tracking Transparency permission hook |
| `src/components/ATTPermissionPrompt.tsx` | UI component for iOS tracking consent dialog |

### Modified Files (minimal changes)

| File | Change |
|---|---|
| `app/_layout.tsx` | Trigger ATT prompt once on app start (iOS only) |
| `app/(auth)/signup.tsx` | Add `CompleteRegistration` event after successful signup |
| `app/wizard/packages.tsx` | Add `ViewContent` (package detail opened) and `AddToCart` (package selected) |
| `app/booking/[eventId]/payment.tsx` | Add `InitiateCheckout` event when payment screen loads |
| `app/booking/[eventId]/confirmation.tsx` | Add `Purchase` event after confirmed payment |
| `app.config.ts` | Add `react-native-fbsdk-next` config plugin with Facebook App ID |
| `.env` / `.env.example` | Add `META_CONVERSIONS_API_TOKEN` |

---

## Event Plan

### Funnel Events (Approach B — Funnel Focus)

| Event | Trigger | Params |
|---|---|---|
| `CompleteRegistration` | Signup successful | `registrationMethod: 'email'\|'google'\|'facebook'\|'apple'` |
| `ViewContent` | Package detail screen opened | `contentId: packageId`, `contentType: 'package'`, `currency: 'EUR'`, `value: pricePerPerson` |
| `AddToCart` | Package selected in wizard (packages.tsx) | `contentId: packageId`, `currency: 'EUR'`, `value: totalPrice` |
| `InitiateCheckout` | Payment screen loaded | `numItems: participantCount`, `currency: 'EUR'`, `value: totalPrice` |
| `Purchase` | Payment confirmed | `orderId: bookingRef`, `currency: 'EUR'`, `value: totalPrice` |

`Purchase` is sent via **both** client SDK and server Conversions API with the same `eventId` for deduplication.

---

## ATT Flow (iOS 14.5+)

1. App launches → `_layout.tsx` calls `useATTPermission`
2. Hook checks iOS version and whether permission was already requested
3. If not yet requested: show `ATTPermissionPrompt` with contextual explanation
4. **User accepts:** Client SDK activates, all 5 funnel events fire from device
5. **User declines:** Client SDK stays silent, Server Conversions API still sends Purchase events
6. Android: no ATT required, SDK always active

**ATT dialog copy (suggested):**
> "Game Over nutzt deine App-Aktivität, um dir auf Instagram und Facebook relevante Angebote zu zeigen. Deine Daten werden niemals verkauft."

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
META_CONVERSIONS_API_TOKEN=        # From Meta Events Manager → Settings → Conversions API
META_PIXEL_ID=                     # From Meta Events Manager (same as Facebook App ID in most setups)
```

`EXPO_PUBLIC_FACEBOOK_APP_ID` already exists — reused for SDK initialisation.

---

## Git Strategy

- Branch: `feature/meta-sdk-integration` (created from `main`)
- All changes on this branch
- PR review before merge
- `expo prebuild` must be re-run after adding `react-native-fbsdk-next` to generate updated native projects

---

## Build Notes

- **Local builds:** After `npm install react-native-fbsdk-next`, run `npx expo prebuild --clean` then `pod install` (iOS) and Gradle sync (Android)
- **EAS Build:** Config plugin in `app.config.ts` handles native configuration automatically
- **Expo Go:** `react-native-fbsdk-next` is not compatible with Expo Go — use a development build

---

## DSGVO / Privacy

- The Datenschutzerklärung must be updated to mention Meta pixel / app event tracking
- ATT prompt is mandatory before any client-side tracking on iOS (enforced by wrapper)
- Server-side Conversions API uses only hashed data (SHA-256 email) — no plaintext PII sent to Meta
- Add Meta tracking disclosure to Privacy Policy before App Store / Play Store submission

---

## Post-MVP — Phase 3

Full product analytics (Mixpanel or Amplitude) is tracked in `GO_LIVE_CHECKLIST.md` under **Monitoring & Analytics → Product Analytics — Full Funnel (Post-MVP — Phase 3)**.

The `MetaAnalytics.ts` wrapper architecture is designed to be extended: a future `AnalyticsManager.ts` can route the same events to both Meta and Mixpanel without touching app screens.

---

## Success Criteria

- [ ] All 5 funnel events appear in Meta Events Manager Test Events tool
- [ ] `Purchase` event confirmed via both client and server (deduplication working)
- [ ] ATT prompt shown on iOS first launch, SDK correctly gated on response
- [ ] No app crashes or functional regressions in booking flow
- [ ] EAS build succeeds with Meta SDK config plugin
