# Redesign Migration Checklist

Status per screen. "✅" = migrated to editorial primitives + verified against mockup / WCAG AA in both dark & light.

## Phase 0 — Foundation (complete)

- [x] `src/constants/designSystem.ts` — EDITORIAL_DARK, EDITORIAL_LIGHT, RADII, SPACING, FONTS, TYPE_SCALE
- [x] `src/stores/themeStore.ts` — mode persistence
- [x] `src/hooks/useTheme.ts` — resolved-mode accessor
- [x] `src/hooks/useEditorialFonts.ts` — Fraunces + Inter loader
- [x] `app/_layout.tsx` — font gating wired
- [x] `src/components/ui/editorial/` — 8 primitives (EditorialCard, SerifHeading, GoldButton, GoldChip, GoldDivider, GoldIconBadge, MinimalInput, SectionLabel)
- [x] `app/(tabs)/profile/appearance.tsx` — Dark/Light/System toggle
- [x] `docs/PERFORMANCE_BASELINE.md` — static baseline captured

## Phase A — Reference screens (mockup 1:1)

- [ ] `app/event/[id]/index.tsx` — Event Summary (Mockup 0)
- [ ] `app/create-event/index.tsx` — Wizard Step 1 (Mockups 1 & 4)
- [x] `app/event/[id]/participants.tsx` — Manage Invitations (Mockup 5)
- [x] `app/(tabs)/budget/index.tsx` — Budget (Mockup 2)
- [x] `app/notifications/index.tsx` + `app/(tabs)/profile/notifications.tsx` — Notifications (Mockup 3)

**Gate:** User review of 5 screens against PNGs → Go/No-Go for Phase B.

## Phase B — Main tabs

- [ ] `app/(tabs)/events/index.tsx`
- [ ] `app/(tabs)/chat/index.tsx` + `[channelId].tsx`
- [ ] `app/(tabs)/profile/index.tsx`
- [ ] `app/(tabs)/_layout.tsx` — tab-bar restyle

## Phase C — Wizard

- [ ] `app/create-event/preferences.tsx`
- [ ] `app/create-event/participants.tsx`
- [ ] `app/create-event/packages.tsx`
- [ ] `app/create-event/review.tsx`
- [ ] `app/create-event/_layout.tsx` — step indicator
- [ ] `src/components/ui/WizardFooter.tsx` — editorial variant
- [ ] `src/components/ui/GlassPanel.tsx` — editorial variant

**Gate:** User review of wizard flow → Go for Phase D.

## Phase D — Booking flow

- [ ] `app/booking/[eventId]/summary.tsx`
- [ ] `app/booking/[eventId]/payment.tsx`
- [ ] `app/booking/[eventId]/confirmation.tsx`
- [ ] `app/package/[id].tsx`

## Phase E — Auth

- [ ] `app/(auth)/welcome.tsx`
- [ ] `app/(auth)/login.tsx`
- [ ] `app/(auth)/signup.tsx`
- [ ] `app/(auth)/forgot-password.tsx`
- [ ] `SocialButton`, `Input`, `Button` primitives → editorial adapt

## Phase F — Detail screens & profile sub-pages

- [ ] `app/event/[id]/day.tsx`
- [ ] `app/event/[id]/destination.tsx`
- [ ] `app/event/[id]/communication.tsx`
- [ ] `app/event/[id]/share.tsx`
- [ ] `app/event/[id]/budget.tsx`
- [ ] `app/event/[id]/polls.tsx`
- [ ] `app/event/[id]/edit.tsx`
- [ ] `app/(tabs)/profile/edit.tsx`
- [ ] `app/(tabs)/profile/terms.tsx`
- [ ] `app/(tabs)/profile/privacy.tsx`
- [ ] `app/(tabs)/profile/impressum.tsx`
- [ ] `app/(tabs)/profile/support.tsx`
- [ ] `app/(tabs)/profile/wellness.tsx`
- [ ] `app/(tabs)/profile/language.tsx`
- [ ] `app/(tabs)/profile/security.tsx`
- [ ] `app/invite/[code].tsx`
- [ ] `app/index.tsx`

## Verification rules (per screen)

1. Visual parity with PNG mockup (Phase A) or token compliance (B–F).
2. No hard-coded `#5A7EB0` / `#258CF4` / `colors.light.*` — all via `useTheme()`.
3. All `testID` props preserved — Detox flows unchanged.
4. Toggle Dark ↔ Light ↔ System — no unreadable surfaces.
5. Screenshot in both modes into `docs/screenshots/<phase>/<screen>-{dark,light}.png`.

## Global gates

- `npm run typecheck` green
- `npm run lint` green
- `npm test` green
- `grep -rn "#5A7EB0\|#258CF4\|colors\.light\." src/ app/` empty at end of Phase F
- Performance gates per `docs/PERFORMANCE_BASELINE.md` hit
