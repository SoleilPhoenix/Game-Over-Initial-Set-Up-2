/**
 * Sign Up Screen
 * Dark glassmorphic design matching UI specifications
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { DARK_THEME } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';

const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const [isLoading, setIsLoading] = React.useState(false);
  const insets = useSafeAreaInsets();
  const { setError, error, clearError } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      setIsLoading(true);
      clearError();

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container} testID="signup-screen">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background gradient */}
      <LinearGradient
        colors={[DARK_THEME.deepNavy, DARK_THEME.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blur circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with back button */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={10}
              testID="back-button"
            >
              <Ionicons name="arrow-back" size={24} color={DARK_THEME.textPrimary} />
            </Pressable>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join Game Over and start planning unforgettable parties
            </Text>
          </View>

          {/* Glassmorphic Form Card */}
          <BlurView intensity={15} tint="dark" style={styles.glassCard}>
            <View style={styles.glassCardInner}>
              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer} testID="error-message">
                  <Ionicons name="alert-circle" size={18} color={DARK_THEME.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Form */}
              <View style={styles.form}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <Controller
                    control={control}
                    name="fullName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={[styles.inputContainer, errors.fullName && styles.inputError]}>
                        <Ionicons name="person-outline" size={20} color={DARK_THEME.textTertiary} />
                        <View style={styles.inputInner}>
                          <Input
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder="Enter your full name"
                            placeholderTextColor={DARK_THEME.textTertiary}
                            autoCapitalize="words"
                            autoComplete="name"
                            textContentType="name"
                            testID="input-full-name"
                            style={styles.darkInput}
                          />
                        </View>
                      </View>
                    )}
                  />
                  {errors.fullName && (
                    <Text style={styles.fieldError}>{errors.fullName.message}</Text>
                  )}
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                        <Ionicons name="mail-outline" size={20} color={DARK_THEME.textTertiary} />
                        <View style={styles.inputInner}>
                          <Input
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder="Enter your email"
                            placeholderTextColor={DARK_THEME.textTertiary}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            textContentType="emailAddress"
                            testID="input-email"
                            style={styles.darkInput}
                          />
                        </View>
                      </View>
                    )}
                  />
                  {errors.email && (
                    <Text style={styles.fieldError}>{errors.email.message}</Text>
                  )}
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                        <Ionicons name="lock-closed-outline" size={20} color={DARK_THEME.textTertiary} />
                        <View style={styles.inputInner}>
                          <Input
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder="Create a password"
                            placeholderTextColor={DARK_THEME.textTertiary}
                            secureTextEntry
                            autoComplete="password-new"
                            textContentType="newPassword"
                            testID="input-password"
                            style={styles.darkInput}
                          />
                        </View>
                      </View>
                    )}
                  />
                  {errors.password ? (
                    <Text style={styles.fieldError}>{errors.password.message}</Text>
                  ) : (
                    <Text style={styles.fieldHint}>
                      Min 8 chars with uppercase, lowercase, and number
                    </Text>
                  )}
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <Controller
                    control={control}
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={DARK_THEME.textTertiary} />
                        <View style={styles.inputInner}>
                          <Input
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder="Confirm your password"
                            placeholderTextColor={DARK_THEME.textTertiary}
                            secureTextEntry
                            autoComplete="password-new"
                            textContentType="newPassword"
                            testID="input-confirm-password"
                            style={styles.darkInput}
                          />
                        </View>
                      </View>
                    )}
                  />
                  {errors.confirmPassword && (
                    <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>
                  )}
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  isLoading && styles.primaryButtonDisabled,
                ]}
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
                testID="signup-submit-button"
              >
                {isLoading ? (
                  <Text style={styles.primaryButtonText}>Creating Account...</Text>
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </Pressable>

              {/* Terms */}
              <Text style={styles.terms}>
                By creating an account, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>
          </BlurView>

          {/* Login Link */}
          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable testID="login-link">
                <Text style={styles.loginLinkText}>Log In</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  decorCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: `${DARK_THEME.primary}20`,
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 100,
    left: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: `${DARK_THEME.primary}10`,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: DARK_THEME.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: DARK_THEME.textSecondary,
    lineHeight: 24,
  },
  glassCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  glassCardInner: {
    backgroundColor: DARK_THEME.glass,
    padding: 24,
    gap: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${DARK_THEME.error}15`,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: `${DARK_THEME.error}30`,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: DARK_THEME.error,
  },
  form: {
    gap: 16,
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DARK_THEME.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  inputError: {
    borderColor: DARK_THEME.error,
  },
  inputInner: {
    flex: 1,
  },
  darkInput: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: DARK_THEME.textPrimary,
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 'auto' as any,
  },
  fieldError: {
    fontSize: 12,
    color: DARK_THEME.error,
    marginTop: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: DARK_THEME.textTertiary,
    marginTop: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DARK_THEME.primary,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: DARK_THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: DARK_THEME.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  terms: {
    fontSize: 12,
    color: DARK_THEME.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: DARK_THEME.primary,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: DARK_THEME.textSecondary,
  },
  loginLinkText: {
    fontSize: 14,
    color: DARK_THEME.primary,
    fontWeight: '700',
  },
});
