---
name: gameover-ci-triage
description: Diagnose and fix failing GitHub Actions CI checks for the Game Over Expo/React Native app. Use when a CI check (Code Quality, Build iOS, Build Android, Apply Migrations, E2E iOS, E2E Android) fails on a PR or main branch push.
allowed-tools: "Bash(gh *),Bash(git *),Bash(npm *),Bash(npx *),Read,Edit,Write"
version: 1.0.0
---

# Game Over CI Triage Skill

Rigid process skill. Follow these steps in order.

## Step 1 — Identify failing checks

```bash
gh pr checks <PR_NUMBER> --repo SoleilPhoenix/Game-Over-Initial-Set-Up-2
```

If on main: `gh run list --repo SoleilPhoenix/Game-Over-Initial-Set-Up-2 --limit 5`

Note which jobs failed. Proceed to the matching section below.

## Step 2 — Fetch the failing job log

```bash
gh run view <RUN_ID> --repo SoleilPhoenix/Game-Over-Initial-Set-Up-2 --log-failed 2>&1 | tail -100
```

Or for a specific job:
```bash
gh run view <RUN_ID> --repo SoleilPhoenix/Game-Over-Initial-Set-Up-2 --log-failed --job <JOB_ID> 2>&1 | tail -150
```

Scan the log for the first ERROR or FAILED line — that is the root cause. Map it to a category below.

---

## Known Failure Categories

### Code Quality (ESLint / TypeScript)

**Symptom:** `error TS...` or ESLint rule violation in log.

**Fix:** Run locally, fix all errors, commit.
```bash
npm run typecheck
npm run lint:fix
```

Common recurring errors:
- Using deprecated color tokens (`#15181D`, `#1E2329`, `#23272F`, `#258CF4`, `#5A7EB0`) → replace with `useTheme()` values
- `glassCard` → `glassLight`, `backgroundDark` → `background`
- Optional params on callbacks not typed with `?`

---

### Apply Migrations

**Symptom:** `PGRST204`, SQL error, or migration not found.

**Fix:** Check that the migration file is committed and the export is in the repositories index.
```bash
git status supabase/migrations/
git status src/repositories/index.ts
```

- If new migration file was created but not committed: `git add supabase/migrations/ && git commit`
- If new repository was added but not exported: add to `src/repositories/index.ts`

Do NOT add `planning_checklist` to DB schema — it does not exist in PostgREST cache. Use `participantCountCache` instead.

---

### Build iOS

**Symptom:** Pod install failure, wrong workspace name, Sentry upload error, or missing plugin.

**Common fixes:**

| Error in log | Fix |
|---|---|
| `No such file or directory: GameOver.xcworkspace` | `app.config.ts` `name` must be `"GameOver"` (exact case) |
| `pod install` fails | Delete `ios/Podfile.lock` before `pod install` in the workflow step |
| `@sentry/react-native/expo` not found | Remove or guard the Sentry Expo plugin in `app.config.ts`/`metro.config.js` |
| Sentry source map upload blocks build | Set `SENTRY_DISABLE_AUTO_UPLOAD=true` in the EAS job env |
| `react-native-crisp-chat-sdk` / `@crisp-chat` unresolved | Remove stale Crisp references from `ios/` native files and `app.config.ts` |
| `libfbjni.so` duplicate | Add `packagingOptions.pickFirst` via `expo-build-properties` |
| `MMKVCore/Core/aes/AESCrypt.cpp: error: use of undeclared identifier 'memset_s'` | Siehe unten - offen, braucht Owner-Freigabe |

```bash
# To check current app.config.ts name
grep -n '"name"' app.config.ts | head -5
```

#### Offen: `memset_s` in MMKVCore unter Xcode 26.6

**Symptom:** `Build iOS` endet mit `exit code 65`; die eigentliche Zeile steht weit oben im Log:

```
ios/Pods/MMKVCore/Core/aes/AESCrypt.cpp:83:11:
error: use of undeclared identifier 'memset_s'
```

**Wichtig fuer die Triage:** der Log-*Schwanz* zeigt nur Warnungen zu Deployment-Targets und
Hermes-Skriptphasen. Wer nur `--log-failed | tail` liest, sieht die Ursache nicht. Immer gezielt
greppen:

