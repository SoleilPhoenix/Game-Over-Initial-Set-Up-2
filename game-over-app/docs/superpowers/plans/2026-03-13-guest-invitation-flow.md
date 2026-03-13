# Guest Invitation Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete guest journey — working invite links via Email/SMS/WhatsApp, a 3-step onboarding wizard, a guest event view, and a contribution reminder system.

**Architecture:** The existing `app/invite/[code].tsx` is rewritten as a multi-step wizard (Preview → Signup → Profile). A new `getPreview()` method on `invitesRepository` fetches invite preview data without auth. Guest role restrictions are applied via a new `isGuest` boolean in event screens. The urgency hook is extended with a guest-specific contribution path.

**Tech Stack:** Expo Router (React Native), Supabase (Edge Functions + RLS), React Query, Zustand, expo-image-picker, Twilio (SMS/WhatsApp), SendGrid (Email)

**Spec:** `docs/superpowers/specs/2026-03-13-guest-invitation-flow-design.md`

---

## Chunk 1: DB Migration + Infrastructure Setup

### Task 1: Add `invited_via` migration

**Files:**
- Create: `supabase/migrations/20260313000000_event_participants_invited_via.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Add invited_via column to event_participants
-- Records how a participant joined (e.g. 'link', 'manual')
ALTER TABLE event_participants
  ADD COLUMN IF NOT EXISTS invited_via TEXT;
```

- [ ] **Step 2: Apply to remote project**

```bash
npx supabase db push
```
Expected: migration runs without error. (This pushes to the project linked in `supabase/config.toml`. If testing locally first, run `npx supabase migration up` against a local instance instead.)

- [ ] **Step 3: Regenerate types**

```bash
npx supabase gen types typescript --project-id stdbvehmjpmqbjyiodqg > src/lib/supabase/types.ts
```
Expected: `invited_via: string | null` appears in `event_participants` Row type

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260313000000_event_participants_invited_via.sql src/lib/supabase/types.ts
git commit -m "feat: add invited_via column to event_participants"
```

---

### Task 2: Configure Supabase Edge Function secrets

**Files:** None (Supabase dashboard / CLI configuration)

- [ ] **Step 1: Set secrets via CLI**

Replace every `<…>` value with real credentials from your SendGrid and Twilio dashboards before running:

```bash
npx supabase secrets set \
  SENDGRID_API_KEY="<your-sendgrid-api-key>" \
  TWILIO_ACCOUNT_SID="<your-twilio-account-sid>" \
  TWILIO_AUTH_TOKEN="<your-twilio-auth-token>" \
  TWILIO_SMS_FROM="GameOver" \
  TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
```
Expected: `Secrets updated.`

- [ ] **Step 2: Deploy the Edge Function**

```bash
npx supabase functions deploy send-guest-invitations
```
Expected: `Function send-guest-invitations deployed.`

- [ ] **Step 3: Smoke-test Email channel**

Replace `<any-valid-event-id>` and `<your-email>` with real values:

```bash
npx supabase functions invoke send-guest-invitations --body '{
  "eventId": "<any-valid-event-id>",
  "channel": "email",
  "guests": [{ "slotIndex": 1, "firstName": "Test", "email": "<your-email>" }]
}'
```
Expected: `{ "sent": 1, "failed": 0, "invalid": 0 }`
Check inbox — invite email should arrive with a working `https://game-over.app/invite/XXXXXXXX` link.

- [ ] **Step 4: Smoke-test WhatsApp Sandbox**

Prerequisite: send `join <sandbox-keyword>` to `+14155238886` on WhatsApp from test device first.

```bash
npx supabase functions invoke send-guest-invitations --body '{
  "eventId": "<any-valid-event-id>",
  "channel": "whatsapp",
  "guests": [{ "slotIndex": 2, "phone": "+49XXXXXXXXXX" }]
}'
```
Expected: `{ "sent": 1, "failed": 0, "invalid": 0 }`
Check WhatsApp — message with invite link should arrive.

- [ ] **Step 5: Smoke-test SMS channel**

```bash
npx supabase functions invoke send-guest-invitations --body '{
  "eventId": "<any-valid-event-id>",
  "channel": "sms",
  "guests": [{ "slotIndex": 3, "phone": "+49XXXXXXXXXX" }]
}'
```
Expected: `{ "sent": 1, "failed": 0, "invalid": 0 }`
Check SMS — text message with invite link should arrive.

- [ ] **Step 6: Commit note**

```bash
git commit --allow-empty -m "chore: edge function secrets configured and smoke-tested"
```

---

## Chunk 2: Public Invite Preview Hook

