/**
 * AvatarUpload Component
 * Avatar display with edit functionality and image picker
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { View, Text } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase/client';

interface AvatarUploadProps {
  userId: string;
  avatarUrl?: string | null;
  initials: string;
  size?: number;
  onAvatarChange?: (url: string) => void;
  testID?: string;
}

const THEME = {
  background: '#2D3748',
  primary: '#4a6fa5',
  textPrimary: '#FFFFFF',
  border: 'rgba(255, 255, 255, 0.08)',
};

export function AvatarUpload({
  userId,
  avatarUrl,
  initials,
  size = 96,
  onAvatarChange,
  testID,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState(avatarUrl);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll access to change your avatar.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera access to take a photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setIsUploading(true);
    try {
      const fileName = `${userId}-${Date.now()}.jpg`;
      const filePath = fileName;

      // Read file as base64 (fetch/blob doesn't work for local URIs in React Native)
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (updateError) throw updateError;

      setLocalAvatarUrl(publicUrl);
      onAvatarChange?.(publicUrl);
    } catch (error) {
      console.error('Avatar upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Change Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const innerSize = size - 6; // Account for gradient border
  const badgeSize = Math.max(28, size * 0.29);

  return (
    <Pressable
      onPress={showImageOptions}
      disabled={isUploading}
      testID={testID}
      style={styles.container}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={localAvatarUrl ? 'Profile photo. Tap to change' : `Profile initials ${initials}. Tap to add photo`}
      accessibilityState={{ disabled: isUploading }}
    >
      <LinearGradient
        colors={[THEME.primary, '#60A5FA']}
        style={[styles.gradient, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <View
          style={[
            styles.inner,
            { width: innerSize, height: innerSize, borderRadius: innerSize / 2 },
          ]}
        >
          {isUploading ? (
            <ActivityIndicator size="large" color={THEME.primary} />
          ) : localAvatarUrl ? (
            <Image
              source={{ uri: localAvatarUrl }}
              style={[
                styles.image,
                { width: innerSize, height: innerSize, borderRadius: innerSize / 2 },
              ]}
            />
          ) : (
            <Text fontSize={size * 0.25} fontWeight="700" color={THEME.textPrimary}>
              {initials}
            </Text>
          )}
        </View>
      </LinearGradient>
      <View
        style={[
          styles.editBadge,
          { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 },
        ]}
      >
        <Ionicons name="camera" size={badgeSize * 0.5} color={THEME.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  gradient: {
    padding: 3,
  },
  inner: {
    flex: 1,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AvatarUpload;
