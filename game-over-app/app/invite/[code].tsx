/**
 * Guest Invite Wizard
 * Step 1: Event Preview (public, no auth required)
 * Step 2: Account Creation (signup)
 * Step 3: Profile Completion (phone + optional photo)
 * → navigates to event on completion
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, ScrollView, KeyboardAvoidingView, Platform,
  Pressable, Alert, StyleSheet, Image, Linking,
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
import type { Json } from '@/lib/supabase/types';
import { normalizePhoneKey } from '@/utils/guestDisplay';
import { formatGuestChanges, type GuestDataChange } from '@/utils/guestDataChange';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { useTranslation } from '@/i18n';
import { usePublicInvitePreview, useAcceptInvite } from '@/hooks/queries/useInvites';
import { getPackageImage, resolveImageSource } from '@/constants/packageImages';
import { CITY_UUID_TO_SLUG } from '@/constants/citySlugMap';
import { KenBurnsImage } from '@/components/ui/KenBurnsImage';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

// ─── Types ───────────────────────────────────────────────────
type WizardStep = 'preview' | 'signup' | 'profile';

type SignupForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};
type ProfileForm = { phone?: string };

// ─── Main Component ──────────────────────────────────────────
export default function InviteWizardScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const language = useLanguageStore(s => s.language);
  const { t } = useTranslation();

  // Schemas are built inside the component so validation messages are localized.
  const signupSchema = useMemo(() => z.object({
    firstName: z.string().min(1, t.invite.valRequired),
    lastName: z.string().min(1, t.invite.valRequired),
    email: z.string().email(t.invite.valInvalidEmail),
    password: z.string()
      .min(8, t.invite.valPasswordMin)
      .regex(/[A-Z]/, t.invite.valPasswordUpper)
      .regex(/[a-z]/, t.invite.valPasswordLower)
      .regex(/[0-9]/, t.invite.valPasswordNumber),
    confirmPassword: z.string(),
  }).refine(d => d.password === d.confirmPassword, {
    message: t.invite.valPasswordsNoMatch,
    path: ['confirmPassword'],
  }), [t]);

  const profileSchema = useMemo(() => z.object({
    phone: z.string().min(7, t.invite.valPhoneInvalid).optional().or(z.literal('')),
  }), [t]);

  const [step, setStep] = useState<WizardStep>('preview');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupCompleted, setSignupCompleted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const { data: preview, isLoading: previewLoading } = usePublicInvitePreview(code);
  const acceptInvite = useAcceptInvite();

  // ── Core accept handler (defined first — used by steps 1 and 3) ──
  const isAcceptingRef = useRef(false);

  const doAcceptInvite = useCallback(async (phone?: string, avatarUrl?: string) => {
    if (isAcceptingRef.current) return;
    isAcceptingRef.current = true;
    setIsAccepting(true);
    try {
      // Get fresh session from Supabase directly (auth store may lag after signUp)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert(t.invite.errorTitle, t.invite.authFailed);
        return;
      }

      // Save profile data — phone and avatar_url in separate calls so one cannot block the other
      if (phone) {
        const { error } = await supabase
          .from('profiles')
          .update({ phone })
          .eq('id', currentUser.id);
        if (error) console.warn('Phone update failed:', error.message);
      }

      if (avatarUrl) {
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', currentUser.id);
        if (error) console.warn('Avatar update failed:', error.message);

        // Sync into user_metadata so auth store picks it up immediately via USER_UPDATED event
        await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } }).catch(() => {});
      }

      try {
        const result = await acceptInvite.mutateAsync({ code: code!, userId: currentUser.id });
        if (!result.eventId) {
          Alert.alert(t.invite.errorTitle, result.error || t.invite.couldNotJoin);
          return;
        }

        // Notify organizer (non-blocking). Only on a genuine first join — when the
        // guest re-opens the link, accept() returns an `error` string, and we must
        // not re-fire notifications.
        if (!result.error) {
          const joinedEventId = result.eventId;
          void (async () => {
            try {
              const { data: eventData } = await supabase
                .from('events')
                .select('created_by')
                .eq('id', joinedEventId)
                .single();
              if (!eventData?.created_by) return;

              const guestFullName = currentUser.user_metadata?.full_name || currentUser.email || 'A guest';
              await supabase.from('notifications').insert({
                event_id: joinedEventId,
                title: 'Guest Joined',
                body: `${guestFullName} has joined your event.`,
                type: 'guest_joined',
                user_id: eventData.created_by,
              });

              // Detect any divergence from what the organizer originally entered.
              const organizerName = [preview?.guestFirstName, preview?.guestLastName]
                .filter(Boolean).join(' ').trim();
              const selfName = currentUser.user_metadata?.full_name || '';
              const selfEmail = currentUser.email || '';
              const changes: GuestDataChange[] = [];
              if (organizerName && selfName && organizerName.toLowerCase() !== selfName.toLowerCase()) {
                changes.push({ field: 'name', from: organizerName, to: selfName });
              }
              const organizerEmail = preview?.guestEmail || '';
              if (organizerEmail && selfEmail && organizerEmail.toLowerCase() !== selfEmail.toLowerCase()) {
                changes.push({ field: 'email', from: organizerEmail, to: selfEmail });
              }
              const organizerPhone = preview?.guestPhone || '';
              const selfPhone = phone || '';
              if (organizerPhone && selfPhone && normalizePhoneKey(organizerPhone) !== normalizePhoneKey(selfPhone)) {
                changes.push({ field: 'phone', from: organizerPhone, to: selfPhone });
              }

              if (changes.length > 0) {
                const changesText = formatGuestChanges(changes, {
                  name: t.notifications.fieldName,
                  email: t.notifications.fieldEmail,
                  phone: t.notifications.fieldPhone,
                });
                await supabase.from('notifications').insert({
                  event_id: joinedEventId,
                  type: 'guest_data_changed',
                  user_id: eventData.created_by,
                  // Fallback text (guest's language) — NotificationItem re-renders it
                  // in the organizer's language from `metadata`.
                  title: t.notifications.guestDataChangedTitle,
                  body: t.notifications.guestDataChangedBody
                    .replace('{{guest}}', selfName || selfEmail)
                    .replace('{{changes}}', changesText),
                  action_url: `/event/${joinedEventId}/participants`,
                  metadata: ({ guestName: selfName || selfEmail, changes } as unknown) as Json,
                });
              }
            } catch {
              // Non-blocking — ignore notification errors
            }
          })();
        }

        router.replace(`/event/${result.eventId}?firstVisit=1`);
      } catch {
        Alert.alert(t.invite.errorTitle, t.invite.joinFailed);
      }
    } finally {
      isAcceptingRef.current = false;
      setIsAccepting(false);
    }
  }, [acceptInvite, code, router, t, preview]);

  // ── Step 1 handlers ─────────────────────────────────────────
  const handleAcceptPressed = async () => {
    if (user) {
      // Already authenticated — accept directly (isAccepting guard is inside doAcceptInvite)
      await doAcceptInvite();
    } else {
      setStep('signup');
    }
  };

  // ── Step 2 handlers ─────────────────────────────────────────
  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '', lastName: '',
      email: '',
      password: '', confirmPassword: '',
    },
  });

  // Pre-fill registration form with guest's data from the invite code
  useEffect(() => {
    if (!preview) return;
    signupForm.reset({
      ...signupForm.getValues(),
      firstName: preview.guestFirstName ?? signupForm.getValues('firstName'),
      lastName: preview.guestLastName ?? signupForm.getValues('lastName'),
      email: preview.guestEmail ?? signupForm.getValues('email'),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.guestEmail, preview?.guestFirstName, preview?.guestLastName]);

  const handleSignup = async (data: SignupForm) => {
    setIsSubmitting(true);
    try {
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { full_name: fullName } },
      });
      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered') ||
            signUpError.message.toLowerCase().includes('user_already_exists')) {
          signupForm.setError('email', {
            message: t.invite.emailExists,
          });
          return;
        }
        throw signUpError;
      }

      // If email confirmation is required (no session returned), auto sign-in with password
      if (!signUpData?.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (signInError) {
          // Confirmation truly required — route back into THIS invite via login redirect,
          // so the guest is not stranded after confirming their email.
          Alert.alert(
            t.invite.confirmEmailTitle,
            t.invite.confirmEmailBody,
            [{ text: t.invite.confirmEmailCta, onPress: () => router.push(`/(auth)/login?redirect=/invite/${code}`) }],
          );
          return;
        }
      }

      setSignupCompleted(true);
      setStep('profile');
    } catch (e: any) {
      Alert.alert(t.invite.signupFailedTitle, e.message || t.invite.tryAgain);
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
    defaultValues: { phone: preview?.guestPhone ?? '' },
  });

  // Pre-fill phone when preview loads (guest invited by phone)
  useEffect(() => {
    if (preview?.guestPhone) {
      profileForm.reset({ phone: preview.guestPhone });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.guestPhone]);

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSkipStep = useCallback(async () => {
    const phoneValue = profileForm.getValues('phone');
    if (phoneValue && phoneValue.length > 0) {
      Alert.alert(
        t.invite.skipProfileTitle,
        t.invite.skipProfileBody,
        [
          { text: t.invite.stay, style: 'cancel' },
          { text: t.invite.skip, onPress: () => doAcceptInvite() },
        ]
      );
    } else {
      await doAcceptInvite();
    }
  }, [doAcceptInvite, profileForm, t]);

  const handleProfileComplete = async (data: ProfileForm) => {
    setIsSubmitting(true);
    try {
      // Get fresh session from Supabase directly (auth store may lag after signUp)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // Upload avatar if selected
      let avatarUrl: string | null = null;
      if (avatarUri) {
        const response = await fetch(avatarUri);
        const blob = await response.blob();

        const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

        if (!ALLOWED_MIME_TYPES.includes(blob.type)) {
          Alert.alert(t.invite.invalidFileTitle, t.invite.invalidFileBody);
          return;
        }
        if (blob.size > MAX_FILE_SIZE_BYTES) {
          Alert.alert(t.invite.fileTooLargeTitle, t.invite.fileTooLargeBody);
          return;
        }

        const mimeToExt: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
        };
        const ext = mimeToExt[blob.type] ?? 'jpg';
        const path = `avatars/${currentUser.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, blob, { upsert: true });
        if (uploadError) {
          // Bug 1 fix: never silently drop the photo. Let the guest decide.
          const proceed = await new Promise<boolean>((resolve) => {
            Alert.alert(
              t.invite.uploadFailedTitle,
              t.invite.uploadFailedBody,
              [
                { text: t.invite.uploadFailedRetry, style: 'cancel', onPress: () => resolve(false) },
                { text: t.invite.uploadFailedContinue, onPress: () => resolve(true) },
              ],
            );
          });
          if (!proceed) {
            setIsSubmitting(false);
            return; // Guest wants to retry — do not continue the flow
          }
          // Guest chose to continue without a photo: avatarUrl stays null
        } else {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        }
      }

      await doAcceptInvite(data.phone, avatarUrl ?? undefined);
    } catch (e: any) {
      Alert.alert(t.invite.errorTitle, e.message || t.invite.completeProfileError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Web: auto-open app deep link when page loads in browser ──
  useEffect(() => {
    if (Platform.OS === 'web' && code) {
      Linking.openURL(`gameover://invite/${code}`).catch(() => {});
    }
  }, [code]);

  // ── Web: "Open in App" banner — shown only in browser, not in native app ──
  const WebAppBanner = Platform.OS === 'web' ? (
    <Pressable
      onPress={() => Linking.openURL(`gameover://invite/${code}`)}
      style={styles.webBanner}
    >
      <View style={styles.webBannerInner}>
        <Ionicons name="phone-portrait-outline" size={18} color="#FFFFFF" />
        <Text style={styles.webBannerText}>{t.invite.webBannerHave}</Text>
        <Text style={styles.webBannerLink}>{t.invite.webBannerOpen}</Text>
      </View>
    </Pressable>
  ) : null;

  // ── Loading ──────────────────────────────────────────────────
  if (previewLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  // ── Invalid invite ───────────────────────────────────────────
  if (!preview) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center"
        backgroundColor="$background" paddingHorizontal="$6" gap="$4"
        testID="invite-error-screen">
        <Ionicons name="link-outline" size={48} color={'rgba(255,255,255,0.48)'} />
        <Text fontSize={18} fontWeight="700" color="$textPrimary" textAlign="center">
          {t.invite.invalidTitle}
        </Text>
        <Text fontSize={14} color="$textTertiary" textAlign="center">
          {t.invite.invalidBody}
        </Text>
        <Button onPress={() => router.replace('/(tabs)/events')}>{t.invite.goToApp}</Button>
      </YStack>
    );
  }

  // ── Step 1: Event Preview ────────────────────────────────────
  if (step === 'preview') {
    const citySlug = CITY_UUID_TO_SLUG[preview.cityId] ?? preview.cityName.toLowerCase();
    return (
      <YStack flex={1} backgroundColor="$background" testID="invite-preview-screen">
        {WebAppBanner}
        <View style={{ height: 280 + insets.top }}>
          <KenBurnsImage
            source={resolveImageSource(getPackageImage(citySlug, 'classic'))}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['transparent', '#0D1B2A']}
            style={[StyleSheet.absoluteFillObject, { top: '40%' }]}
          />
          <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
            <Text fontSize={26} fontWeight="900" color="white">{preview.eventName}</Text>
            <Text fontSize={15} color="rgba(255,255,255,0.8)" marginTop={4}>
              {new Date(preview.startDate).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })} · {preview.cityName}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 16 }}>
          <YStack gap="$4">
            <YStack gap="$2">
              <XStack gap="$2" alignItems="center">
                <Ionicons name="person-circle-outline" size={18} color={'rgba(255,255,255,0.48)'} />
                <Text fontSize={14} color="$textTertiary">
                  {t.invite.invitedBy} <Text fontWeight="700" color="$textPrimary">{preview.organizerName}</Text>
                </Text>
              </XStack>
            </YStack>

            <Button onPress={handleAcceptPressed} loading={isAccepting} testID="accept-invite-button">
              {t.invite.accept}
            </Button>

            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/events');
                }
              }}
              style={{ alignItems: 'center', paddingVertical: 8 }}
              testID="decline-invite-button"
            >
              <Text fontSize={13} color="$textTertiary">{t.invite.decline}</Text>
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
              <Ionicons name="arrow-back" size={24} color={'#FFFFFF'} />
            </Pressable>
            <YStack flex={1}>
              <Text fontSize={11} color="$textTertiary">{t.invite.joining.replace('{{event}}', preview.eventName)}</Text>
              <Text fontSize={16} fontWeight="700" color="$textPrimary">{t.invite.createAccount}</Text>
            </YStack>
          </XStack>

          <ScrollView
            contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            <XStack gap="$3">
              <View style={{ flex: 1 }}>
                <Controller
                  control={signupForm.control}
                  name="firstName"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      label={t.invite.firstName}
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
                      label={t.invite.lastName}
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
                  label={t.invite.email}
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
{/* Persistent login link below the form supersedes this conditional — removed to avoid duplicate */}
            <Controller
              control={signupForm.control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label={t.invite.password}
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
                  label={t.invite.confirmPassword}
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
              {t.invite.createAccountCta}
            </Button>

            {/* Persistent link — visible before any error occurs */}
            <Pressable
              onPress={handleLoginInstead}
              style={{ alignItems: 'center', paddingVertical: 12 }}
              testID="login-instead-link"
            >
              <Text fontSize={13} color={'rgba(255,255,255,0.48)'}>
                {t.invite.alreadyHaveAccount}
                <Text color={'#C6A75E'} textDecorationLine="underline">
                  {t.invite.loginInstead}
                </Text>
              </Text>
            </Pressable>
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
          {!signupCompleted && (
            <Pressable onPress={() => setStep('signup')}>
              <Ionicons name="arrow-back" size={24} color={'#FFFFFF'} />
            </Pressable>
          )}
          {signupCompleted && <View style={{ width: 24 }} />}
          <YStack flex={1}>
            <Text fontSize={11} color="$textTertiary">{t.invite.almostThere}</Text>
            <Text fontSize={16} fontWeight="700" color="$textPrimary">{t.invite.completeProfile}</Text>
          </YStack>
        </XStack>

        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
          <YStack alignItems="center" gap="$3">
            <Pressable onPress={handlePickPhoto} testID="profile-photo-picker">
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: 88, height: 88, borderRadius: 44 }} />
              ) : (
                <View style={{
                  width: 88, height: 88, borderRadius: 44,
                  backgroundColor: '#1A2F47',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 2, borderColor: 'rgba(230,220,200,0.15)',
                }}>
                  <Ionicons name="camera-outline" size={28} color={'rgba(255,255,255,0.48)'} />
                </View>
              )}
            </Pressable>
            <Text fontSize={13} color="$textTertiary">{t.invite.profilePhotoOptional}</Text>
          </YStack>

          <Controller
            control={profileForm.control}
            name="phone"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label={t.invite.phone}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                placeholder={t.invite.phonePlaceholder}
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
            {t.invite.continueCta}
          </Button>

          <Pressable
            onPress={handleSkipStep}
            style={{ alignItems: 'center', paddingVertical: 8 }}
            testID="skip-photo-button"
          >
            <Text fontSize={13} color="$textTertiary">{t.invite.skipStep}</Text>
          </Pressable>
        </ScrollView>
      </YStack>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  webBanner: {
    backgroundColor: '#C6A75E',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  webBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  webBannerText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  webBannerLink: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