### Task 3: Add `getPreview` to repository + `usePublicInvitePreview` hook

The existing hooks delegate to `invitesRepository`. We add `getPreview(code)` to the repository (keeps the three-tier pattern intact) and a thin query hook over it.

**Files:**
- Modify: `src/repositories/invites.ts`
- Modify: `src/hooks/queries/useInvites.ts`
- Test: `__tests__/hooks/usePublicInvitePreview.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/usePublicInvitePreview.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePublicInvitePreview } from '@/hooks/queries/useInvites';

// Mock the repository — do not test Supabase internals here
vi.mock('@/repositories/invites', () => ({
  invitesRepository: {
    getPreview: vi.fn(),
  },
}));

const { invitesRepository: mockRepo } = await import('@/repositories/invites');

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('usePublicInvitePreview', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns event preview for a valid code', async () => {
    (mockRepo.getPreview as any).mockResolvedValue({
      eventId: 'evt-1',
      eventName: "Sophie's Bachelorette",
      honoreeName: 'Sophie',
      cityName: 'Hamburg',
      cityId: 'city-1',
      startDate: '2026-03-30T10:00:00Z',
      organizerName: 'Max M.',
      acceptedCount: 8,
      guestEmail: null,
    });

    const { result } = renderHook(() => usePublicInvitePreview('TESTCODE'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.eventName).toBe("Sophie's Bachelorette");
    expect(result.current.data?.organizerName).toBe('Max M.');
    expect(result.current.data?.acceptedCount).toBe(8);
  });

  it('returns null for an expired or not-found code', async () => {
    (mockRepo.getPreview as any).mockResolvedValue(null);

    const { result } = renderHook(() => usePublicInvitePreview('EXPIRED'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/hooks/usePublicInvitePreview.test.ts
```
Expected: FAIL — `getPreview is not a function` (method doesn't exist yet)

- [ ] **Step 3: Add `getPreview` method to `src/repositories/invites.ts`**

Add after the existing `validate()` method:

```typescript
export interface InvitePreview {
  eventId: string;
  eventName: string;
  honoreeName: string;
  cityName: string;
  cityId: string;
  startDate: string;
  organizerName: string;
  acceptedCount: number;
  /** Pre-fill email field in signup step if invite was sent to email */
  guestEmail: string | null;
}

/**
 * Fetch public invite preview — works WITHOUT authentication.
 * Uses the anonymous SELECT policy on invite_codes.
 */
async getPreview(code: string): Promise<InvitePreview | null> {
  const { data, error } = await supabase
    .from('invite_codes')
    .select(`
      event:events (
        id,
        title,
        honoree_name,
        start_date,
        city_id,
        city:cities ( name ),
        created_by_profile:profiles!events_created_by_fkey ( full_name )
      )
    `)
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (error || !data?.event) return null;

  const ev = data.event as any;

  // Count accepted guests
  const { count: acceptedCount } = await supabase
    .from('event_participants')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', ev.id)
    .eq('role', 'guest')
    .not('confirmed_at', 'is', null);

  // Check if invite was sent to an email address (for pre-fill)
  const { data: inviteRecord } = await supabase
    .from('guest_invitations')
    .select('email')
    .eq('invite_code', code)
    .maybeSingle();

  return {
    eventId: ev.id,
    eventName: ev.title || `${ev.honoree_name}'s Party`,
    honoreeName: ev.honoree_name,
    cityName: ev.city?.name ?? '',
    cityId: ev.city_id,
    startDate: ev.start_date,
    organizerName: ev.created_by_profile?.full_name ?? 'The organizer',
    acceptedCount: acceptedCount ?? 0,
    guestEmail: inviteRecord?.email ?? null,
  };
}
```

- [ ] **Step 4: Add `usePublicInvitePreview` hook to `src/hooks/queries/useInvites.ts`**

Add the `InvitePreview` import at the top of the file (it's now exported from the repository):

```typescript
import { invitesRepository, InviteCodeWithEvent, type InvitePreview } from '@/repositories/invites';
```

Then add the hook after the existing `useValidateInvite` export:

```typescript
export type { InvitePreview };

/**
 * Fetch public invite preview — works WITHOUT authentication.
 * Uses anonymous SELECT policy on invite_codes.
 */
