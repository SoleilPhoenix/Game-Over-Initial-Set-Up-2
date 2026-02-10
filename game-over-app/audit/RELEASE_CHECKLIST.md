# Release Checklist - Game Over App

**Last Updated:** 2026-01-30
**Target Release:** v1.0.0

---

## iOS App Store

### Apple Developer Setup
- [ ] Apple Developer Program enrollment ($99/year)
- [ ] App ID created with correct bundle identifier: `app.gameover.ios`
- [ ] Sign in with Apple capability enabled
- [ ] Push Notifications capability enabled

### Certificates & Provisioning
- [ ] Distribution certificate generated
- [ ] App Store provisioning profile created
- [ ] Push notification certificate (APNs)
- [ ] Entitlements file configured

### App Store Connect
- [ ] App listing created
- [ ] App description written
- [ ] Keywords optimized
- [ ] Support URL provided
- [ ] Privacy Policy URL provided
- [ ] Age rating completed
- [ ] App categories selected

### Assets (Required Sizes)
- [ ] App Icon 1024x1024 (no alpha)
- [ ] iPhone 6.7" screenshots (1290 x 2796)
- [ ] iPhone 6.5" screenshots (1242 x 2688)
- [ ] iPhone 5.5" screenshots (1242 x 2208)
- [ ] iPad Pro 12.9" screenshots (2048 x 2732) - if supporting tablet

### Privacy & Compliance
- [ ] Privacy Manifest (`PrivacyInfo.xcprivacy`)
- [ ] NSUserTrackingUsageDescription (if using ATT)
- [ ] NSCameraUsageDescription
- [ ] NSPhotoLibraryUsageDescription
- [ ] NSCalendarsUsageDescription ✅ (in Info.plist)
- [ ] NSFaceIDUsageDescription ✅ (in Info.plist)

### Build Configuration
- [ ] Bundle version incremented
- [ ] `newArchEnabled` setting verified
- [ ] Release scheme configured
- [ ] Bitcode disabled (not required for iOS 16+)

### Testing
- [ ] TestFlight beta testing completed
- [ ] Apple Sign-In tested on device
- [ ] Push notifications tested
- [ ] Universal Links tested (game-over.app)
- [ ] IAP testing (if applicable)

---

## Android Play Store

### Google Play Console Setup
- [ ] Developer account created ($25 one-time)
- [ ] App listing created
- [ ] Package name verified: `app.gameover.android`

### Signing & Keys
- [ ] Upload keystore generated (NOT debug keystore!)
- [ ] Keystore backed up securely (CRITICAL - cannot recover if lost!)
- [ ] SHA-256 fingerprint extracted for:
  - [ ] Firebase (if used)
  - [ ] Facebook OAuth
  - [ ] Google OAuth
- [ ] App signing by Google Play enabled

### Assets (Required)
- [ ] App Icon 512x512
- [ ] Feature Graphic 1024x500
- [ ] Phone screenshots (min 2)
- [ ] 7" Tablet screenshots (optional)
- [ ] 10" Tablet screenshots (optional)

### Store Listing
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)
- [ ] Privacy Policy URL
- [ ] App category selected
- [ ] Content rating questionnaire completed
- [ ] Target audience and content defined

### Build Configuration
- [ ] `versionCode` incremented ✅ (currently: 1)
- [ ] `versionName` set ✅ (currently: 1.0.0)
- [ ] `minSdkVersion` appropriate
- [ ] `targetSdkVersion` meets Play Store requirements
- [ ] ProGuard/R8 enabled for release
- [ ] Release build type uses production keystore

### Testing
- [ ] Internal testing track setup
- [ ] APK/AAB tested on multiple devices
- [ ] Deep links tested (gameover.app)
- [ ] Push notifications tested

---

## Cross-Platform Requirements

### Authentication
- [ ] Apple Sign-In configured (REQUIRED for iOS)
- [ ] Google OAuth production credentials
- [ ] Facebook OAuth production credentials
- [ ] Email/password auth tested

### Domain & Deep Links
- [ ] DNS configured for `game-over.app`
- [ ] `/.well-known/apple-app-site-association` uploaded
- [ ] `/.well-known/assetlinks.json` uploaded
- [ ] SSL certificate valid

### Backend (Supabase)
- [ ] Production project (or verify current is production-ready)
- [ ] Email confirmations enabled
- [ ] Rate limiting configured
- [ ] RLS policies reviewed
- [ ] Database backups enabled
- [ ] Edge functions deployed:
  - [ ] `create-payment-intent`
  - [ ] `stripe-webhook`

### Payments (Stripe)
- [ ] Live mode enabled
- [ ] Webhook endpoint configured
- [ ] Production API keys in edge functions
- [ ] Payment flows tested with real cards

### Push Notifications
- [ ] APNs configured (iOS)
- [ ] FCM configured (Android)
- [ ] `expo-notifications` token registration working
- [ ] Notification delivery tested

### Code Quality
- [ ] TypeScript errors resolved (currently: 50+ errors)
- [ ] ESLint warnings addressed (currently: 46 warnings)
- [ ] Unit tests passing (currently: 32/32 ✅)
- [ ] E2E tests passing

### Security
- [ ] No hardcoded secrets in code
- [ ] `.env` not in git
- [ ] Production secrets in secure storage
- [ ] API keys rotated from development

### Legal
- [ ] Privacy Policy document
- [ ] Terms of Service document
- [ ] GDPR compliance (if EU users)
- [ ] Data retention policy

---

## Environment Variables Required

### Client-Side (EXPO_PUBLIC_*)
```
EXPO_PUBLIC_SUPABASE_URL=https://stdbvehmjpmqbjyiodqg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<production_anon_key>
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=<production_google_ios_client_id>
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=<production_google_android_client_id>
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=<production_google_web_client_id>
EXPO_PUBLIC_FACEBOOK_APP_ID=<production_facebook_app_id>
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_<production_stripe_key>
```

### Server-Side (Supabase Edge Functions)
```
STRIPE_SECRET_KEY=sk_live_<production_stripe_secret>
STRIPE_WEBHOOK_SECRET=whsec_<production_webhook_secret>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

### EAS Build Secrets
```
APPLE_ID=<apple_account_email>
ASC_APP_ID=<app_store_connect_app_id>
APPLE_TEAM_ID=<apple_team_id>
```

---

## Pre-Submission Checklist

### Final Verification
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] App launches successfully
- [ ] Core flows work:
  - [ ] Sign up / Sign in
  - [ ] Create event
  - [ ] Browse packages
  - [ ] Book package / payment
  - [ ] Chat functionality
  - [ ] Invite system
- [ ] No console errors/warnings in production build
- [ ] Performance acceptable on target devices

### Documentation
- [ ] CLAUDE.md updated
- [ ] README accurate
- [ ] CHANGELOG maintained

---

## Post-Launch

- [ ] Monitor crash reports (Sentry/Bugsnag)
- [ ] Monitor user feedback
- [ ] Monitor payment disputes
- [ ] Monitor Supabase usage/costs
- [ ] Plan 1.0.1 bugfix release timeline
