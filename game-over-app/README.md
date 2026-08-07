# Game Over

AI-powered bachelor / bachelorette party planning app. Built with Expo (React Native), Supabase, TypeScript, and Tamagui.

> **For AI assistants:** the authoritative project context lives in [`CLAUDE.md`](./CLAUDE.md). It documents the data layer, auth flow, RLS workarounds, design system, and all the gotchas.

---

## Project state

| | Status |
|---|---|
| **UI** | ✅ Editorial Navy & Gold redesign merged (PR #10, May 2026). Dark + light themes via `Profile → Appearance`. |
| **Design system** | ✅ Single source of truth: `src/constants/designSystem.ts` (`EDITORIAL_DARK` + `EDITORIAL_LIGHT`). Tamagui tokens mirror it. |
| **Fonts** | ✅ Inter only (Display / Body / Label). Fraunces removed. |
| **CI checks** | ✅ Code Quality + Build iOS + Build Android run on every push; E2E (Detox) **manual-only** (see below). |
| **EAS Build** | ✅ Configured for development / preview / production profiles. `EXPO_TOKEN` repo-secret set. |
| **Stripe / Sentry** | ⚠️ Sentry source-map auto-upload **disabled** in CI builds (Plugin + Metro hook removed). JS-side `Sentry.init` still captures crashes. Re-enable when bumping to Expo SDK 55+ and `@sentry/react-native` 8.x. |
| **App Store / Play Store** | ⏳ Not yet submitted. EAS submit configured but waiting for Apple Developer + Google Play credentials. |

---

## Quick start

```bash
# Install
npm install --legacy-peer-deps

# Run locally
npm start                 # Expo dev server (Expo Go)
npm run ios               # iOS simulator (native build)
npm run android           # Android emulator (native build)

# Verify before pushing
npm run typecheck
npm run lint
npx vitest run            # unit tests
```

Required env vars are documented in `.env.example`. Production checklist: [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md).

---

## What CI does (`.github/workflows/`)

Every push to `main` and every pull request triggers three checks running in parallel on GitHub-hosted runners:

| Job | Runner | Duration | What it verifies |
|---|---|---|---|
| **Code Quality** | Ubuntu | ~1 min | `tsc --noEmit` + ESLint + Vitest (60 unit tests) |
| **Build iOS** | macOS | ~20 min | `expo prebuild --platform ios` → `pod install` → `xcodebuild` (Debug, simulator SDK, code-signing off) |
| **Build Android** | Ubuntu | ~20 min | `expo prebuild --platform android` → `./gradlew assembleDebug` |

Plus two external integrations on the PR view:

- **GitGuardian** — scans commits for accidentally committed secrets (API keys, tokens).
- ~~**Vercel**~~ — removed. Game Over is a mobile app, not a website. There is nothing to deploy to Vercel. If a Vercel check still shows up on your PRs, delete the project at <https://vercel.com/dashboard> and disconnect the Vercel GitHub App from this repo's integration settings.

CI builds in this repo are **Debug builds for verification only** — they prove the code compiles. They do not produce installable artifacts. For TestFlight / Play Store builds, use EAS (see below).

### Optional workflows

| Workflow | Trigger | What it does |
|---|---|---|
| **E2E Tests (Detox)** [`e2e.yml`] | **Manual only** (Actions tab → "Run workflow") | Runs Detox tests on iOS Simulator (release config, macOS runner) and Android Emulator (Ubuntu + KVM). ~30 min iOS, ~25 min Android, 90 min job timeout. Failure artifacts uploaded for 7 days. **Auto-trigger removed** while the app is pre-launch — solo-dev manual QA on simulator catches regressions cheaper than ~70 min of macOS CI time per push. Re-enable by adding `push: { branches: [main] }` to the `on:` block. |
| **EAS Preview Build** [`eas-preview.yml`] | Manual only | Triggers `eas build --profile preview` for internal testing (install link sent via EAS). |
| **Release** [`release.yml`] | Git tag matching `v*.*.*` | `v1.0.0` → builds production + submits to App Store / Play Store + creates GitHub Release. `v1.0.0-rc.1` → builds only (no store submission). |

---

## Cutting a release

The full pipeline (build → submit → GitHub release) runs from a single tag push:

```bash
# Final release — builds + submits to both stores + creates GitHub Release
git tag v1.0.0
git push origin v1.0.0

# Release candidate — builds only, NO store submission
git tag v1.0.0-rc.1
git push origin v1.0.0-rc.1
```

The convention: any tag containing `-` is treated as a pre-release. `eas submit` only runs for clean semver tags like `v1.0.0`, `v2.3.4`.

Prerequisites:
- `EXPO_TOKEN` set as GitHub repo secret (Settings → Secrets → Actions)
- EAS project secrets configured (see below)
- Apple Developer + Google Play credentials configured in `eas.json`

If you want to build/submit manually without tagging, see the EAS section below.

---

## EAS builds (App Store / Play Store)

[EAS Build](https://docs.expo.dev/eas/) compiles signed binaries in Expo's cloud. Configuration lives in [`eas.json`](./eas.json) with three profiles:

| Profile | Purpose | Output |
|---|---|---|
| `development` | Local dev with native modules in Expo Dev Client | iOS simulator + Android dev build |
| `preview` | Internal testing (TestFlight internal, Firebase App Distribution) | iOS `.ipa`, Android `.apk` |
| `production` | Public App Store / Play Store releases | iOS `.ipa`, Android `.aab`, version auto-increment |

### First-time setup

```bash
# Install once globally
npm install -g eas-cli

# Authenticate with the Expo account that owns the project
eas login                 # account: soleil_phoenix
                          # project ID: 0e06655a-2e82-4574-b673-5dc6b7c42206
```

### Triggering builds manually

```bash
# Internal preview build (give testers an install link)
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Production build (signed for store submission)
eas build --platform all --profile production

# Submit the most recent production build to the stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

### Required secrets

The `eas.json` build profiles expect these environment variables to exist on **Expo's project secrets** (not in `.env`). Set them once with `eas secret:create`:

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_SENTRY_DSN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN
```

For `eas submit` to work, you also need:
- **iOS:** `APPLE_ID`, `ASC_APP_ID`, `APPLE_TEAM_ID` env vars + an Apple Developer account
- **Android:** `google-service-account.json` (Google Play Console → API access → Service accounts)

---

## Repository layout

```
GameOver/                          # monorepo root
├── .github/workflows/             # CI pipelines (ci.yml, migrate.yml, …)
├── game-over-app/                 # Expo app
│   ├── app/                       # expo-router file-based routes
│   ├── src/                       # components, hooks, stores, repositories
│   ├── supabase/                  # SQL migrations + edge functions
│   ├── eas.json                   # EAS Build / Submit config
│   ├── app.config.ts              # Expo runtime config
│   ├── CLAUDE.md                  # AI-assistant project context
│   └── GO_LIVE_CHECKLIST.md       # production launch checklist
└── docs/                          # cross-app docs (admin, auth review, …)
```

---

## Further reading

- [`CLAUDE.md`](./CLAUDE.md) — architecture, data layer, auth, RLS, design system
- [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md) — production launch checklist
- [`docs/AUTH_CODE_REVIEW.md`](./docs/AUTH_CODE_REVIEW.md) — auth implementation review
- [`docs/DOMAIN_CONFIGURATION.md`](./docs/DOMAIN_CONFIGURATION.md) — deep linking & universal links
- [`docs/ADMIN_GUIDE.md`](./docs/ADMIN_GUIDE.md) — admin features and management