export function usePublicInvitePreview(code: string | undefined) {
  return useQuery({
    queryKey: [...inviteKeys.all, 'preview', code ?? ''],
    queryFn: () => invitesRepository.getPreview(code!),
    enabled: !!code,
    staleTime: 30 * 1000,
    retry: false,
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- __tests__/hooks/usePublicInvitePreview.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/repositories/invites.ts src/hooks/queries/useInvites.ts __tests__/hooks/usePublicInvitePreview.test.ts
git commit -m "feat: add getPreview to invitesRepository + usePublicInvitePreview hook"
```

---

## Chunk 3: Guest Onboarding Wizard

### Task 4: Rewrite `app/invite/[code].tsx` as 3-step wizard

**Files:**
- Modify: `app/invite/[code].tsx` (full rewrite)

The wizard manages step via local `useState`. The invite code stays in scope throughout. Steps: `'preview' | 'signup' | 'profile'`.

- [ ] **Step 1: Write the complete new screen**

Replace the entire file with:

```typescript
/**
 * Guest Invite Wizard
 * Step 1: Event Preview (public, no auth required)
 * Step 2: Account Creation (signup)
 * Step 3: Profile Completion (phone + optional photo)
 * → navigates to event on completion
 */
import React, { useState } from 'react';
import {
  View, ScrollView, KeyboardAvoidingView, Platform,
  Pressable, Alert, StyleSheet, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { usePublicInvitePreview, useAcceptInvite } from '@/hooks/queries/useInvites';
import { getPackageImage, resolveImageSource } from '@/constants/packageImages';
import { KenBurnsImage } from '@/components/ui/KenBurnsImage';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DARK_THEME } from '@/constants/theme';
import { CITY_UUID_TO_SLUG } from '@/constants/citySlugMap'; // see note below

// ─── Types ───────────────────────────────────────────────────
type WizardStep = 'preview' | 'signup' | 'profile';

// Note: CITY_UUID_TO_SLUG is defined in app/(tabs)/events/index.tsx and must be
// extracted to src/constants/citySlugMap.ts so the wizard can import it.
// Content: { '550e8400-e29b-41d4-a716-446655440101': 'berlin', ...102: 'hamburg', ...103: 'hannover' }

const signupSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const profileSchema = z.object({
  phone: z.string().min(7, 'Please enter a valid phone number'),
});

type SignupForm = z.infer<typeof signupSchema>;
type ProfileForm = z.infer<typeof profileSchema>;

// ─── Main Component ──────────────────────────────────────────
export default function InviteWizardScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);

  const [step, setStep] = useState<WizardStep>('preview');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: preview, isLoading: previewLoading } = usePublicInvitePreview(code);
  const acceptInvite = useAcceptInvite();

  // ── Step 1 handlers ─────────────────────────────────────────
  const handleAcceptPressed = async () => {
    if (user) {
      // Already authenticated — accept directly
      await doAcceptInvite();
    } else {
      setStep('signup');
    }
  };

  // ── Step 2 handlers ─────────────────────────────────────────
  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    // Pre-fill email if invite was sent to an email address
    defaultValues: {
      firstName: '', lastName: '',
      email: preview?.guestEmail ?? '',
      password: '', confirmPassword: '',
    },
  });

  const handleSignup = async (data: SignupForm) => {
    setIsSubmitting(true);
    try {
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        if (error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('user_already_exists')) {
          signupForm.setError('email', {
            message: 'An account with this email already exists — tap "Log in instead" below',
          });
          return;
        }
        throw error;
      }
      setStep('profile');
    } catch (e: any) {
      Alert.alert('Signup failed', e.message || 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginInstead = () => {
    router.push(`/(auth)/login?redirect=/invite/${code}`);
  };

  // ── Step 3 handlers ─────────────────────────────────────────
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { phone: '' },
  });

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleProfileComplete = async (data: ProfileForm) => {
    setIsSubmitting(true);
    try {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) throw new Error('Not authenticated');

      // Upload avatar if selected
      let avatarUrl: string | null = null;
      if (avatarUri) {
        const ext = avatarUri.split('.').pop() ?? 'jpg';
        const path = `avatars/${currentUser.id}.${ext}`;
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, blob, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      // Save profile fields
      await supabase
        .from('profiles')
        .update({ phone: data.phone, ...(avatarUrl ? { avatar_url: avatarUrl } : {}) })
        .eq('id', currentUser.id);

      await doAcceptInvite();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to complete profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const doAcceptInvite = async () => {
    try {
      const result = await acceptInvite.mutateAsync(code!);
      if (!result.eventId) {
        Alert.alert('Error', result.error || 'Could not join event.');
        return;
      }
      // Pass firstVisit=1 so the contribution card shows on first load
      router.replace(`/event/${result.eventId}?firstVisit=1`);
    } catch {
      Alert.alert('Error', 'Failed to join event. Please try again.');
    }
  };

  // ── Loading ──────────────────────────────────────────────────
  if (previewLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  // ── Invalid invite — granular error states ───────────────────
  // preview is null when invite is not_found, expired, inactive, or max_uses_reached.
  // The repository returns null for all these cases; the user sees a friendly message.
  if (!preview) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center"
        backgroundColor="$background" paddingHorizontal="$6" gap="$4">
        <Ionicons name="link-outline" size={48} color={DARK_THEME.textTertiary} />
        <Text fontSize={18} fontWeight="700" color="$textPrimary" textAlign="center">
          This invite link is no longer valid
        </Text>
        <Text fontSize={14} color="$textTertiary" textAlign="center">
          The link may have expired, already been used, or been revoked. Ask the organizer for a new one.
        </Text>
        <Button onPress={() => router.replace('/(tabs)/events')}>Go to App</Button>
      </YStack>
    );
  }

  // ── Step 1: Event Preview ────────────────────────────────────
  if (step === 'preview') {
    // Resolve hero image using city UUID → slug map then package image
    const citySlug = CITY_UUID_TO_SLUG[preview.cityId] ?? preview.cityName.toLowerCase();
    return (
      <YStack flex={1} backgroundColor="$background">
        <View style={{ height: 280 }}>
          <KenBurnsImage
            source={resolveImageSource(getPackageImage(citySlug, 'classic'))}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['transparent', DARK_THEME.background]}
            style={[StyleSheet.absoluteFillObject, { top: '40%' }]}
          />
          <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
            <Text fontSize={26} fontWeight="900" color="white">{preview.eventName}</Text>
            <Text fontSize={15} color="rgba(255,255,255,0.8)" marginTop={4}>
              {new Date(preview.startDate).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })} · {preview.cityName}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 16 }}>
          <YStack gap="$4">
            <YStack gap="$2">
              <XStack gap="$2" alignItems="center">
                <Ionicons name="person-circle-outline" size={18} color={DARK_THEME.textTertiary} />
                <Text fontSize={14} color="$textTertiary">
                  Invited by <Text fontWeight="700" color="$textPrimary">{preview.organizerName}</Text>
                </Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <Ionicons name="people-outline" size={18} color={DARK_THEME.textTertiary} />
                <Text fontSize={14} color="$textTertiary">
                  <Text fontWeight="700" color="$textPrimary">{preview.acceptedCount}</Text> guests already in
                </Text>
              </XStack>
            </YStack>

            <Button onPress={handleAcceptPressed} testID="accept-invite-button">
              Accept Invitation →
            </Button>

            <Pressable onPress={() => router.back()} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text fontSize={13} color="$textTertiary">Decline</Text>
            </Pressable>
          </YStack>
        </ScrollView>
      </YStack>
    );
  }

  // ── Step 2: Account Creation ──────────────────────────────────
  if (step === 'signup') {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
          <XStack paddingHorizontal="$5" paddingVertical="$3" alignItems="center" gap="$3">
            <Pressable onPress={() => setStep('preview')}>
              <Ionicons name="arrow-back" size={24} color={DARK_THEME.textPrimary} />
            </Pressable>
            <YStack flex={1}>
              <Text fontSize={11} color="$textTertiary">Joining: {preview.eventName}</Text>
              <Text fontSize={16} fontWeight="700" color="$textPrimary">Create your account</Text>
            </YStack>
          </XStack>

          <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
            <XStack gap="$3">
              <View style={{ flex: 1 }}>
                <Controller
                  control={signupForm.control}
                  name="firstName"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      label="First Name"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                      error={signupForm.formState.errors.firstName?.message}
                      testID="signup-firstname"
                    />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={signupForm.control}
                  name="lastName"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      label="Last Name"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                      error={signupForm.formState.errors.lastName?.message}
                      testID="signup-lastname"
                    />
                  )}
                />
              </View>
            </XStack>
            <Controller
              control={signupForm.control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={signupForm.formState.errors.email?.message}
                  testID="signup-email"
                />
              )}
            />
            {signupForm.formState.errors.email?.message?.includes('Log in instead') && (
              <Pressable onPress={handleLoginInstead}>
                <Text fontSize={13} color={DARK_THEME.primary} textDecorationLine="underline">
                  Log in instead →
                </Text>
              </Pressable>
            )}
            <Controller
              control={signupForm.control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  error={signupForm.formState.errors.password?.message}
                  testID="signup-password"
                />
              )}
            />
            <Controller
              control={signupForm.control}
              name="confirmPassword"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Confirm Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  error={signupForm.formState.errors.confirmPassword?.message}
                  testID="signup-confirm-password"
                />
              )}
            />
            <Button
              onPress={signupForm.handleSubmit(handleSignup)}
              loading={isSubmitting}
              testID="signup-submit-button"
              marginTop="$2"
            >
              Create Account →
            </Button>
          </ScrollView>
        </YStack>
      </KeyboardAvoidingView>
    );
  }

  // ── Step 3: Profile Completion ────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
        <XStack paddingHorizontal="$5" paddingVertical="$3" alignItems="center" gap="$3">
          <Pressable onPress={() => setStep('signup')}>
            <Ionicons name="arrow-back" size={24} color={DARK_THEME.textPrimary} />
          </Pressable>
          <YStack flex={1}>
            <Text fontSize={11} color="$textTertiary">Almost there</Text>
            <Text fontSize={16} fontWeight="700" color="$textPrimary">Complete your profile</Text>
          </YStack>
        </XStack>

        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
          {/* Avatar picker */}
          <YStack alignItems="center" gap="$3">
            <Pressable onPress={handlePickPhoto} testID="profile-photo-picker">
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: 88, height: 88, borderRadius: 44 }} />
              ) : (
                <View style={{
                  width: 88, height: 88, borderRadius: 44,
                  backgroundColor: DARK_THEME.surfaceCard,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: DARK_THEME.glassBorder,
                }}>
                  <Ionicons name="camera-outline" size={28} color={DARK_THEME.textTertiary} />
                </View>
              )}
            </Pressable>
            <Text fontSize={13} color="$textTertiary">Profile photo (optional)</Text>
          </YStack>

          <Controller
            control={profileForm.control}
            name="phone"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Phone Number"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                placeholder="+49 151 1234567"
                error={profileForm.formState.errors.phone?.message}
                testID="profile-phone"
              />
            )}
          />

          <Button
            onPress={profileForm.handleSubmit(handleProfileComplete)}
            loading={isSubmitting}
            testID="profile-continue-button"
          >
            Continue →
          </Button>

          <Pressable
            onPress={() => doAcceptInvite()}
            style={{ alignItems: 'center', paddingVertical: 8 }}
            testID="skip-photo-button"
          >
            <Text fontSize={13} color="$textTertiary">Skip photo →</Text>
          </Pressable>
        </ScrollView>
      </YStack>
    </KeyboardAvoidingView>
  );
}
```

**Also create `src/constants/citySlugMap.ts`** (extract from events screen to avoid duplication):

```typescript
/** Maps city UUIDs to city slugs for image lookup */
export const CITY_UUID_TO_SLUG: Record<string, string> = {
  '550e8400-e29b-41d4-a716-446655440101': 'berlin',
  '550e8400-e29b-41d4-a716-446655440102': 'hamburg',
  '550e8400-e29b-41d4-a716-446655440103': 'hannover',
};
```

Then update `app/(tabs)/events/index.tsx` to import from this shared constant instead of defining it locally:
```typescript
// Replace the inline CITY_UUID_TO_SLUG definition with:
import { CITY_UUID_TO_SLUG } from '@/constants/citySlugMap';
```

- [ ] **Step 2: Run type-check**

```bash
npm run typecheck 2>&1 | grep "invite\|citySlugMap"
```
Expected: no errors for `app/invite/[code].tsx` or `src/constants/citySlugMap.ts`

- [ ] **Step 3: Run the app and test the wizard manually**

```bash
npm start
```
- Open invite link on simulator: `gameover://invite/TESTCODE` (or via Expo deeplink)
- Verify: Step 1 preview loads without auth — shows event name, organizer, guest count
- Verify: "Accept Invitation" → Step 2 shows First Name + Last Name fields
- Verify: Email pre-filled if `preview.guestEmail` is set
- Verify: Existing email → inline error + "Log in instead →" link
- Verify: Step 2 "Create Account →" → Step 3 profile form
- Verify: "Skip photo →" on Step 3 goes directly to event with `?firstVisit=1`
- Verify: Authenticated user on Step 1 → "Accept Invitation" goes directly to event

