/**
 * Edit Profile Screen
 * User profile editing with avatar upload
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View, Spinner } from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { useTranslation } from '@/i18n';
import { feedback, useUIStore } from '@/stores/uiStore';
import type { Json } from '@/lib/supabase/types';
import {
  formatGuestChanges,
  type GuestDataChange,
  type GuestDataChangedMeta,
} from '@/utils/guestDataChange';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const { t } = useTranslation();

  const metadataFullName = (user?.user_metadata?.full_name || '').trim();
  const metadataNameParts = metadataFullName.split(' ');
  const metadataFirstName = metadataNameParts[0] || '';
  const metadataLastName = metadataNameParts.slice(1).join(' ');
  const metadataPhone = (user?.user_metadata?.phone || '').trim();

  const [firstName, setFirstName] = useState(() => {
    return metadataFirstName;
  });
  const [lastName, setLastName] = useState(() => {
    return metadataLastName;
  });
  const [phone, setPhone] = useState(() => metadataPhone);
  const [savedValues, setSavedValues] = useState(() => {
    return {
      firstName: metadataFirstName,
      lastName: metadataLastName,
      phone: metadataPhone,
    };
  });
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fieldPositions = useRef({ firstName: 0, lastName: 0, phone: 0 });
  const focusedField = useRef<keyof typeof fieldPositions.current | null>(null);

  const scrollFocusedFieldIntoView = useCallback(() => {
    const field = focusedField.current;
    if (!field) return;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, fieldPositions.current[field] - 24),
        animated: true,
      });
    });
  }, []);

  const handleFieldFocus = useCallback((field: keyof typeof fieldPositions.current) => {
    focusedField.current = field;
    scrollFocusedFieldIntoView();
  }, [scrollFocusedFieldIntoView]);

  // Match the email editor: keep the current field above the keyboard and the
  // save action pinned in the remaining visible space.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const shown = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => { shown.remove(); hidden.remove(); };
  }, []);

  useEffect(() => {
    if (keyboardOpen && focusedField.current) {
      scrollFocusedFieldIntoView();
    }
  }, [keyboardOpen, scrollFocusedFieldIntoView]);

  // Profiles are authoritative for participant-facing contact details.
  React.useEffect(() => {
    if (!user?.id) return;
    void supabase.from('profiles').select('phone').eq('id', user.id).single()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[profile] phone load failed:', error.message);
          return;
        }
        const profilePhone = data?.phone?.trim() || '';
        setPhone(profilePhone);
        setSavedValues((current) => ({ ...current, phone: profilePhone }));
      });
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
      feedback.warning(t.editProfile.errorTitle, t.editProfile.firstNameRequired);
      return;
    }

    if (!user?.id) return;

    const nextValues = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
    };
    const previousFullName = [savedValues.firstName, savedValues.lastName].filter(Boolean).join(' ');
    const nextFullName = [nextValues.firstName, nextValues.lastName].filter(Boolean).join(' ');
    const changes: GuestDataChange[] = [];
    if (nextValues.firstName !== savedValues.firstName || nextValues.lastName !== savedValues.lastName) {
      changes.push({ field: 'name', from: previousFullName, to: nextFullName });
    }
    if (nextValues.phone !== savedValues.phone) {
      changes.push({ field: 'phone', from: savedValues.phone, to: nextValues.phone });
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullNameCombined,
          phone: nextValues.phone || null,
        },
      });

      if (error) throw error;

      // Also sync to profiles table (used by invitation lists, budgets, and server-side features).
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullNameCombined, phone: nextValues.phone || null })
        .eq('id', user.id);

      if (profileError) throw profileError;

      if (changes.length > 0) {
        try {
          const { data: guestParticipations, error: participationError } = await supabase
            .from('event_participants')
            .select('event_id')
            .eq('user_id', user.id)
            .eq('role', 'guest');

          if (participationError) throw participationError;

          const eventIds = [...new Set((guestParticipations || []).map(({ event_id }) => event_id))];
          if (eventIds.length > 0) {
            const { data: events, error: eventsError } = await supabase
              .from('events')
              .select('id, created_by')
              .in('id', eventIds);

            if (eventsError) throw eventsError;

            const guestName = nextFullName || userEmail;
            const changesText = formatGuestChanges(changes, {
              name: t.notifications.fieldName,
              email: t.notifications.fieldEmail,
              phone: t.notifications.fieldPhone,
            });
            const metadata: GuestDataChangedMeta = { guestName, changes };

            const { error: notificationError } = await supabase
              .from('notifications')
              .insert((events || []).map((event) => ({
                event_id: event.id,
                title: t.notifications.guestDataChangedTitle,
                body: t.notifications.guestDataChangedBody
                  .replace('{{guest}}', guestName)
                  .replace('{{changes}}', changesText),
                type: 'guest_data_changed',
                user_id: event.created_by,
                action_url: `/event/${event.id}/participants`,
                metadata: (metadata as unknown) as Json,
              })));

            if (notificationError) throw notificationError;
          }
        } catch (notificationError) {
          console.warn('[profile] guest profile update notification failed:', notificationError);
        }
      }

      setSavedValues(nextValues);

      // Leaving immediately and confirming with a toast: the dialog only ever
      // said "saved", so making the user tap OK to get back was pure friction.
      router.back();
      useUIStore.getState().showSuccess(t.editProfile.successTitle, t.editProfile.profileUpdated);
    } catch (error) {
      console.log('Profile update error:', error);
      feedback.error(t.editProfile.errorTitle, t.editProfile.updateFailed);
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
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: keyboardOpen ? 160 : insets.bottom + 88,
            paddingTop: 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
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
            {/* First Name Input */}
            <YStack
              gap="$2"
              onLayout={(event) => {
                fieldPositions.current.firstName = event.nativeEvent.layout.y;
              }}
            >
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
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t.editProfile.firstNamePlaceholder}
                  placeholderTextColor="#6B7280"
                  autoCapitalize="words"
                  autoCorrect={false}
                  onFocus={() => handleFieldFocus('firstName')}
                  testID="edit-profile-firstname-input"
                />
              </View>
            </YStack>

            {/* Last Name Input */}
            <YStack
              gap="$2"
              onLayout={(event) => {
                fieldPositions.current.lastName = event.nativeEvent.layout.y;
              }}
            >
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
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t.editProfile.lastNamePlaceholder}
                  placeholderTextColor="#6B7280"
                  autoCapitalize="words"
                  autoCorrect={false}
                  onFocus={() => handleFieldFocus('lastName')}
                  testID="edit-profile-lastname-input"
                />
              </View>
            </YStack>

            {/* Phone Input */}
            <YStack
              gap="$2"
              onLayout={(event) => {
                fieldPositions.current.phone = event.nativeEvent.layout.y;
              }}
            >
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
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t.editProfile.phonePlaceholder}
                  placeholderTextColor="#6B7280"
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  onFocus={() => handleFieldFocus('phone')}
                  testID="edit-profile-phone-input"
                />
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
              <Pressable
                style={[styles.inputContainer, styles.readOnlyContainer]}
                onPress={() => router.push('/(tabs)/profile/email')}
                accessibilityRole="button"
              >
                <Text color="#6B7280" fontSize={16}>
                  {userEmail}
                </Text>
                <XStack alignItems="center" gap="$2">
                  <Ionicons name="lock-closed" size={16} color="#6B7280" />
                  <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                </XStack>
              </Pressable>
              <Text
                fontSize={11}
                color={'rgba(255,255,255,0.72)'}
                marginLeft="$1"
              >
                {t.editProfile.emailCannotChange}
              </Text>
            </YStack>

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
});
