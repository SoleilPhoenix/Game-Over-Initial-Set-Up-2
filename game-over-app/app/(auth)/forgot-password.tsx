/**
 * Forgot Password Screen
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
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { DARK_THEME } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: 'gameover://reset-password',
      });

      if (error) throw error;

      setIsSuccess(true);
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.container} testID="forgot-password-success-screen">
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Background gradient */}
        <LinearGradient
          colors={[DARK_THEME.deepNavy, DARK_THEME.background]}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative blur circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <View style={[styles.successContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="success-state">
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <LinearGradient
              colors={[`${DARK_THEME.success}30`, `${DARK_THEME.success}10`]}
              style={styles.successIconGradient}
            >
              <Ionicons name="mail" size={48} color={DARK_THEME.success} />
            </LinearGradient>
          </View>

          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successMessage}>
            We've sent a password reset link to{' '}
            <Text style={styles.emailText}>{getValues('email')}</Text>
          </Text>
          <Text style={styles.successHint}>
            Didn't receive the email? Check your spam folder or try again.
          </Text>

          {/* Glassmorphic Button Card */}
          <BlurView intensity={15} tint="dark" style={styles.successButtonCard}>
            <View style={styles.successButtonCardInner}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}
                onPress={() => router.replace('/(auth)/login')}
                testID="success-back-to-login-button"
              >
                <Text style={styles.primaryButtonText}>Back to Login</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={() => setIsSuccess(false)}
                testID="try-different-email-button"
              >
                <Text style={styles.secondaryButtonText}>Try Different Email</Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="forgot-password-screen">
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
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              No worries! Enter your email and we'll send you a reset link.
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
                testID="forgot-password-submit-button"
              >
                {isLoading ? (
                  <Text style={styles.primaryButtonText}>Sending...</Text>
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>
          </BlurView>

          {/* Back to Login Link */}
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={styles.loginLink}
            testID="back-to-login-link"
          >
            <Ionicons name="arrow-back" size={16} color={DARK_THEME.primary} />
            <Text style={styles.loginLinkText}>Back to Login</Text>
          </Pressable>
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
    marginTop: 32,
    marginBottom: 32,
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
    gap: 24,
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
    gap: 20,
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
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
  },
  loginLinkText: {
    fontSize: 14,
    color: DARK_THEME.primary,
    fontWeight: '600',
  },
  // Success state styles
  successContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: DARK_THEME.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: DARK_THEME.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
    color: DARK_THEME.textPrimary,
  },
  successHint: {
    fontSize: 14,
    color: DARK_THEME.textTertiary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  successButtonCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  successButtonCardInner: {
    backgroundColor: DARK_THEME.glass,
    padding: 24,
    gap: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: DARK_THEME.primary,
    fontWeight: '600',
  },
});