- [ ] **Step 4: Commit**

```bash
git add app/invite/\[code\].tsx src/constants/citySlugMap.ts app/\(tabs\)/events/index.tsx
git commit -m "feat: rewrite invite screen as 3-step guest onboarding wizard"
```

---

## Chunk 4: Guest Event View

### Task 5: Hide organizer-only UI from guests

**Files:**
- Modify: `app/event/[id]/index.tsx`
- Modify: `app/event/[id]/participants.tsx`

- [ ] **Step 1: Derive `isGuest` in event screen**

In `app/event/[id]/index.tsx`:

1. Add `useAuthStore` import (not currently imported in this file):
```typescript
import { useAuthStore } from '@/stores/authStore';
```

2. After the `const { data: participants } = useParticipants(id);` line, add:
```typescript
const currentUserId = useAuthStore(s => s.user?.id);
const currentParticipant = participants?.find(p => p.user_id === currentUserId);
const isGuest = currentParticipant?.role === 'guest';
```

- [ ] **Step 2: Hide the three organizer-only items**

In `app/event/[id]/index.tsx`, wrap each of the following:

**a) Edit button** (search for `testID="edit-button"` around line 246–252):
```typescript
// Before:
<Pressable onPress={() => router.push(`/event/${id}/edit`)} hitSlop={8} testID="edit-button">
  <Ionicons name="create-outline" size={22} color="#FFFFFF" />
</Pressable>

// After:
{!isGuest && (
  <Pressable onPress={() => router.push(`/event/${id}/edit`)} hitSlop={8} testID="edit-button">
    <Ionicons name="create-outline" size={22} color="#FFFFFF" />
  </Pressable>
)}
{isGuest && <View style={{ width: 22 }} />}
```
(The empty View preserves the header layout balance for guests.)

