# Go-Live Checklist

This document tracks all tasks that must be completed before launching the Game Over app to production.

## Authentication & OAuth

### Apple Sign-In (Required for iOS App Store)
**Status:** ⏸️ Pending - Requires Apple Developer Account ($99/year)

**Requirements:**
- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Create App ID in Apple Developer Portal with "Sign in with Apple" capability
- [ ] Configure Services ID for OAuth
- [ ] Generate Key ID and download Private Key (.p8 file)
- [ ] Get your Team ID from Apple Developer Portal
- [ ] Add redirect URLs in Apple Developer Portal
- [ ] Configure Supabase Auth with Apple provider credentials
- [ ] Test Apple Sign-In flow on physical iOS device
- [ ] Submit app for App Store review

**Documentation:** https://developer.apple.com/sign-in-with-apple/

**Supabase Configuration (Once Apple Developer Account is Set Up):**

1. **In Supabase Dashboard:**
   - Go to Authentication > Providers
   - Find **Apple** in the providers list and click it
   - Toggle **"Enable Sign in with Apple"** to ON

2. **You'll need these credentials from Apple Developer Portal:**
   - **Services ID**: Your OAuth Services ID (e.g., `app.gameover.ios.signin`)
   - **Team ID**: Found in Apple Developer Account > Membership
   - **Key ID**: Generated when you create a Sign in with Apple key
   - **Private Key**: The `.p8` file you download (only available once!)

3. **In Apple Developer Portal, configure redirect URL:**
   - Add: `https://stdbvehmjpmqbjyiodqg.supabase.co/auth/v1/callback`

**Notes:**
- Apple requires all apps with third-party social login to also offer Apple Sign-In
- This is mandatory for App Store approval if you have Google/Facebook login
- Testing Apple Sign-In requires a physical iOS device (won't work in simulator fully)
- The Private Key (.p8 file) can only be downloaded once - store it securely!

---

### Facebook OAuth Configuration
**Status:** ⏸️ Pending - Development configured, production needs updates

**Current Status:**
- ✅ Facebook App created (App ID: `2083822122367839`)
- ✅ Development key hash configured: `nRhx4vJ1AplGGXP2zzPBiwMYAzc=`
- ✅ OAuth redirect URL configured: `https://stdbvehmjpmqbjyiodqg.supabase.co/auth/v1/callback`
- ✅ App domains configured: `stdbvehmjpmqbjyiodqg.supabase.co`
- ❌ Release key hash not yet generated
- ❌ Production domains not yet added

**Action Required for Production:**

1. **Generate Android Release Key Hash:**
   ```bash
   keytool -exportcert -alias YOUR_RELEASE_KEY_ALIAS \
     -keystore YOUR_RELEASE_KEY_PATH \
     | openssl sha1 -binary \
     | openssl base64
   ```
   Then add the release key hash to:
   - Facebook Developer Console > Your App > Settings > Basic > Key Hashes

2. **Update App Domains (if using custom Supabase domain):**
   - Add `game-over.app` to App Domains
   - Add `auth.game-over.app` if using custom Supabase domain

3. **Update OAuth Redirect URLs (if using custom Supabase domain):**
   - Keep: `https://stdbvehmjpmqbjyiodqg.supabase.co/auth/v1/callback`
   - Add: `https://auth.game-over.app/auth/v1/callback` (if custom domain configured)

4. **Switch Facebook App to Live Mode:**
   - Go to Settings > Basic
   - Toggle "App Mode" from Development to Live
   - Fill in required information (Privacy Policy URL, etc.)

**Note:** The release keystore is different from the debug keystore. You'll create this when setting up app signing for the Play Store.

---

## Domain Configuration

### Custom Domain Setup for Game-Over.app
**Status:** ⏸️ Pending - Domain purchased, needs DNS and SSL configuration

**Current Status:**
- ✅ Domain purchased: `Game-Over.app`
- ✅ Deep linking configured in app for `gameover.app`
- ✅ Universal Links (iOS) configured for `applinks:gameover.app`
- ✅ App Links (Android) configured for `gameover.app`
- ❌ DNS records not yet configured
- ❌ Supabase custom domain not set up

**DNS Configuration Required:**

1. **Root Domain (game-over.app):**
   - Type: `A` or `CNAME`
   - Points to: Your web hosting provider (if you plan to have a website)
   - Purpose: Main website (optional, can redirect to app stores)

2. **Apple App Site Association (for Universal Links):**
   - Upload `.well-known/apple-app-site-association` file to `https://game-over.app/.well-known/`
   - File must be accessible without redirect
   - Content: iOS app ID and supported paths
   ```json
   {
     "applinks": {
       "apps": [],
       "details": [{
         "appID": "TEAM_ID.app.gameover.ios",
         "paths": ["/invite/*", "/event/*"]
       }]
     }
   }
   ```

3. **Android Digital Asset Links (for App Links):**
   - Upload `.well-known/assetlinks.json` file to `https://game-over.app/.well-known/`
   - Content: Android package name and SHA256 fingerprints
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "app.gameover.android",
       "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
     }
   }]
   ```

4. **Optional - Custom Supabase Domain:**
   - Type: `CNAME`
   - Name: `auth.game-over.app` (or `api.game-over.app`)
   - Points to: `stdbvehmjpmqbjyiodqg.supabase.co`
   - Purpose: Custom branded auth endpoint
   - **Note:** Requires Supabase Pro plan or higher
   - After setup, update all OAuth redirect URLs to use custom domain

**Action Items:**
- [ ] Configure DNS records with your domain registrar
- [ ] Set up SSL certificate (usually automatic with most hosting providers)
- [ ] Upload `.well-known` files for Universal/App Links verification
- [ ] Test deep linking on physical devices after DNS propagation (24-48 hours)
- [ ] (Optional) Set up Supabase custom domain and update OAuth configs

---

## Environment Variables

### Production Environment Setup
**Status:** ⏸️ Pending

- [ ] Set up production Supabase project (or verify current project is production-ready)
- [ ] Configure production Stripe account (currently using test mode)
- [ ] Set production Stripe webhook endpoint: `https://stdbvehmjpmqbjyiodqg.supabase.co/functions/v1/stripe-webhook`
- [ ] Update all environment variables for production
- [ ] Configure EAS Build secrets for production builds

