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
import { useTranslation } from '@/i18n';

type PasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SecurityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordSchema = React.useMemo(() => z.object({
    currentPassword: z.string().min(1, t.security.validCurrentRequired),
    newPassword: z
      .string()
      .min(8, t.security.validMinLength)
      .regex(/[A-Z]/, t.security.validUpper)
      .regex(/[a-z]/, t.security.validLower)
      .regex(/[0-9]/, t.security.validNumber),
    confirmPassword: z.string().min(1, t.security.validConfirmRequired),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t.security.validMatch,
    path: ['confirmPassword'],
  }), [t]);

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
        t.security.passwordUpdatedTitle,
        t.security.passwordUpdatedMsg,
        [{ text: t.security.ok, onPress: () => {
          reset();
          router.back();
        }}]
      );
    } catch (error: any) {
      console.error('Password change error:', error);
      Alert.alert(
        t.security.errorTitle,
        error.message || t.security.updateFailedMsg
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View flex={1} backgroundColor={'#0D1B2A'}>
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
          backgroundColor={'#12253A'}
          borderBottomWidth={1}
          borderBottomColor={'rgba(230,220,200,0.15)'}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.headerButton}
            testID="security-back"
          >
            <Ionicons name="chevron-back" size={24} color={'#FFFFFF'} />
          </Pressable>
          <Text fontSize={17} fontWeight="600" color={'#FFFFFF'}>
            {t.security.headerTitle}
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
                color={'rgba(255,255,255,0.72)'}
                textTransform="uppercase"
                letterSpacing={1}
                marginLeft="$1"
              >
                {t.security.changePasswordSection}
              </Text>
              <Text fontSize={13} color={'rgba(255,255,255,0.72)'}>
                {t.security.changePasswordDesc}
              </Text>
            </YStack>

            {/* Current Password */}
            <YStack gap="$2">
              <Text
                fontSize={13}
                fontWeight="500"
                color={'#FFFFFF'}
                marginLeft="$1"
              >
                {t.security.currentPasswordLabel}
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
                      placeholder={t.security.currentPasswordPlaceholder}
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
                <Text fontSize={12} color={'#E8836B'} marginLeft="$1">
                  {errors.currentPassword.message}
                </Text>
              )}
            </YStack>

            {/* New Password */}
            <YStack gap="$2">
              <Text
                fontSize={13}
                fontWeight="500"
                color={'#FFFFFF'}
                marginLeft="$1"
              >
                {t.security.newPasswordLabel}
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
                      placeholder={t.security.newPasswordPlaceholder}
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
                <Text fontSize={12} color={'#E8836B'} marginLeft="$1">
                  {errors.newPassword.message}
                </Text>
              )}
            </YStack>

            {/* Confirm Password */}
            <YStack gap="$2">
              <Text
                fontSize={13}
                fontWeight="500"
                color={'#FFFFFF'}
                marginLeft="$1"
              >
                {t.security.confirmPasswordLabel}
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
                      placeholder={t.security.confirmPasswordPlaceholder}
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
                <Text fontSize={12} color={'#E8836B'} marginLeft="$1">
                  {errors.confirmPassword.message}
                </Text>
              )}
            </YStack>

            {/* Password Requirements */}
            <View style={styles.requirementsBox}>
              <Text fontSize={12} fontWeight="600" color={'rgba(255,255,255,0.72)'} marginBottom="$2">
                {t.security.requirementsTitle}
              </Text>
              <YStack gap="$1">
                <XStack alignItems="center" gap="$2">
                  <Ionicons name="checkmark-circle" size={14} color={'#C6A75E'} />
                  <Text fontSize={12} color={'rgba(255,255,255,0.72)'}>
                    {t.security.reqMinLength}
                  </Text>
                </XStack>
                <XStack alignItems="center" gap="$2">
                  <Ionicons name="checkmark-circle" size={14} color={'#C6A75E'} />
                  <Text fontSize={12} color={'rgba(255,255,255,0.72)'}>
                    {t.security.reqUppercase}
                  </Text>
                </XStack>
                <XStack alignItems="center" gap="$2">
                  <Ionicons name="checkmark-circle" size={14} color={'#C6A75E'} />
                  <Text fontSize={12} color={'rgba(255,255,255,0.72)'}>
                    {t.security.reqLowercase}
                  </Text>
                </XStack>
                <XStack alignItems="center" gap="$2">
                  <Ionicons name="checkmark-circle" size={14} color={'#C6A75E'} />
                  <Text fontSize={12} color={'rgba(255,255,255,0.72)'}>
                    {t.security.reqNumber}
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
                  <Spinner size="small" color="#0D1B2A" />
                  <Text color="#0D1B2A" fontWeight="600" fontSize={16}>
                    {t.security.updating}
                  </Text>
                </XStack>
              ) : (
                <Text color="#0D1B2A" fontWeight="600" fontSize={16}>
                  {t.security.updateBtn}
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
    backgroundColor: '#12253A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(230,220,200,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputError: {
    borderColor: '#E8836B',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  requirementsBox: {
    backgroundColor: 'rgba(198, 167, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 167, 94, 0.2)',
  },
  saveButton: {
    backgroundColor: '#C6A75E',
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