**b) Invitations tool card** — in the `TOOL_CONFIGS.map(...)` render (around line 320):
```typescript
// Before:
{TOOL_CONFIGS.map((tool) => {

// After:
{TOOL_CONFIGS.filter(tool => !isGuest || tool.key !== 'invitations').map((tool) => {
```

**c) Booking Reference** — the `ShareEventBanner` contains the invite + share feature. For guests, hide only the booking reference display if it exists, not the banner. If the booking reference is displayed somewhere with `booking?.reference_number` or text starting with `GO-`, wrap that node in `{!isGuest && (...)}`. (Search the file for `reference_number` to confirm.)

- [ ] **Step 3: Hide invite-sending UI in participants screen**

In `app/event/[id]/participants.tsx`:

1. `useUser` is already imported (line 57). Add after the `const user = useUser()` call:
```typescript
const { data: participants } = useParticipants(id);
const currentParticipant = participants?.find(p => p.user_id === user?.id);
const isGuest = currentParticipant?.role === 'guest';
```
(Note: `useParticipants` is already imported in this file. Check that `id` is available from `useLocalSearchParams`.)

2. The participants screen shows guest contact fields + send buttons. Find the "Send invitations" button or section and wrap it:
```typescript
{!isGuest && (
  // ... send invitations UI ...
)}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck 2>&1 | grep -E "event/\[id\]"
```
Expected: no new errors