---

## App Store Preparation

### iOS App Store
**Status:** ⏸️ Pending

- [ ] Create App Store listing
- [ ] Prepare app screenshots (all required device sizes)
- [ ] Write app description and keywords
- [ ] Create app icon (1024x1024)
- [ ] Set up App Store Connect account
- [ ] Configure TestFlight for beta testing
- [ ] Submit for App Store review

### Google Play Store
**Status:** ⏸️ Pending

- [ ] Create Play Store listing
- [ ] Prepare app screenshots (all required device sizes)
- [ ] Write app description
- [ ] Create feature graphic (1024x500)
- [ ] Set up Google Play Console account
- [ ] Configure Play Store app signing
- [ ] Generate release key hash for Facebook OAuth (see above)
- [ ] Create production build with EAS
- [ ] Submit for Play Store review

---

## Legal & Compliance

**Status:** 🟡 In Progress — Draft legal pages created, pending legal review

- [x] Create Privacy Policy (draft in `app/(tabs)/profile/privacy.tsx`)
- [x] Create Terms of Service (draft in `app/(tabs)/profile/terms.tsx`)
- [x] Create Impressum (draft in `app/(tabs)/profile/impressum.tsx`)
- [ ] **IMPORTANT: Have Terms of Service reviewed and finalized by a lawyer/legal expert**
- [ ] **IMPORTANT: Have Privacy Policy reviewed and finalized by a lawyer/legal expert**
- [ ] **IMPORTANT: Update Impressum with correct company address and contact details**
- [ ] Add privacy policy URL to Facebook App settings
- [ ] Add privacy policy URL to Apple App Store listing
- [ ] Add privacy policy URL to Google Play Store listing
- [ ] Ensure GDPR compliance (if applicable)
- [ ] Configure data retention policies in Supabase

---

## Communication & Invitations

