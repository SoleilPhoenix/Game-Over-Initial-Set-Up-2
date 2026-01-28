/**
 * Edit Profile Screen
 * User profile editing with avatar upload
 */

import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { Button } from '@/components/ui/Button';
import { DARK_THEME } from '@/constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);

  const userEmail = user?.email || '';
  const userInitials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your name.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (url: string) => {
    // Avatar URL is automatically saved by the AvatarUpload component
  };

  return (
    <View flex={1} backgroundColor={DARK_THEME.background} testID="edit-profile-screen">
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
            testID="edit-profile-back"
          >
            <Ionicons name="chevron-back" size={24} color={DARK_THEME.textPrimary} />
          </Pressable>
          <Text fontSize={17} fontWeight="600" color={DARK_THEME.textPrimary}>
            Edit Profile
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
          {/* Avatar Section */}
          <YStack alignItems="center" marginBottom="$8">
            <AvatarUpload
              userId={user?.id || ''}
              avatarUrl={user?.user_metadata?.avatar_url}
              initials={userInitials}
              size={120}
              onAvatarChange={handleAvatarChange}
              testID="edit-profile-avatar"
            />
            <Text
              fontSize={13}
              color={DARK_THEME.textSecondary}
              marginTop="$3"
            >
              Tap to change photo
            </Text>
          </YStack>

          <YStack paddingHorizontal="$4" gap="$5">
            {/* Full Name Input */}
            <YStack gap="$2">
              <Text
                fontSize={11}
                fontWeight="600"
                color={DARK_THEME.textSecondary}
                textTransform="uppercase"
                letterSpacing={1}
                marginLeft="$1"
              >
                Full Name
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your name"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="words"
                  autoCorrect={false}
                  testID="edit-profile-name-input"
                />
              </View>
            </YStack>

            {/* Email (Read-only) */}
            <YStack gap="$2">
              <Text
                fontSize={11}
                fontWeight="600"
                color={DARK_THEME.textSecondary}
                textTransform="uppercase"
                letterSpacing={1}
                marginLeft="$1"
              >
                Email
              </Text>
              <View style={[styles.inputContainer, styles.readOnlyContainer]}>
                <Text color="#6B7280" fontSize={16}>
                  {userEmail}
                </Text>
                <Ionicons name="lock-closed" size={16} color="#6B7280" />
              </View>
              <Text
                fontSize={11}
                color={DARK_THEME.textSecondary}
                marginLeft="$1"
              >
                Email cannot be changed
              </Text>
            </YStack>

            {/* Save Button */}
            <YStack marginTop="$4">
              <Pressable
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
                testID="edit-profile-save"
              >
                {isSaving ? (
                  <XStack gap="$2" alignItems="center">
                    <Spinner size="small" color="white" />
                    <Text color="white" fontWeight="600" fontSize={16}>
                      Saving...
                    </Text>
                  </XStack>
                ) : (
                  <Text color="white" fontWeight="600" fontSize={16}>
                    Save Changes
                  </Text>
                )}
              </Pressable>
            </YStack>
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
    justifyContent: 'space-between',
  },
  readOnlyContainer: {
    backgroundColor: 'rgba(45, 55, 72, 0.4)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: DARK_THEME.textPrimary,
  },
  saveButton: {
    backgroundColor: DARK_THEME.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
});