- [ ] **Step 5: Commit**

```bash
git add app/event/\[id\]/index.tsx app/event/\[id\]/participants.tsx
git commit -m "feat: hide organizer-only UI elements from guest role"
```

---

### Task 6: Add "Guest" badge to event cards + first-time contribution card

**Files:**
- Modify: `app/(tabs)/events/index.tsx`
- Modify: `app/event/[id]/index.tsx`

- [ ] **Step 1: Add Guest badge to event list cards**

In `app/(tabs)/events/index.tsx`, `getUserRole()` already exists (line 384) and returns `'guest'` when `event.created_by !== user?.id`. The `'attending'` filter tab already shows only guest events. Add a "Guest" badge to event cards rendered in the `'attending'` tab:

Find where event cards are rendered (inside the `FlatList` `renderItem` or wherever `filteredEvents` items are mapped). Add:

```typescript
{activeFilter === 'attending' && (
  <View style={{
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(90,126,176,0.85)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    zIndex: 1,
  }}>
    <Text style={{ fontSize: 11, color: 'white', fontWeight: '600' }}>Guest</Text>
  </View>
)}
```

- [ ] **Step 2: Add first-time contribution card modal**

In `app/event/[id]/index.tsx`, add after the existing imports:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal } from 'react-native';
```

Then add state and effect (after the existing `useEffect` for `id`):

```typescript
const { firstVisit } = useLocalSearchParams<{ id: string; firstVisit?: string }>();
const [showContributionCard, setShowContributionCard] = useState(false);
const [contributionCents, setContributionCents] = useState(0);

useEffect(() => {
  if (!isGuest || !firstVisit || !currentUserId || !id) return;
  const key = `gameover:contribution_seen:${id}:${currentUserId}`;
  AsyncStorage.getItem(key).then(seen => {
    if (!seen) setShowContributionCard(true);
  });
  // Compute contribution amount
  loadBudgetInfo(id).then(info => {
    if (info?.totalCents && info?.payingCount) {
      setContributionCents(Math.ceil(info.totalCents / info.payingCount));
    } else if (booking?.total_amount_cents && participants?.length) {
      setContributionCents(Math.ceil(booking.total_amount_cents / participants.length));
    }
  });
}, [isGuest, firstVisit, currentUserId, id, booking, participants]);

