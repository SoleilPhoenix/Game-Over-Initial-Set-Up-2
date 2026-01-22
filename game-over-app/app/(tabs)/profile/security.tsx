/**
 * Password & Security Screen
 * Change password and security settings
 */

import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { DARK_THEME } from '@/constants/theme';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function SecurityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      Alert.alert(
        'Password Updated',
        'Your password has been changed successfully.',
        [{ text: 'OK', onPress: () => {
          reset();
          router.back();
        }}]
      );
    } catch (error: any) {
      console.error('Password change error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to update password. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View flex={1} backgroundColor={DARK_THEME.background}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <XStack
          paddingTop={insets.top}
          paddingHorizontal="$4"
          paddingBottom="$3"
          alignItems="center"
          justifyContent="space-between"
          backgroundColor={DARK_THEME.surface}
          borderBottomWidth={1}
          borderBottomColor={DARK_THEME.border}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.headerButton}
            testID="security-back"
          >
            <Ionicons name="chevron-back" size={24} color={DARK_THEME.textPrimary} />
          </Pressable>
          <Text fontSize={17} fontWeight="600" color={DARK_THEME.textPrimary}>
            Password & Security
          </Text>
          <View width={40} />
        </XStack>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
            paddingTop: 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <YStack paddingHorizontal="$4" gap="$5">
            {/* Section Title */}
            <YStack gap="$2">
              <Text
                fontSize={11}
                fontWeight="600"
                color={DARK_THEME.textSecondary}
                textTransform="uppercase"
                letterSpacing={1}
                marginLeft="$1"
              >
                Change Password
              </Text>
              <Text fontSize={13} color={DARK_THEME.textSecondary}>
                Enter your current password and a new password to update your credentials.
              </Text>
            </YStack>

            {/* Current Password */}
            <YStack gap="$2">
              <Text
                fontSize={13}
                fontWeight="500"
                color={DARK_THEME.textPrimary}
                marginLeft="$1"
              >
                Current Password
              </Text>
              <Controller
                control={control}
                name="currentPassword"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.inputContainer, errors.currentPassword && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter current password"
                      placeholderTextColor="#6B7280"
                      secureTextEntry={!showCurrentPassword}
                      autoCapitalize="none"
                      testID="security-current-password"
                    />
                    <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                      <Ionicons
                        name={showCurrentPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#6B7280"
                      />
                    </Pressable>
                  </View>
                )}
              />
              {errors.currentPassword && (
                <Text fontSize={12} color={DARK_THEME.error} marginLeft="$1">
                  {errors.currentPassword.message}
                </Text>
              )}
            </YStack>

            {/* New Password */}
            <YStack gap="$2">
              <Text
                fontSize={13}
                fontWeight="500"
                color={DARK_THEME.textPrimary}
                marginLeft="$1"
              >
                New Password
              </Text>
              <Controller
                control={control}
                name="newPassword"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.inputContainer, errors.newPassword && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter new password"
                      placeholderTextColor="#6B7280"
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      testID="security-new-password"
                    />
                    <Pressable onPress={() => setShowNewPassword(!showNewPassword)}>
                      <Ionicons
                        name={showNewPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#6B7280"
                      />
                    </Pressable>
                  </View>
                )}
              />
              {errors.newPassword && (
                <Text fontSize={12} color={DARK_THEME.error} marginLeft="$1">
                  {errors.newPassword.message}
                </Text>
              )}
            </YStack>

            {/* Confirm Password */}
            <YStack gap="$2">
              <Text
                fontSize={13}
                fontWeight="500"
                color={DARK_THEME.textPrimary}
                marginLeft="$1"
              >
                Confirm New Password
              </Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Confirm new password"
                      placeholderTextColor="#6B7280"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      testID="security-confirm-password"
                    />
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#6B7280"
                      />
                    </Pressable>
                  </View>
                )}
              />
              {errors.confirmPassword && (
                <Text fontSize={12} color={DARK_THEME.error} marginLeft="$1">
                  {errors.confirmPassword.message}
                </Text>
              )}
            </YStack>

            {/* Password Requirements */}
            <View style={styles.requirementsBox}>
              <Text fontSize={12} fontWeight="600" color={DARK_THEME.textSecondary} marginBottom="$2">
                Password Requirements:
              </Text>
              <YStack gap="$1">
                <XStack alignItems="center" gap="$2">
                  <Ionicons name="checkmark-circle" size={14} color={DARK_THEME.success} />
                  <Text fontSize={12} color={DARK_THEME.textSecondary}>
                    At least 8 characters
                  </Text>
                </XStack>
                <XStack alignItems="center" gap="$2">
                  <Ionicons name="checkmark-circle" size={14} color={DARK_THEME.success} />
                  <Text fontSize={12} color={DARK_THEME.textSecondary}>
                    One uppercase letter
                  </Text>
                </XStack>
                <XStack alignItems="center" gap="$2">
                  <Ionicons name="checkmark-circle" size={14} color={DARK_THEME.success} />
                  <Text fontSize={12} color={DARK_THEME.textSecondary}>
                    One lowercase letter
                  </Text>
                </XStack>
                <XStack alignItems="center" gap="$2">
                  <Ionicons name="checkmark-circle" size={14} color={DARK_THEME.success} />
                  <Text fontSize={12} color={DARK_THEME.textSecondary}>
                    One number
                  </Text>
                </XStack>
              </YStack>
            </View>

            {/* Submit Button */}
            <Pressable
              style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              testID="security-save"
            >
              {isSubmitting ? (
                <XStack gap="$2" alignItems="center">
                  <Spinner size="small" color="white" />
                  <Text color="white" fontWeight="600" fontSize={16}>
                    Updating...
                  </Text>
                </XStack>
              ) : (
                <Text color="white" fontWeight="600" fontSize={16}>
                  Update Password
                </Text>
              )}
            </Pressable>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    backgroundColor: DARK_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputError: {
    borderColor: DARK_THEME.error,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: DARK_THEME.textPrimary,
  },
  requirementsBox: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  saveButton: {
    backgroundColor: DARK_THEME.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
});
