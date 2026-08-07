# Performance Baseline — Game Over Redesign

**Captured:** 2026-04-19
**Branch:** `feature/ui-redesign`
**Baseline commit:** `635ce2c44` (main HEAD at worktree creation)

This document captures the performance characteristics of the app **before** the redesign work starts. All optimisation gates in the plan (`~/.claude/plans/mach-weiter-mit-diesen-parallel-treehouse.md`) are measured against this baseline.

---

## 1. Static Code Metrics

### Codebase Size
| Metric | Value |
|---|---|
| Routes (`app/**/*.tsx`) | 46 |
| Components (`src/components/**/*.tsx`) | 28 |
| Total source files (`src/**`) | 97 |
| `dependencies` | 58 |
| `devDependencies` | 18 |

### Largest Screens (by file size)
| Rank | File | KB |
|---|---|---|
| 1 | `app/(tabs)/budget/index.tsx` | 128 |
| 2 | `app/(tabs)/chat/index.tsx` | 100 |
| 3 | `app/event/[id]/destination.tsx` | 60 |
| 4 | `app/event/[id]/participants.tsx` | 48 |
| 5 | `app/(tabs)/events/index.tsx` | 48 |
| 6 | `app/event/[id]/index.tsx` | 36 |
| 7 | `app/package/[id].tsx` | 28 |
| 8 | `app/booking/[eventId]/payment.tsx` | 28 |

Target after redesign: no screen > 150 KB; split oversized screens into sub-components.

---

## 2. Performance-Relevant Patterns (Migration Targets)

### Image Handling
| Pattern | Files | Target |
|---|---|---|
| `expo-image` usage (via `OptimizedImage` or direct) | 14 | Keep / expand |
| RN built-in `Image` import | 7 | **Migrate all to `expo-image`** |
| Existing `OptimizedImage` component | 1 | Reuse everywhere |
| Existing `KenBurnsImage` component | 1 | Reuse for hero images |

**Migration list (RN Image → expo-image):**
- `src/components/polls/PollCard.tsx`
- `app/event/[id]/share.tsx`
- `app/event/[id]/destination.tsx`
- `app/create-event/packages.tsx`
- `app/booking/[eventId]/summary.tsx`
- `app/_layout.tsx`
- `app/(tabs)/budget/index.tsx`

### List Rendering
| Pattern | Files | Target |
|---|---|---|
| `FlatList` (RN built-in) | 6 | **Migrate to `@shopify/flash-list` (already installed)** |

**Migration list (FlatList → FlashList):**
- `app/(tabs)/events/index.tsx`
- `app/(tabs)/chat/[channelId].tsx`
- `app/(tabs)/budget/index.tsx`
- `app/event/[id]/polls.tsx`
- `app/event/[id]/communication.tsx`
- (1 E2E test file — no migration needed)

### Theme / Color Compliance
| Pattern | Hits | Files |
|---|---|---|
| Hardcoded `#5A7EB0` / `#258CF4` / `colors.light.*` / hex surface colors | 109 | 28 |

Target: **0 hits after Phase F** (outside of token definitions, docs, tests).

---

## 3. Existing Performance Infrastructure

Good news — several performance libraries are **already installed but underused**:

| Library | Version | Status |
|---|---|---|
| `expo-image` | `~3.0.11` | Installed, used in 14 files |
| `@shopify/flash-list` | `^2.0.2` | Installed, **not yet used in app code** |
| `react-native-reanimated` | `~4.1.1` | Installed, used for animations |
| `react-native-mmkv` | (via abstraction) | Installed, gated by execution env |

**Gap analysis:**
- `@shopify/flash-list` is installed but never imported in `app/` or `src/`. Every `FlatList` is a quick win.
- `expo-image` usage is inconsistent — 7 screens still import `Image` from `react-native`.
- No `React.lazy` / dynamic imports yet → all 46 routes bundled eagerly.

---

## 4. Runtime Metrics (To Be Measured on Device)

These require a running dev/prod build and cannot be captured from static analysis:

| Metric | Baseline | Tool | Gate |
|---|---|---|---|
| Cold start (iOS sim) | **TBD** | `expo-perf` / manual stopwatch | ≤ 80 % of baseline after Phase B |
| Cold start (mid-range Android) | **TBD** | Flashlight / `adb shell am start` | ≤ 80 % of baseline after Phase B |
| JS bundle size (iOS, production) | **TBD** | `npx expo export --platform ios` + `du -sh dist` | ≤ 105 % of baseline at final merge (two custom fonts allowed) |
| Events tab scroll FPS (mid-range Android) | **TBD** | React DevTools Profiler / Detox perf | ≥ 58 fps after Phase D |
| Chat channel scroll FPS | **TBD** | same | ≥ 58 fps after Phase D |
| React Query refetch volume (first-minute idle) | **TBD** | Flipper network panel | ≤ current after Phase D |

**Action:** Before starting Phase B, run these measurements on a physical iPhone + mid-range Android and fill in the "Baseline" column.

---

## 5. Known Optimisation Opportunities (identified during audit)

1. **React Query `staleTime` is 30 s globally** (per CLAUDE.md) — many resources rarely change. Tune per-hook to 2–5 min where appropriate, prefetch on navigation intent.
2. **Wizard store persists on every state change** (every 30 s auto-save) — input-level persists might fire per keystroke if not debounced. Audit.
3. **No `React.lazy` / route-level code splitting** — legal pages, wellness, admin rarely visited but always bundled.
4. **Mixed Image usage** — at least 5 files use both `react-native` Image and `expo-image` side by side. Normalize.
5. **`Constants.executionEnvironment` check runs every storage call** — memoize.

---

## 6. Re-measurement Checklist (Pre-Merge)

Before the final merge into `main`, re-run everything in Section 4 and fill in an "After" column. All gates must be green.

```bash
# Bundle size
cd game-over-app
npx expo export --platform ios --output-dir /tmp/export-after
du -sh /tmp/export-after

# Typecheck / lint must stay green
npm run typecheck
npm run lint
npm test

# Grep gate — no legacy color tokens
grep -rn "#5A7EB0\|#258CF4\|colors\.light\." src/ app/ | wc -l  # expect 0
```
