/**
 * Profile Screen
 * User settings hub with dark glassmorphic theme
 */

import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, View } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser, useAuthStore } from '@/stores/authStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useTranslation, getTranslation } from '@/i18n';
import { DARK_THEME } from '@/constants/theme';

interface MenuItemProps {
  icon: string;
  iconColor: string;
  iconBgColor: string;
  label: string;
  value?: string;
  showBadge?: boolean;
  onPress: () => void;
  testID?: string;
}

function MenuItem({
  icon,
  iconColor,
  iconBgColor,
  label,
  value,
  showBadge,
  onPress,
  testID,
}: MenuItemProps) {
  return (
    <Pressable
      style={styles.menuItem}
      onPress={onPress}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${label}${value ? `, current value: ${value}` : ''}${showBadge ? ', has notification' : ''}`}
      accessibilityHint={`Opens ${label} settings`}
    >
      <XStack alignItems="center" gap="$3">
        <View
          width={32}
          height={32}
          borderRadius={16}
          backgroundColor={iconBgColor}
          alignItems="center"
          justifyContent="center"
        >
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text color={DARK_THEME.textPrimary} fontSize={14} fontWeight="500">
          {label}
        </Text>
      </XStack>
      <XStack alignItems="center" gap="$2">
        {showBadge && (
          <View width={8} height={8} borderRadius={4} backgroundColor="#EF4444" />
        )}
        {value && (
          <Text color={DARK_THEME.textSecondary} fontSize={12}>
            {value}
          </Text>
        )}
        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
      </XStack>
    </Pressable>
  );
}

interface MenuSectionProps {
  title: string;
  children: React.ReactNode;
}

function MenuSection({ title, children }: MenuSectionProps) {
  return (
    <YStack marginBottom="$5">
      <Text
        fontSize={11}
        fontWeight="600"
        color={DARK_THEME.textSecondary}
        textTransform="uppercase"
        letterSpacing={1}
        marginBottom="$3"
        marginLeft="$1"
      >
        {title}
      </Text>
      <View style={styles.glassCard}>
        {children}
      </View>
    </YStack>
  );
}

const TIER_LABELS: Record<string, string> = { essential: 'Essential (S)', classic: 'Classic (M)', grand: 'Grand (L)' };

const LANGUAGE_LABELS: Record<string, string> = { en: 'English', de: 'Deutsch' };

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const signOut = useAuthStore((state) => state.signOut);
  const favorites = useFavoritesStore((s) => s.favorites);
  const [imageLoading, setImageLoading] = useState(true);
  const { t, language } = useTranslation();

  const userName = user?.user_metadata?.full_name || 'User';
  const userEmail = user?.email || '';
  const userAvatar = user?.user_metadata?.avatar_url;
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    const tr = getTranslation();
    Alert.alert(
      tr.profile.logOutConfirmTitle,
      tr.profile.logOutConfirmMessage,
      [
        { text: tr.profile.cancel, style: 'cancel' },
        {
          text: tr.profile.logOut,
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const handleLanguagePress = () => {
    router.push('/profile/language');
  };

  return (
    <View flex={1} backgroundColor={DARK_THEME.background}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 180,
          paddingTop: insets.top + 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <Text
          fontSize={24}
          fontWeight="700"
          color={DARK_THEME.textPrimary}
          textAlign="center"
          marginBottom="$6"
        >
          {t.profile.title}
        </Text>

        {/* Profile Card */}
        <YStack alignItems="center" marginBottom="$8">
          <Pressable
            onPress={() => router.push('/profile/edit')}
            testID="profile-avatar-button"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Profile picture for ${userName}. Tap to edit profile`}
          >
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[DARK_THEME.primary, '#60A5FA']}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarInner}>
                  {userAvatar ? (
                    <>
                      <Image
                        source={{ uri: userAvatar, cache: 'force-cache' }}
                        style={styles.avatarImage}
                        onLoadStart={() => setImageLoading(true)}
                        onLoad={() => setImageLoading(false)}
                        onError={() => setImageLoading(false)}
                      />
                      {imageLoading && (
                        <View style={styles.avatarLoader}>
                          <ActivityIndicator size="small" color={DARK_THEME.primary} />
                        </View>
                      )}
                    </>
                  ) : (
                    <Text fontSize={24} fontWeight="700" color={DARK_THEME.textPrimary}>
                      {userInitials}
                    </Text>
                  )}
                </View>
              </LinearGradient>
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={12} color={DARK_THEME.primary} />
              </View>
            </View>
          </Pressable>
          <Text
            fontSize={20}
            fontWeight="700"
            color={DARK_THEME.textPrimary}
            marginTop="$4"
          >
            {userName}
          </Text>
          <Text fontSize={14} color={DARK_THEME.textSecondary}>
            {userEmail}
          </Text>
        </YStack>

        <YStack paddingHorizontal="$4">
          {/* Notifications Section */}
          <MenuSection title={t.profile.notifications}>
            <MenuItem
              icon="notifications"
              iconColor="#60A5FA"
              iconBgColor="rgba(96, 165, 250, 0.2)"
              label={t.profile.notificationPreferences}
              onPress={() => router.push('/profile/notifications')}
              testID="menu-notifications"
            />
          </MenuSection>

          {/* Saved Packages Section */}
          {favorites.length > 0 && (
            <YStack marginBottom="$5">
              <Text
                fontSize={11}
                fontWeight="600"
                color={DARK_THEME.textSecondary}
                textTransform="uppercase"
                letterSpacing={1}
                marginBottom="$3"
                marginLeft="$1"
              >
                {t.profile.savedPackages} ({favorites.length})
              </Text>
              <View style={styles.glassCard}>
                {favorites.map((fav, index) => (
                  <React.Fragment key={fav.id}>
                    {index > 0 && <View style={styles.separator} />}
                    <Pressable
                      style={styles.menuItem}
                      onPress={() => router.push(`/package/${fav.id}`)}
                      testID={`saved-package-${index}`}
                    >
                      <XStack alignItems="center" gap="$3">
                        <View
                          width={32}
                          height={32}
                          borderRadius={16}
                          backgroundColor="rgba(239, 68, 68, 0.2)"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Ionicons name="heart" size={16} color="#EF4444" />
                        </View>
                        <YStack flex={1}>
                          <Text color={DARK_THEME.textPrimary} fontSize={14} fontWeight="500">
                            {fav.cityName} {TIER_LABELS[fav.tier] || fav.name}
                          </Text>
                          <Text color={DARK_THEME.textSecondary} fontSize={11}>
                            {'\u20AC'}{(fav.pricePerPersonCents / 100).toFixed(0)} {t.profile.perPerson}
                          </Text>
                        </YStack>
                      </XStack>
                      <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                    </Pressable>
                  </React.Fragment>
                ))}
              </View>
            </YStack>
          )}

          {/* Account Section */}
          <MenuSection title={t.profile.account}>
            <MenuItem
              icon="person"
              iconColor="#A78BFA"
              iconBgColor="rgba(167, 139, 250, 0.2)"
              label={t.profile.editProfile}
              onPress={() => router.push('/profile/edit')}
              testID="menu-edit-profile"
            />
            <View style={styles.separator} />
            <MenuItem
              icon="lock-closed"
              iconColor="#34D399"
              iconBgColor="rgba(52, 211, 153, 0.2)"
              label={t.profile.passwordSecurity}
              onPress={() => router.push('/profile/security')}
              testID="menu-security"
            />
            <View style={styles.separator} />
            <MenuItem
              icon="language"
              iconColor="#FB923C"
              iconBgColor="rgba(251, 146, 60, 0.2)"
              label={t.profile.language}
              value={LANGUAGE_LABELS[language]}
              onPress={handleLanguagePress}
              testID="menu-language"
            />
          </MenuSection>

          {/* Wellness & Support Section */}
          <MenuSection title={t.profile.wellnessSupport}>
            <MenuItem
              icon="heart"
              iconColor="#F472B6"
              iconBgColor="rgba(244, 114, 182, 0.2)"
              label={t.profile.relationshipHealthCenter}
              onPress={() => Alert.alert(t.profile.comingSoon, t.profile.comingSoonMessage)}
              testID="menu-wellness"
            />
            <View style={styles.separator} />
            <MenuItem
              icon="help-circle"
              iconColor="#9CA3AF"
              iconBgColor="rgba(156, 163, 175, 0.2)"
              label={t.profile.supportFAQ}
              onPress={() => router.push('/profile/support')}
              testID="menu-support"
            />
          </MenuSection>

          {/* Logout Button */}
          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
            testID="logout-button"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Log out of your account"
          >
            <Ionicons name="log-out-outline" size={18} color="#F87171" />
            <Text color="#F87171" fontSize={14} fontWeight="600">
              {t.profile.logOut}
            </Text>
          </Pressable>

          {/* Version */}
          <Text
            fontSize={10}
            color="#4B5563"
            textAlign="center"
            marginTop="$6"
          >
            {t.profile.version} 1.0.0 (Build 1)
          </Text>
        </YStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    backgroundColor: DARK_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  separator: {
    height: 1,
    backgroundColor: DARK_THEME.border,
    marginLeft: 56,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 45,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  avatarLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#374151',
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DARK_THEME.background,
    borderWidth: 1,
    borderColor: DARK_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginTop: 8,
  },
});
