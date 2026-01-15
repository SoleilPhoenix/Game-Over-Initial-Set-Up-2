/**
 * Forgot Password Screen
 * Password reset via email
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing, layout } from '@/constants/spacing';
import { textStyles } from '@/constants/typography';
import { supabase } from '@/lib/supabase/client';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
      <SafeAreaView style={styles.container} testID="forgot-password-success-screen">
        <StatusBar barStyle="dark-content" />
        <View style={styles.successContent} testID="success-state">
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✉️</Text>
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successMessage}>
            We've sent a password reset link to{' '}
            <Text style={styles.emailText}>{getValues('email')}</Text>
          </Text>
          <Text style={styles.successHint}>
            Didn't receive the email? Check your spam folder or try again.
          </Text>

          <View style={styles.successButtons}>
            <Button
              variant="primary"
              fullWidth
              onPress={() => router.replace('/(auth)/login')}
              testID="success-back-to-login-button"
            >
              Back to Login
            </Button>

            <Button
              variant="text"
              fullWidth
              onPress={() => setIsSuccess(false)}
              style={styles.retryButton}
              testID="try-different-email-button"
            >
              Try Different Email
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="forgot-password-screen">
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={10}
            testID="back-button"
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              No worries! Enter your email and we'll send you a reset link.
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer} testID="error-message">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  testID="input-email"
                />
              )}
            />
          </View>

          {/* Submit Button */}
          <Button
            variant="primary"
            fullWidth
            loading={isLoading}
            onPress={handleSubmit(onSubmit)}
            testID="forgot-password-submit-button"
          >
            Send Reset Link
          </Button>

          {/* Login Link */}
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={styles.loginLink}
            testID="back-to-login-link"
          >
            <Text style={styles.loginLinkText}>Back to Login</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: layout.screenPaddingVertical,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    ...textStyles.body,
    color: colors.primary,
    fontWeight: '600',
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  title: {
    ...textStyles.h1,
    color: colors.light.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.light.textSecondary,
  },
  errorContainer: {
    backgroundColor: 'rgba(225, 45, 57, 0.1)',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...textStyles.bodySmall,
    color: colors.error,
  },
  form: {
    marginBottom: spacing.xl,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  loginLinkText: {
    ...textStyles.body,
    color: colors.primary,
    fontWeight: '600',
  },
  // Success state styles
  successContent: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.transparent.primary10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successEmoji: {
    fontSize: 48,
  },
  successTitle: {
    ...textStyles.h2,
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successMessage: {
    ...textStyles.body,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emailText: {
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  successHint: {
    ...textStyles.bodySmall,
    color: colors.light.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  successButtons: {
    width: '100%',
  },
  retryButton: {
    marginTop: spacing.sm,
  },
});