const handleDismissContributionCard = async () => {
  const key = `gameover:contribution_seen:${id}:${currentUserId}`;
  await AsyncStorage.setItem(key, '1');
  setShowContributionCard(false);
};
```

Add the Modal JSX before the closing `</View>` of the main container:

```typescript
<Modal
  visible={showContributionCard}
  transparent
  animationType="fade"
  onRequestClose={handleDismissContributionCard}
>
  <View style={{
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  }}>
    <View style={{
      backgroundColor: DARK_THEME.surfaceCard, borderRadius: 20,
      padding: 24, width: '100%',
      borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)',
    }}>
      <Text style={{ fontSize: 20 }}>💰</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: 'white', marginTop: 8 }}>
        Your Contribution
      </Text>
      {contributionCents > 0 && (
        <Text style={{ fontSize: 32, fontWeight: '900', color: DARK_THEME.primary, marginTop: 4 }}>
          €{Math.round(contributionCents / 100)}
        </Text>
      )}
      <Text style={{ fontSize: 13, color: DARK_THEME.textTertiary, marginTop: 8, lineHeight: 20 }}>
        Please transfer this amount to{' '}
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {event?.profiles?.full_name ?? 'the organizer'}
        </Text>
        . Your share is due 14 days before the event.
      </Text>
      <Pressable
        onPress={handleDismissContributionCard}
        style={{
          marginTop: 20, backgroundColor: DARK_THEME.primary,
          borderRadius: 12, paddingVertical: 14, alignItems: 'center',
        }}
        testID="contribution-card-dismiss"
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Got it</Text>
      </Pressable>
    </View>
  </View>
</Modal>
```

Note: `loadBudgetInfo` is already imported in this file (line 31). `DARK_THEME` is already imported. `booking` and `participants` are already in scope.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck 2>&1 | grep -E "events/index|event/\[id\]/index"
```
Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add app/\(tabs\)/events/index.tsx app/event/\[id\]/index.tsx
git commit -m "feat: guest badge on event cards + first-time contribution card"
```

---

## Chunk 5: Urgency Hook — Guest Contribution Path

### Task 7: Extend `useUrgentPayment` for guests

**Files:**
- Modify: `src/hooks/useUrgentPayment.ts`
- Modify: `__tests__/hooks/useUrgentPayment.test.ts` (extend or create)

- [ ] **Step 1: Read the current hook to understand the shape**

Read `src/hooks/useUrgentPayment.ts`. Key facts already known:
- `daysUntil(startDate)` is a file-local helper — reuse it for guest path
- Returns `{ urgentEvent, urgentEvents, hasUnseenUrgency, markUrgencySeen }`
- `urgentEvent` is the most urgent *organizer-path* unpaid event (filtered by `budget_info` cache)
- Guest events won't have `budget_info` cache — their paid status comes from `event_participants.payment_status`

- [ ] **Step 2: Write a failing test for the guest path**

Create or extend `__tests__/hooks/useUrgentPayment.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useEvents to return controlled data
vi.mock('@/hooks/queries/useEvents', () => ({
  useEvents: vi.fn(),
}));

// Mock participantCountCache (getAllBudgetInfos returns empty for guests)
vi.mock('@/lib/participantCountCache', () => ({
  getAllBudgetInfos: vi.fn(() => ({})),
}));

const { useEvents: mockUseEvents } = await import('@/hooks/queries/useEvents');
import { useUrgentPayment } from '@/hooks/useUrgentPayment';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage is already mocked globally in __tests__/setup.ts

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

// Create an event 13 days from now
function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

