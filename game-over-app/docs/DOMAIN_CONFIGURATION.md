# Domain Configuration Guide for Game-Over.app

This document explains how the `Game-Over.app` domain is configured throughout the application and what steps are needed for production deployment.

## Current Configuration Status

### ✅ Already Configured

1. **Deep Linking (App Code)**
   - iOS Associated Domains: `applinks:gameover.app` (in `GameOver.entitlements`)
   - Android Intent Filters: `gameover.app` domain (in `app.config.ts`)
   - Custom URL Scheme: `gameover://`

2. **OAuth Configuration**
   - Facebook App ID: `2083822122367839`
   - Google OAuth Client IDs (iOS, Android, Web)
   - OAuth Redirect URL: `https://stdbvehmjpmqbjyiodqg.supabase.co/auth/v1/callback`
   - Facebook App Domains: `stdbvehmjpmqbjyiodqg.supabase.co`

3. **Environment Variables**
   - All OAuth credentials configured in `.env`
   - Supabase URL and keys configured

### ⏸️ Pending (Before Production Launch)

1. **DNS Configuration**
   - Set up DNS records for `game-over.app`
   - Configure SSL certificates

2. **Universal Links Verification Files**
   - Upload Apple App Site Association file
   - Upload Android Digital Asset Links file

3. **Optional: Custom Supabase Domain**
   - Set up `auth.game-over.app` → Supabase

---

## How the Domain is Used

### 1. Deep Linking (User Experience)

**Purpose:** Allow users to open app content from web links

**Examples:**
- Share invite link: `https://game-over.app/invite/ABC123`
- Share event link: `https://game-over.app/event/xyz789`

**User Experience:**
- User clicks link in browser/message
- iOS/Android recognizes the domain
- Opens Game Over app directly to that content
- Falls back to website if app not installed

**Configuration:**
- iOS: `ios/GameOver/GameOver.entitlements` → `com.apple.developer.associated-domains`
- Android: `app.config.ts` → `intentFilters`

**What You Need to Do:**
1. Host verification files at `https://game-over.app/.well-known/`
2. See "Universal Links Setup" section below

---

### 2. OAuth Redirect URLs (Authentication)

**Purpose:** Where OAuth providers redirect after user authenticates

**Current Setup:**
- All OAuth providers redirect to: `https://stdbvehmjpmqbjyiodqg.supabase.co/auth/v1/callback`
- This is your Supabase auth endpoint
- Supabase handles the OAuth flow and redirects back to your app

**Why NOT use game-over.app directly?**
- Supabase needs to receive the OAuth callback to exchange tokens
- Your domain would need to proxy to Supabase (complex)
- Supabase custom domain feature handles this elegantly

**Optional Enhancement (Requires Supabase Pro):**
- Set up `auth.game-over.app` as custom domain in Supabase
- Update OAuth redirect URLs to: `https://auth.game-over.app/auth/v1/callback`
- Benefits: Branded URL, custom email templates
- **Note:** This is purely cosmetic and optional

**Configuration:**
- Facebook: Developer Console > Facebook Login > Settings > Valid OAuth Redirect URIs
- Google: OAuth Client configuration in Google Cloud Console
- Apple: Service ID configuration in Apple Developer Portal

---

### 3. Facebook OAuth Configuration

**What's Configured:**

1. **App Domains** (Facebook Settings > Basic):
   - `stdbvehmjpmqbjyiodqg.supabase.co`
   - *(Optional)* `game-over.app` (can add this too, doesn't hurt)

2. **Valid OAuth Redirect URIs** (Facebook Login > Settings):
   - `https://stdbvehmjpmqbjyiodqg.supabase.co/auth/v1/callback`
   - *(Optional with custom domain)* `https://auth.game-over.app/auth/v1/callback`

3. **Platform Settings** (Facebook Settings > Basic > Platforms):
   - iOS Bundle ID: `app.gameover.ios`
   - Android Package Name: `app.gameover.android`
   - Android Key Hash: `nRhx4vJ1AplGGXP2zzPBiwMYAzc=` (development)

**Recommendation for Now:**
- Keep current Supabase URL configuration (simpler, works immediately)
- Optionally add `game-over.app` to App Domains (no harm, good for future)
- Custom domain setup can wait until you need it

---

## Universal Links Setup (Required for Production)

Universal Links allow iOS/Android to open your app from web links automatically.

### Apple App Site Association (iOS)

**File Location:** `https://game-over.app/.well-known/apple-app-site-association`

**File Content:**
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAM_ID.app.gameover.ios",
      "paths": ["/invite/*", "/event/*", "*"]
    }]
  }
}
```

**Replace `TEAM_ID` with your Apple Developer Team ID**

**Requirements:**
- No file extension (no `.json`)
- Served with `Content-Type: application/json`
- HTTPS only (SSL required)
- No redirects
- Must return HTTP 200 status

**How to Get Your Team ID:**
1. Go to https://developer.apple.com/account
2. Click "Membership" in sidebar
3. Copy your Team ID

### Android Digital Asset Links

**File Location:** `https://game-over.app/.well-known/assetlinks.json`

