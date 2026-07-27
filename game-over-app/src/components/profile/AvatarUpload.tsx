/**
 * AvatarUpload Component
 * Avatar display with edit functionality and image picker
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { View, Text } from 'tamagui';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase/client';
import { useTranslation } from '@/i18n';

// Security: validate uploaded avatars before sending to Supabase Storage.
// MIME and size checks are first-line defence — the storage bucket policy is the second.
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

/**
 * Validates an asset returned by ImagePicker. Returns an error message
 * suitable for Alert.alert when invalid, or null when the asset passes.
 */
function validateAvatarAsset(asset: ImagePicker.ImagePickerAsset): string | null {
  if (asset.fileSize != null && asset.fileSize > MAX_AVATAR_BYTES) {
    const sizeMb = (asset.fileSize / 1024 / 1024).toFixed(1);
    return `Image is too large (${sizeMb} MB). Please choose one under 5 MB.`;
  }
  const mime = asset.mimeType?.toLowerCase();
  if (mime && !ALLOWED_AVATAR_MIME_TYPES.includes(mime)) {
    return `Unsupported image type (${mime}). Use JPEG, PNG, WebP, or HEIC.`;
  }
  return null;
}

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
  primary: '#C6A75E',
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
  const { t } = useTranslation();
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
      const asset = result.assets[0];
      const validationError = validateAvatarAsset(asset);
      if (validationError) {
        Alert.alert('Invalid image', validationError);
        return;
      }
      await uploadAvatar(asset.uri);
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
      const asset = result.assets[0];
      const validationError = validateAvatarAsset(asset);
      if (validationError) {
        Alert.alert('Invalid image', validationError);
        return;
      }
      await uploadAvatar(asset.uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setIsUploading(true);
    try {
      // One folder per user: the storage policies scope writes to
      // <user id>/…, so a user can only ever touch their own avatars.
      const filePath = `${userId}/${Date.now()}.jpg`;

      // Normalize every picker format (including iPhone HEIC/HEIF) to JPEG.
      // The bucket only accepts jpeg/png/webp, so an unconverted HEIC is
      // rejected outright — and the file name has always claimed .jpg anyway.
      const jpeg = await manipulateAsync(uri, [], {
        compress: 0.8,
        format: SaveFormat.JPEG,
      });

      // Read file as base64 (fetch/blob doesn't work for local URIs in React Native)
      const base64 = await FileSystem.readAsStringAsync(jpeg.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      let { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        await supabase.auth.refreshSession();
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        session = refreshedSession;
      }

      console.log('[avatar upload] session present:', !!session?.access_token);
      if (!session?.access_token) {
        Alert.alert(t.common.signInAgainTitle, t.common.signInAgainBody);
        return;
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('[avatar upload] failed', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // `profiles.avatar_url` is the canonical source: the invitation list, the
      // budget screen and every other participant view read it. Writing only the
      // auth metadata (as this used to) left those screens on the previous photo
      // forever, because nothing ever copied the new URL across.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Kept in sync because screens that render the signed-in user before their
      // profile row has loaded fall back to the metadata copy.
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
        colors={[THEME.primary, '#8A7338']}
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
            <ExpoImage
              source={{ uri: localAvatarUrl }}
              style={[
                styles.image,
                { width: innerSize, height: innerSize, borderRadius: innerSize / 2 },
              ]}
              contentFit="cover"
              cachePolicy="memory-disk"
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
