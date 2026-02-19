# Unit Test Strategy — Game Over App

**Date:** 2026-02-19
**Goals:** A — Regression Safety, C — Bug Detection, D — CI/CD Pipeline (GitHub Actions)
**Approach:** Risk-first (Pricing → i18n → Cross-Segment → Stores → Repositories)
**Constraint:** Zero changes to app source code — all tests are additive only.

---

## Current State

- **Test runner:** Vitest + jsdom (already configured in `vitest.config.ts`)
- **Global mocks:** `__tests__/setup.ts` — RN, Expo, Supabase, MMKV, AsyncStorage all mocked
- **Existing tests:**
  - `__tests__/unit/utils/packageMatching.test.ts`
  - `__tests__/unit/stores/wizardStore.test.ts`
- **E2E tests:** Detox in `e2e/` — separate, requires native build, not part of this strategy

---

## File Structure (all new files — nothing modified)

```
__tests__/
  setup.ts                          ← unchanged
  utils/testUtils.tsx               ← unchanged
  unit/
    utils/
      packageMatching.test.ts       ← exists
      pricing.test.ts               ← NEW
      phoneFormat.test.ts           ← NEW
      emailSuggestions.test.ts      ← NEW
    i18n/
      completeness.test.ts          ← NEW
      interpolation.test.ts         ← NEW
    stores/
      wizardStore.test.ts           ← exists (extend)
      languageStore.test.ts         ← NEW
      favoritesStore.test.ts        ← NEW
    repositories/
      events.test.ts                ← NEW
      bookings.test.ts              ← NEW
    integration/
      wizardToBooking.test.ts       ← NEW
      bookingFlow.test.ts           ← NEW

.github/
  workflows/
    unit-tests.yml                  ← NEW (GitHub Actions CI)
```

---

## Implementation Order (Risk-first)

### Phase 1 — Pure Logic (Day 1, highest ROI)
**`pricing.test.ts`** — No mocking needed, pure calculations:
- Package base price = `price_per_person_cents × totalParticipants`
- Cost per person changes when honoree excluded: `total / payingCount`
- Deposit = 25% of total
- Service fee = 10% of package base
- Fallback pricing: S=€99pp, M=€149pp, L=€199pp
- Edge cases: 0 participants, honoree excluded with 1 remaining payer

**`phoneFormat.test.ts`** — `formatGermanPhone()`:
- `"015712345678"` → `"0157-12345678"`
- `"0157"` → `"0157"` (no dash yet, prefix not complete)
- Non-mobile number `"030123456"` → no dash applied
- Input with existing dashes/spaces stripped correctly
- Max 15 digits enforced

**`emailSuggestions.test.ts`** — `getEmailSuggestions()`:
- `"user@"` → returns top 5 common domains
- `"user@gm"` → returns `["gmail.com", "gmx.de"]`
- `"user@web"` → returns `["web.de"]`
- `"user"` (no @) → returns `[]`
- Case insensitive: `"user@GM"` → `["gmail.com", "gmx.de"]`

---

### Phase 2 — i18n Completeness (Day 2)
**`completeness.test.ts`** — Every key in `en.ts` must exist in `de.ts`:
- Deep diff of all translation keys
- Test fails with list of missing keys if any key is absent in German
- Also checks reverse: no extra keys in DE that don't exist in EN

**`interpolation.test.ts`** — Every `{{placeholder}}` in EN exists in DE:
- Scans all string values for `{{...}}` patterns
- Verifies the same placeholders appear in the corresponding DE value
- Catches: `{{name}}` in EN but `{{Name}}` (wrong case) in DE
- Catches: placeholder present in EN but missing entirely in DE

---

### Phase 3 — Cross-Segment Integration (Day 3)
**`wizardToBooking.test.ts`** — Wizard state → `getEventData()` produces correct DB structure:
- `honoreeName` + `honoreeLastName` → `honoree_name` is full name
- Event `title` uses first name only: `"Sven's Bachelor"` not `"Sven Ostermann's Bachelor"`
- `partyType: 'bachelor'` → title contains "Bachelor"
- `partyType: 'bachelorette'` → title contains "Bachelorette"
- `cityId` is passed through unchanged
- `EnergyLevel 'extreme'` maps to `'high_energy'` in preferences
- Empty `honoreeLastName` → `honoree_name` = first name only (no trailing space)

**`bookingFlow.test.ts`** — `useBookingFlow` hook + URL param bridging:
- `participantCountOverride` takes precedence over DB count
- Fallback package lookup by slug when DB returns null
- `price_per_person_cents` used when `base_price_cents` absent
- Correct package found for each city slug (berlin-classic, hamburg-classic, etc.)

---

### Phase 4 — Store Logic (Day 4)
**`languageStore.test.ts`**:
- Default language is `'de'` (or `'en'` depending on device)
- `setLanguage('en')` updates state
- Persists to AsyncStorage on change
- `getTranslation()` returns correct language object after switch

**`favoritesStore.test.ts`**:
- `addFavorite(id)` adds to favorites list
- `removeFavorite(id)` removes from list
- `isFavorite(id)` returns correct boolean
- Persists correctly to AsyncStorage
- Toggle behavior: add → remove → add cycles

---

### Phase 5 — Repository Layer (Day 5)
**`events.test.ts`** — Verifies Supabase query structure:
- `createEvent()` generates UUID client-side (does NOT use `.select()` after insert)
- `getEventData()` does NOT include `participant_count` field (doesn't exist in DB)
- `updateEventStatus()` calls correct table + column
- Error handling: RLS error (42P17) is caught, not rethrown

**`bookings.test.ts`**:
- `getBooking(eventId)` queries correct table
- Returns null gracefully when no booking found
- `updatePaymentStatus()` is non-blocking on RLS errors

---

### Phase 6 — GitHub Actions CI
**`.github/workflows/unit-tests.yml`**:
```yaml
name: Unit Tests
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --reporter=verbose
      - run: npm run typecheck
```
- Runs on every push to `main` and every PR
- TypeScript check included (catches type errors before they reach the app)
- No native build required (jsdom only)
- Target: < 30 seconds total run time

---

## Key Mocking Patterns (already in setup.ts)

All infrastructure is already mocked — tests can import app code directly:
```ts
// Storage
import AsyncStorage from '@react-native-async-storage/async-storage';
// AsyncStorage.getItem is already vi.fn() — just set return values per test

// Supabase
import { supabase } from '@/lib/supabase/client';
// supabase.from().select()... is already vi.fn().mockReturnThis()

// Storage abstraction
import { createSyncStorage } from '@/lib/storage';
// Uses mocked MMKV/AsyncStorage automatically
```

For stores, reset state between tests:
```ts
beforeEach(() => {
  useWizardStore.getState().resetDraft();
});
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Test run time | < 30s |
| Coverage (src/utils, src/stores, src/i18n) | > 80% |
| CI green on every push to main | Required |
| Zero false positives | All tests deterministic, no flakiness |
| App code unchanged | Verified by `git diff src/` = empty after adding tests |
