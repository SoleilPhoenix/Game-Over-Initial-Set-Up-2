# Audit Changelog

**Audit Date:** 2026-01-30
**Audit Branch:** `release-audit/2026-01-30`

---

## Commits Made During Audit

### Commit 1: `6cd55024f`

**Type:** Security Fix
**Message:** `chore(security): fix .gitignore and remove tracked artifacts`

#### Changes Summary
| Category | Files Changed | Lines Removed |
|----------|--------------|---------------|
| node_modules | 73,957 | ~7,700,000 |
| .expo | 56 | ~5,000 |
| .env | 1 | 35 |
| *.log | 7 | ~70,000 |
| .gitignore | 1 | +75 lines |

#### Detailed Changes

**1. Updated `.gitignore`**
- **Evidence:** Previous .gitignore only contained expo-generated patterns
- **Action:** Added comprehensive ignore patterns for:
  - `node_modules/`
  - `.expo/`, `.expo-shared/`
  - `.env`, `.env.local`, `.env.*.local`
  - `*.log`, `*.tsbuildinfo`
  - `ios/build/`, `ios/Pods/`
  - `android/build/`, `android/.gradle/`
  - Native signing files (`*.jks`, `*.p8`, `*.p12`, `*.key`)
  - IDE files (`.idea/`, `.vscode/`)
  - macOS artifacts (`.DS_Store`)

**2. Removed `.env` from git tracking**
- **Path:** `.env`
- **Evidence:** `git ls-files .env` returned the file (tracked)
- **Risk:** CRITICAL - contained Supabase keys, OAuth credentials, Stripe keys
- **Action:** `git rm --cached .env`
- **Test:** Unit tests pass (32/32)

**3. Removed `node_modules/` from git tracking**
- **Path:** `node_modules/`
- **Evidence:** `git ls-files node_modules/ | wc -l` returned 73,957
- **Risk:** HIGH - 862MB of dependencies should never be committed
- **Action:** `git rm -r --cached node_modules/`
- **Test:** Unit tests pass (32/32)

**4. Removed `.expo/` from git tracking**
- **Path:** `.expo/`
- **Evidence:** Directory was tracked (prebuild cache, metro shims, types)
- **Risk:** MEDIUM - Cache/generated files bloat repo
- **Action:** `git rm -r --cached .expo/`
- **Test:** Unit tests pass (32/32)

**5. Removed log files from git tracking**
- **Paths:**
  - `xcodebuild.log` (20 MB)
  - `xcodebuild_v2.log` (10 MB)
  - `npm_run_ios.log` (358 B)
  - `build_ios.log` (213 B)
  - `build_ios_final.log` (319 B)
  - `build_ios_sim.log` (269 B)
  - `expo.log` (1.3 KB)
- **Evidence:** `git ls-files *.log` returned 7 files
- **Risk:** MEDIUM - Build logs are transient and bloat repo
- **Action:** `git rm --cached *.log`
- **Test:** Unit tests pass (32/32)

---

## Items NOT Changed (Quarantine/Keep)

### Kept - Design Assets
| Path | Size | Reason |
|------|------|--------|
| `UI_and_UX/` | 17 MB | Design reference mockups, useful for UI alignment |

### Kept - Documentation
| Path | Size | Reason |
|------|------|--------|
| `IMPLEMENTATION_PLAN_V2.1.md` | 44 KB | Historical reference, may be useful for context |
| `PRD` | 75 KB | Product requirements document |
| `Rules` | 3 KB | Project rules |
| `GO_LIVE_CHECKLIST.md` | 10 KB | Active production checklist |
| `CLAUDE.md` | 11 KB | Active project guide |

### Kept - Config Files
| Path | Reason |
|------|--------|
| `pnpm-workspace.yaml` | May be needed for monorepo setup |
| `.eslintrc.js` | ESLint config (currently untracked - user decision) |

---

## Test Matrix

### Pre-Change Tests
| Test | Command | Result |
|------|---------|--------|
| Unit Tests | `npm test -- --run` | PASS (32/32) |
| TypeScript | `npm run typecheck` | FAIL (50+ errors) - pre-existing |
| ESLint | `npm run lint` | WARN (46 warnings) - pre-existing |
| JS Bundle | `npx expo export --platform ios` | PASS (6.52 MB) |

### Post-Change Tests
| Test | Command | Result |
|------|---------|--------|
| Unit Tests | `npm test -- --run` | PASS (32/32) |

### Verification
- Functionality preserved: Unit tests pass before and after
- No runtime changes: Only git tracking modified
- Files still on disk: `git rm --cached` preserves local files

---

## Security Notes

### Credential Rotation Required

The following credentials were previously committed to git and should be considered compromised:

1. **Supabase**
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

2. **Google OAuth**
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS`
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID`
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB`

3. **Facebook OAuth**
   - `EXPO_PUBLIC_FACEBOOK_APP_ID`

4. **Stripe**
   - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Recommended Actions
1. Rotate all above credentials immediately
2. Update `.env` with new values
3. Verify git history doesn't expose other secrets
4. Consider using `git-filter-repo` to remove history if repo is public

---

## Audit Artifacts Created

| File | Purpose |
|------|---------|
| `audit/REPORT.md` | Comprehensive audit findings and Go/No-Go decision |
| `audit/RELEASE_CHECKLIST.md` | iOS/Android release requirements checklist |
| `audit/CHANGELOG_AUDIT.md` | This file - detailed change log with evidence |

---

*Audit completed: 2026-01-30*