```bash
gh run view --job <job-id> --log-failed | grep -E "error:|The following build commands failed"
```

**Ursache:** `memset_s` ist Teil von C11 Annex K und nur sichtbar, wenn `__STDC_WANT_LIB_EXT1__`
vor `<string.h>` definiert ist. Aktuelle Apple-SDKs (hier iOS 26.5 unter Xcode 26.6) stellen es
nicht mehr implizit bereit; die eingebundene MMKVCore-Fassung rechnet noch damit.

**Status:** nicht behoben. Bestaetigt vorbestehend - derselbe Job scheiterte am 30.07. genauso,
also unabhaengig von allem, was seither geaendert wurde. Kein Blocker fuer Code Quality, Build
Android oder die Edge-Function-Deploys, die alle gruen sind.

**Loesungswege, beide brauchen Owner-Freigabe (Abhaengigkeit bzw. native Buildkonfiguration):**

1. `react-native-mmkv` und damit den MMKVCore-Pod auf eine Fassung heben, die das behebt - der
   saubere Weg, aber ein Dependency-Bump nach §2.8 der Change-Control.
2. `__STDC_WANT_LIB_EXT1__=1` als Preprocessor-Define fuer den MMKVCore-Pod setzen. **Nicht** in
   `ios/` editieren: der Ordner ist gitignored und wird von `expo prebuild` neu erzeugt. Der
   Eingriff gehoert in ein Config-Plugin unter `plugins/` (Vorbild: `withBrandAndroidColors.js`)
   oder in `expo-build-properties`.

---

### Build Android

**Symptom:** Gradle OOM, Sentry bundling crash, duplicate `.so` files.

**Common fixes:**

| Error in log | Fix |
|---|---|
| `OutOfMemoryError` in Gradle | In `android/gradle.properties` set `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m` |
| `GRADLE_OPTS` not enough | Patch `android/gradle.properties` directly (not just env var) |
| Sentry `withSentryConfig` bundling crash | Disable in `metro.config.js`: remove `withSentryConfig` wrapper |
| `libfbjni.so` / `libc++_shared.so` conflict | Use `expo-build-properties` `android.packagingOptions.pickFirst` |

---

### E2E iOS (Detox)

**Symptom:** Red Box / JS bundle not found, simulator boot failure, test timeout.

**Common fixes:**

| Error in log | Fix |
|---|---|
| Red Box: `Unable to resolve module` | Set `FORCE_BUNDLING=1` in Detox config / iOS scheme build settings |
| `No simulator named "iPhone 16 Pro"` | Check available sims: `xcrun simctl list devices available`; update `.detoxrc.js` |
| Tests time out (>60 min) | Raise `timeout-minutes` to `90` in the workflow job; use **release** config for CI |
| `get-started-button` testID not found | Check `testID` props exist on all welcome/auth screen buttons |

For CI E2E is now **manual-only** (`workflow_dispatch`). If E2E is blocking a PR merge, verify this workflow is not wired to auto-trigger on push (check `.github/workflows/e2e.yml` `on:` section).

---

### E2E Android (Detox)

**Symptom:** Gradle build OOM during `androidTest` APK compilation.

**Common fixes:**

| Error in log | Fix |
|---|---|
| OOM building `androidTest` APK | `gradle.properties`: `org.gradle.jvmargs=-Xmx4096m` |
| `patch-package` for gesture handler fails | Run `npx patch-package react-native-gesture-handler` and commit the patch file |
| Emulator not booting | Increase `timeout-minutes` to `90` and verify AVD name in `.detoxrc.js` |

---

## Step 3 — Apply fix and verify

After making changes:
```bash
npm run typecheck   # catch TS errors before push
npm run lint        # catch ESLint before push
git add <files>
git commit -m "fix(ci): <root-cause-description>"
git push
```

Then re-run the failing check:
```bash
gh run rerun <RUN_ID> --repo SoleilPhoenix/Game-Over-Initial-Set-Up-2 --failed
```

Monitor with:
```bash
gh run watch <RUN_ID> --repo SoleilPhoenix/Game-Over-Initial-Set-Up-2
```

## Step 4 — Done

Report: which check failed, root cause, fix applied, whether re-run was triggered.