describe('guest contribution urgency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AsyncStorage.getItem as any).mockResolvedValue(null);
  });

  it('returns isGuestContribution=true for a guest with pending payment ≤14 days', async () => {
    (mockUseEvents as any).mockReturnValue({
      data: [{
        id: 'evt-guest',
        status: 'booked',
        start_date: futureDate(13),
        title: "Sophie's Bachelorette",
        created_by: 'other-user',
        event_participants: [
          { user_id: 'current-user', role: 'guest', payment_status: 'pending' },
        ],
      }],
    });

    vi.mock('@/stores/authStore', () => ({
      useAuthStore: vi.fn(selector => selector({ user: { id: 'current-user' } })),
    }));

    const { result } = renderHook(() => useUrgentPayment(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.guestUrgentEvent).not.toBeNull());
    expect(result.current.isGuestContribution).toBe(true);
  });

  it('does not flag urgency when guest payment_status is paid', async () => {
    (mockUseEvents as any).mockReturnValue({
      data: [{
        id: 'evt-guest-paid',
        status: 'booked',
        start_date: futureDate(5),
        created_by: 'other-user',
        event_participants: [
          { user_id: 'current-user', role: 'guest', payment_status: 'paid' },
        ],
      }],
    });

    const { result } = renderHook(() => useUrgentPayment(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.guestUrgentEvent).toBeNull());
    expect(result.current.isGuestContribution).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- __tests__/hooks/useUrgentPayment.test.ts
```
Expected: FAIL — `guestUrgentEvent` and `isGuestContribution` properties do not exist

- [ ] **Step 4: Extend the hook**

In `src/hooks/useUrgentPayment.ts`:

1. Add `useAuthStore` import at the top:
```typescript
import { useAuthStore } from '@/stores/authStore';
```

2. Inside `useUrgentPayment()`, after the existing `urgentEvent` memo, add the guest path. Use the existing `daysUntil` helper:

```typescript
const currentUserId = useAuthStore(s => s.user?.id);

// Guest urgency path: driven by event_participants.payment_status (no budget cache needed)
const guestUrgentEvent = useMemo(() => {
  if (!currentUserId) return null;
  return (events ?? []).find(event => {
    const participant = event.event_participants?.find(
      (p: any) => p.user_id === currentUserId
    );
    if (participant?.role !== 'guest') return false;
    if (participant?.payment_status === 'paid') return false;
    const days = daysUntil(event.start_date);
    return days !== null && days <= 14;
  }) ?? null;
}, [events, currentUserId]);

const isGuestContribution = guestUrgentEvent !== null;

const guestDaysLeft = guestUrgentEvent
  ? (daysUntil(guestUrgentEvent.start_date) ?? 0)
  : 0;
```

3. Update the return statement to expose the new fields:
```typescript
return {
  urgentEvent,
  urgentEvents,
  hasUnseenUrgency,
  markUrgencySeen,
  guestUrgentEvent,
  isGuestContribution,
  guestDaysLeft,
};
```

- [ ] **Step 5: Update bell-tap handlers for guest path**

The bell-tap handler lives in `app/(tabs)/events/index.tsx` (`handleNotifications`, line 379) and in `app/(tabs)/chat/index.tsx` (similar pattern). Update both files:

```typescript
// Destructure the new fields:
const { hasUnseenUrgency, markUrgencySeen, isGuestContribution, guestUrgentEvent, guestDaysLeft } = useUrgentPayment();

// In the bell-tap handler:
const handleNotifications = () => {
  markUrgencySeen();
  if (isGuestContribution && guestUrgentEvent) {
    Alert.alert(
      'Contribution Due',
      `Your share for ${guestUrgentEvent.title} is due in ${guestDaysLeft} days.\nPlease transfer your contribution to the organizer.`,
      [{ text: 'OK' }]
    );
  } else {
    router.push('/notifications');
  }
};
```

- [ ] **Step 6: Run tests**

```bash
npm test -- __tests__/hooks/useUrgentPayment.test.ts
```
Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useUrgentPayment.ts __tests__/hooks/useUrgentPayment.test.ts app/\(tabs\)/events/index.tsx app/\(tabs\)/chat/index.tsx
git commit -m "feat: extend urgency hook with guest contribution reminder path"
```

---

## Final Verification

- [ ] **Full test suite**

```bash
npm test
```
Expected: all existing tests pass, new tests pass

- [ ] **Type check**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **End-to-end smoke test**

1. As organizer: go to Manage Invitations, enter guest email, tap Send (Email channel)
2. Open email inbox — invite email arrives with working link
3. Tap link — app opens to Step 1 (Event Preview) without login
4. Verify email pre-filled in Step 2 signup form
5. Tap "Accept Invitation" → Step 2 signup (First Name, Last Name, Email, Password)
6. Fill in name/email/password → Step 3 profile
7. Enter phone, optionally add photo → "Continue"
8. Lands on event — contribution card modal appears
9. Dismiss → event screen shows: no edit button, no "Manage Invitations" card, "Guest" badge visible on events list
10. Navigate to Events tab "Attending" — event shows "Guest" badge
11. Simulate event date ≤14 days: update `start_date` directly in Supabase dashboard to today + 13 days
12. Bell dot appears on tabs → tap → guest contribution Alert fires (no navigation to Budget)

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: complete guest invitation flow — wizard, guest view, contribution reminder"
```
