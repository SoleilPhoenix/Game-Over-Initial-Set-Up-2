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
import { useTranslation } from '@/i18n';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const { t } = useTranslation();

  // Check if this user is a guest in any event — guests cannot change name/phone/email
  const [isGuestUser, setIsGuestUser] = useState(false);
  React.useEffect(() => {
    if (!user?.id) return;
    void supabase.from('event_participants')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'guest')
      .limit(1)
      .then(({ data }) => { if (data && data.length > 0) setIsGuestUser(true); });
  }, [user?.id]);

  const [firstName, setFirstName] = useState(() => {
    const full = (user?.user_metadata?.full_name || '').trim();
    return full.split(' ')[0] || '';
  });
  const [lastName, setLastName] = useState(() => {
    const full = (user?.user_metadata?.full_name || '').trim();
    const parts = full.split(' ');
    return parts.slice(1).join(' ');
  });
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load phone from profiles table (not in user_metadata)
  React.useEffect(() => {
    if (!user?.id) return;
    void supabase.from('profiles').select('phone').eq('id', user.id).single()
      .then(({ data }) => { if (data?.phone) setPhone(data.phone); });
  }, [user?.id]);

  const userEmail = user?.email || '';
  const fullNameCombined = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
  const userInitials = fullNameCombined
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert(t.editProfile.errorTitle, t.editProfile.firstNameRequired);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullNameCombined },
      });

      if (error) throw error;

      // Also sync to profiles table (used by Edge Functions and server-side features)
      await supabase
        .from('profiles')
        .update({ full_name: fullNameCombined, ...(phone.trim() ? { phone: phone.trim() } : {}) })
        .eq('id', user!.id);

      Alert.alert(t.editProfile.successTitle, t.editProfile.profileUpdated, [
        { text: t.editProfile.ok, onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert(t.editProfile.errorTitle, t.editProfile.updateFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (url: string) => {
    // Avatar URL is automatically saved by the AvatarUpload component
  };

  return (
    <View flex={1} backgroundColor={'#0D1B2A'} testID="edit-profile-screen">
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
            testID="edit-profile-back"
          >
            <Ionicons name="chevron-back" size={24} color={'#FFFFFF'} />
          </Pressable>
          <Text fontSize={17} fontWeight="600" color={'#FFFFFF'}>
            {t.editProfile.headerTitle}
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
              color={'rgba(255,255,255,0.72)'}
              marginTop="$3"
            >
              {t.editProfile.tapToChangePhoto}
            </Text>
          </YStack>

          <YStack paddingHorizontal="$4" gap="$5">
            {/* Guest lock banner */}
            {isGuestUser && (
              <View style={styles.guestLockBanner}>
                <Ionicons name="lock-closed" size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                <Text fontSize={13} color="#F59E0B" flex={1}>
                  {t.editProfile.guestLockBanner}
                </Text>
              </View>
            )}

            {/* First Name Input */}
            <YStack gap="$2">
              <Text
                fontSize={11}
                fontWeight="600"
                color={'rgba(255,255,255,0.72)'}
                textTransform="uppercase"
                letterSpacing={1}
                marginLeft="$1"
              >
                {t.editProfile.firstNameLabel}
              </Text>
              <View style={[styles.inputContainer, isGuestUser && styles.readOnlyContainer]}>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={isGuestUser ? undefined : setFirstName}
                  placeholder={t.editProfile.firstNamePlaceholder}
                  placeholderTextColor="#6B7280"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isGuestUser}
                  testID="edit-profile-firstname-input"
                />
                {isGuestUser && <Ionicons name="lock-closed" size={16} color="#6B7280" />}
              </View>
            </YStack>

            {/* Last Name Input */}
            <YStack gap="$2">
              <Text
                fontSize={11}
                fontWeight="600"
                color={'rgba(255,255,255,0.72)'}
                textTransform="uppercase"
                letterSpacing={1}
                marginLeft="$1"
              >
                {t.editProfile.lastNameLabel}
              </Text>
              <View style={[styles.inputContainer, isGuestUser && styles.readOnlyContainer]}>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={isGuestUser ? undefined : setLastName}
                  placeholder={t.editProfile.lastNamePlaceholder}
                  placeholderTextColor="#6B7280"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isGuestUser}
                  testID="edit-profile-lastname-input"
                />
              </View>
            </YStack>

            {/* Phone Input */}
            <YStack gap="$2">
              <Text
                fontSize={11}
                fontWeight="600"
                color={'rgba(255,255,255,0.72)'}
                textTransform="uppercase"
                letterSpacing={1}
                marginLeft="$1"
              >
                {t.editProfile.phoneLabel}
              </Text>
              <View style={[styles.inputContainer, isGuestUser && styles.readOnlyContainer]}>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={isGuestUser ? undefined : setPhone}
                  placeholder={t.editProfile.phonePlaceholder}
                  placeholderTextColor="#6B7280"
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  editable={!isGuestUser}
                  testID="edit-profile-phone-input"
                />
                {isGuestUser && <Ionicons name="lock-closed" size={16} color="#6B7280" />}
              </View>
            </YStack>

            {/* Email (Read-only) */}
            <YStack gap="$2">
              <Text
                fontSize={11}
                fontWeight="600"
                color={'rgba(255,255,255,0.72)'}
                textTransform="uppercase"
                letterSpacing={1}
                marginLeft="$1"
              >
                {t.editProfile.emailLabel}
              </Text>
              <View style={[styles.inputContainer, styles.readOnlyContainer]}>
                <Text color="#6B7280" fontSize={16}>
                  {userEmail}
                </Text>
                <Ionicons name="lock-closed" size={16} color="#6B7280" />
              </View>
              <Text
                fontSize={11}
                color={'rgba(255,255,255,0.72)'}
                marginLeft="$1"
              >
                {t.editProfile.emailCannotChange}
              </Text>
            </YStack>

            {/* Save Button — hidden for guests (data managed by organizer) */}
            {!isGuestUser && <YStack marginTop="$4">
              <Pressable
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
                testID="edit-profile-save"
              >
                {isSaving ? (
                  <XStack gap="$2" alignItems="center">
                    <Spinner size="small" color="#0D1B2A" />
                    <Text color="#0D1B2A" fontWeight="600" fontSize={16}>
                      {t.editProfile.saving}
                    </Text>
                  </XStack>
                ) : (
                  <Text color="#0D1B2A" fontWeight="600" fontSize={16}>
                    {t.editProfile.saveChanges}
                  </Text>
                )}
              </Pressable>
            </YStack>}
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
    justifyContent: 'space-between',
  },
  readOnlyContainer: {
    backgroundColor: 'rgba(45, 55, 72, 0.4)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#C6A75E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  guestLockBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
