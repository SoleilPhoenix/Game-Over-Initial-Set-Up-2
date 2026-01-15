# Phases 3-6 Implementation Design

**Date:** 2026-01-12
**Status:** Approved
**Scope:** Event Management, Creation Wizard, Event Details, Package System, E2E Tests

---

## 1. Component Structure

```
src/
├── components/
│   ├── ui/                    # Tamagui primitives
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Chip.tsx
│   │   ├── Skeleton.tsx
│   │   └── index.ts
│   ├── cards/                 # All card components (reusable)
│   │   ├── EventCard.tsx
│   │   ├── PackageCard.tsx
│   │   ├── DestinationCard.tsx
│   │   └── PlanningToolCard.tsx
│   ├── forms/                 # Selection & input components
│   │   ├── PartyTypeSelector.tsx
│   │   ├── CitySelector.tsx
│   │   ├── PreferenceSelector.tsx
│   │   └── DateRangePicker.tsx
│   └── feedback/              # States & indicators
│       ├── EmptyState.tsx
│       ├── ErrorState.tsx
│       └── LoadingSkeleton.tsx
```

---

## 2. Navigation Structure

```
app/
├── (auth)/                         # Auth screens (existing)
│
├── (tabs)/                         # Main app with bottom nav
│   ├── _layout.tsx
│   ├── index.tsx                   # Redirect to events
│   ├── events.tsx                  # My Events Dashboard
│   ├── chat.tsx
│   ├── budget.tsx
│   └── profile.tsx
│
├── event/                          # Event detail stack (NO tabs)
│   ├── [id]/
│   │   ├── index.tsx               # Event Summary
│   │   ├── edit.tsx
│   │   ├── participants.tsx
│   │   ├── destination.tsx
│   │   └── packages.tsx
│
├── create-event/                   # Wizard stack (NO tabs, modal)
│   ├── _layout.tsx                 # Progress bar, close button
│   ├── index.tsx                   # Step 1: Key Details
│   ├── preferences.tsx             # Step 2: Honoree Preferences
│   ├── participants.tsx            # Step 3: Group Preferences
│   ├── packages.tsx                # Step 4: Package Selection
│   └── review.tsx                  # Step 5: Review & Create
│
├── package/
│   └── [id].tsx                    # Package Details
│
├── booking/
│   └── [eventId]/
│       ├── summary.tsx             # Payment Summary
│       ├── payment.tsx             # Stripe Payment
│       └── confirmation.tsx        # Success
│
└── invite/
    └── [code].tsx                  # Deep link handler
```

---

## 3. Tamagui Configuration

Full Tamagui replacement of existing components.

```typescript
// tamagui.config.ts
const tokens = createTokens({
  color: {
    primary: '#258CF4',
    primaryLight: '#5AA5F7',
    primaryDark: '#1A6BC4',
    success: '#47B881',
    warning: '#FF8551',
    error: '#E12D39',
    white: '#FFFFFF',
    black: '#000000',
    gray100: '#F5F7F8',
    gray200: '#E2E8F0',
    gray500: '#64748B',
    gray900: '#1A202C',
  },
  space: { 0: 0, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  size: { buttonHeight: 48, inputHeight: 56, cardMin: 120 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  zIndex: { base: 0, card: 1, modal: 100, toast: 200 },
})

const themes = {
  light: {
    background: '$gray100',
    surface: '$white',
    text: '$gray900',
    textMuted: '$gray500',
    border: '$gray200',
    primary: '$primary',
  },
  dark: {
    background: '#101922',
    surface: '#1B2127',
    text: '#FFFFFF',
    textMuted: '#9CABBA',
    border: '#283039',
    primary: '$primary',
  },
}
```

---

## 4. Data Flow

### State Architecture

- **authStore** (Zustand): User, session, auth state
- **wizardStore** (Zustand + MMKV): Draft event creation
- **uiStore** (Zustand): Toasts, modals, loading
- **React Query**: All server state

### No bookingStore

Use `useBookingFlow()` hook instead - derives pricing from server state.

```typescript
function useBookingFlow(eventId: string) {
  const { data: event } = useEvent(eventId)
  const { data: participants } = useParticipants(eventId)
  const [excludeHonoree, setExcludeHonoree] = useState(true)

  const pricing = useMemo(() => {
    // Calculate from server state
  }, [event, participants, excludeHonoree])

  return { event, participants, pricing, excludeHonoree, setExcludeHonoree }
}
```

### Booking Flow

1. User enters `/booking/[eventId]/summary`
2. Taps "Proceed to Payment"
3. `createBookingAndPaymentIntent()` mutation
4. Server creates booking (pending) + Stripe PaymentIntent
5. Client opens Stripe Payment Sheet
6. On success → navigate to confirmation
7. Webhook updates booking status async

---

## 5. E2E Testing Strategy

### Test Pyramid

- **E2E**: 10-15 critical journeys (happy paths)
- **Integration**: 30+ tests (API + UI, mocked network)
- **Unit**: 100+ tests (functions, hooks)

### Structure

```
e2e/
├── setup/
│   ├── globalSetup.ts
│   ├── testDatabase.ts
│   └── testUsers.ts
├── utils/
│   ├── auth.ts
│   └── navigation.ts
├── screens/                    # Focused tests
│   ├── eventsDashboard.test.ts
│   ├── wizardStep1.test.ts
│   └── ...
├── journeys/                   # Integration tests
│   ├── createEventJourney.test.ts
│   └── bookPackageJourney.test.ts
└── smoke/
    └── appLaunches.test.ts
```

### Key Decisions

- **Stripe**: Mock payment, test up-to and after
- **OAuth**: Test callback handling only
- **Data isolation**: Unique prefix per test file
- **CI**: Parallelized, cached builds, 2 retries

---

## Implementation Order

1. Install & configure Tamagui
2. Replace existing Button/Input with Tamagui
3. Build base UI components (Card, Badge, etc.)
4. Phase 3: Events Dashboard screen
5. Phase 4: Wizard screens (5 steps)
6. Phase 5: Event detail screens
7. Phase 6: Package details + booking flow
8. E2E test infrastructure
9. E2E tests for all phases