### SendGrid Email API — Upgrade to Paid Plan
**Status:** ⏸️ Pending — Required before go-live. Email invitations are currently blocked.

- [ ] **Upgrade SendGrid Email API plan to "Essentials"** (~$19.95/month for 50,000 emails)
  - Free trial ended July 7, 2025 — email sending via `/v3/mail/send` is blocked
  - Go to [SendGrid Account Details](https://app.sendgrid.com/account/billing) → **Email API** section → **Change Plan** → select **Essentials**
  - **Do NOT upgrade Marketing Campaigns** — the app only uses the transactional Email API
  - Access is restored immediately after upgrade

### Twilio SMS Sender ID
**Status:** ⏸️ Pending — Update the display name shown to SMS recipients

- [ ] **Update `TWILIO_SMS_FROM` Supabase secret** from `"GameOver"` to `"GameOverApp"` (or preferred name)
  - Twilio alphanumeric sender IDs: **1–11 characters, letters + numbers only** — no hyphens, dots, or spaces
  - `"game-over.app"` is **not** a valid alphanumeric sender ID
  - Recommended value: `"GameOverApp"` (11 chars, fully valid)
  - Update via: `npx supabase secrets set TWILIO_SMS_FROM=GameOverApp --project-ref stdbvehmjpmqbjyiodqg`
  - ⚠️ Note: Alphanumeric sender IDs are **not supported in all countries** (e.g. USA requires a registered long number or short code). Verify coverage for your target markets.

---

## Backend & Infrastructure

### Supabase Configuration
**Status:** ⏸️ Pending

- [ ] **⚠️ CRITICAL: Re-enable email confirmations** (DISABLED for development!)
  - Go to Supabase Dashboard > Authentication > Providers > Email
  - Toggle ON "Confirm email"
  - Configure email templates for confirmation emails
  - **Current Status:** DISABLED to bypass rate limits during development
  - **Security Risk:** Without email confirmation, anyone can create accounts with any email
- [ ] **Set up Custom SMTP Provider** (Required for production email limits)
  - Current built-in Supabase email has ~4 emails/hour limit
  - Recommended: Resend, SendGrid, or Amazon SES
  - Go to Supabase Dashboard > Project Settings > Auth > SMTP Settings
  - Configure custom SMTP to remove rate limits
- [ ] **Set up rate limiting for auth endpoints**
  - Go to Supabase Dashboard > Authentication > Rate Limits
  - Configure limits for:
    - Login attempts: 10 per hour per IP
    - Signup attempts: 5 per hour per IP
    - Password reset: 5 per hour per IP
  - Enable CAPTCHA for repeated failed attempts
- [ ] Review and optimize Row Level Security (RLS) policies
- [ ] Set up database backups
- [ ] Configure production database indexes for performance
- [ ] Set up monitoring and alerts
- [ ] Review Edge Function rate limits
- [ ] Configure CORS policies for production domain

### Stripe Configuration
**Status:** ⏸️ Pending

- [ ] Switch from test mode to live mode
- [ ] Configure production webhook endpoint
- [ ] Set up production API keys in Supabase Edge Functions
- [ ] Test payment flows in production
- [ ] Configure Stripe billing settings

---

## Testing

**Status:** ⏸️ Pending

- [ ] Complete end-to-end testing on physical devices (iOS & Android)
- [ ] Test all OAuth flows (Google, Facebook, Apple) in production
- [ ] Test payment flows with real payment methods
- [ ] Test push notifications on physical devices
- [ ] Test deep linking (invite codes, event links)
- [ ] Perform security audit
- [ ] Load testing for expected user volume

---

## Monitoring & Analytics

**Status:** ⏸️ Pending

- [ ] Set up error tracking (Sentry, Bugsnag, etc.)
- [ ] Configure analytics (Firebase Analytics, Mixpanel, etc.)
- [ ] Set up performance monitoring
- [ ] Configure push notification analytics
- [ ] Set up uptime monitoring for Edge Functions

---

## Post-Launch

**Status:** ⏸️ Pending

- [ ] Monitor crash reports
- [ ] Monitor user feedback and reviews
- [ ] Set up customer support system
- [ ] Plan feature updates and bug fix releases
- [ ] Monitor Stripe dashboard for payment issues
- [ ] Monitor Supabase usage and costs

---

## Future App Iterations — Twilio / Communication Platform

**Status:** 💡 Planned — Not required for v1 launch. Revisit after initial user feedback.

These services build on top of the v1 Twilio integration (SendGrid email, SMS, WhatsApp) and unlock more powerful communication and engagement features.

### Delivery & Read Receipts (High Priority — Phase 2)
**What it does:** Twilio POSTs a webhook to your server when a message status changes. Lets you show the organizer which guests received, opened, or read each invitation — live, inside the app.

- [ ] Create `twilio-status-webhook` Supabase Edge Function
- [ ] Handle SMS/WhatsApp status callbacks: `queued` → `sent` → `delivered` → `failed`
- [ ] Handle WhatsApp `read` status (blue ticks confirmed)
- [ ] Handle SendGrid email events: `delivered`, `opened`, `clicked`, `bounced`, `spam_reported`, `unsubscribed`
- [ ] Update `guest_invitations.status` in DB on each callback
- [ ] Show per-guest delivery status in Manage Invitations screen (delivered ✓, read 👁, failed ✗)
- [ ] Register webhook URLs in Twilio Console and SendGrid settings

### Inbound SMS Replies (Medium Priority — Phase 2)
**What it does:** If a guest replies `YES` / `JA` / `NO` to the invite SMS, Twilio fires a webhook. Auto-update RSVP status without the guest needing to download the app.

- [ ] Purchase a Twilio German inbound-capable long number or short code
- [ ] Create `twilio-inbound-sms` Edge Function to parse guest replies
- [ ] Map inbound phone number back to `guest_invitations` record
- [ ] Auto-update RSVP / participant status on YES/JA response
- [ ] Send confirmation reply: "Thanks! We've noted your RSVP. Download Game Over: https://game-over.app"

### Twilio Verify — Phone Verification (Medium Priority — Phase 2)
**What it does:** When a guest clicks the invite link and signs up, silently confirm their phone number matches the one the organizer entered. More robust than Supabase's built-in OTP.

- [ ] Evaluate replacing Supabase SMS OTP with Twilio Verify for phone auth
- [ ] Add Twilio Verify step during guest RSVP / account creation flow
- [ ] Handle Verify webhook callbacks for verification results
- [ ] Cost: ~€0.05 per verification

### Twilio Conversations API (Low Priority — Phase 3)
**What it does:** Unified omnichannel messaging — SMS, WhatsApp, and in-app chat in one thread per event. Would replace or augment the current Supabase realtime chat with a managed platform.

- [ ] Evaluate replacing Supabase realtime chat with Twilio Conversations
- [ ] Assess migration path from current `chat_channels` / `messages` DB tables
- [ ] Prototype a Conversations-backed event chat channel
- [ ] Consider hybrid: keep in-app chat on Supabase, use Conversations for external SMS/WA guests only

### Twilio Flex / Customer Support (Low Priority — Phase 3)
**What it does:** Full contact centre platform. Would replace or augment the current Crisp chat support widget with a Twilio-native solution that unifies all communication channels (SMS, WhatsApp, email, in-app) in one agent dashboard.

- [ ] Evaluate replacing Crisp with Twilio Flex for customer support
- [ ] Assess cost vs. Crisp at expected support volume

### Marketing & Lifecycle Campaigns (Phase 3)
**What it does:** SendGrid Marketing Campaigns lets you send segmented bulk emails (re-engagement, feature announcements, event reminders) to your full user base — not just transactional one-to-one.

- [ ] Set up SendGrid Marketing Campaigns for user lifecycle emails
- [ ] Design email sequences: welcome series, event reminder 7d before, post-event review request
- [ ] Configure unsubscribe groups (transactional vs. marketing) — required for GDPR
- [ ] Integrate Supabase user segments with SendGrid contact lists

---

## Notes

- This checklist should be reviewed and updated as you progress through development
- Some items may require additional planning and resources
- Prioritize based on your launch timeline and requirements
