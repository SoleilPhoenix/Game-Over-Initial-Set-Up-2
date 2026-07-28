import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { Spinner, Text, View, XStack, YStack } from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/stores/authStore';
import { useTranslation } from '@/i18n';
import { useUIStore } from '@/stores/uiStore';
import { useTheme } from '@/hooks/useTheme';
import type { EditorialTheme } from '@/constants/designSystem';

interface EmailFormData {
  newEmail: string;
  confirmEmail: string;
  currentPassword: string;
}

export default function ChangeEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // The submit button lives in a pinned footer rather than at the end of the
  // scroll content: with the password keyboard up there was no reliable way to
  // reach it, and the tab bar sits on top of the last stretch of the scroll view.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const shown = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => { shown.remove(); hidden.remove(); };
  }, []);

  const currentEmail = user?.email ?? '';

  const schema = useMemo(() => z.object({
    newEmail: z.string().trim().email(t.changeEmail.validEmail),
    confirmEmail: z.string().trim().min(1, t.changeEmail.validConfirmRequired),
    currentPassword: z.string().min(1, t.changeEmail.validPasswordRequired),
  }).refine((data) => data.newEmail.toLowerCase() === data.confirmEmail.toLowerCase(), {
    message: t.changeEmail.validMatch,
    path: ['confirmEmail'],
  }).refine(
    // Supabase accepts a no-op change and still reports success, which would
    // send the user off to check an inbox for a confirmation that never comes.
    (data) => !currentEmail || data.newEmail.toLowerCase() !== currentEmail.toLowerCase(),
    { message: t.changeEmail.validSameAsCurrent, path: ['newEmail'] },
  ), [t, currentEmail]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      newEmail: '',
      confirmEmail: '',
      currentPassword: '',
    },
  });

  const onSubmit = async (data: EmailFormData) => {
    if (!user?.email) return;
    const nextEmail = data.newEmail.trim();
    setIsSubmitting(true);
    try {
      // Reauthenticate before requesting any account mutation. This protects a
      // signed-in but borrowed unlocked device.
      const { error: passwordError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      });
      if (passwordError) {
        Alert.alert(t.changeEmail.errorTitle, t.changeEmail.passwordIncorrect);
        return;
      }

      const { error } = await supabase.auth.updateUser({ email: nextEmail });
      if (error) throw error;

      reset();
      router.replace('/(tabs)/profile');
      useUIStore.getState().showSuccess(
        t.changeEmail.successTitle,
        t.changeEmail.successMessage.replace('{{email}}', nextEmail),
      );
    } catch (error) {
      console.error('[profile] email change failed:', error);
      const message = error instanceof Error ? error.message : t.changeEmail.updateFailed;
      Alert.alert(t.changeEmail.errorTitle, message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const FieldError = ({ message }: { message?: string }) =>
    message ? <Text fontSize={12} color={theme.error} marginLeft="$1">{message}</Text> : null;

  return (
    <View flex={1} backgroundColor={theme.background}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <XStack
          paddingTop={insets.top}
          paddingHorizontal="$4"
          paddingBottom="$3"
          alignItems="center"
          justifyContent="space-between"
          backgroundColor={theme.surfaceLow}
          borderBottomWidth={1}
          borderBottomColor={theme.ghostBorder}
        >
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </Pressable>
          <Text fontSize={17} fontWeight="600" color={theme.textPrimary}>
            {t.changeEmail.headerTitle}
          </Text>
          <View width={40} />
        </XStack>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <YStack paddingHorizontal="$4" gap="$5">
            <YStack gap="$2">
              <Text
                fontSize={11}
                fontWeight="600"
                color={theme.textSecondary}
                textTransform="uppercase"
                letterSpacing={1}
              >
                {t.changeEmail.sectionTitle}
              </Text>
              <Text fontSize={13} color={theme.textSecondary}>
                {t.changeEmail.description}
              </Text>
            </YStack>

            <YStack gap="$2">
              <Text style={styles.label}>{t.changeEmail.newEmailLabel}</Text>
              <Controller
                control={control}
                name="newEmail"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.newEmail && styles.inputError]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t.changeEmail.newEmailPlaceholder}
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              <FieldError message={errors.newEmail?.message} />
            </YStack>

            <YStack gap="$2">
              <Text style={styles.label}>{t.changeEmail.confirmEmailLabel}</Text>
              <Controller
                control={control}
                name="confirmEmail"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.confirmEmail && styles.inputError]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={t.changeEmail.confirmEmailPlaceholder}
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
              />
              <FieldError message={errors.confirmEmail?.message} />
            </YStack>

            <YStack gap="$2">
              <Text style={styles.label}>{t.changeEmail.currentPasswordLabel}</Text>
              <Controller
                control={control}
                name="currentPassword"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.passwordInput, errors.currentPassword && styles.inputError]}>
                    <TextInput
                      style={styles.passwordText}
                      value={value}
                      onChangeText={onChange}
                      placeholder={t.changeEmail.currentPasswordPlaceholder}
                      placeholderTextColor={theme.textTertiary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <Pressable onPress={() => setShowPassword((current) => !current)}>
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={theme.textTertiary}
                      />
                    </Pressable>
                  </View>
                )}
              />
              <FieldError message={errors.currentPassword?.message} />
            </YStack>
          </YStack>
        </ScrollView>

        <View
          paddingHorizontal="$4"
          paddingTop="$3"
          paddingBottom={keyboardOpen ? 12 : insets.bottom + 88}
          backgroundColor={theme.background}
          borderTopWidth={1}
          borderTopColor={theme.ghostBorder}
        >
          <Pressable
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            disabled={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          >
            {isSubmitting ? (
              <XStack gap="$2" alignItems="center">
                <Spinner size="small" color={theme.textOnPrimary} />
                <Text color={theme.textOnPrimary} fontWeight="600">
                  {t.changeEmail.submitting}
                </Text>
              </XStack>
            ) : (
              <Text color={theme.textOnPrimary} fontWeight="600" fontSize={16}>
                {t.changeEmail.submit}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(theme: EditorialTheme) {
  return StyleSheet.create({
    headerButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textPrimary,
      marginLeft: 4,
    },
    input: {
      minHeight: 50,
      backgroundColor: theme.surfaceLow,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.ghostBorder,
      paddingHorizontal: 16,
      fontSize: 16,
      color: theme.textPrimary,
    },
    passwordInput: {
      minHeight: 50,
      backgroundColor: theme.surfaceLow,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.ghostBorder,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    passwordText: {
      flex: 1,
      fontSize: 16,
      color: theme.textPrimary,
    },
    inputError: {
      borderColor: theme.error,
    },
    submitButton: {
      minHeight: 52,
      backgroundColor: theme.primary,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
  });
}
