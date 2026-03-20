/**
 * Guest Invite Wizard
 * Step 1: Event Preview (public, no auth required)
 * Step 2: Account Creation (signup)
 * Step 3: Profile Completion (phone + optional photo)
 * → navigates to event on completion
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { CITY_UUID_TO_SLUG } from '@/constants/citySlugMap';
import { KenBurnsImage } from '@/components/ui/KenBurnsImage';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DARK_THEME } from '@/constants/theme';

// ─── Types ───────────────────────────────────────────────────
type WizardStep = 'preview' | 'signup' | 'profile';

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
  phone: z.string().min(7, 'Please enter a valid phone number').optional().or(z.literal('')),
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
        Alert.alert('Error', 'Authentication failed. Please try again.');
        return;
      }

      // If profile data provided, save it first
      if (phone || avatarUrl) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ ...(phone ? { phone } : {}), ...(avatarUrl ? { avatar_url: avatarUrl } : {}) })
          .eq('id', currentUser.id);

        if (profileError) {
          console.warn('Profile update failed:', profileError.message);
          // Don't block — continue with invite acceptance
        }
      }

      try {
        const result = await acceptInvite.mutateAsync({ code: code!, userId: currentUser.id });
        if (!result.eventId) {
          Alert.alert('Error', result.error || 'Could not join event.');
          return;
        }
        router.replace(`/event/${result.eventId}?firstVisit=1`);
      } catch {
        Alert.alert('Error', 'Failed to join event. Please try again.');
      }
    } finally {
      isAcceptingRef.current = false;
      setIsAccepting(false);
    }
  }, [acceptInvite, code, router]);

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
      email: preview?.guestEmail ?? '',
      password: '', confirmPassword: '',
    },
  });

  useEffect(() => {
    if (preview?.guestEmail) {
      signupForm.reset({
        ...signupForm.getValues(),
        email: preview.guestEmail,
      });
    }
  }, [preview?.guestEmail, signupForm]);

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
            message: 'An account with this email already exists — tap "Log in instead" below',
          });
          return;
        }
        throw signUpError;
      }

      // Guard: email confirmation required (production Supabase config)
      if (!signUpData?.session) {
        Alert.alert(
          'Check your email',
          'Please confirm your email address, then return to accept the invite.',
          [{ text: 'OK' }]
        );
        return;
      }

      setSignupCompleted(true);
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
        'Skip profile?',
        "Your phone number won't be saved. You can add it later in profile settings.",
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Skip', onPress: () => doAcceptInvite() },
        ]
      );
    } else {
      await doAcceptInvite();
    }
  }, [doAcceptInvite, profileForm]);

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
          Alert.alert('Invalid file', 'Please select a JPEG, PNG, or WebP image.');
          return;
        }
        if (blob.size > MAX_FILE_SIZE_BYTES) {
          Alert.alert('File too large', 'Please select an image under 5 MB.');
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
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      await doAcceptInvite(data.phone, avatarUrl ?? undefined);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to complete profile.');
    } finally {
      setIsSubmitting(false);
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

  // ── Invalid invite ───────────────────────────────────────────
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
    const citySlug = CITY_UUID_TO_SLUG[preview.cityId] ?? preview.cityName.toLowerCase();
    return (
      <YStack flex={1} backgroundColor="$background">
        <View style={{ height: 280 + insets.top }}>
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

            <Button onPress={handleAcceptPressed} loading={isAccepting} testID="accept-invite-button">
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
          {!signupCompleted && (
            <Pressable onPress={() => setStep('signup')}>
              <Ionicons name="arrow-back" size={24} color={DARK_THEME.textPrimary} />
            </Pressable>
          )}
          {signupCompleted && <View style={{ width: 24 }} />}
          <YStack flex={1}>
            <Text fontSize={11} color="$textTertiary">Almost there</Text>
            <Text fontSize={16} fontWeight="700" color="$textPrimary">Complete your profile</Text>
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
            onPress={handleSkipStep}
            style={{ alignItems: 'center', paddingVertical: 8 }}
            testID="skip-photo-button"
          >
            <Text fontSize={13} color="$textTertiary">Skip this step →</Text>
          </Pressable>
        </ScrollView>
      </YStack>
    </KeyboardAvoidingView>
  );
}