**File Content:**
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.gameover.android",
    "sha256_cert_fingerprints": [
      "YOUR_RELEASE_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```

**How to Get SHA256 Fingerprint:**

For debug build:
```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android | grep "SHA256"
```

For release build (after creating release keystore):
```bash
keytool -list -v -keystore YOUR_RELEASE_KEYSTORE.keystore \
  -alias YOUR_ALIAS | grep "SHA256"
```

**Requirements:**
- File extension must be `.json`
- Served with `Content-Type: application/json`
- HTTPS only (SSL required)
- Must return HTTP 200 status

---

## DNS Configuration

### Option 1: Simple Setup (Recommended for Now)

**Just for verification files:**

1. Set up basic web hosting for `game-over.app`
   - Can use GitHub Pages, Netlify, Vercel, etc. (free options)
   - Only needs to serve static files

2. Upload the `.well-known` directory with both verification files

3. Optionally: Create a landing page that redirects to app stores

### Option 2: Full Setup with Custom Supabase Domain

**Requires Supabase Pro plan or higher**

1. **Root Domain (game-over.app):**
   - Type: `A` or `CNAME`
   - Points to: Your web hosting

2. **Auth Subdomain (auth.game-over.app):**
   - Type: `CNAME`
   - Value: `stdbvehmjpmqbjyiodqg.supabase.co`

3. **In Supabase Dashboard:**
   - Go to Settings > Custom Domains
   - Add `auth.game-over.app`
   - Verify DNS configuration
   - SSL certificate auto-generated

4. **Update OAuth Redirect URLs:**
   - Google Cloud Console
   - Facebook Developer Console
   - Apple Developer Portal
   - Change from `stdbvehmjpmqbjyiodqg.supabase.co` to `auth.game-over.app`

---

## Testing Deep Links

### During Development

**iOS Simulator:**
```bash
xcrun simctl openurl booted "gameover://invite/TEST123"
xcrun simctl openurl booted "https://game-over.app/invite/TEST123"
```

**Android Emulator:**
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "gameover://invite/TEST123" app.gameover.android

adb shell am start -W -a android.intent.action.VIEW \
  -d "https://game-over.app/invite/TEST123" app.gameover.android
```

### After DNS Configuration

**iOS (Physical Device):**
1. Send link via Messages/Email
2. Tap link
3. Should open app directly (no browser)

**Android (Physical Device):**
1. Send link via Messages/Email
2. Tap link
3. May show "Open with" dialog first time
4. Select "Always open with Game Over"

**Troubleshooting:**
- Clear app data and reinstall
- Verify verification files are accessible
- Check DNS propagation (can take 24-48 hours)
- iOS: Check Settings > Your App > Associated Domains

---

## Summary: What to Do Now vs. Later

### **Now (For Development & Testing):**

✅ **Already Done:**
- Deep linking configured in app code
- Facebook App created and configured with Supabase URL
- Environment variables set

✅ **Complete These Facebook Steps:**
1. In Facebook Developer Console > Settings > Basic:
   - Verify App Domains includes: `stdbvehmjpmqbjyiodqg.supabase.co`
   - Optionally add: `game-over.app`

2. In Facebook Login > Settings:
   - Verify Valid OAuth Redirect URIs includes: `https://stdbvehmjpmqbjyiodqg.supabase.co/auth/v1/callback`

### **Before Production Launch:**

1. **DNS & Verification Files** (Required for Universal Links):
   - Set up web hosting for `game-over.app`
   - Upload `.well-known` verification files
   - Wait for DNS propagation (24-48 hours)
   - Test on physical devices

2. **Android Release Signing** (Required for Play Store):
   - Generate release keystore
   - Get SHA256 fingerprint
   - Update `assetlinks.json` with release fingerprint
   - Generate Facebook release key hash
   - Add to Facebook Developer Console

3. **Facebook App Production Mode**:
   - Add Privacy Policy URL
   - Add Terms of Service URL
   - Submit for review if needed
   - Switch from Development to Live mode

### **Optional (Can Do Anytime):**

- Set up custom Supabase domain (`auth.game-over.app`)
- Update all OAuth providers to use custom domain
- Create landing page website at `game-over.app`

---

## Need Help?

Refer to:
- `GO_LIVE_CHECKLIST.md` - Complete production checklist
- `CLAUDE.md` - Project documentation
- [Apple Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)
- [Supabase Custom Domains](https://supabase.com/docs/guides/platform/custom-domains)
